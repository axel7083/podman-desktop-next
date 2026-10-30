<script lang="ts" module>
import type { IconRef } from '#lib/ext/types.ts';

import type { LabResource } from '../data.ts';

export type ViewItem =
  | { kind: 'group'; key: string; title: string; icon: IconRef; chip: string; count: number; open: boolean }
  | { kind: 'row'; key: string; r: LabResource };

export interface ViewColumn {
  key: string;
  title: string;
  width: string;
}
</script>

<script lang="ts">
/**
 * P13 Views table, virtualized: only the rows on screen exist, and `rowOf`
 * builds them on demand, so a query over thousands of resources stays smooth.
 * Same look as the lists (cards when `table=classic`, compact rows otherwise),
 * one-level groups as header rows, sorting owned by the page across all results.
 */
import { faCaretDown, faCaretRight, faSort, faSortDown, faSortUp } from '@fortawesome/free-solid-svg-icons';
import { elementScroll, observeElementOffset, observeElementRect, Virtualizer } from '@tanstack/virtual-core';
import { untrack } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';

import { STATUS_DOT } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import LabIcon from '../ui/LabIcon.svelte';
import ActionsCell from './cells/ActionsCell.svelte';
import NameCell from './cells/NameCell.svelte';
import StatusCell from './cells/StatusCell.svelte';
import TextCell from './cells/TextCell.svelte';
import type { LabRow } from './cells/types.ts';
import { openMenu } from './live.svelte.ts';
import type { ViewSort } from './views.svelte.ts';

interface Props {
  items: ViewItem[];
  columns: ViewColumn[];
  sort: ViewSort;
  rowOf: (r: LabResource) => LabRow;
  onsort: (col: string) => void;
  ontoggle: (key: string) => void;
}

let { items, columns, sort, rowOf, onsort, ontoggle }: Props = $props();

const HEADER = 28;
const compact = $derived(lab.table !== 'classic');
/** Row height + gap. Fixed heights: nothing has to be measured while scrolling. */
const rowH = $derived(compact ? 34 : 56);
const groupH = $derived(compact ? 34 : 40);
const grid = $derived(`70px minmax(14rem, 2fr) ${columns.map(c => c.width).join(' ')} 124px`);

let scroller = $state<HTMLElement>();
let version = $state(0);

function size(i: number): number {
  return items[i]?.kind === 'group' ? groupH : rowH;
}

const virtualizer = new Virtualizer<HTMLElement, HTMLElement>({
  count: 0,
  getScrollElement: () => scroller ?? null,
  estimateSize: size,
  getItemKey: i => items[i]?.key ?? i,
  overscan: 6,
  scrollMargin: HEADER,
  scrollToFn: elementScroll,
  observeElementRect,
  observeElementOffset,
  onChange: (): void => {
    version += 1;
  },
});

$effect(() => {
  if (!scroller) return;
  const cleanup = virtualizer._didMount();
  virtualizer._willUpdate();
  return cleanup;
});

$effect(() => {
  const count = items.length;
  void rowH;
  void groupH;
  untrack(() => {
    virtualizer.setOptions({ ...virtualizer.options, count });
    virtualizer.measure();
    virtualizer._willUpdate();
    version += 1;
  });
});

const visible = $derived.by(() => {
  void version;
  return virtualizer.getVirtualItems().filter(v => items[v.index]);
});
const total = $derived.by(() => {
  void version;
  return virtualizer.getTotalSize() - HEADER;
});

function isGlyph(icon: IconRef): boolean {
  return typeof icon === 'object' && 'iconName' in icon;
}

function sortIcon(col: string): typeof faSort {
  if (sort.col !== col) return faSort;
  return sort.asc ? faSortUp : faSortDown;
}

function ariaSort(col: string): 'ascending' | 'descending' | 'none' {
  if (sort.col !== col) return 'none';
  return sort.asc ? 'ascending' : 'descending';
}
</script>

