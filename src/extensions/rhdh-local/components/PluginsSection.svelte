<script lang="ts">
/**
 * Developer Hub › Plugins (P2): `dynamic-plugins.override.yaml`. Adding or
 * toggling a plugin writes the file; "Install plugins" re-runs the
 * install-dynamic-plugins compose service and restarts rhdh (P15).
 */
import { faDownload, faPlusCircle, faPuzzlePiece, faToggleOff, faToggleOn, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, Input, NavPage } from '@podman-desktop/ui-svelte';

import { withConfirmation } from '#lib/confirm.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';
import { type Container, later, runTask, world } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import DataTable from '../../_appdev/DataTable.svelte';
import type { DataColumn } from '../../_appdev/types.ts';
import { COMPOSE_PROJECT, COMPOSE_SERVICE, type DynamicPlugin, ensureHub, hub, overrideYaml, pluginName, pluginSource, RHDH_EXT } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const DEFAULT_REF = 'oci://quay.io/acme/backstage-plugin-kafka-topics:0.4.0!acme-plugin-kafka-topics';

let searchTerm = $state('');
let adding = $state(false);
let ref = $state(DEFAULT_REF);
let showFile = $state(false);

const plugins = $derived(hub(conn.id).plugins);
const rows = $derived(plugins.filter(p => p.package.toLowerCase().includes(searchTerm.toLowerCase())));
const pending = $derived(plugins.filter(p => p.pending).length);
const project = $derived(conn.id === 'developer-hub' ? 'rhdh-local' : conn.id);
const installing = $derived(world.tasks.some(t => t.ext === RHDH_EXT && t.status === 'in-progress' && t.name.startsWith('Install plugins')));
const refValid = $derived(/^oci:\/\/[^\s!]+:[^\s!]+![a-z0-9@./-]+$/i.test(ref.trim()) || ref.trim().startsWith('./'));
const refTaken = $derived(plugins.some(p => p.package === ref.trim()));

function key(p: DynamicPlugin): string {
  return p.package;
}

function nameOf(p: DynamicPlugin): NameCellData {
  return { title: pluginName(p), sub: [p.package, ...(p.pending ? ['pending install'] : [])] };
}

function status(p: DynamicPlugin): StatusCellData {
  return { status: p.pending ? 'STARTING' : p.disabled ? 'EXITED' : 'RUNNING', icon: faPuzzlePiece };
}

const columns: DataColumn<DynamicPlugin>[] = [
  { title: 'Source', width: '110px', value: pluginSource },
  { title: 'State', width: '110px', value: (p): string => (p.disabled ? 'Disabled' : 'Enabled') },
  { title: 'Route', width: '110px', value: (p): string => p.route ?? '–' },
];

function toggle(p: DynamicPlugin): void {
  p.disabled = !p.disabled;
  p.pending = true;
}

function remove(p: DynamicPlugin): void {
  withConfirmation(
    () => {
      const h = ensureHub(conn.id);
      h.plugins = h.plugins.filter(x => x.package !== p.package);
    },
    `remove plugin ${pluginName(p)} from dynamic-plugins.override.yaml`,
    'Remove plugin?',
    'Remove',
  );
}

function actions(p: DynamicPlugin): ActionsCellData {
  return {
    buttons: [{ title: p.disabled ? 'Enable' : 'Disable', icon: p.disabled ? faToggleOff : faToggleOn, onClick: (): void => toggle(p) }],
    menu: [{ title: 'Remove', icon: faTrash, onClick: (): void => remove(p), hidden: pluginSource(p) === 'Bundled' }],
  };
}

function openAdd(): void {
  adding = true;
}

function closeAdd(): void {
  adding = false;
}

function onRef(e: Event): void {
  ref = (e.currentTarget as HTMLInputElement).value;
}

function add(): void {
  const h = ensureHub(conn.id);
  h.plugins.push({ package: ref.trim(), disabled: false, pending: true, route: ref.includes('kafka-topics') ? '/kafka' : undefined });
  adding = false;
  ref = DEFAULT_REF;
}

function composeContainer(service: string): Container | undefined {
  return world.containers.find(c => c.labels[COMPOSE_PROJECT] === project && c.labels[COMPOSE_SERVICE] === service);
}

