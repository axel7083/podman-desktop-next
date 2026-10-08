<script lang="ts">
/** acme-prod › Inventories (GET /api/controller/v2/inventories/). */
import { faExternalLinkSquareAlt } from '@fortawesome/free-solid-svg-icons';
import { FilteredEmptyScreen, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import type { ConnectionView } from '#lib/ext/types.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import type { ActionsCellData, NameCellData } from '#lib/table/types.ts';
import { toast } from '#lib/world.svelte.ts';

import { AAP_URL, type Inventory, store } from '../data.ts';
import StatusDot from './StatusDot.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const { inventories } = store();
let searchTerm = $state('');
const filtered = $derived(inventories.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())));

const KIND: Record<Inventory['kind'], string> = { '': 'Inventory', smart: 'Smart inventory', constructed: 'Constructed inventory' };

function openInAap(i: Inventory): void {
  toast({ type: 'info', title: 'Opening AAP', body: `${AAP_URL}/execution/infrastructure/inventories/inventory/${i.id}/details` });
}

function resetFilter(): void {
  searchTerm = '';
}

const columns = [
  new TableColumn<Inventory, { status: string }>('Sync status', {
    width: '140px',
    renderer: StatusDot,
    renderMapping: (i): { status: string } => ({ status: i.hosts_with_active_failures ? 'failed' : 'successful' }),
  }),
  new TableColumn<Inventory, NameCellData>('Name', {
    width: '2fr',
    renderer: NameCell,
    renderMapping: (i): NameCellData => ({ title: i.name, sub: [KIND[i.kind], i.organization] }),
    comparator: (a, b): number => a.name.localeCompare(b.name),
  }),
  new TableColumn<Inventory, string>('Hosts', { renderer: TableSimpleColumn, renderMapping: (i): string => String(i.total_hosts) }),
  new TableColumn<Inventory, string>('Failed hosts', { renderer: TableSimpleColumn, renderMapping: (i): string => String(i.hosts_with_active_failures) }),
  new TableColumn<Inventory, string>('Groups', { renderer: TableSimpleColumn, renderMapping: (i): string => String(i.total_groups) }),
  new TableColumn<Inventory, string>('Sources', { renderer: TableSimpleColumn, renderMapping: (i): string => (i.has_inventory_sources ? 'Yes' : 'No') }),
  new TableColumn<Inventory, ActionsCellData>('Actions', {
    align: 'right',
    width: '80px',
    renderer: ActionsCell,
    overflow: true,
    renderMapping: (i): ActionsCellData => ({ buttons: [{ title: 'Open in AAP', icon: faExternalLinkSquareAlt, onClick: (): void => openInAap(i) }], menu: [] }),
  }),
];

const row = new TableRow<Inventory>({});

function key(i: Inventory): string {
  return String(i.id);
}

function label(i: Inventory): string {
  return i.name;
}
</script>

<NavPage bind:searchTerm={searchTerm} title="Inventories">
  {#snippet content()}
    <div class="flex min-w-full grow">
      {#if conn.status !== 'started'}
        <ConnectionStoppedScreen {conn} kind="inventories" />
      {:else if filtered.length === 0}
        <FilteredEmptyScreen kind="inventories" {searchTerm} onResetFilter={resetFilter} />
      {:else}
        <Table kind="aap inventories" data={filtered} {columns} {row} defaultSortColumn="Name" {key} {label} />
      {/if}
    </div>
  {/snippet}
</NavPage>
