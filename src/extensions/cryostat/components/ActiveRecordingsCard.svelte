<script lang="ts">
/** Dashboard card (P17): JFR recordings currently RUNNING in the local Cryostat. */
import { href } from '#lib/nav.ts';
import { world } from '#lib/world.svelte.ts';

import Pill from '../../_appdev/Pill.svelte';
import { type ActiveRecording, activeRecordings, remainingSeconds, resumeRecordings, templateOf } from '../data.ts';

const running = $derived(activeRecordings());

$effect(() => {
  void running.length;
  resumeRecordings();
});

function linkOf(r: ActiveRecording): string {
  const c = world.containers.find(x => x.name === r.target);
  return href(c ? `/c/${c.engineId}/containers/${c.id}/jfr` : '/tools/cryostat?tab=recordings');
}
</script>

<div class="space-y-1 text-[var(--pd-content-card-text)]" aria-label="Active JFR recordings">
  {#each running as r (r.id)}
    <a class="flex items-center gap-2 no-underline text-[var(--pd-content-card-text)] hover:text-[var(--pd-link)]" href={linkOf(r)}>
      <Pill label="REC" tone="running" />
      <span class="font-semibold text-[var(--pd-content-card-header-text)] truncate">{r.name}</span>
      <span class="grow truncate">{r.target} · {templateOf(r)}</span>
      <span class="tabular-nums whitespace-nowrap">{r.continuous ? 'continuous' : `${remainingSeconds(r)} s left`}</span>
    </a>
  {:else}
    <p class="text-sm">No active recordings. <a class="text-[var(--pd-link)]" href={href('/tools/cryostat?tab=targets')}>Open Cryostat</a></p>
  {/each}
</div>
