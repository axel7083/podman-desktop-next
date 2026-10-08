<script lang="ts">
/**
 * Settings › Resources – PD's PreferencesResourcesRendering: one card per
 * provider, "Create new …" factory buttons on the left (P12), one 240px column
 * per connection with status, endpoint and lifecycle actions.
 */
import { faArrowsRotate, faCircleInfo, faPlay, faPlusCircle, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen, Tooltip } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import ConnectionStatus from '#lib/components/ConnectionStatus.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import ListItemButtonIcon from '#lib/components/ListItemButtonIcon.svelte';
import { withConfirmation } from '#lib/confirm.svelte.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import EngineIcon from '#lib/images/ResourcesIcon.svelte';
import { href, navigate } from '#lib/nav.ts';
import { deleteConnection, restartConnection, startConnection, stopConnection } from '#lib/world.svelte.ts';

import SettingsPage from './SettingsPage.svelte';

interface ProviderCard {
  id: string;
  name: string;
  icon: string | undefined;
  version?: string;
  conns: ConnectionView[];
  factories: typeof registry.factories;
  ext: ConnectionView['ext'];
}

const providers: ProviderCard[] = $derived.by(() => {
  const map = new Map<string, ProviderCard>();
  for (const c of registry.activeConnections) {
    let p = map.get(c.providerId);
    if (!p) {
      p = { id: c.providerId, name: c.providerName, icon: typeof c.icon === 'string' ? c.icon : c.ext.icon, version: c.version, conns: [], factories: [], ext: c.ext };
      map.set(c.providerId, p);
    }
    p.conns.push(c);
  }
  for (const f of registry.factories) {
    let p = map.get(f.providerId);
    if (!p) {
      p = { id: f.providerId, name: f.ext.displayName, icon: f.ext.icon, conns: [], factories: [], ext: f.ext };
      map.set(f.providerId, p);
    }
    p.factories.push(f);
  }
  return [...map.values()];
});

function create(id: string): void {
  navigate(`/settings/create/${id}`);
}

function start(c: ConnectionView): void {
  startConnection(c.id, c.name);
}

function stop(c: ConnectionView): void {
  stopConnection(c.id, c.name);
}

function restart(c: ConnectionView): void {
  restartConnection(c.id, c.name);
}

function remove(c: ConnectionView): void {
  withConfirmation(() => deleteConnection(c.id, c.name), `delete ${c.name}`, 'Delete connection?');
}

function details(c: ConnectionView): void {
  navigate(`/c/${c.id}`);
}

function endpointLabel(c: ConnectionView): string {
  if (c.kind === 'engine') return `${c.engineType === 'docker' ? 'Docker' : c.engineType === 'podman' ? 'Podman' : (c.engineType ?? '')} endpoint`;
  if (c.kind === 'kubernetes') return 'Kubernetes endpoint';
  return 'Endpoint';
}
</script>

<SettingsPage title="Resources">
  {#snippet subtitle()}
    <span>Additional provider information is available under <a href={href('/extensions')} class="text-[var(--pd-content-text)] underline underline-offset-2">Extensions</a></span>
  {/snippet}
  <div role="region" aria-label="Featured Provider Resources">
    {#if providers.length === 0}
      <EmptyScreen icon={EngineIcon} title="No resources found" message="Start an extension that manages containers or Kubernetes engines" />
    {/if}
    {#each providers as p (p.id)}
      <Contribution ext={p.ext} kind="provider" api="P1">
        <div class="bg-[var(--pd-invert-content-card-bg)] mb-5 rounded-md p-3 flex" role="region" aria-label={p.id}>
          <div role="region" aria-label="Provider Setup" class="border-r border-[var(--pd-content-divider)] flex flex-col">
            <div class="min-w-[170px] max-w-[200px] pr-5 py-2 flex flex-col flex-1">
              <div class="flex">
                <AppIcon icon={p.icon} size="40px" class="max-w-[40px]" title={p.name} />
                <span class="my-auto font-semibold text-[var(--pd-invert-content-card-header-text)] ml-3 break-words">{p.name}</span>
                {#if p.version && p.conns[0]?.kind === 'engine'}
                  <span class="my-auto text-[var(--pd-content-sub-header)] ml-3 break-words">v{p.version}</span>
                {/if}
              </div>
              <div class="mt-3 flex flex-col gap-2 items-start">
                {#each p.factories as f (f.id)}
                  <Contribution ext={f.ext} kind="connectionFactory" api="P12">
                    <Button icon={faPlusCircle} onclick={create.bind(undefined, f.id)} title={f.description} aria-label={f.label}>
                      {f.label.replace(/^Create /, 'Create new ')}
                    </Button>
                  </Contribution>
                {/each}
              </div>
            </div>
          </div>
          <div class="grow flex flex-wrap text-[var(--pd-invert-content-card-text)]" role="region" aria-label="Provider Connections">
            {#if p.conns.length === 0}
              <div class="px-5 py-2 text-[var(--pd-content-sub-header)]">No connection yet. Use “Create new” to add one.</div>
            {/if}
            {#each p.conns as c (c.id)}
              <div class="px-5 py-2 w-[240px] border-r border-[var(--pd-content-divider)]" role="region" aria-label={c.name}>
                <div class="float-right">
                  <Tooltip bottom tip="{p.name} details">
                    <button aria-label="{p.name} details" type="button" onclick={details.bind(undefined, c)}><Icon icon={faCircleInfo} /></button>
                  </Tooltip>
                </div>
                <div class="{c.status !== 'started' ? 'text-[var(--pd-content-sub-header)]' : ''} font-semibold">{c.name}</div>
                <div class="flex" aria-label="Connection Status"><ConnectionStatus status={c.status} /></div>
                <div class="mt-2 text-[var(--pd-content-text)] text-xs" aria-label="{c.name} type">{endpointLabel(c)}</div>
                <div class="mt-1 text-xs break-all {c.status !== 'started' ? 'text-[var(--pd-content-sub-header)]' : ''}">{c.endpoint}</div>
                {#if c.details}
                  <div class="flex flex-wrap gap-x-3 mt-2 text-xs {c.status !== 'started' ? 'text-[var(--pd-content-sub-header)]' : ''}" aria-label="Provider Configuration">
                    {#each Object.entries(c.details).slice(0, 4) as [k, v] (k)}<span>{k}: {v}</span>{/each}
                  </div>
                {/if}
                <div class="mt-2 flex flex-row -ml-2" aria-label="Connection Actions">
                  <ListItemButtonIcon title="Start" icon={faPlay} onClick={start.bind(undefined, c)} hidden={c.status !== 'stopped'} />
                  <ListItemButtonIcon title="Stop" icon={faStop} onClick={stop.bind(undefined, c)} hidden={c.status === 'stopped'} enabled={c.status === 'started'} inProgress={c.status === 'stopping' || c.status === 'starting'} />
                  <ListItemButtonIcon title="Restart" icon={faArrowsRotate} onClick={restart.bind(undefined, c)} enabled={c.status === 'started'} />
                  <ListItemButtonIcon title="Delete" icon={faTrash} onClick={remove.bind(undefined, c)} enabled={c.status === 'stopped' || c.dynamic} />
                </div>
                <div class="mt-1.5 text-[var(--pd-content-sub-header)] text-[9px] flex justify-between">
                  <div aria-label="Connection Type">{c.details?.['VM type'] ?? ''}</div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </Contribution>
    {/each}
  </div>
</SettingsPage>
