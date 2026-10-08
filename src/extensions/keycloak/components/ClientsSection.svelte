<script lang="ts">
/** Keycloak › Clients (P2): realm picker + client list; `?client=` shows the client details. */
import { faCopy, faRotate, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import type { ConnectionView } from '#lib/ext/types.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';
import { toast } from '#lib/world.svelte.ts';

import DataTable from '../../_appdev/DataTable.svelte';
import type { DataColumn } from '../../_appdev/types.ts';
import { clientFlows, clientType, type KcClient, quarkusConfig, server } from '../data.ts';
import { regenerateSecret } from '../actions.ts';
import ClientDetails from './ClientDetails.svelte';
import RealmPicker from './RealmPicker.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
let showBuiltin = $state(false);
const realmName = $derived(page.url.searchParams.get('realm') ?? 'acme');
const clientId = $derived(page.url.searchParams.get('client'));
const realms = $derived(server(conn.id).realms);
const realm = $derived(realms.find(r => r.realm === realmName));
const all = $derived((realm?.clients ?? []).filter(c => showBuiltin || !c.builtin));
const rows = $derived(all.filter(c => c.clientId.toLowerCase().includes(searchTerm.toLowerCase()) || (c.name ?? '').toLowerCase().includes(searchTerm.toLowerCase())));
const selected = $derived(clientId ? realm?.clients.find(c => c.clientId === clientId) : undefined);

function key(c: KcClient): string {
  return c.id;
}

function nameOf(c: KcClient): NameCellData {
  return {
    title: c.clientId,
    sub: [c.builtin ? 'built-in' : (c.name ?? ''), c.protocol].filter(Boolean),
    href: `/c/${conn.id}/clients?realm=${encodeURIComponent(realmName)}&client=${encodeURIComponent(c.clientId)}`,
  };
}

function status(c: KcClient): StatusCellData {
  return { status: c.enabled ? 'RUNNING' : 'EXITED', icon: faShieldHalved };
}

const columns: DataColumn<KcClient>[] = [
  { title: 'Type', width: '120px', value: (c): string => clientType(c) },
  { title: 'Flows', width: '2fr', value: (c): string => clientFlows(c).join(', ') || '–' },
  { title: 'Redirect URIs', width: '1.4fr', value: (c): string => c.redirectUris.join(', ') || '–' },
];

function copyConfig(c: KcClient): void {
  const lines = quarkusConfig(conn.endpoint, realmName, c);
  navigator.clipboard?.writeText(lines.join('\n')).catch(() => undefined);
  toast({ type: 'success', title: `Copied ${lines.length} properties`, body: 'Paste them into src/main/resources/application.properties.' });
}

function actions(c: KcClient): ActionsCellData {
  return {
    buttons: [{ title: 'Copy Quarkus config', icon: faCopy, onClick: (): void => copyConfig(c), hidden: c.builtin }],
    menu: [{ title: 'Regenerate secret', icon: faRotate, onClick: (): void => regenerateSecret(c), hidden: c.publicClient || !c.secret }],
  };
}

function toggleBuiltin(): void {
  showBuiltin = !showBuiltin;
}

function reset(): void {
  searchTerm = '';
}
</script>

{#if selected && realm}
  {#key selected.id}
    <ClientDetails {conn} {realm} client={selected} />
  {/key}
{:else}
  <NavPage bind:searchTerm={searchTerm} title="clients">
    {#snippet additionalActions()}
      <RealmPicker connId={conn.id} section="clients" {realms} value={realmName} />
      <Button type="secondary" onclick={toggleBuiltin}>{showBuiltin ? 'Hide built-in clients' : 'Show built-in clients'}</Button>
    {/snippet}
    {#snippet content()}
      {#if conn.status !== 'started'}
        <ConnectionStoppedScreen {conn} kind="clients" />
      {:else}
        <DataTable
          kind="clients"
          {rows}
          total={all.length}
          {searchTerm}
          onResetFilter={reset}
          {key}
          name={nameOf}
          nameTitle="Client ID"
          {status}
          {columns}
          {actions}
          icon={faShieldHalved}
          emptyMessage="Create a client in the admin console or import a realm file." />
      {/if}
    {/snippet}
  </NavPage>
{/if}
