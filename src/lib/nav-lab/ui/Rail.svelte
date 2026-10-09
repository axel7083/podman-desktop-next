<script lang="ts" module>
import type { IconRef } from '#lib/ext/types.ts';

export interface RailItem {
  id: string;
  label: string;
  icon?: IconRef;
  /** Draw this connection's icon + status dot instead of `icon`. */
  connId?: string;
  group?: string;
  badge?: number;
}
</script>

<script lang="ts">
/**
 * Generic left rail with three modes (icons 48px · labels-under ≈84px ·
 * expanded 200px), group headers, a "More (n)" overflow tier computed from
 * the available height, and pinned bottom items. Active = 3px left accent + tint.
 */
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import type { RailMode } from '../lab.svelte.ts';
import ConnIcon from './ConnIcon.svelte';

interface Props {
  items: RailItem[];
  bottom?: RailItem[];
  mode: RailMode;
  selected?: string;
  onselect: (id: string) => void;
  avatar?: boolean;
  /** Group headers in labels/expanded mode. */
  headers?: boolean;
  label?: string;
}

let { items, bottom = [], mode, selected, onselect, avatar = false, headers = true, label = 'Navigation' }: Props = $props();

let height = $state(0);
let moreOpen = $state(false);

const W = $derived(mode === 'icons' ? (avatar ? 56 : 48) : mode === 'labels' ? 84 : 208);
const itemH = $derived(mode === 'icons' ? (avatar ? 48 : 40) : mode === 'labels' ? 58 : 34);
const headerH = $derived(!headers ? 0 : mode === 'icons' ? 9 : mode === 'labels' ? 26 : 28);

interface Row {
  item: RailItem;
  header?: string;
}

const layout = $derived.by(() => {
  const avail = height - 4;
  const rows: Row[] = [];
  const hidden: RailItem[] = [];
  let used = 0;
  let lastGroup: string | undefined;
  const all = items.length;
  const totalNeeded = items.reduce((acc, it, i) => acc + itemH + (it.group && it.group !== items[i - 1]?.group ? headerH : 0), 0);
  const budget = totalNeeded <= avail ? avail : avail - itemH;
  for (let i = 0; i < all; i++) {
    const it = items[i];
    const newGroup = !!it.group && it.group !== lastGroup;
    const h = itemH + (newGroup ? headerH : 0);
    if (hidden.length === 0 && used + h <= budget) {
      rows.push({ item: it, header: newGroup ? it.group : undefined });
      used += h;
      lastGroup = it.group;
    } else {
      hidden.push(it);
    }
  }
  // keep the selected item visible
  const selIdx = hidden.findIndex(h => h.id === selected);
  if (selIdx >= 0 && rows.length > 0) {
    const last = rows.pop()!;
    hidden.splice(selIdx, 1);
    hidden.unshift(last.item);
    rows.push({ item: items.find(i => i.id === selected)! });
  }
  return { rows, hidden };
});

const hiddenGroups = $derived.by(() => {
  const map = new Map<string, RailItem[]>();
  for (const h of layout.hidden) {
    const g = h.group ?? '';
    map.set(g, [...(map.get(g) ?? []), h]);
  }
  return [...map.entries()];
});

function pick(id: string): void {
  moreOpen = false;
  onselect(id);
}
</script>

