<script lang="ts">
/**
 * Editor-style tab strip (32px, rule A1): `Tab` items (target icon + provider
 * badge, italic preview tabs, close on hover, tab context menu), optional leading "home" tab, optional connection
 * groups (P3), and an overflow menu "+N" that keeps the active tab visible.
 */
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import type { Snippet } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn, type LabTarget } from '../data.ts';
import { describe, HOME, lab, type LabTab, type Workbench } from '../lab.svelte.ts';
import { ctxColor } from '../r2/ctx.ts';
import { type MenuItem } from '../r3/live.svelte.ts';
import Tab from './Tab.svelte';
import TabIcon from './TabIcon.svelte';

interface Props {
  wb: Workbench;
  groupByConn?: boolean;
  actions?: Snippet;
  /** Label of the leading home tab. */
  homeLabel?: string;
}

let { wb, groupByConn = false, actions, homeLabel }: Props = $props();

let width = $state(0);
let menuOpen = $state(false);

function estimate(tab: LabTab): number {
  const d = describe(tab.target);
  return Math.min(196, Math.max(100, 58 + d.title.length * 6.3));
}

interface Seg {
  tab: LabTab;
  groupStart?: string;
}

const ordered = $derived.by((): LabTab[] => {
  if (!groupByConn) return wb.tabs;
  const order: string[] = [];
  for (const t of wb.tabs) {
    const g = describe(t.target).connId ?? '~';
    if (!order.includes(g)) order.push(g);
  }
  return [...wb.tabs].sort((a, b) => order.indexOf(describe(a.target).connId ?? '~') - order.indexOf(describe(b.target).connId ?? '~'));
});

const homeW = $derived(wb.home ? 44 + (homeLabel ?? describe(wb.home).title).length * 6.6 : 0);

const layout = $derived.by(() => {
  const avail = width - homeW - (actions ? 72 : 8);
  const visible: Seg[] = [];
  const hidden: LabTab[] = [];
  let used = 0;
  let lastGroup: string | undefined;
  const totalNeeded = ordered.reduce((a, t) => a + estimate(t) + (groupByConn ? 40 : 0), 0);
  const budget = totalNeeded <= avail ? avail : avail - 64;
  for (const t of ordered) {
    const g = groupByConn ? (describe(t.target).connId ?? '~') : undefined;
    const chip = groupByConn && g !== lastGroup ? (findConn(g)?.name.length ?? 5) * 6 + 30 : 0;
    const w = estimate(t) + chip;
    if (hidden.length === 0 && used + w <= budget) {
      visible.push({ tab: t, groupStart: groupByConn && g !== lastGroup ? g : undefined });
      used += w;
      lastGroup = g;
    } else hidden.push(t);
  }
  const ai = hidden.findIndex(t => t.key === wb.active);
  if (ai >= 0 && visible.length) {
    const last = visible.pop()!;
    hidden.splice(ai, 1, last.tab);
    const act = ordered.find(t => t.key === wb.active)!;
    const g = describe(act.target).connId ?? '~';
    visible.push({ tab: act, groupStart: groupByConn && g !== describe(visible.at(-1)?.tab.target ?? act.target).connId ? g : undefined });
  }
  return { visible, hidden };
});

function select(key: string): void {
  wb.active = key;
  menuOpen = false;
}

function homeTarget(): LabTarget | undefined {
  return wb.home;
}

function tabMenu(key: string): MenuItem[] {
  const idx = wb.tabs.findIndex(t => t.key === key);
  return [
    { label: 'Close', run: (): void => wb.close(key) },
    { label: 'Close others', disabled: wb.tabs.length < 2, run: (): void => wb.tabs.filter(t => t.key !== key).forEach(t => wb.close(t.key)) },
    { label: 'Close tabs to the right', disabled: idx === wb.tabs.length - 1, run: (): void => wb.tabs.slice(idx + 1).forEach(t => wb.close(t.key)) },
  ];
}
</script>

{#snippet tabEl(tab: LabTab)}
  {@const d = describe(tab.target)}
  {@const gc = groupByConn ? undefined : lab.color ? ctxColor(d.connId) : undefined}
  <Tab
    icon={d.icon}
    connId={d.connId}
    title={d.title}
    tooltip="{d.crumb.filter(Boolean).join(' › ')}{d.crumb.length ? ' › ' : ''}{d.title}"
    selected={tab.key === wb.active}
    preview={tab.preview}
    color={gc}
    onselect={(): void => select(tab.key)}
    onpin={(): void => wb.pin(tab.key)}
    onclose={(): void => wb.close(tab.key)}
    menu={(): MenuItem[] => tabMenu(tab.key)} />
{/snippet}

<div
  role="tablist"
  aria-label="Open tabs"
  class="flex items-stretch h-8 shrink-0 bg-[var(--pd-secondary-nav-bg)] border-b border-[var(--pd-content-divider)] relative"
  bind:clientWidth={width}>
  {#if wb.home}
    {@const d = describe(homeTarget()!)}
    <Tab icon={d.icon} connId={d.connId} title={homeLabel ?? d.title} tooltip="{homeLabel ?? d.title} (not closable)" selected={wb.active === HOME} closable={false} testid="home-tab" onselect={(): void => select(HOME)} />
  {/if}
  <div class="flex items-stretch min-w-0 overflow-hidden">
    {#each layout.visible as seg (seg.tab.key)}
      {#if seg.groupStart}
        {@const gc = findConn(seg.groupStart)}
        {#if gc}
          <div class="flex items-center px-1.5 shrink-0 border-r border-[var(--pd-content-divider)]">
            <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white whitespace-nowrap" style:background={gc.color}>{gc.name}</span>
          </div>
        {/if}
      {/if}
      {@render tabEl(seg.tab)}
    {/each}
  </div>
  {#if layout.hidden.length}
    <div class="relative flex items-center px-1">
      <button
        type="button"
        aria-label="{layout.hidden.length} more tabs"
        class="flex items-center gap-1 h-6 px-2 rounded text-sm font-semibold text-[var(--pd-tab-text)] hover:bg-[var(--pd-content-card-hover-bg)] border border-[var(--pd-content-divider)]"
        onclick={(): void => {
          menuOpen = !menuOpen;
        }}>+{layout.hidden.length}<AppIcon icon={faChevronDown} size="xs" /></button>
      {#if menuOpen}
        <div role="menu" class="absolute right-0 top-full mt-1 w-80 max-h-[60vh] overflow-auto rounded-md border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] shadow-xl py-1 z-50">
          <div class="px-3 py-1 text-sm text-[var(--pd-nav-group-header)] font-semibold">{layout.hidden.length} hidden tabs · {wb.tabs.length} open</div>
          {#each layout.hidden as t (t.key)}
            {@const d = describe(t.target)}
            <button
              type="button"
              role="menuitem"
              class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[var(--pd-dropdown-item-text)] hover:bg-[var(--pd-dropdown-item-hover-bg)]"
              onclick={(): void => select(t.key)}>
              <TabIcon icon={d.icon} connId={d.connId} />
              <span class="truncate flex-1" class:italic={t.preview}>{d.title}</span>
              <span class="text-[11px] text-[var(--pd-table-body-text)] truncate max-w-28">{findConn(d.connId)?.name ?? d.crumb[0] ?? ''}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
  <div class="flex-1"></div>
  {#if actions}<div class="flex items-center gap-1 px-2 shrink-0">{@render actions()}</div>{/if}
</div>
