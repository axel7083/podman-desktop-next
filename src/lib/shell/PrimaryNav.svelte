<script lang="ts">
/**
 * Provider-first primary navigation (docs/ia.md rule 1).
 * Shell markup from PD's AppNavigation.svelte (resizable 50–240px, collapses
 * to icons below 70px); groups ENGINES / KUBERNETES / VMS & SERVICES / TOOLS
 * with collapsible headers, pinned items, a per-group cap and "More" overflow.
 */
import { faChevronDown, faChevronRight, faEllipsis, faEllipsisVertical, faEye, faEyeSlash, faPlus, faThumbtack } from '@fortawesome/free-solid-svg-icons';
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
/** Items shown per group before overflowing into "More" (pinned items don't count). */
const GROUP_CAP = 4;

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

function split(id: string, label: string, entries: NavEntry[], createHref?: string): Group {
  const pinned = entries.filter(e => ui.pinned.includes(e.id));
  const rest = entries.filter(e => !ui.pinned.includes(e.id));
  const shown = rest.filter(e => !ui.hidden.includes(e.id));
  const hidden = rest.filter(e => ui.hidden.includes(e.id));
  const visible = [...pinned, ...shown.slice(0, GROUP_CAP)];
  // keep the selected entry visible even when it would overflow
  const overflow = [...shown.slice(GROUP_CAP), ...hidden].filter(e => {
    if (isSelected(e)) {
      visible.push(e);
      return false;
    }
    return true;
  });
  return { id, label, entries, visible, overflow, createHref };
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
  <NavRow href="/" label="Dashboard" selected={path === '/' || path === ''} {expanded}>
    {#snippet icon()}<DashboardIcon size="24" />{/snippet}
  </NavRow>

  <div class="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none]" role="region" aria-label="Connections and tools">
    {#each groups as group (group.id)}
      {@const collapsed = ui.collapsedGroups.includes(group.id)}
      <div role="group" aria-label={group.label}>
        {#if expanded}
          <div class="group/header flex items-center pl-3.5 pr-1.5 pt-3 pb-1 text-[var(--pd-nav-group-header)]">
            <button
              class="flex items-center gap-1 grow min-w-0 text-[10px] font-semibold uppercase tracking-wider hover:text-[var(--pd-global-nav-icon-selected)]"
              aria-expanded={!collapsed}
              onclick={toggleGroup.bind(undefined, group.id)}>
              <span class="truncate">{group.label}</span>
              <span class="opacity-0 group-hover/header:opacity-100 w-3"><Icon icon={collapsed ? faChevronRight : faChevronDown} size="xs" /></span>
              {#if collapsed}<span class="ml-auto font-normal normal-case tracking-normal">{group.entries.length}</span>{/if}
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
          <div class="mx-2.5 my-1.5 border-t border-[var(--pd-global-nav-bg-border)]" aria-hidden="true"></div>
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
            <button
              class="w-full flex py-2 px-2.5 items-center min-h-9 border-l-[4px] border-l-[var(--pd-global-nav-bg)] text-[color:var(--pd-global-nav-icon)] hover:text-[color:var(--pd-global-nav-icon-selected)]"
              title="{group.overflow.length} more in {group.label}"
              aria-label="More {group.label}"
              onclick={openMore.bind(undefined, group.id)}>
              <span class="flex items-center justify-center w-6"><Icon icon={faEllipsis} /></span>
              {#if expanded}<span class="text-sm ml-3">More ({group.overflow.length})</span>{/if}
            </button>
            <Popover open={moreOpen === group.id} anchor={moreAnchor} placement="right-start" onclose={closeMore} class="w-64 py-1">
              <div class="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--pd-nav-group-header)]">
                More {group.label}
              </div>
              {#each group.overflow as entry (entry.id)}
                <MenuItem title={entry.label} icon={entry.icon} onclick={goFromMore.bind(undefined, entry)}>
                  {#snippet trailing()}
                    {#if entry.dot}<span class="w-2 h-2 rounded-full {entry.dot}" title={entry.status}></span>{/if}
                    {#if ui.hidden.includes(entry.id)}<span class="text-[9px] uppercase opacity-70">hidden</span>{/if}
                  {/snippet}
                </MenuItem>
              {/each}
            </Popover>
          {/if}
        {/if}
      </div>
    {/each}

    <div class="mx-2.5 my-1.5 border-t border-[var(--pd-global-nav-bg-border)]" aria-hidden="true"></div>
    <NavRow href="/extensions" label="Extensions" selected={path.startsWith('/extensions')} {expanded} counter={expanded ? registry.extensions.length : undefined}>
      {#snippet icon()}<PuzzleIcon size="24" />{/snippet}
    </NavRow>
  </div>

  <div class="flex-shrink-0 w-full border-t border-[var(--pd-global-nav-bg-border)]" aria-hidden="true"></div>
  <NavRow href="/accounts" label="Accounts" selected={path.startsWith('/accounts')} {expanded}>
    {#snippet icon()}<AccountIcon size="24" />{/snippet}
  </NavRow>
  <NavRow href="/settings/resources" label="Settings" selected={path.startsWith('/settings')} {expanded}>
    {#snippet icon()}<SettingsIcon size="24" />{/snippet}
  </NavRow>

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
