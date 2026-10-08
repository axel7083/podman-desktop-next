<script lang="ts">
/** Konflux › Applications: one card per Application with components, latest build, snapshot and release. */
import { faCircleCheck, faCircleXmark, faCubes } from '@fortawesome/free-solid-svg-icons';
import { NavPage } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { type KubeObject, world } from '#lib/world.svelte.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();
let searchTerm = $state('');

const objs = $derived(world.kube[conn.id] ?? []);
const apps = $derived(objs.filter(o => o.kind === 'Application' && o.metadata.name.includes(searchTerm)));

function of(kind: string, app: string): KubeObject[] {
  return objs
    .filter(o => o.kind === kind && (o.metadata.labels?.['appstudio.openshift.io/application'] === app || o.spec?.application === app))
    .toSorted((a, b) => b.metadata.creationTimestamp.localeCompare(a.metadata.creationTimestamp));
}

function go(section: string): void {
  navigate(`/c/${conn.id}/${section}`);
}
</script>

<NavPage bind:searchTerm={searchTerm} title="Applications">
  {#snippet content()}
    <div role="region" class="w-full px-5 py-3 grid grid-cols-2 gap-3 content-start text-[var(--pd-content-text)]" aria-label="Konflux applications">
      {#each apps as a (a.metadata.uid)}
        {@const comps = of('Component', a.metadata.name)}
        {@const builds = of('PipelineRun', a.metadata.name).filter(r => r.metadata.labels?.['pipelines.appstudio.openshift.io/type'] === 'build')}
        {@const snap = of('Snapshot', a.metadata.name)[0]}
        {@const rel = of('Release', a.metadata.name)[0]}
        <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 space-y-2" aria-label="Application {a.metadata.name}">
          <div class="flex items-center gap-2">
            <Icon icon={faCubes} />
            <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] grow">{String(a.spec?.displayName ?? a.metadata.name)}</h2>
            <span class="text-sm">{comps.length} component{comps.length === 1 ? '' : 's'}</span>
          </div>
          <div class="text-sm space-y-1">
            {#each comps as c (c.metadata.uid)}
              {@const last = builds.find(b => b.metadata.labels?.['appstudio.openshift.io/component'] === c.metadata.name && b.metadata.labels?.['pipelinesascode.tekton.dev/event-type'] === 'push')}
              <div class="flex items-center gap-2">
                <span class="w-40 text-[var(--pd-table-body-text-highlight)]">{c.metadata.name}</span>
                {#if last}
                  <span class={last.status?.reason === 'Succeeded' ? 'text-[var(--pd-state-success)]' : last.status?.reason === 'Failed' ? 'text-[var(--pd-state-error)]' : ''}><Icon icon={last.status?.reason === 'Succeeded' ? faCircleCheck : faCircleXmark} size="xs" /></span>
                  <button class="text-[var(--pd-link)] hover:underline truncate" onclick={go.bind(undefined, 'konflux-pipelineruns')}>{last.metadata.name} · {String(last.status?.reason)}</button>
                {:else}<span>No builds yet</span>{/if}
              </div>
            {/each}
          </div>
          <div class="flex gap-4 text-sm pt-1 border-t border-[var(--pd-content-divider)]">
            <button class="text-[var(--pd-link)] hover:underline" onclick={go.bind(undefined, 'konflux-snapshots')}>Snapshot: {snap?.metadata.name ?? '—'}</button>
            <button class="text-[var(--pd-link)] hover:underline" onclick={go.bind(undefined, 'konflux-releases')}>Release: {rel ? `${rel.metadata.name} (${String(rel.status?.Released)})` : '—'}</button>
          </div>
        </section>
      {/each}
    </div>
  {/snippet}
</NavPage>
