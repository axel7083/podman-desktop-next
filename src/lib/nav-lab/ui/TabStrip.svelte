<script lang="ts">
/**
 * Editor-style tab strip (36px): target icon + provider badge, italic preview
 * tabs, close on hover, optional leading "home" tab, optional connection
 * groups (P3), and an overflow menu "+N" that keeps the active tab visible.
 */
import { faChevronDown, faHouse, faXmark } from '@fortawesome/free-solid-svg-icons';
import type { Snippet } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn, type LabTarget } from '../data.ts';
import { describe, HOME, lab, type LabTab, type Workbench } from '../lab.svelte.ts';
import { ctxColor } from '../r2/ctx.ts';
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
</script>

{#snippet tabEl(tab: LabTab)}
  {@const d = describe(tab.target)}
  {@const sel = tab.key === wb.active}
  {@const gc = groupByConn ? findConn(d.connId)?.color : lab.color ? ctxColor(d.connId) : undefined}
  <div
    role="tab"
    tabindex="0"
    aria-selected={sel}
    title="{d.crumb.filter(Boolean).join(' › ')}{d.crumb.length ? ' › ' : ''}{d.title}"
    class="group/tab relative flex items-center gap-2 h-full pl-3 pr-1.5 border-r border-[var(--pd-content-divider)] cursor-pointer shrink-0 select-none"
    class:bg-[var(--pd-content-bg)]={sel}
    class:text-[var(--pd-tab-text-highlight)]={sel}
    class:text-[var(--pd-tab-text)]={!sel}
    class:hover:bg-[var(--pd-content-card-hover-bg)]={!sel}
    style:max-width="196px"
    onclick={(): void => select(tab.key)}
    ondblclick={(): void => wb.pin(tab.key)}
    onauxclick={(e): void => {
      if (e.button === 1) wb.close(tab.key);
    }}
    onkeydown={(e): void => {
      if (e.key === 'Enter') select(tab.key);
    }}>
    {#if sel}<span class="absolute left-0 right-0 top-0 h-[2px] bg-[var(--pd-tab-highlight)]" style:background={gc && !groupByConn ? gc : undefined}></span>{/if}
    {#if gc}<span class="absolute left-0 right-0 bottom-0 h-[2px]" style:background={gc}></span>{/if}
    {#if lab.color && !groupByConn && gc}<span class="w-1.5 h-1.5 rounded-full shrink-0 -mr-1" style:background={gc}></span>{/if}
    <TabIcon icon={d.icon} connId={d.connId} size={15} />
    <span class="truncate text-base" class:italic={tab.preview}>{d.title}</span>
    <button
      type="button"
      aria-label="Close {d.title}"
      class="ml-0.5 w-5 h-5 shrink-0 flex items-center justify-center rounded hover:bg-[var(--pd-content-card-hover-inset-bg)] text-[var(--pd-tab-text)] {sel ? '' : 'invisible group-hover/tab:visible'}"
      onclick={(e): void => {
        e.stopPropagation();
        wb.close(tab.key);
      }}><AppIcon icon={faXmark} size="xs" /></button>
  </div>
{/snippet}

<div
  role="tablist"
  aria-label="Open tabs"
  class="flex items-stretch h-9 shrink-0 bg-[var(--pd-secondary-nav-bg)] border-b border-[var(--pd-content-divider)] relative"
  bind:clientWidth={width}>
  {#if wb.home}
    {@const ht = homeTarget()!}
    {@const d = describe(ht)}
    {@const sel = wb.active === HOME}
    <div
      role="tab"
      tabindex="0"
      aria-selected={sel}
      title="Current view (not closable)"
      class="relative flex items-center gap-2 h-full px-3 border-r border-[var(--pd-content-divider)] cursor-pointer shrink-0"
      class:bg-[var(--pd-content-bg)]={sel}
      class:text-[var(--pd-tab-text-highlight)]={sel}
      class:text-[var(--pd-tab-text)]={!sel}
      onclick={(): void => select(HOME)}
      onkeydown={(): void => select(HOME)}>
      {#if sel}<span class="absolute left-0 right-0 top-0 h-[2px] bg-[var(--pd-tab-highlight)]"></span>{/if}
      <span class="text-[11px] opacity-70"><AppIcon icon={faHouse} /></span>
      {#if ht.kind !== 'dashboard'}<TabIcon icon={d.icon} connId={d.connId} size={15} />{/if}
      <span class="text-base font-medium whitespace-nowrap">{homeLabel ?? d.title}</span>
    </div>
  {/if}
  <div class="flex items-stretch min-w-0 overflow-hidden">
    {#each layout.visible as seg (seg.tab.key)}
      {#if seg.groupStart}
        {@const gc = findConn(seg.groupStart)}
        {#if gc}
          <div class="flex items-center px-1.5 shrink-0 border-r border-[var(--pd-content-divider)]">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap" style:background={gc.color}>{gc.name}</span>
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
              <TabIcon icon={d.icon} connId={d.connId} size={15} />
              <span class="truncate flex-1" class:italic={t.preview}>{d.title}</span>
              <span class="text-xs opacity-60 truncate max-w-28">{findConn(d.connId)?.name ?? d.crumb[0] ?? ''}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
  <div class="flex-1"></div>
  {#if actions}<div class="flex items-center gap-1 px-2 shrink-0">{@render actions()}</div>{/if}
</div>