{#snippet head(col: string, title: string)}
  <div role="columnheader" aria-sort={ariaSort(col)} class="min-w-0">
    <button type="button" data-testid="view-sort-{col}" class="flex items-center gap-1 max-w-full uppercase hover:text-[var(--pd-table-header-text)]" onclick={(): void => onsort(col)}>
      <span class="truncate">{title}</span>
      <span class={sort.col === col ? '' : 'text-[var(--pd-table-header-unsorted)]'}><AppIcon icon={sortIcon(col)} size="xs" /></span>
    </button>
  </div>
{/snippet}

<div bind:this={scroller} data-testid="view-table" role="table" aria-label="Results" aria-rowcount={items.length} class="flex-1 min-h-0 min-w-0 overflow-auto px-5" class:compact>
  <div role="row" class="vgrid sticky top-0 z-[2] h-7 items-center text-[11px] font-semibold text-[var(--pd-table-header-text)] bg-[var(--pd-content-bg)]" style:grid-template-columns={grid}>
    {@render head('status', 'Status')}
    {@render head('name', 'Name')}
    {#each columns as c (c.key)}{@render head(c.key, c.title)}{/each}
    <div role="columnheader" class="justify-self-end pr-2 uppercase">Actions</div>
  </div>
  <div class="relative w-full" style:height="{total}px">
    {#each visible as v (v.key)}
      {@const item = items[v.index]}
      <div class="absolute left-0 right-0 top-0" style:height="{v.size}px" style:transform="translateY({v.start - HEADER}px)">
        {#if item.kind === 'group'}
          <button type="button" data-testid="view-group" aria-expanded={item.open} class="group-row flex items-center gap-2 w-full h-full text-left" onclick={(): void => ontoggle(item.key)}>
            <span class="flex w-3 justify-center text-[11px] text-[var(--pd-table-body-text)]"><AppIcon icon={item.open ? faCaretDown : faCaretRight} /></span>
            <LabIcon icon={item.icon} size={16} />
            <span class="truncate font-semibold text-[13px] text-[var(--pd-table-body-text-highlight)]">{item.title}</span>
            <span class="shrink-0 rounded-sm px-1.5 leading-4 text-xs bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">{item.chip}</span>
            <span class="text-[12px] text-[var(--pd-table-body-text)]">{item.count}</span>
          </button>
        {:else}
          {@const row = rowOf(item.r)}
          <div
            role="row"
            tabindex="-1"
            data-testid="view-row"
            aria-rowindex={v.index + 1}
            class="vgrid row group/row items-center"
            style:grid-template-columns={grid}
            ondblclick={row.pin}
            oncontextmenu={(e): void => {
              if (row.menu) openMenu(e, row.menu());
            }}>
            <div role="cell" class="flex justify-center">
              {#if compact}
                {#if row.status}<span class="w-2 h-2 rounded-full {STATUS_DOT[row.status.toLowerCase()] ?? STATUS_DOT.stopped}" title={row.dotTitle ?? row.status}></span>{/if}
              {:else}
                {#if isGlyph(row.icon)}
                  <!-- ui-svelte's StatusIcon renders no FontAwesome glyph at its numeric size: same tile, with the glyph. -->
                  <span class="tile" class:running={row.status === 'RUNNING'} class:degraded={row.status === 'DEGRADED'} role="status" title={row.dotTitle ?? row.status}><LabIcon icon={row.icon} size={14} /></span>
                {:else}
                  <StatusCell object={row} />
                {/if}
              {/if}
            </div>
            <div role="cell" class="flex items-center gap-2 min-w-0">
              {#if compact}<span class="flex shrink-0 text-[var(--pd-table-body-text)]"><LabIcon icon={row.icon} size={16} /></span>{/if}
              <span class="min-w-0"><NameCell object={row} /></span>
            </div>
            {#each columns as c (c.key)}
              <div role="cell" class="min-w-0"><TextCell object={row.cols[c.key] ?? ''} /></div>
            {/each}
            <div role="cell" class="actions"><ActionsCell object={row} /></div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
.vgrid {
  display: grid;
  column-gap: 2px;
}
.row {
  height: 48px;
  border-radius: 8px;
  border: 1px solid var(--pd-content-table-border);
  background: var(--pd-content-card-bg);
}
.row:hover {
  background: var(--pd-content-card-hover-bg);
}
.tile {
  display: inline-grid;
  place-content: center;
  width: 28px;
  height: 28px;
  border-radius: 2px;
  border: 2px solid var(--pd-status-not-running);
  color: var(--pd-status-not-running);
}
.tile.running,
.tile.degraded {
  border: 0;
  color: var(--pd-status-contrast);
}
.tile.running {
  background: var(--pd-status-running);
}
.tile.degraded {
  background: var(--pd-status-degraded);
}
.compact .row {
  height: 34px;
  border-width: 0 0 1px;
  border-radius: 0;
  border-color: var(--pd-content-divider);
  background: transparent;
}
.compact .actions {
  opacity: 0;
}
.compact .row:hover .actions,
.compact .row:focus-within .actions {
  opacity: 1;
}
.compact .row :global([data-testid='row-name'] > span + span) {
  display: none;
}
</style>
