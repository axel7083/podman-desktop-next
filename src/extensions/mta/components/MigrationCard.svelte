<script lang="ts">
/** Dashboard card (P17) "Migration readiness": story points by target of the latest runs. */
import { href } from '#lib/nav.ts';

import { latestAnalysis, PROJECTS, resolvedIncidents, summary, targetLabel } from '../data.ts';
import CardHeader from '../../_appdev/CardHeader.svelte';

const resolved = $derived(resolvedIncidents());
const rows = $derived(
  PROJECTS.map(p => ({ project: p, analysis: latestAnalysis(p.name) }))
    .filter(r => r.analysis)
    .map(r => ({
      name: r.project.name,
      id: r.analysis?.id ?? '',
      targets: (r.analysis?.targets ?? []).map(t => ({ id: t, points: r.analysis ? summary(r.analysis, t, resolved).points : 0 })),
    })),
);

function pathLabel(id: string): string {
  return id === 'eap8' ? 'EAP 8.1 path' : targetLabel(id);
}
</script>

<CardHeader icon="icons/redhat.mta.svg" title="Migration Toolkit for Applications" />
<div class="space-y-2 text-[var(--pd-content-card-text)]">
  {#each rows as r (r.name)}
    <div>
      <a class="font-semibold text-[var(--pd-content-card-header-text)] hover:text-[var(--pd-link)] no-underline" href={href(`/tools/mta?report=${r.id}`)}>{r.name}</a>
      {#each r.targets as t (t.id)}
        <a class="flex items-center gap-2 no-underline text-[var(--pd-content-card-text)] hover:text-[var(--pd-link)]" href={href(`/tools/mta?report=${r.id}&target=${t.id}`)}>
          <span class="grow">{pathLabel(t.id)}</span>
          <span class="tabular-nums">{t.points} pts</span>
        </a>
      {/each}
    </div>
  {:else}
    <p>No project analyzed yet. <a class="text-[var(--pd-link)]" href={href('/tools/mta?view=analyze')}>Analyze an application</a></p>
  {/each}
</div>
