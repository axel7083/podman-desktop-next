<script lang="ts">
/** AMQ Broker › Addresses (P2): `listAddresses` with routing types and bound queues; create address + queue. */
import { faPlusCircle, faSitemap, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, EmptyScreen, FilteredEmptyScreen, Input, NavPage, Table, TableColumn, TableRow, TableSimpleColumn } from '@podman-desktop/ui-svelte';

import { withConfirmation } from '#lib/confirm.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import NameCell from '#lib/table/NameCell.svelte';
import type { ActionsCellData, NameCellData } from '#lib/table/types.ts';
import { runTask } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import { type Address, AMQ_EXT, broker, ensureBroker, type RoutingType } from '../data.ts';
import RoutingTypeCell from './RoutingTypeCell.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
let creating = $state(false);
let newName = $state('inventory.backorders');
let newRouting = $state<RoutingType>('ANYCAST');

const data = $derived(broker(conn.id));
const all = $derived(data.addresses);
const rows = $derived(all.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())));
const nameTaken = $derived(all.some(a => a.name === newName.trim()));

const ROUTING = [
  { value: 'ANYCAST', label: 'ANYCAST (point-to-point, JMS queue)' },
  { value: 'MULTICAST', label: 'MULTICAST (publish-subscribe, JMS topic)' },
];

function queuesOf(a: Address): string[] {
  return data.queues.filter(q => q.address === a.name).map(q => q.name);
}

function messagesOf(a: Address): number {
  return data.queues.filter(q => q.address === a.name).reduce((s, q) => s + q.messageCount, 0);
}

function remove(a: Address): void {
  withConfirmation(
    () =>
      runTask({
        name: `Delete address ${a.name}`,
        ext: AMQ_EXT,
        steps: [{ label: `artemis address delete --name ${a.name}`, ms: 700, log: [`Address ${a.name} deleted successfully.`] }],
        onDone: () => {
          const b = ensureBroker(conn.id);
          b.addresses = b.addresses.filter(x => x.name !== a.name);
          b.queues = b.queues.filter(q => q.address !== a.name);
        },
      }),
    `delete address ${a.name} and its queues`,
    'Delete address?',
  );
}

function actions(a: Address): ActionsCellData {
  const system = a.name === 'DLQ' || a.name === 'ExpiryQueue';
  return { buttons: [{ title: 'Delete address', icon: faTrash, onClick: (): void => remove(a), enabled: !system && messagesOf(a) === 0 }], menu: [] };
}

const columns = [
  new TableColumn<Address, NameCellData>('Name', {
    width: '2fr',
    renderer: NameCell,
    renderMapping: (a): NameCellData => ({ title: a.name, sub: [`queues: ${queuesOf(a).join(', ') || 'none'}`], href: queuesOf(a).length === 1 ? `/c/${conn.id}/queues?queue=${encodeURIComponent(queuesOf(a)[0])}` : undefined }),
    comparator: (a, b): number => a.name.localeCompare(b.name),
  }),
  new TableColumn<Address, RoutingType[]>('Routing types', { width: '160px', renderer: RoutingTypeCell, renderMapping: (a): RoutingType[] => a.routingTypes }),
  new TableColumn<Address, string>('Queues', { width: '90px', renderer: TableSimpleColumn, renderMapping: (a): string => String(queuesOf(a).length) }),
  new TableColumn<Address, string>('Messages', { width: '100px', renderer: TableSimpleColumn, renderMapping: (a): string => String(messagesOf(a)) }),
  new TableColumn<Address, ActionsCellData>('Actions', { align: 'right', width: '90px', renderer: ActionsCell, overflow: true, renderMapping: actions }),
];

const row = new TableRow<Address>({ selectable: (): boolean => false });

function key(a: Address): string {
  return a.name;
}

function label(a: Address): string {
  return a.name;
}

function reset(): void {
  searchTerm = '';
}

function openForm(): void {
  creating = true;
}

function closeForm(): void {
  creating = false;
}

function onName(e: Event): void {
  newName = (e.currentTarget as HTMLInputElement).value;
}

function onRouting(v: string): void {
  newRouting = v as RoutingType;
}

function create(): void {
  const name = newName.trim();
  const rt = newRouting;
  const flag = rt === 'ANYCAST' ? '--anycast' : '--multicast';
  creating = false;
  runTask({
    name: `Create address ${name}`,
    ext: AMQ_EXT,
    steps: [
      { label: `artemis address create --name ${name} ${flag}`, ms: 700, log: [`Address ${name} created successfully.`] },
      { label: `artemis queue create --name ${name} --address ${name} ${flag} --durable --auto-create-address=false`, ms: 900, log: [`Queue [name=${name}, address=${name}, routingType=${rt}, durable=true] created successfully.`] },
    ],
    onDone: () => {
      const b = ensureBroker(conn.id);
      if (b.addresses.some(a => a.name === name)) return;
      b.addresses.unshift({ name, routingTypes: [rt] });
      b.queues.unshift({ name, address: name, routingType: rt, durable: true, messageCount: 0, consumerCount: 0, deliveringCount: 0, messagesAdded: 0, messagesAcknowledged: 0, scheduledCount: 0, paused: false, messages: [] });
    },
  });
}
</script>

<NavPage bind:searchTerm={searchTerm} title="addresses">
  {#snippet additionalActions()}
    {#if conn.status === 'started'}
      <Button icon={faPlusCircle} onclick={openForm} disabled={creating}>Create address</Button>
    {/if}
  {/snippet}
  {#snippet content()}
    {#if conn.status !== 'started'}
      <ConnectionStoppedScreen {conn} kind="addresses" />
    {:else}
      <div class="flex flex-col w-full h-full">
        {#if creating}
          <div class="px-5 pb-3">
            <Card title="Create address" subtitle="Creates the address and a durable queue with the same name">
              <div class="grid grid-cols-2 gap-3 items-end">
                <label class="flex flex-col gap-1 text-sm" for="amq-address">Name
                  <Input id="amq-address" value={newName} oninput={onName} aria-label="Address name" error={nameTaken ? 'An address with this name already exists' : undefined} />
                </label>
                <div class="flex flex-col gap-1 text-sm"><span>Routing type</span><Dropdown id="amq-routing" ariaLabel="Routing type" value={newRouting} options={ROUTING} onChange={onRouting} /></div>
              </div>
              <div class="flex justify-end gap-2 mt-4">
                <Button type="link" onclick={closeForm}>Cancel</Button>
                <Button onclick={create} disabled={!newName.trim() || nameTaken}>Create</Button>
              </div>
            </Card>
          </div>
        {/if}
        <div class="flex min-w-full grow">
          {#if rows.length === 0}
            {#if all.length > 0}
              <FilteredEmptyScreen icon={faSitemap} kind="addresses" {searchTerm} onResetFilter={reset} />
            {:else}
              <EmptyScreen icon={faSitemap} title="No addresses" message="Create an address to start sending messages." />
            {/if}
          {:else}
            <Table kind="addresses" data={rows} {columns} {row} defaultSortColumn="Name" {key} {label} />
          {/if}
        </div>
      </div>
    {/if}
  {/snippet}
</NavPage>
