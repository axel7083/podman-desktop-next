<script lang="ts">
/**
 * Provider-first primary navigation (docs/ia.md rule 1).
 * Shell markup from PD's AppNavigation.svelte (resizable 50–240px, collapses
 * to icons below 70px); groups Engines / Kubernetes / VMs & services / Tools (sentence case, no uppercase
 * transform so "VMs" survives)
 * with collapsible headers, pinned items, a per-group cap and "More" overflow.
 */
import { faChevronDown, faChevronRight, faEllipsis, faEllipsisVertical, faEye, faEyeSlash, faPlus, faThumbtack } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { page } from '$app/state';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import MenuItem from '#lib/components/MenuItem.svelte';
import Popover from '#lib/components/Popover.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView, Contributed, ExtensionMeta, IconRef, ToolDef } from '#lib/ext/types.ts';
import AccountIcon from '#lib/images/AccountIcon.svelte';
import DashboardIcon from '#lib/images/DashboardIcon.svelte';
import PuzzleIcon from '#lib/images/PuzzleIcon.svelte';
import SettingsIcon from '#lib/images/SettingsIcon.svelte';
import { appPath, connectionHome, GROUPS, href, navigate, STATUS_DOT_CLASS, statusLabel } from '#lib/nav.ts';
import { ui } from '#lib/ui.svelte.ts';
import { world } from '#lib/world.svelte.ts';

import NavRow from './NavRow.svelte';

const MIN_WIDTH = 50;
const MAX_WIDTH = 240;
const EXPANDED_THRESHOLD = 70;
/**
 * Visible slots per group before overflowing into "More" (pinned items don't
 * count). Tuned so Everything fits 1280×800 with the footer visible and the
 * windows scenario shows its three engine families (Podman, Docker, WSLC).
 */
const GROUP_CAP: Record<string, number> = { engines: 4, kubernetes: 4, vms: 3, tools: 4 };

const expanded = $derived(ui.navWidth > EXPANDED_THRESHOLD);
const path = $derived(appPath(page.url.pathname));

interface NavEntry {
  id: string;
  label: string;
  href: string;
  icon: IconRef | undefined;
  dot?: string;
  status?: string;
  hint?: string;
  hintTooltip?: string;
  ext: ExtensionMeta;
  dimmed?: boolean;
  counter?: number;
  kind: 'connection' | 'tool';
  /** Running / connected / busy: wins a visible slot over stopped items. */
  active?: boolean;
  provider?: string;
}

function connEntry(c: ConnectionView): NavEntry {
  return {
    id: c.id,
    label: c.name,
    href: connectionHome(c),
    icon: c.icon,
    dot: c.extensionDisabled ? undefined : STATUS_DOT_CLASS[c.status],
    status: c.extensionDisabled ? 'Extension disabled' : statusLabel(c),
    hint: c.hint,
    hintTooltip: c.hintTooltip,
    ext: c.ext,
    dimmed: c.extensionDisabled || c.status === 'stopped',
    kind: 'connection',
    active: !c.extensionDisabled && c.status !== 'stopped' && c.status !== 'unknown',
    provider: c.engineType ?? c.providerId,
  };
}

function toolEntry(t: Contributed<ToolDef>): NavEntry {
  return {
    id: `tool:${t.id}`,
    label: t.label,
    href: `/tools/${t.id}`,
    icon: t.icon ?? t.ext.icon,
    ext: t.ext,
    counter: t.badge?.(world),
    kind: 'tool',
    active: !!t.badge?.(world),
  };
}

interface Group {
  id: string;
  label: string;
  entries: NavEntry[];
  visible: NavEntry[];
  overflow: NavEntry[];
  createHref?: string;
}

/**
 * Visible slots: selected > running/connected (or tools with a badge) >
 * the rest, ties broken by the stable order (D10). Visible rows keep the
 * stable order, so status changes never reshuffle what is on screen; the
 * selected overflow item takes the last slot instead of growing the group.
 */
