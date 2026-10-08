<script lang="ts">
/** AMQ Broker › Queues (P2): `artemis queue stat` as a table; `?queue=` browses messages. */
import { faBroom, faEnvelope, faEye, faInbox, faPaperPlane, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { EmptyScreen, FilteredEmptyScreen, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import StatusCell from '#lib/table/StatusCell.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';

import { purgeQueue, retryAll, sendTestMessage } from '../actions.ts';
import { broker, type Queue, type RoutingType } from '../data.ts';
import QueueDetails from './QueueDetails.svelte';
import RoutingTypeCell from './RoutingTypeCell.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
const queueName = $derived(page.url.searchParams.get('queue'));
const data = $derived(broker(conn.id));
const all = $derived(data.queues);
const rows = $derived(all.filter(q => `${q.name} ${q.address}`.toLowerCase().includes(searchTerm.toLowerCase())));
const selected = $derived(queueName ? all.find(q => q.name === queueName) : undefined);

function nf(n: number): string {
  return n.toLocaleString('en-US');
}

function browse(q: Queue): void {
  navigate(`/c/${conn.id}/queues?queue=${encodeURIComponent(q.name)}`);
}

function actions(q: Queue): ActionsCellData {
  return {
    buttons: [
      { title: 'Send test message', icon: faPaperPlane, onClick: (): void => sendTestMessage(conn.id, q) },
      { title: 'Browse messages', icon: faEye, onClick: (): void => browse(q) },
    ],
    menu: [
      { title: 'Retry all', icon: faRotateRight, onClick: (): void => retryAll(data, q), hidden: q.name !== 'DLQ', enabled: q.messageCount > 0 },
      { title: 'Purge', icon: faBroom, onClick: (): void => purgeQueue(q), enabled: q.messageCount > 0 },
    ],
  };
}

const columns = [
  new TableColumn<Queue, StatusCellData>('Status', {
    align: 'center',
    width: '70px',
    renderer: StatusCell,
    renderMapping: (q): StatusCellData => ({ status: q.paused ? 'PAUSED' : q.consumerCount > 0 ? 'RUNNING' : 'EXITED', icon: faInbox }),
  }),
  new TableColumn<Queue, NameCellData>('Name', {
    width: '2fr',
    renderer: NameCell,
    renderMapping: (q): NameCellData => ({
      title: q.name,
      sub: q.messagesAdded ? [`${nf(q.messagesAdded)} added · ${nf(q.messagesAcknowledged)} acked`] : [],
      href: `/c/${conn.id}/queues?queue=${encodeURIComponent(q.name)}`,
    }),
    comparator: (a, b): number => a.name.localeCompare(b.name),
  }),
  new TableColumn<Queue, string>('Address', { width: '1.4fr', renderer: TableSimpleColumn, renderMapping: (q): string => q.address, comparator: (a, b): number => a.address.localeCompare(b.address) }),
  new TableColumn<Queue, RoutingType[]>('Routing type', { width: '120px', renderer: RoutingTypeCell, renderMapping: (q): RoutingType[] => [q.routingType] }),
  new TableColumn<Queue, string>('Durable', { width: '80px', renderer: TableSimpleColumn, renderMapping: (q): string => (q.durable ? 'Yes' : 'No') }),
  new TableColumn<Queue, string>('Messages', { width: '90px', renderer: TableSimpleColumn, renderMapping: (q): string => nf(q.messageCount), comparator: (a, b): number => a.messageCount - b.messageCount }),
  new TableColumn<Queue, string>('Consumers', { width: '90px', renderer: TableSimpleColumn, renderMapping: (q): string => String(q.consumerCount), comparator: (a, b): number => a.consumerCount - b.consumerCount }),
  new TableColumn<Queue, string>('Delivering', { width: '90px', renderer: TableSimpleColumn, renderMapping: (q): string => String(q.deliveringCount) }),
  new TableColumn<Queue, ActionsCellData>('Actions', { align: 'right', width: '120px', renderer: ActionsCell, overflow: true, renderMapping: actions }),
];

const row = new TableRow<Queue>({ selectable: (): boolean => false });

function key(q: Queue): string {
  return q.name;
}

function label(q: Queue): string {
  return q.name;
}

function reset(): void {
  searchTerm = '';
}
</script>

{#if selected}
  {#key selected.name}
    <QueueDetails {conn} broker={data} queue={selected} />
  {/key}
{:else}
  <NavPage bind:searchTerm={searchTerm} title="queues">
    {#snippet content()}
      {#if conn.status !== 'started'}
        <ConnectionStoppedScreen {conn} kind="queues" />
      {:else}
        <div class="flex min-w-full grow">
          {#if rows.length === 0}
            {#if all.length > 0}
              <FilteredEmptyScreen icon={faEnvelope} kind="queues" {searchTerm} onResetFilter={reset} />
            {:else}
              <EmptyScreen icon={faEnvelope} title="No queues" message="Create an address with a queue, or let a JMS client auto-create one." />
            {/if}
          {:else}
            <Table kind="queues" data={rows} {columns} {row} defaultSortColumn="Name" {key} {label} />
          {/if}
        </div>
      {/if}
    {/snippet}
  </NavPage>
{/if}
