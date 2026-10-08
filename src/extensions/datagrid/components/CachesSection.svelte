<script lang="ts">
/** Data Grid › Caches (P2): REST v2 detailed list + stats; create / clear / reset stats / delete as tasks. */
import { faDatabase, faEraser, faPlusCircle, faRotateLeft, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, Checkbox, Dropdown, Input, NavPage } from '@podman-desktop/ui-svelte';

import { confirm, withConfirmation } from '#lib/confirm.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';
import { runTask } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import DataTable from '../../_appdev/DataTable.svelte';
import type { DataColumn } from '../../_appdev/types.ts';
import { type Cache, type CacheType, DG_EXT, ensureGrid, grid, hitRatio } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
let showInternal = $state(false);
let creating = $state(false);
let form = $state({ name: 'shipping-quotes', type: 'distributed-cache', mode: 'SYNC', owners: '1', encoding: 'application/x-protostream', statistics: true });

const data = $derived(grid(conn.id));
const all = $derived(data.caches.filter(c => showInternal || !c.internal));
const rows = $derived(all.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())));
const nameTaken = $derived(data.caches.some(c => c.name === form.name.trim()));

const TYPES = [
  { value: 'distributed-cache', label: 'Distributed' },
  { value: 'replicated-cache', label: 'Replicated' },
  { value: 'local-cache', label: 'Local' },
  { value: 'invalidation-cache', label: 'Invalidation' },
];
const MODES = [
  { value: 'SYNC', label: 'SYNC' },
  { value: 'ASYNC', label: 'ASYNC' },
];
const ENCODINGS = [
  { value: 'application/x-protostream', label: 'application/x-protostream' },
  { value: 'application/json', label: 'application/json' },
  { value: 'text/plain', label: 'text/plain' },
];

function nf(n: number): string {
  return n.toLocaleString('en-US');
}

function key(c: Cache): string {
  return c.name;
}

function nameOf(c: Cache): NameCellData {
  return { title: c.name, sub: [c.internal ? 'internal' : '', c.persistent ? 'persistent' : '', c.bounded ? 'bounded' : '', c.indexed ? 'indexed' : ''].filter(Boolean) };
}

function status(c: Cache): StatusCellData {
  return { status: c.health === 'HEALTHY' ? 'RUNNING' : c.health === 'FAILED' ? 'EXITED' : 'DEGRADED', icon: faDatabase };
}

const columns: DataColumn<Cache>[] = [
  { title: 'Type', width: '110px', value: (c): string => c.type.replace('-cache', '') },
  { title: 'Mode', width: '70px', value: (c): string => c.mode ?? '–' },
  { title: 'Owners', width: '70px', value: (c): string => (c.owners ? String(c.owners) : '–') },
  { title: 'Encoding', width: '1.3fr', value: (c): string => c.encoding },
  { title: 'Entries', width: '90px', value: (c): string => nf(c.entries) },
  { title: 'Hit ratio', width: '90px', value: hitRatio },
  { title: 'Health', width: '110px', value: (c): string => c.health },
];

function clear(c: Cache): void {
  confirm({
    title: 'Clear cache?',
    message: `Are you sure you want to clear cache ${c.name}? ${nf(c.entries)} entries will be removed.`,
    buttonLabel: 'Clear',
    variant: 'danger',
  })
    .then(ok => {
      if (!ok) return;
      runTask({
        name: `Clear cache ${c.name}`,
        ext: DG_EXT,
        steps: [{ label: `POST /rest/v2/caches/${c.name}?action=clear`, ms: 700, log: ['HTTP/1.1 204 No Content'] }],
        onDone: () => {
          c.entries = 0;
        },
      });
    })
    .catch(console.error);
}

function resetStats(c: Cache): void {
  runTask({
    name: `Reset statistics of ${c.name}`,
    ext: DG_EXT,
    steps: [{ label: `POST /rest/v2/caches/${c.name}?action=stats-reset`, ms: 500, log: ['HTTP/1.1 204 No Content'] }],
    onDone: () => {
      c.hits = 0;
      c.misses = 0;
      c.stores = 0;
    },
  });
}

function remove(c: Cache): void {
  withConfirmation(
    () =>
      runTask({
        name: `Delete cache ${c.name}`,
        ext: DG_EXT,
        steps: [{ label: `DELETE /rest/v2/caches/${c.name}`, ms: 800, log: ['HTTP/1.1 204 No Content'] }],
        onDone: () => {
          const g = ensureGrid(conn.id);
          g.caches = g.caches.filter(x => x.name !== c.name);
        },
      }),
    `delete cache ${c.name}`,
    'Delete cache?',
  );
}

function actions(c: Cache): ActionsCellData {
  return {
    buttons: [{ title: 'Clear', icon: faEraser, onClick: (): void => clear(c), enabled: c.entries > 0 && !c.internal }],
    menu: [
      { title: 'Reset stats', icon: faRotateLeft, onClick: (): void => resetStats(c), enabled: c.statistics },
      { title: 'Delete', icon: faTrash, onClick: (): void => remove(c), hidden: c.internal },
    ],
  };
}

