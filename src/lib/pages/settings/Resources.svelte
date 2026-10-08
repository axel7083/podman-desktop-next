<script lang="ts">
/**
 * Settings › Resources – PD's PreferencesResourcesRendering: one card per
 * provider, "Create new …" factory buttons on the left (P12), a responsive grid
 * of ≥240px columns, one per connection, with status, endpoint and lifecycle actions.
 * Scaling: provider cards grouped by kind (same groups as the primary nav)
 * with a name filter on top; connection details are label/value rows.
 */
import { faArrowsRotate, faCircleInfo, faPlay, faPlusCircle, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen, FilteredEmptyScreen, SearchInput, Tooltip } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import ListItemButtonIcon from '#lib/components/ListItemButtonIcon.svelte';
import { withConfirmation } from '#lib/confirm.svelte.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionKind, ConnectionView } from '#lib/ext/types.ts';
import EngineIcon from '#lib/images/ResourcesIcon.svelte';
import { GROUPS, href, navigate, STATUS_DOT_CLASS, statusLabel } from '#lib/nav.ts';
import { plural } from '#lib/util.ts';
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
  kind: ConnectionKind | undefined;
}

let searchTerm = $state('');

const providers: ProviderCard[] = $derived.by(() => {
  const map = new Map<string, ProviderCard>();
  for (const c of registry.activeConnections) {
    let p = map.get(c.providerId);
    if (!p) {
      p = { id: c.providerId, name: c.providerName, icon: typeof c.icon === 'string' ? c.icon : c.ext.icon, version: c.version, conns: [], factories: [], ext: c.ext, kind: c.kind };
      map.set(c.providerId, p);
    }
    p.conns.push(c);
  }
  for (const f of registry.factories) {
    let p = map.get(f.providerId);
    if (!p) {
      p = { id: f.providerId, name: f.ext.displayName, icon: f.ext.icon, conns: [], factories: [], ext: f.ext, kind: f.kind };
      map.set(f.providerId, p);
    }
    p.factories.push(f);
  }
  return [...map.values()];
});

/** Search: a provider-name match keeps all its connections, otherwise only the matching connections. */
const filtered: ProviderCard[] = $derived.by(() => {
  const t = searchTerm.trim().toLowerCase();
  if (!t) return providers;
  const out: ProviderCard[] = [];
  for (const p of providers) {
    if (p.name.toLowerCase().includes(t) || p.id.toLowerCase().includes(t)) {
      out.push(p);
      continue;
    }
    const conns = p.conns.filter(c => c.name.toLowerCase().includes(t));
    if (conns.length) out.push({ ...p, conns });
  }
  return out;
});

/** Provider cards grouped like the primary nav: Engines, Kubernetes, VMs & services. */
const groups = $derived.by(() => {
  const out = GROUPS.map(g => ({ id: g.id, label: g.label, items: filtered.filter(p => p.kind && g.kinds.includes(p.kind)) }));
  const other = filtered.filter(p => !p.kind || !GROUPS.some(g => g.kinds.includes(p.kind as ConnectionKind)));
  if (other.length) out.push({ id: 'other', label: 'Other', items: other });
  return out.filter(g => g.items.length);
});

function resetFilter(): void {
  searchTerm = '';
}

function connectionCount(items: ProviderCard[]): number {
  return items.reduce((n, p) => n + p.conns.length, 0);
}

