<script lang="ts">
/** Keycloak › Realms (P2): one card per realm with counts, endpoints and export. */
import { faFileExport, faUsers } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage } from '@podman-desktop/ui-svelte';

import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import { runTask } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import CopyField from '../../_appdev/CopyField.svelte';
import KeyValue from '../../_appdev/KeyValue.svelte';
import Pill from '../../_appdev/Pill.svelte';
import { KC_EXT, type KcRealm, oidcEndpoints, server } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
const data = $derived(server(conn.id));
const realms = $derived(
  data.realms.filter(r => {
    const t = searchTerm.toLowerCase();
    return !t || r.realm.includes(t) || (r.displayName ?? '').toLowerCase().includes(t);
  }),
);

function appClients(r: KcRealm): number {
  return r.clients.filter(c => !c.builtin).length;
}

function openClients(r: KcRealm): void {
  navigate(`/c/${conn.id}/clients?realm=${encodeURIComponent(r.realm)}`);
}

function openUsers(r: KcRealm): void {
  navigate(`/c/${conn.id}/users?realm=${encodeURIComponent(r.realm)}`);
}

function exportRealm(r: KcRealm): void {
  runTask({
    name: `Export realm ${r.realm}`,
    ext: KC_EXT,
    steps: [
      { label: `kc.sh export --dir /opt/keycloak/data/export --realm ${r.realm} --users realm_file`, ms: 1400, log: [`Exporting realm '${r.realm}' with ${r.users.length} users`] },
      { label: `podman cp ${conn.id}:/opt/keycloak/data/export/${r.realm}-realm.json ~/dev/acme-orders/src/main/docker/`, ms: 600, log: [`Realm '${r.realm}' exported to ${r.realm}-realm.json`] },
    ],
  });
}
</script>

<NavPage bind:searchTerm={searchTerm} title="realms">
  {#snippet content()}
    {#if conn.status !== 'started'}
      <ConnectionStoppedScreen {conn} kind="realms" />
    {:else}
      <div class="w-full h-full overflow-auto px-5 py-4">
        <div class="grid grid-cols-2 gap-3">
          {#each realms as r (r.id)}
            {@const ep = oidcEndpoints(conn.endpoint, r.realm)}
            <Card title={r.realm} subtitle={r.displayName}>
              {#snippet actions()}
                {#if r.realm === 'master'}<Pill label="Administration" tone="info" />{/if}
                <Pill label={r.enabled ? 'Enabled' : 'Disabled'} tone={r.enabled ? 'success' : 'neutral'} />
              {/snippet}
              <div class="grid grid-cols-3 gap-2 mb-3">
                <button class="rounded-md p-2 text-left bg-[var(--pd-content-card-inset-bg)] hover:bg-[var(--pd-content-card-hover-bg)]" onclick={openClients.bind(undefined, r)} aria-label="Open clients of realm {r.realm}">
                  <div class="text-xl font-semibold text-[var(--pd-content-card-header-text)] tabular-nums">{appClients(r)}</div>
                  <div class="text-sm">Clients <span class="opacity-70">(+{r.clients.length - appClients(r)} built-in)</span></div>
                </button>
                <button class="rounded-md p-2 text-left bg-[var(--pd-content-card-inset-bg)] hover:bg-[var(--pd-content-card-hover-bg)]" onclick={openUsers.bind(undefined, r)} aria-label="Open users of realm {r.realm}">
                  <div class="text-xl font-semibold text-[var(--pd-content-card-header-text)] tabular-nums">{r.users.length}</div>
                  <div class="text-sm">Users</div>
                </button>
                <div class="rounded-md p-2 bg-[var(--pd-content-card-inset-bg)]">
                  <div class="text-xl font-semibold text-[var(--pd-content-card-header-text)] tabular-nums">{r.roles.length}</div>
                  <div class="text-sm">Realm roles</div>
                </div>
              </div>
              <KeyValue labelWidth="w-40" rows={[['SSL required', r.sslRequired], ['User registration', r.registrationAllowed ? 'On' : 'Off'], ['Access token lifespan', `${r.accessTokenLifespan / 60} min`]]} />
              <div class="mt-3"><CopyField label="OpenID configuration" value={ep.wellKnown} toastTitle="Copied the {r.realm} well-known URL" /></div>
              <div class="flex gap-2 mt-3">
                <Button type="secondary" onclick={openClients.bind(undefined, r)} aria-label="Clients of {r.realm}">Clients</Button>
                <Button type="secondary" icon={faUsers} onclick={openUsers.bind(undefined, r)} aria-label="Users of {r.realm}">Users</Button>
                <Button type="link" icon={faFileExport} onclick={exportRealm.bind(undefined, r)} aria-label="Export realm {r.realm}">Export realm</Button>
              </div>
            </Card>
          {:else}
            <p class="text-[var(--pd-content-text)]">No realm matches "{searchTerm}".</p>
          {/each}
        </div>
      </div>
    {/if}
  {/snippet}
</NavPage>
