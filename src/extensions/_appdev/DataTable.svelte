<script lang="ts" generics="T extends object">
/**
 * Shared list for the appdev extensions: a ui-svelte Table with an optional
 * status column, a PD name cell (title + sub line + link), plain text
 * columns and the PD actions cell. Keeps every service page consistent.
 */
import { EmptyScreen, FilteredEmptyScreen, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import type { Component } from 'svelte';

import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';

import StatusCell from './StatusCell.svelte';
import type { DataColumn } from './types.ts';

interface Props {
  kind: string;
  rows: T[];
  key: (row: T) => string;
  name: (row: T) => NameCellData;
  nameTitle?: string;
  nameWidth?: string;
  columns?: DataColumn<T>[];
  status?: (row: T) => StatusCellData;
  actions?: (row: T) => ActionsCellData;
  actionsWidth?: string;
  icon?: IconDefinition | Component;
  emptyTitle?: string;
  emptyMessage?: string;
  searchTerm?: string;
  onResetFilter?: () => void;
  /** Total before filtering, to tell "empty" from "filtered empty". */
  total?: number;
}

let {
  kind,
  rows,
  key,
  name,
  nameTitle = 'Name',
  nameWidth = '2fr',
  columns = [],
  status,
  actions,
  actionsWidth = '120px',
  icon,
  emptyTitle,
  emptyMessage = '',
  searchTerm = '',
  onResetFilter,
  total,
}: Props = $props();

const tableColumns = $derived([
  ...(status
    ? [
        new TableColumn<T, StatusCellData>('Status', {
          align: 'center',
          width: '70px',
          renderer: StatusCell,
          renderMapping: status,
          comparator: (a, b): number => status(a).status.localeCompare(status(b).status),
        }),
      ]
    : []),
  new TableColumn<T, NameCellData>(nameTitle, {
    width: nameWidth,
    renderer: NameCell,
    renderMapping: name,
    comparator: (a, b): number => name(a).title.localeCompare(name(b).title),
  }),
  ...columns.map(
    c =>
      new TableColumn<T, string>(c.title, {
        width: c.width ?? '1fr',
        renderer: TableSimpleColumn,
        renderMapping: c.value,
        comparator: (a, b): number => c.value(a).localeCompare(c.value(b), undefined, { numeric: true }),
      }),
  ),
  ...(actions
    ? [
        new TableColumn<T, ActionsCellData>('Actions', {
          align: 'right',
          width: actionsWidth,
          renderer: ActionsCell,
          overflow: true,
          renderMapping: actions,
        }),
      ]
    : []),
]);

const row = new TableRow<T>({ selectable: (): boolean => false });

function label(r: T): string {
  return name(r).title;
}

function reset(): void {
  onResetFilter?.();
}
</script>

<div class="flex min-w-full grow">
  {#if rows.length === 0}
    {#if (total ?? 0) > 0}
      <FilteredEmptyScreen icon={icon ?? undefined} {kind} searchTerm={searchTerm} onResetFilter={reset} />
    {:else}
      <EmptyScreen icon={icon ?? undefined} title={emptyTitle ?? `No ${kind}`} message={emptyMessage} />
    {/if}
  {:else}
    {#key tableColumns}
      <Table {kind} data={rows} columns={tableColumns} {row} defaultSortColumn={nameTitle} {key} {label} />
    {/key}
  {/if}
</div>