function detailRows(c: ConnectionView): [string, string][] {
  return [[endpointLabel(c), c.endpoint] as [string, string], ...Object.entries(c.details ?? {}).slice(0, 4)].filter(([, v]) => v !== '');
}

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
    {:else}
      <div class="mb-1 max-w-[320px]">
        <SearchInput title="resources" bind:searchTerm={searchTerm} />
      </div>
      {#if filtered.length === 0}
        <FilteredEmptyScreen icon={EngineIcon} kind="resources" searchTerm={searchTerm} onResetFilter={resetFilter} />
      {/if}
    {/if}
    {#each groups as g (g.id)}
      <section aria-label={g.label}>
        <h2 class="pt-4 pb-2 text-[11px] font-semibold text-[var(--pd-nav-group-header)]">
          {g.label} <span class="font-normal">· {plural(g.items.length, 'provider')}, {plural(connectionCount(g.items), 'connection')}</span>
        </h2>
        {#each g.items as p (p.id)}
          <Contribution ext={p.ext} kind="provider" api="P1">
            <div class="bg-[var(--pd-invert-content-card-bg)] mb-3 rounded-md p-3 flex" role="region" aria-label={p.id}>
              <div role="region" aria-label="Provider Setup" class="border-r border-[var(--pd-content-divider)] flex flex-col shrink-0">
                <div class="w-[230px] pr-4 py-2 flex flex-col flex-1">
                  <div class="flex min-w-0">
                    <AppIcon icon={p.icon} size="40px" class="max-w-[40px] shrink-0" title={p.name} />
                    <span class="my-auto font-semibold text-[var(--pd-invert-content-card-header-text)] ml-3 truncate" title={p.name}>{p.name}</span>
                    {#if p.version && p.conns[0]?.kind === 'engine'}
                      <span class="my-auto text-[var(--pd-content-sub-header)] ml-3 shrink-0">v{p.version}</span>
                    {/if}
                  </div>
                  <!-- one button per factory: first primary, the others secondary, stacked; long labels wrap to two lines, full label in the tooltip -->
                  <div class="mt-3 flex flex-col gap-2 items-stretch">
                    {#each p.factories as f, i (f.id)}
                      {@const label = f.label.replace(/^Create /, 'Create new ')}
                      <Contribution ext={f.ext} kind="connectionFactory" api="P12">
                        <Button
                          icon={faPlusCircle}
                          type={i === 0 ? 'primary' : 'secondary'}
                          class="w-full justify-start text-left"
                          onclick={create.bind(undefined, f.id)}
                          title="{label}{f.description ? ` – ${f.description}` : ''}"
                          aria-label={f.label}>
                          <span class="block whitespace-normal line-clamp-2 max-w-[170px] text-left">{label}</span>
                        </Button>
                      </Contribution>
                    {/each}
                  </div>
                </div>
              </div>
              <div class="grow min-w-0 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] content-start text-[var(--pd-invert-content-card-text)]" role="region" aria-label="Provider Connections">
                {#if p.conns.length === 0}
                  <div class="col-span-full px-5 py-2 text-[var(--pd-invert-content-card-text)] opacity-70">No connection yet. Use “Create new” to add one.</div>
                {/if}
                {#each p.conns as c (c.id)}
                  {@const dim = c.status !== 'started'}
                  <div class="px-5 py-2 min-w-0 border-r border-[var(--pd-content-divider)]" role="region" aria-label={c.name}>
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="grow min-w-0 font-semibold truncate {dim ? 'text-[var(--pd-invert-content-card-text)] opacity-70' : 'text-[var(--pd-invert-content-card-header-text)]'}" title={c.name}>{c.name}</div>
                      <Tooltip bottom tip="{c.name} details">
                        <button aria-label="{c.name} details" type="button" onclick={details.bind(undefined, c)}><Icon icon={faCircleInfo} /></button>
                      </Tooltip>
                    </div>
                    <div class="flex items-center gap-1.5" aria-label="Connection Status">
                      <span aria-label="Connection Status Icon" class="w-2.5 h-2.5 rounded-full {STATUS_DOT_CLASS[c.status]}"></span>
                      <span aria-label="Connection Status Label" class="text-xs {c.status === 'started' ? 'text-[var(--pd-status-running)]' : 'text-[var(--pd-status-stopped)]'}">{statusLabel(c)}</span>
                    </div>
                    <dl class="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs {dim ? 'opacity-70' : ''}" aria-label="Provider Configuration">
                      {#each detailRows(c) as [k, v] (k)}
                        <dt class="text-[var(--pd-invert-content-card-text)] opacity-70 whitespace-nowrap">{k}</dt>
                        <dd class="truncate" title={v}>{v}</dd>
                      {/each}
                    </dl>
                    <div class="mt-2 flex flex-row -ml-2" aria-label="Connection Actions">
                      <ListItemButtonIcon title="Start" icon={faPlay} onClick={start.bind(undefined, c)} hidden={c.status !== 'stopped'} />
                      <ListItemButtonIcon title="Stop" icon={faStop} onClick={stop.bind(undefined, c)} hidden={c.status === 'stopped'} enabled={c.status === 'started'} inProgress={c.status === 'stopping' || c.status === 'starting'} />
                      <ListItemButtonIcon title="Restart" icon={faArrowsRotate} onClick={restart.bind(undefined, c)} enabled={c.status === 'started'} />
                      <ListItemButtonIcon title="Delete" icon={faTrash} onClick={remove.bind(undefined, c)} enabled={c.status === 'stopped' || c.dynamic} />
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </Contribution>
        {/each}
      </section>
    {/each}
  </div>
</SettingsPage>