function install(): void {
  const toInstall = plugins.filter(p => p.pending && !p.disabled);
  runTask({
    name: `Install plugins (${pending} change${pending > 1 ? 's' : ''})`,
    ext: RHDH_EXT,
    steps: [
      { label: 'podman compose run install-dynamic-plugins', ms: 2400, log: ['Running prepare-and-install-dynamic-plugins.sh', ...toInstall.map(p => `======= Installing dynamic plugin ${p.package}`), ...toInstall.map(p => `==> Successfully installed dynamic plugin ${pluginName(p)}`)] },
      { label: 'podman compose restart rhdh', ms: 2000, log: ['✔ Container rhdh  Restarted'] },
      { label: `Waiting for ${conn.endpoint}`, ms: 1200, log: ['{"level":"info","message":"Listening on :7007","service":"rootHttpRouter"}'] },
    ],
    onDone: () => {
      for (const p of ensureHub(conn.id).plugins) p.pending = false;
    },
  });
  const installer = composeContainer('install-dynamic-plugins');
  const rhdh = composeContainer('rhdh');
  if (installer) {
    installer.state = 'RUNNING';
    installer.startedAt = Date.now();
    later(2400, () => {
      installer.state = 'EXITED';
      installer.startedAt = undefined;
    });
  }
  if (rhdh) {
    later(2400, () => {
      rhdh.state = 'RESTARTING';
    });
    later(4400, () => {
      rhdh.state = 'RUNNING';
      rhdh.startedAt = Date.now();
    });
  }
}

function toggleFile(): void {
  showFile = !showFile;
}

function reset(): void {
  searchTerm = '';
}
</script>

<NavPage bind:searchTerm={searchTerm} title="plugins">
  {#snippet additionalActions()}
    {#if conn.status === 'started'}
      <Button type="secondary" onclick={toggleFile}>{showFile ? 'Hide override file' : 'View override file'}</Button>
      <Button icon={faPlusCircle} onclick={openAdd} disabled={adding}>Add plugin</Button>
    {/if}
  {/snippet}
  {#snippet content()}
    {#if conn.status !== 'started'}
      <ConnectionStoppedScreen {conn} kind="plugins" />
    {:else}
      <div class="flex flex-col w-full h-full">
        <div class="px-5 pb-3 space-y-3 empty:hidden">
          {#if pending > 0}
            <div class="flex items-center gap-3 rounded-lg px-4 py-3 bg-[var(--pd-content-card-bg)] border-l-4 border-[var(--pd-state-warning)] text-[var(--pd-content-card-text)]" role="status">
              <span class="grow">{pending} change{pending > 1 ? 's' : ''} saved to dynamic-plugins.override.yaml. Install plugins, then restart rhdh to apply.</span>
              <Button icon={faDownload} onclick={install} inProgress={installing} disabled={installing}>Install plugins</Button>
            </div>
          {/if}
          {#if adding}
            <Card title="Add plugin" subtitle="OCI reference oci://<registry>/<image>:<tag>!<plugin-name>, or a ./local-plugins path">
              <label class="flex flex-col gap-1 text-sm" for="rhdh-plugin-ref">Package
                <Input id="rhdh-plugin-ref" value={ref} oninput={onRef} aria-label="Plugin package" error={refTaken ? 'This plugin is already in the override file' : !refValid ? 'Use oci://<registry>/<image>:<tag>!<plugin-name>' : undefined} />
              </label>
              <div class="flex justify-end gap-2 mt-4">
                <Button type="link" onclick={closeAdd}>Cancel</Button>
                <Button onclick={add} disabled={!refValid || refTaken}>Add</Button>
              </div>
            </Card>
          {/if}
          {#if showFile}
            <Card title="configs/dynamic-plugins/dynamic-plugins.override.yaml">
              <pre class="text-xs font-mono rounded-md p-3 bg-[var(--pd-content-card-inset-bg)] overflow-auto" aria-label="Override file">{overrideYaml(plugins)}</pre>
            </Card>
          {/if}
        </div>
        <DataTable kind="plugins" {rows} total={plugins.length} {searchTerm} onResetFilter={reset} {key} name={nameOf} nameTitle="Plugin" {status} {columns} {actions} icon={faPuzzlePiece} emptyMessage="Add a dynamic plugin from an OCI image." />
      </div>
    {/if}
  {/snippet}
</NavPage>