function split(id: string, label: string, entries: NavEntry[], createHref?: string): Group {
  const cap = GROUP_CAP[id] ?? 4;
  const pinned = entries.filter(e => ui.pinned.includes(e.id));
  const candidates = entries.filter(e => !ui.pinned.includes(e.id) && (!ui.hidden.includes(e.id) || isSelected(e)));
  // one running item per provider first (Podman, Docker, WSLC… all stay reachable), then other running ones
  const firstOfProvider = new Set<string>();
  const seenProviders = new Set<string>();
  for (const e of candidates) {
    if (e.active && !seenProviders.has(e.provider ?? e.id)) {
      seenProviders.add(e.provider ?? e.id);
      firstOfProvider.add(e.id);
    }
  }
  const rank = (e: NavEntry): number => (isSelected(e) ? 0 : firstOfProvider.has(e.id) ? 1 : e.active ? 2 : 3);
  const chosen = new Set(
    candidates
      .map((e, i) => ({ e, i }))
      .toSorted((a, b) => rank(a.e) - rank(b.e) || a.i - b.i)
      .slice(0, cap)
      .map(x => x.e.id),
  );
  // a group that only overflows by one shows the item instead of "More (1)"
  if (candidates.length === cap + 1 && !entries.some(e => ui.hidden.includes(e.id))) candidates.forEach(e => chosen.add(e.id));
  const visible = [...pinned, ...entries.filter(e => chosen.has(e.id))];
  const overflow = entries.filter(e => !visible.includes(e));
  return { id, label, entries, visible, overflow, createHref };
}