{#snippet glyph(it: RailItem, size: number)}
  {#if it.connId}
    <ConnIcon connId={it.connId} {size} {avatar} />
  {:else if it.icon}
    <span class="flex items-center justify-center" style:width="{size}px" style:height="{size}px" style:font-size="{size - 4}px">
      <AppIcon icon={it.icon} size="{size}px" />
    </span>
  {/if}
{/snippet}

{#snippet entry(it: RailItem)}
  {@const sel = it.id === selected}
  <button
    type="button"
    title={mode === 'expanded' ? undefined : it.label}
    aria-label={it.label}
    aria-current={sel ? 'page' : undefined}
    onclick={(): void => pick(it.id)}
    class="relative w-full flex border-l-[3px] text-[var(--pd-global-nav-icon)] hover:text-[var(--pd-global-nav-icon-hover)]"
    class:border-l-[var(--pd-global-nav-icon-selected-highlight)]={sel}
    class:bg-[var(--pd-global-nav-icon-selected-bg)]={sel}
    class:!text-[var(--pd-global-nav-icon-selected)]={sel}
    class:border-l-transparent={!sel}
    class:hover:bg-[var(--pd-global-nav-icon-hover-bg)]={!sel}
    class:flex-col={mode === 'labels'}
    class:items-center={true}
    class:justify-center={mode !== 'expanded'}
    class:px-2.5={mode === 'expanded'}
    class:gap-2.5={mode === 'expanded'}
    style:height="{itemH}px">
    {@render glyph(it, mode === 'labels' ? 22 : avatar && mode === 'icons' ? 32 : 20)}
    {#if mode === 'labels'}
      <span class="mt-1 px-1 w-full text-center text-[10px] leading-[12px] line-clamp-2 break-words">{it.label}</span>
    {:else if mode === 'expanded'}
      <span class="text-sm truncate text-left flex-1 min-w-0" class:font-medium={sel}>{it.label}</span>
      {#if it.badge !== undefined}<span class="text-xs opacity-70">{it.badge}</span>{/if}
    {/if}
  </button>
{/snippet}

<nav
  aria-label={label}
  class="flex flex-col h-full shrink-0 bg-[var(--pd-global-nav-bg)] border-r border-[var(--pd-global-nav-bg-border)] relative z-20"
  style:width="{W}px">
  <div class="flex-1 min-h-0 flex flex-col pt-1" bind:clientHeight={height}>
    {#each layout.rows as row (row.item.id)}
      {#if row.header && headers}
        {#if mode === 'icons'}
          <div class="mx-3 my-1 border-t border-[var(--pd-global-nav-bg-border)]" style:height="1px"></div>
        {:else}
          <div
            class="flex items-end truncate text-[var(--pd-nav-group-header)] font-semibold"
            class:text-[10px]={mode === 'labels'}
            class:justify-center={mode === 'labels'}
            class:text-sm={mode === 'expanded'}
            class:px-3={mode === 'expanded'}
            class:pb-1={true}
            style:height="{headerH}px">{row.header}</div>
        {/if}
      {/if}
      {@render entry(row.item)}
    {/each}
    {#if layout.hidden.length > 0}
      {@const selHidden = layout.hidden.some(h => h.id === selected)}
      <div class="relative">
        <button
          type="button"
          aria-label="More ({layout.hidden.length})"
          title="More ({layout.hidden.length})"
          class="w-full flex items-center border-l-[3px] border-l-transparent text-[var(--pd-global-nav-icon)] hover:bg-[var(--pd-global-nav-icon-hover-bg)]"
          class:flex-col={mode === 'labels'}
          class:justify-center={mode !== 'expanded'}
          class:px-2.5={mode === 'expanded'}
          class:gap-2.5={mode === 'expanded'}
          class:!border-l-[var(--pd-global-nav-icon-selected-highlight)]={selHidden}
          style:height="{itemH}px"
          onclick={(): void => {
            moreOpen = !moreOpen;
          }}>
          <span class="relative flex items-center justify-center w-6 h-6 text-lg">
            <AppIcon icon={faEllipsis} />
            {#if mode === 'icons'}
              <span class="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full text-[9px] leading-4 font-semibold bg-[var(--pd-label-primary-bg)] text-[var(--pd-label-primary-text)]">{layout.hidden.length}</span>
            {/if}
          </span>
          {#if mode === 'labels'}
            <span class="mt-1 text-[10px] leading-[12px]">More ({layout.hidden.length})</span>
          {:else if mode === 'expanded'}
            <span class="text-sm flex-1 text-left">More</span><span class="text-xs opacity-70">{layout.hidden.length}</span>
          {/if}
        </button>
        {#if moreOpen}
          <div
            role="menu"
            class="absolute left-full bottom-0 ml-1 w-64 max-h-[70vh] overflow-auto rounded-md border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] shadow-xl py-1 z-50">
            {#each hiddenGroups as [group, list] (group)}
              {#if group}<div class="px-3 pt-2 pb-1 text-sm font-semibold text-[var(--pd-nav-group-header)]">{group}</div>{/if}
              {#each list as it (it.id)}
                <button
                  type="button"
                  role="menuitem"
                  class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[var(--pd-dropdown-item-text)] hover:bg-[var(--pd-dropdown-item-hover-bg)] hover:text-[var(--pd-dropdown-item-hover-text)]"
                  class:font-semibold={it.id === selected}
                  onclick={(): void => pick(it.id)}>
                  {@render glyph(it, 18)}
                  <span class="truncate">{it.label}</span>
                </button>
              {/each}
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
  {#if bottom.length}
    <div class="shrink-0 border-t border-[var(--pd-global-nav-bg-border)] py-1">
      {#each bottom as it (it.id)}
        {@render entry(it)}
      {/each}
    </div>
  {/if}
</nav>
