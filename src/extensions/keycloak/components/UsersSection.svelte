<script lang="ts">
/** Keycloak › Users (P2): realm picker + users; `?user=` shows details and the decoded test token. */
import { faKey, faUser } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage, NavPage } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate, appUrl } from '#lib/nav.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';
import { world } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import DataTable from '../../_appdev/DataTable.svelte';
import KeyValue from '../../_appdev/KeyValue.svelte';
import Pill from '../../_appdev/Pill.svelte';
import TaskLog from '../../_appdev/TaskLog.svelte';
import type { DataColumn } from '../../_appdev/types.ts';
import { requestToken } from '../actions.ts';
import { type KcUser, server } from '../data.ts';
import RealmPicker from './RealmPicker.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
let taskId = $state<string | undefined>();
const realmName = $derived(appUrl().searchParams.get('realm') ?? 'acme');
const username = $derived(appUrl().searchParams.get('user'));
const data = $derived(server(conn.id));
const realm = $derived(data.realms.find(r => r.realm === realmName));
const all = $derived(realm?.users ?? []);
const rows = $derived(all.filter(u => `${u.username} ${u.email ?? ''}`.toLowerCase().includes(searchTerm.toLowerCase())));
const selected = $derived(username ? all.find(u => u.username === username) : undefined);
const token = $derived(selected ? data.tokens[`${realmName}/${selected.username}`] : undefined);
const task = $derived(taskId ? world.tasks.find(t => t.id === taskId) : undefined);

function key(u: KcUser): string {
  return u.id;
}

function nameOf(u: KcUser): NameCellData {
  return {
    title: u.username,
    sub: [u.email ?? (u.serviceAccountClientLink ? `service account of ${u.serviceAccountClientLink}` : ''), ...u.requiredActions].filter(Boolean),
    href: `/c/${conn.id}/users?realm=${encodeURIComponent(realmName)}&user=${encodeURIComponent(u.username)}`,
  };
}

function status(u: KcUser): StatusCellData {
  return { status: u.enabled ? 'RUNNING' : 'EXITED', icon: faUser };
}

function fullName(u: KcUser): string {
  return u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : '–';
}

const columns: DataColumn<KcUser>[] = [
  { title: 'Name', width: '1fr', value: fullName },
  { title: 'Realm roles', width: '1.4fr', value: (u): string => u.realmRoles.filter(r => !r.startsWith('default-roles')).join(', ') || '–' },
  { title: 'Email verified', width: '120px', value: (u): string => (u.serviceAccountClientLink ? '–' : u.emailVerified ? 'Yes' : 'No') },
];

function getToken(u: KcUser): void {
  if (!realm) return;
  taskId = requestToken(conn.id, conn.endpoint, realm, u);
  navigate(`/c/${conn.id}/users?realm=${encodeURIComponent(realm.realm)}&user=${encodeURIComponent(u.username)}`);
}

function actions(u: KcUser): ActionsCellData {
  return { buttons: [{ title: 'Get token', icon: faKey, onClick: (): void => getToken(u) }], menu: [] };
}

function getSelectedToken(): void {
  if (selected) getToken(selected);
}

function close(): void {
  navigate(`/c/${conn.id}/users?realm=${encodeURIComponent(realmName)}`);
}

function reset(): void {
  searchTerm = '';
}

function json(v: unknown): string {
  return JSON.stringify(v, null, 2);
}

function time(epochS: unknown): string {
  return new Date(Number(epochS) * 1000).toLocaleTimeString('en-GB');
}
</script>

{#if selected && realm}
  <DetailsPage
    title={selected.username}
    subtitle="{selected.email ?? (selected.serviceAccountClientLink ? `service account of ${selected.serviceAccountClientLink}` : '')} · realm {realm.realm}"
    breadcrumbLeftPart="Users"
    breadcrumbRightPart={selected.username}
    onclose={close}
    onbreadcrumbClick={close}>
    {#snippet iconSnippet()}<AppIcon icon="icons/redhat.keycloak.svg" size="28px" />{/snippet}
    {#snippet actionsSnippet()}
      <Button icon={faKey} onclick={getSelectedToken} inProgress={task?.status === 'in-progress'}>Get token</Button>
    {/snippet}
    {#snippet contentSnippet()}
      <div class="h-full overflow-auto px-5 py-4 space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <Card title="Details">
            <KeyValue
              rows={[
                ['ID', selected.id],
                ['Username', selected.username],
                ['Email', selected.email],
                ['Name', selected.firstName ? fullName(selected) : undefined],
                ['Email verified', selected.serviceAccountClientLink ? undefined : selected.emailVerified ? 'Yes' : 'No'],
                ['Created', new Date(selected.createdTimestamp).toLocaleString('en-GB')],
                ['Service account of', selected.serviceAccountClientLink],
              ]} />
          </Card>
          <Card title="Role mapping">
            <div class="flex flex-wrap gap-1.5">
              {#each selected.realmRoles as role (role)}<Pill label={role} tone={role.startsWith('default-roles') ? 'neutral' : 'info'} />{/each}
            </div>
            {#if selected.requiredActions.length}
              <p class="mt-3 text-sm">Required actions:</p>
              <div class="flex flex-wrap gap-1.5 mt-1">
                {#each selected.requiredActions as a (a)}<Pill label={a} tone="warning" />{/each}
              </div>
            {/if}
          </Card>
        </div>
        <TaskLog {taskId} label="Token request" />
        {#if token}
          <Card title="Access token" subtitle="Issued {new Date(token.issued).toLocaleTimeString('en-GB')} by {String(token.payload.iss)} · expires {time(token.payload.exp)}">
            <div class="grid grid-cols-[1fr_2fr] gap-3">
              <div>
                <p class="text-sm mb-1">Header</p>
                <pre class="text-xs font-mono rounded-md p-3 bg-[var(--pd-content-card-inset-surface)] overflow-auto" aria-label="Token header">{json(token.header)}</pre>
              </div>
              <div>
                <p class="text-sm mb-1">Payload</p>
                <pre class="text-xs font-mono rounded-md p-3 bg-[var(--pd-content-card-inset-surface)] overflow-auto max-h-96" aria-label="Token payload">{json(token.payload)}</pre>
              </div>
            </div>
          </Card>
        {:else if !taskId}
          <Card><p>Use "Get token" to request an access token ({selected.serviceAccountClientLink ? `client credentials of ${selected.serviceAccountClientLink}` : 'direct access grant on acme-web'}) and inspect its claims.</p></Card>
        {/if}
      </div>
    {/snippet}
  </DetailsPage>
{:else}
  <NavPage bind:searchTerm={searchTerm} title="users">
    {#snippet additionalActions()}
      <RealmPicker connId={conn.id} section="users" realms={data.realms} value={realmName} />
    {/snippet}
    {#snippet content()}
      {#if conn.status !== 'started'}
        <ConnectionStoppedScreen {conn} kind="users" />
      {:else}
        <DataTable kind="users" {rows} total={all.length} {searchTerm} onResetFilter={reset} {key} name={nameOf} nameTitle="Username" {status} {columns} {actions} icon={faUser} />
      {/if}
    {/snippet}
  </NavPage>
{/if}