/** Overflow entries grouped by the contributing extension's category (TOOLS at scale). */
function byCategory(entries: NavEntry[]): { category: string; entries: NavEntry[] }[] {
  const map = new Map<string, NavEntry[]>();
  for (const e of entries) {
    const key = e.ext.category ?? 'Other';
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  return [...map.entries()].map(([category, list]) => ({ category, entries: list.toSorted((a, b) => a.label.localeCompare(b.label)) }));
}

/* Scroll region with fade edges ------------------------------------- */

let scroller = $state<HTMLDivElement>();
let fadeTop = $state(false);
let fadeBottom = $state(false);

function updateFade(): void {
  if (!scroller) return;
  fadeTop = scroller.scrollTop > 2;
  fadeBottom = scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2;
}

$effect(() => {
  if (!scroller) return;
  void groups.length;
  void ui.collapsedGroups.length;
  const observer = new ResizeObserver(updateFade);
  observer.observe(scroller);
  for (const child of scroller.children) observer.observe(child);
  updateFade();
  return (): void => observer.disconnect();
});

// keep the selected row in view after navigation (e.g. from the palette)
$effect(() => {
  void path;
  if (!scroller) return;
  requestAnimationFrame(() => scroller?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' }));
});

/*
 * The mask lives on the scroller only, which starts strictly below the pinned
 * Dashboard row: nothing can render behind a pinned row. The top edge is
 * fully transparent for 8px so a half-scrolled row never reads as a ghost
 * under the divider, then fades in over 28px.
 */
const fadeMask = $derived(
  fadeTop || fadeBottom
    ? `linear-gradient(to bottom, ${fadeTop ? 'transparent 0, transparent 8px, black 28px' : 'black 0'}, ${fadeBottom ? 'black calc(100% - 28px), transparent 100%' : 'black 100%'})`
    : undefined,
);

/** "More engines (4)", "More Kubernetes (4)", "More VMs & services (16)": proper nouns keep their case. */
function moreLabel(group: Group): string {
  const label = /^(Kubernetes|VMs)/.test(group.label) ? group.label : group.label.toLowerCase();
  return `More ${label} (${group.overflow.length})`;
}

const groups: Group[] = $derived.by(() => {
  const result: Group[] = [];
  for (const g of GROUPS) {
    const conns = registry.connections.filter(c => g.kinds.includes(c.kind));
    if (conns.length === 0) continue;
    result.push(split(g.id, g.label, conns.map(connEntry), '/settings/resources'));
  }
  if (registry.tools.length) result.push(split('tools', 'Tools', registry.tools.map(toolEntry)));
  return result;
});

function isSelected(e: NavEntry): boolean {
  const target = e.kind === 'tool' ? `/tools/${e.id.slice(5)}` : `/c/${e.id}`;
  return path === target || path.startsWith(`${target}/`);
}

/* More / item menus ------------------------------------------------- */

let moreOpen = $state<string | undefined>();
const moreGroup = $derived(groups.find(g => g.id === moreOpen && g.overflow.length));
let moreAnchor = $state<HTMLElement | undefined>();
let itemMenuOpen = $state<string | undefined>();
let itemMenuAnchor = $state<HTMLElement | undefined>();

function openMore(groupId: string, e: MouseEvent): void {
  moreAnchor = e.currentTarget as HTMLElement;
  moreOpen = moreOpen === groupId ? undefined : groupId;
}

function closeMore(): void {
  moreOpen = undefined;
}

function openItemMenu(id: string, e: MouseEvent): void {
  e.preventDefault();
  e.stopPropagation();
  itemMenuAnchor = e.currentTarget as HTMLElement;
  itemMenuOpen = itemMenuOpen === id ? undefined : id;
}

function closeItemMenu(): void {
  itemMenuOpen = undefined;
}

function goFromMore(entry: NavEntry): void {
  moreOpen = undefined;
  navigate(entry.href);
}

function pin(id: string): void {
  ui.togglePinned(id);
  itemMenuOpen = undefined;
  moreOpen = undefined;
}

function hide(id: string): void {
  ui.toggleHidden(id);
  itemMenuOpen = undefined;
}

function toggleGroup(id: string): void {
  ui.toggleGroup(id);
}

/* Resize (AppNavigation.svelte) ------------------------------------- */

let isDragging = $state(false);
let startX = 0;
let startWidth = 0;

function onResizePointerDown(e: PointerEvent): void {
  isDragging = true;
  startX = e.clientX;
  startWidth = ui.navWidth;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onResizePointerMove(e: PointerEvent): void {
  if (!isDragging) return;
  ui.navWidth = Math.round(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + e.clientX - startX)));
}

function onResizePointerUp(): void {
  if (!isDragging) return;
  isDragging = false;
  ui.setNavWidth(ui.navWidth < EXPANDED_THRESHOLD ? MIN_WIDTH : ui.navWidth);
}

function onResizeDblClick(): void {
  ui.setNavWidth(expanded ? MIN_WIDTH : 200);
}
</script>

<nav
  class="group relative h-full flex-shrink-0 flex flex-col bg-[var(--pd-global-nav-bg)] border-[var(--pd-global-nav-bg-border)] border-r-[1px]"
  aria-label="AppNavigation"
  class:select-none={isDragging}
  style:width="{ui.navWidth}px">
  <div class="flex-shrink-0 relative z-10 bg-[var(--pd-global-nav-bg)]">
    <NavRow href="/" label="Dashboard" selected={path === '/' || path === ''} {expanded}>
      {#snippet icon()}<DashboardIcon size="24" />{/snippet}
    </NavRow>
  </div>
  <!-- 1px divider between the pinned row and the scroll region, shown once scrolled -->
  <div
    class="flex-shrink-0 h-px w-full"
    class:bg-[var(--pd-global-nav-bg-border)]={fadeTop}
    aria-hidden="true"></div>

  <div
    bind:this={scroller}
    onscroll={updateFade}
    class="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--pd-global-nav-bg-border)_transparent]"
    style:mask-image={fadeMask}
    role="region"
    aria-label="Connections and tools">
    {#each groups as group (group.id)}
      {@const collapsed = ui.collapsedGroups.includes(group.id)}
      <div role="group" aria-label={group.label}>
        {#if expanded}
          <div class="group/header flex items-center pl-3.5 pr-1.5 pt-3 pb-1 text-[var(--pd-nav-group-header)]">
            <button
              class="flex items-center gap-1 grow min-w-0 text-[11px] font-semibold hover:text-[var(--pd-global-nav-icon-selected)]"
              aria-expanded={!collapsed}
              onclick={toggleGroup.bind(undefined, group.id)}>
              <span class="truncate">{group.label}</span>
              <span class="opacity-0 group-hover/header:opacity-100 w-3"><Icon icon={collapsed ? faChevronRight : faChevronDown} size="xs" /></span>
              {#if collapsed}<span class="ml-auto font-normal">{group.entries.length}</span>{/if}
            </button>
            {#if group.createHref}
              <a
                href={href(group.createHref)}
                class="opacity-0 group-hover/header:opacity-100 focus:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--pd-global-nav-icon-inset-bg)]"
                title="Create or add a {group.label.toLowerCase()} connection"
                aria-label="Create {group.label} connection"><Icon icon={faPlus} size="xs" /></a>
            {/if}
          </div>
        {:else}
          <!-- icon rail: a 1px divider stands in for the group header (docs/ia.md, below 70px) -->
          <div class="mx-2 my-2 border-t border-[var(--pd-global-nav-icon)] opacity-40" role="separator" aria-label={group.label}></div>
        {/if}

        {#if !collapsed || !expanded}
          {#each group.visible as entry (entry.id)}
            <Contribution ext={entry.ext} kind={entry.kind === 'tool' ? 'tool' : 'connection'} api={entry.kind === 'tool' ? 'P3' : 'P1'}>
              <NavRow
                href={entry.href}
                label={entry.label}
                tooltip="{entry.label}{entry.status ? ` · ${entry.status}` : ''}"
                selected={isSelected(entry)}
                {expanded}
                dotClass={entry.dot}
                hint={entry.hint}
                hintTooltip={entry.hintTooltip}
                counter={entry.counter}
                dimmed={entry.dimmed}>
                {#snippet icon()}<AppIcon icon={entry.icon} size="20px" class="rounded-sm" />{/snippet}
                {#snippet menu()}
                  <button
                    class="w-5 h-6 flex items-center justify-center rounded text-[var(--pd-global-nav-icon)] hover:bg-[var(--pd-global-nav-icon-inset-bg)]"
                    title="Options for {entry.label}"
                    aria-label="Options for {entry.label}"
                    onclick={openItemMenu.bind(undefined, entry.id)}>
                    <Icon icon={faEllipsisVertical} size="sm" />
                  </button>
                {/snippet}
              </NavRow>
            </Contribution>
          {/each}
          {#if group.overflow.length}
            <Tooltip right tip={expanded ? undefined : moreLabel(group)} class="block w-full" containerClass="relative w-full">
              <button
                class="w-full flex py-2 px-2.5 items-center min-h-9 border-l-[4px] border-l-[var(--pd-global-nav-bg)] text-[color:var(--pd-global-nav-icon)] hover:text-[color:var(--pd-global-nav-icon-selected)] hover:bg-[var(--pd-global-nav-icon-hover-bg)]"
                title={expanded ? moreLabel(group) : undefined}
                aria-label="More {group.label}"
                onclick={openMore.bind(undefined, group.id)}>
                <span class="relative flex items-center justify-center w-6 h-6">
                  <Icon icon={faEllipsis} />
                  {#if !expanded}
                    <span
                      class="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full text-[10px] leading-4 font-semibold text-center bg-[var(--pd-global-nav-icon-inset-bg)] text-[var(--pd-global-nav-icon-selected)]"
                      aria-hidden="true">{group.overflow.length}</span>
                  {/if}
                </span>
                {#if expanded}<span class="text-sm ml-3">More ({group.overflow.length})</span>{/if}
              </button>
            </Tooltip>
          {/if}
        {/if}
      </div>
    {/each}
    <div class="h-2" aria-hidden="true"></div>
  </div>

  <!-- footer never scrolls away: Extensions, Accounts, Settings -->
  <div class="flex-shrink-0 w-full border-t border-[var(--pd-global-nav-bg-border)]" aria-hidden="true"></div>
  <NavRow href="/extensions" label="Extensions" selected={path.startsWith('/extensions')} {expanded} counter={expanded ? registry.extensions.length : undefined}>
    {#snippet icon()}<PuzzleIcon size="24" />{/snippet}
  </NavRow>
  <NavRow href="/accounts" label="Accounts" selected={path.startsWith('/accounts')} {expanded}>
    {#snippet icon()}<AccountIcon size="24" />{/snippet}
  </NavRow>
  <NavRow href="/settings/resources" label="Settings" selected={path.startsWith('/settings')} {expanded}>
    {#snippet icon()}<SettingsIcon size="24" />{/snippet}
  </NavRow>

{#if moreGroup}
  {@const group = moreGroup}
<Popover open={true} anchor={moreAnchor} placement="right-start" onclose={closeMore} class="w-64 py-1">
  <div class="px-3 pt-1.5 pb-1 text-[11px] font-semibold text-[var(--pd-nav-group-header)]">{moreLabel(group)}</div>
  {#each group.id === 'tools' && group.overflow.length > 6 ? byCategory(group.overflow) : [{ category: '', entries: group.overflow }] as section (section.category)}
    {#if section.category}
      <div class="px-3 pt-2 pb-0.5 text-[10px] font-semibold text-[var(--pd-table-body-text)]" role="presentation">{section.category}</div>
    {/if}
    {#each section.entries as entry (entry.id)}
      <MenuItem dense title={entry.label} icon={entry.icon} onclick={goFromMore.bind(undefined, entry)}>
        {#snippet trailing()}
          {#if entry.counter !== undefined}<span class="text-xs text-[var(--pd-table-body-text)]">{entry.counter}</span>{/if}
          {#if entry.dot}<span class="w-2 h-2 rounded-full {entry.dot}" title={entry.status}></span>{/if}
          {#if ui.hidden.includes(entry.id)}<span class="text-[9px] uppercase opacity-70">hidden</span>{/if}
        {/snippet}
      </MenuItem>
    {/each}
  {/each}
</Popover>
{/if}

  <Popover open={!!itemMenuOpen} anchor={itemMenuAnchor} placement="right-start" onclose={closeItemMenu} class="w-44">
    {#if itemMenuOpen}
      {@const id = itemMenuOpen}
      <MenuItem title={ui.pinned.includes(id) ? 'Unpin' : 'Pin to top'} icon={faThumbtack} onclick={pin.bind(undefined, id)} />
      <MenuItem title={ui.hidden.includes(id) ? 'Show in group' : 'Move to More'} icon={ui.hidden.includes(id) ? faEye : faEyeSlash} onclick={hide.bind(undefined, id)} />
    {/if}
  </Popover>

  <!-- Resize handle (AppNavigation.svelte) -->
  <div
    class="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-40 hover:bg-[var(--pd-global-nav-icon-selected-highlight)] transition-colors duration-150"
    class:bg-[var(--pd-global-nav-icon-selected-highlight)]={isDragging}
    role="separator"
    tabindex="-1"
    aria-orientation="vertical"
    aria-label="Resize navigation bar"
    aria-valuenow={ui.navWidth}
    aria-valuemin={MIN_WIDTH}
    aria-valuemax={MAX_WIDTH}
    onpointerdown={onResizePointerDown}
    onpointermove={onResizePointerMove}
    onpointerup={onResizePointerUp}
    ondblclick={onResizeDblClick}></div>
</nav>
