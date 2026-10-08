<script lang="ts">
/**
 * Generic Kubernetes list (PD kube pages: Status / Name+namespace / kind
 * columns / Age / Actions). Reusable by extensions for their CRDs (P4):
 * `<KubeResourceList {conn} title="InferenceServices" kinds={['InferenceService']} columns={…} />`.
 */
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { EmptyScreen, FilteredEmptyScreen, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';
import type { Component, Snippet } from 'svelte';

import { withConfirmation } from '#lib/confirm.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import KubeIcon from '#lib/images/KubeIcon.svelte';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';
import { type KubeObject, world } from '#lib/world.svelte.ts';

import ConnectionStoppedScreen from './ConnectionStoppedScreen.svelte';
import { kubeColumns, kubeStatus } from './kube.ts';

interface Props {
  conn: ConnectionView;
  title: string;
  kinds: string[];
  icon?: Component;
  /** Extra columns (defaults per kind from kube.ts). */
  columns?: { title: string; width?: string; value: (o: KubeObject) => string }[];
  additionalActions?: Snippet;
}

let { conn, title, kinds, icon = KubeIcon, columns: extraColumns, additionalActions }: Props = $props();

let searchTerm = $state('');
let selectedItemsNumber = $state(0);

const objects = $derived(
  (world.kube[conn.id] ?? []).filter(o => kinds.includes(o.kind)),
);
const filtered = $derived(objects.filter(o => o.metadata.name.toLowerCase().includes(searchTerm.toLowerCase())));
const extra = $derived(extraColumns ?? kubeColumns(kinds));

function age(o: KubeObject): string {
  const ms = Date.now() - new Date(o.metadata.creationTimestamp).getTime();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function remove(o: KubeObject): void {
  withConfirmation(
    () => (world.kube[conn.id] = (world.kube[conn.id] ?? []).filter(x => x.metadata.uid !== o.metadata.uid)),
    `delete ${o.kind.toLowerCase()} ${o.metadata.name}`,
    `Delete ${o.kind.toLowerCase()}?`,
  );
}

const columns = $derived([
  new TableColumn<KubeObject, StatusCellData>('Status', {
    align: 'center',
    width: '70px',
    renderer: StatusCell,
    renderMapping: (o): StatusCellData => ({ status: kubeStatus(o), icon }),
    comparator: (a, b): number => kubeStatus(a).localeCompare(kubeStatus(b)),
  }),
  new TableColumn<KubeObject, NameCellData>('Name', {
    width: '2fr',
    renderer: NameCell,
    renderMapping: (o): NameCellData => ({
      title: o.metadata.name,
      sub: [kinds.length > 1 ? o.kind : '', o.metadata.namespace ?? ''].filter(Boolean),
      href: `/c/${conn.id}/kube/${o.kind}~${o.metadata.namespace ?? '_'}~${o.metadata.name}/summary`,
    }),
    comparator: (a, b): number => a.metadata.name.localeCompare(b.metadata.name),
  }),
  ...extra.map(
    c =>
      new TableColumn<KubeObject, string>(c.title, {
        width: c.width ?? '1fr',
        renderer: TableSimpleColumn,
        renderMapping: (o): string => c.value(o),
      }),
  ),
  new TableColumn<KubeObject, string>('Age', {
    renderer: TableSimpleColumn,
    renderMapping: age,
    comparator: (a, b): number => b.metadata.creationTimestamp.localeCompare(a.metadata.creationTimestamp),
  }),
  new TableColumn<KubeObject, ActionsCellData>('Actions', {
    align: 'right',
    width: '80px',
    renderer: ActionsCell,
    overflow: true,
    renderMapping: (o): ActionsCellData => ({
      buttons: [{ title: `Delete ${o.kind}`, icon: faTrash, onClick: (): void => remove(o) }],
      menu: [],
    }),
  }),
]);

const row = new TableRow<KubeObject>({ selectable: (): boolean => true });

function key(o: KubeObject): string {
  return o.metadata.uid;
}

function label(o: KubeObject): string {
  return o.metadata.name;
}

function resetFilter(): void {
  searchTerm = '';
}
</script>

<NavPage bind:searchTerm={searchTerm} {title} {additionalActions}>
  {#snippet bottomAdditionalActions()}
    {#if selectedItemsNumber > 0}<span>On {selectedItemsNumber} selected items.</span>{/if}
  {/snippet}
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if conn.status !== 'started'}
        <ConnectionStoppedScreen {conn} kind={title.toLowerCase()} />
      {:else if filtered.length === 0}
        {#if objects.length}
          <FilteredEmptyScreen {icon} kind={title.toLowerCase()} {searchTerm} onResetFilter={resetFilter} />
        {:else}
          <EmptyScreen {icon} title="No {title.toLowerCase()}" message="No {kinds.join(', ')} objects found in {conn.name}." />
        {/if}
      {:else}
        {#key columns}
          <Table kind="kube-{kinds.join('-')}" bind:selectedItemsNumber={selectedItemsNumber} data={filtered} {columns} {row} defaultSortColumn="Name" {key} {label} />
        {/key}
      {/if}
    </div>
  {/snippet}
</NavPage>
