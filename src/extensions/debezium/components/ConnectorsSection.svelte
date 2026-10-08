<script lang="ts">
/** Kafka › Connectors (contributed by Debezium): Kafka Connect connectors with status, tasks and trace. */
import { faArrowRightArrowLeft, faArrowsRotate, faPause, faPlay, faTrash } from '@fortawesome/free-solid-svg-icons';
import { NavPage } from '@podman-desktop/ui-svelte';

import { withConfirmation } from '#lib/confirm.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';
import { runTask, toast } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import DataTable from '../../_appdev/DataTable.svelte';
import type { DataColumn } from '../../_appdev/types.ts';
import { type Connector, DBZ_EXT, ensureStore, store } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
const all = $derived(store().connectors.filter(c => c.kafka === conn.id));
const rows = $derived(all.filter(c => c.name.includes(searchTerm.toLowerCase())));
const failed = $derived(all.filter(c => c.tasks.some(t => t.state === 'FAILED')));

function key(c: Connector): string {
  return c.name;
}

function effective(c: Connector): string {
  return c.tasks.some(t => t.state === 'FAILED') ? 'FAILED' : c.state;
}

function nameOf(c: Connector): NameCellData {
  return { title: c.name, sub: [c.config['connector.class'].split('.').pop() ?? '', `${c.database} → ${c.topics.join(', ')}`] };
}

function status(c: Connector): StatusCellData {
  const s = effective(c);
  return { status: s === 'RUNNING' ? 'RUNNING' : s === 'FAILED' ? 'DEGRADED' : 'PAUSED', icon: faArrowRightArrowLeft };
}

const columns: DataColumn<Connector>[] = [
  { title: 'State', width: '100px', value: (c): string => effective(c) },
  { title: 'Tasks', width: '90px', value: (c): string => `${c.tasks.filter(t => t.state === 'RUNNING').length}/${c.tasks.length}` },
  { title: 'Snapshot', width: '110px', value: (c): string => c.config['snapshot.mode'] },
];

function mutate(name: string, fn: (c: Connector) => void): void {
  const c = ensureStore().connectors.find(x => x.name === name);
  if (c) fn(c);
}

function pause(c: Connector): void {
  mutate(c.name, x => {
    x.state = 'PAUSED';
    x.tasks.forEach(t => (t.state = 'PAUSED'));
  });
  toast({ type: 'info', title: `Connector ${c.name} paused`, body: 'The replication slot retains WAL while paused.' });
}

function resume(c: Connector): void {
  mutate(c.name, x => {
    x.state = 'RUNNING';
    x.tasks.forEach(t => (t.state = 'RUNNING'));
  });
}

function restart(c: Connector): void {
  runTask({
    name: `Restart connector ${c.name}`,
    ext: DBZ_EXT,
    steps: [
      ...(c.tasks.some(t => t.state === 'FAILED') ? [{ label: 'PUT /connectors/' + c.name + '/config slot.name=inventory_slot', ms: 600, log: ['Replication slot "debezium" is used by another connector: using inventory_slot'] }] : []),
      { label: `POST /connectors/${c.name}/restart?includeTasks=true`, ms: 900 },
    ],
    onDone: () =>
      mutate(c.name, x => {
        x.state = 'RUNNING';
        x.config['slot.name'] = x.config['slot.name'] === 'debezium' ? 'inventory_slot' : x.config['slot.name'];
        x.tasks = x.tasks.map(t => ({ id: t.id, state: 'RUNNING' }));
      }),
  });
}

function remove(c: Connector): void {
  withConfirmation(
    () => {
      ensureStore().connectors = ensureStore().connectors.filter(x => x.name !== c.name);
      toast({ type: 'success', title: `Connector ${c.name} deleted` });
    },
    `delete connector ${c.name}`,
    'Delete connector?',
  );
}

function actions(c: Connector): ActionsCellData {
  return {
    buttons: [
      { title: 'Pause connector', icon: faPause, onClick: (): void => pause(c), hidden: c.state !== 'RUNNING' },
      { title: 'Resume connector', icon: faPlay, onClick: (): void => resume(c), hidden: c.state === 'RUNNING' },
      { title: 'Restart connector', icon: faArrowsRotate, onClick: (): void => restart(c) },
      { title: 'Delete connector', icon: faTrash, onClick: (): void => remove(c) },
    ],
    menu: [],
  };
}

function reset(): void {
  searchTerm = '';
}
</script>

<NavPage bind:searchTerm={searchTerm} title="connectors">
  {#snippet content()}
    {#if conn.status !== 'started'}
      <ConnectionStoppedScreen {conn} kind="connectors" />
    {:else}
      <div class="flex flex-col w-full">
        {#each failed as c (c.name)}
          <div class="mx-5 mb-2">
            <Card>
              <div class="text-sm" role="alert">
                <span class="font-semibold text-[var(--pd-state-error)]">Task 0 of {c.name} FAILED</span>
                <pre class="mt-1 text-xs font-mono whitespace-pre-wrap">{c.tasks.find(t => t.trace)?.trace}</pre>
                <p class="mt-1">Fix: give the connector its own slot (<code>slot.name=inventory_slot</code>) and restart it.</p>
              </div>
            </Card>
          </div>
        {/each}
        <DataTable kind="connectors" {rows} total={all.length} {searchTerm} onResetFilter={reset} {key} name={nameOf} {status} {columns} {actions} actionsWidth="160px" emptyMessage="Use 'Capture changes with Debezium' on a PostgreSQL container to create a connector." />
      </div>
    {/if}
  {/snippet}
</NavPage>
