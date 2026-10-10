<script lang="ts">
/**
 * ui-svelte Table for P13 lists: Status | Name | <text columns> | Actions,
 * sortable headers, row selection, layout configuration (pencil), group rows
 * (compose / pod) as expandable children.
 */
import { Table, TableColumn, TableRow } from '@podman-desktop/ui-svelte';

import type { IconRef } from '#lib/ext/types.ts';

import { lab } from '../lab.svelte.ts';
import ActionsCell from './cells/ActionsCell.svelte';
import NameCell from './cells/NameCell.svelte';
import StatusCell from './cells/StatusCell.svelte';
import TextCell from './cells/TextCell.svelte';
import type { LabRow } from './cells/types.ts';
import ModernTable from './ModernTable.svelte';

interface Props {
  kind: string;
  rows: LabRow[];
  /** Text columns: [title, key in `row.cols`, width, numeric sort?]. */
  cols: [string, string, string, boolean?][];
  actionsWidth?: string;
  /** Extra bulk-bar actions (modern / grid tables). */
  bulkActions?: { label: string; icon?: IconRef; run: (rows: LabRow[]) => void }[];
}

let { kind, rows, cols, actionsWidth = '120px', bulkActions }: Props = $props();

function num(v: string): number {
  const m = /([\d.]+)\s*(GB|MB|kB|B|minute|hour|day|week)?/.exec(v);
  if (!m) return 0;
  const mul: Record<string, number> = { GB: 1e9, MB: 1e6, kB: 1e3, B: 1, minute: 60, hour: 3600, day: 86400, week: 604800 };
  return Number(m[1]) * (mul[m[2] ?? ''] ?? 1);
}

const columns = $derived([
  new TableColumn<LabRow, LabRow>('Status', { align: 'center', width: '70px', renderer: StatusCell, renderMapping: (r): LabRow => r, comparator: (a, b): number => a.status.localeCompare(b.status) }),
  new TableColumn<LabRow, LabRow>('Name', { width: 'minmax(14rem, 2fr)', renderer: NameCell, renderMapping: (r): LabRow => r, comparator: (a, b): number => a.title.localeCompare(b.title) }),
  ...cols.map(
    ([title, key, width, numeric]) =>
      new TableColumn<LabRow, string>(title, {
        width,
        renderer: TextCell,
        renderMapping: (r): string => r.cols[key] ?? '',
        comparator: (a, b): number => (numeric ? num(a.cols[key] ?? '') - num(b.cols[key] ?? '') : (a.cols[key] ?? '').localeCompare(b.cols[key] ?? '')),
      }),
  ),
  new TableColumn<LabRow, LabRow>('Actions', { align: 'right', width: actionsWidth, renderer: ActionsCell, renderMapping: (r): LabRow => r, overflow: true }),
]);

const row = new TableRow<LabRow, LabRow>({ selectable: (): boolean => true, children: (r): LabRow[] => r.children ?? [] });
</script>

{#if lab.table !== 'classic'}
  <ModernTable {rows} {cols} variant={lab.table} {bulkActions} />
{:else}
<div data-testid="rows-table" class="flex min-w-full grow">
  {#key columns}
    <Table {kind} data={rows} {columns} {row} defaultSortColumn="Name" enableLayoutConfiguration key={(r): string => r.name} label={(r): string => r.title} />
  {/key}
</div>
{/if}