function openForm(): void {
  creating = true;
}

function closeForm(): void {
  creating = false;
}

function onName(e: Event): void {
  form.name = (e.currentTarget as HTMLInputElement).value;
}

function onOwners(e: Event): void {
  form.owners = (e.currentTarget as HTMLInputElement).value;
}

function onType(v: string): void {
  form.type = v;
}

function onMode(v: string): void {
  form.mode = v;
}

function onEncoding(v: string): void {
  form.encoding = v;
}

function onStats(checked: boolean): void {
  form.statistics = checked;
}

function create(): void {
  const spec = { ...form, name: form.name.trim() };
  const type = spec.type as CacheType;
  const clustered = type !== 'local-cache';
  const body = { [type]: { ...(clustered ? { mode: spec.mode } : {}), ...(type === 'distributed-cache' ? { owners: Number(spec.owners) } : {}), statistics: spec.statistics, encoding: { 'media-type': spec.encoding } } };
  creating = false;
  runTask({
    name: `Create cache ${spec.name}`,
    ext: DG_EXT,
    steps: [{ label: `POST /rest/v2/caches/${spec.name}`, ms: 1000, log: [JSON.stringify(body), 'HTTP/1.1 200 OK'] }],
    onDone: () => {
      const g = ensureGrid(conn.id);
      if (g.caches.some(c => c.name === spec.name)) return;
      g.caches.push({
        name: spec.name,
        type,
        mode: clustered ? (spec.mode as 'SYNC' | 'ASYNC') : undefined,
        owners: type === 'distributed-cache' ? Number(spec.owners) : undefined,
        encoding: spec.encoding,
        statistics: spec.statistics,
        health: 'HEALTHY',
        persistent: false,
        bounded: false,
        indexed: false,
        entries: 0,
        hits: 0,
        misses: 0,
        stores: 0,
      });
    },
  });
}

function toggleInternal(): void {
  showInternal = !showInternal;
}

function reset(): void {
  searchTerm = '';
}
</script>

<NavPage bind:searchTerm={searchTerm} title="caches">
  {#snippet additionalActions()}
    {#if conn.status === 'started'}
      <Button type="secondary" onclick={toggleInternal}>{showInternal ? 'Hide internal caches' : 'Show internal caches'}</Button>
      <Button icon={faPlusCircle} onclick={openForm} disabled={creating}>Create cache</Button>
    {/if}
  {/snippet}
  {#snippet content()}
    {#if conn.status !== 'started'}
      <ConnectionStoppedScreen {conn} kind="caches" />
    {:else}
      <div class="flex flex-col w-full h-full">
        {#if creating}
          <div class="px-5 pb-3">
            <Card title="Create cache" subtitle="POST /rest/v2/caches/{form.name || '<name>'} on {data.nodeName}">
              <div class="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-3 items-end">
                <label class="flex flex-col gap-1 text-sm" for="dg-name">Name
                  <Input id="dg-name" value={form.name} oninput={onName} aria-label="Cache name" error={nameTaken ? 'A cache with this name already exists' : undefined} />
                </label>
                <div class="flex flex-col gap-1 text-sm"><span>Type</span><Dropdown id="dg-type" ariaLabel="Cache type" value={form.type} options={TYPES} onChange={onType} /></div>
                <div class="flex flex-col gap-1 text-sm"><span>Encoding</span><Dropdown id="dg-encoding" ariaLabel="Encoding" value={form.encoding} options={ENCODINGS} onChange={onEncoding} /></div>
                {#if form.type !== 'local-cache'}
                  <div class="flex flex-col gap-1 text-sm"><span>Mode</span><Dropdown id="dg-mode" ariaLabel="Mode" value={form.mode} options={MODES} onChange={onMode} /></div>
                {/if}
                {#if form.type === 'distributed-cache'}
                  <label class="flex flex-col gap-1 text-sm" for="dg-owners">Owners
                    <Input id="dg-owners" type="number" min={1} max={3} value={form.owners} oninput={onOwners} aria-label="Owners" />
                  </label>
                {/if}
                <Checkbox checked={form.statistics} onclick={onStats}>Enable statistics</Checkbox>
              </div>
              <div class="flex justify-end gap-2 mt-4">
                <Button type="link" onclick={closeForm}>Cancel</Button>
                <Button onclick={create} disabled={!form.name.trim() || nameTaken}>Create</Button>
              </div>
            </Card>
          </div>
        {/if}
        <DataTable kind="caches" nameWidth="1.8fr" {rows} total={all.length} {searchTerm} onResetFilter={reset} {key} name={nameOf} {status} {columns} {actions} emptyMessage="Create a cache, or let your application create one on first use." />
      </div>
    {/if}
  {/snippet}
</NavPage>
