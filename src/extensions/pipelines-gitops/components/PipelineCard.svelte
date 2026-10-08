<script lang="ts">
/** Dashboard card (P17): last pipeline and out-of-sync apps across connected clusters. */
import AppIcon from '#lib/components/AppIcon.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import { href } from '#lib/nav.ts';
import { world } from '#lib/world.svelte.ts';

const clusters = $derived(registry.activeConnections.filter(c => c.kind === 'kubernetes' && c.status === 'started'));
const rows = $derived(
  clusters.flatMap(c => {
    const objs = world.kube[c.id] ?? [];
    const runs = objs.filter(o => o.kind === 'PipelineRun').toSorted((a, b) => b.metadata.creationTimestamp.localeCompare(a.metadata.creationTimestamp));
    const apps = objs.filter(o => o.kind === 'Application');
    if (!runs.length && !apps.length) return [];
    const outOfSync = apps.filter(a => (a.status?.sync as { status?: string } | undefined)?.status === 'OutOfSync').length;
    const failed = runs.filter(r => r.status?.state === 'DEGRADED').length;
    return [{ c, last: runs[0], outOfSync, failed, apps: apps.length }];
  }),
);
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center gap-3">
    <AppIcon icon="icons/redhat.openshift-pipelines-gitops.svg" size="32px" />
    <div class="flex flex-col">
      <span class="text-lg text-[var(--pd-content-card-header-text)]">Pipelines & GitOps</span>
      <span class="text-sm text-[var(--pd-content-card-title)]">Connected clusters with Tekton or Argo CD</span>
    </div>
  </div>
  {#if rows.length === 0}
    <span class="text-sm text-[var(--pd-content-card-text)]">No connected cluster runs OpenShift Pipelines or GitOps.</span>
  {/if}
  {#each rows as r (r.c.id)}
    <div class="text-sm text-[var(--pd-content-card-text)] flex flex-col">
      <span class="font-semibold text-[var(--pd-content-card-header-text)]">{r.c.name}</span>
      {#if r.apps}<a class="text-[var(--pd-link)]" href={href(`/c/${r.c.id}/gitops`)}>{r.outOfSync ? `${r.outOfSync} app OutOfSync` : `${r.apps} apps synced`}</a>{/if}
      {#if r.last}<a class="text-[var(--pd-link)]" href={href(`/c/${r.c.id}/pipelines`)}>Last pipeline {r.last.metadata.name}: {r.last.status?.reason}{r.failed ? ` · ${r.failed} failed` : ''}</a>{/if}
    </div>
  {/each}
</div>
