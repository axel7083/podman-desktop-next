<script lang="ts">
/** Dashboard card "AAP jobs" (P17): last 5 jobs on acme-prod. */
import { href } from '#lib/nav.ts';
import { humanAge } from '#lib/world.svelte.ts';

import { CONN_ID, store } from '../data.ts';
import StatusDot from './StatusDot.svelte';

const { jobs } = store();
const last = $derived([...jobs].sort((a, b) => b.id - a.id).slice(0, 5));
</script>

<div class="flex flex-col gap-1.5 text-sm" aria-label="AAP jobs">
  <div class="flex items-baseline justify-between">
    <span class="text-[var(--pd-content-card-header-text)]">acme-prod · aap.acme-corp.com</span>
    <a class="text-[var(--pd-link)]" href={href(`/c/${CONN_ID}/aap-jobs`)}>All jobs</a>
  </div>
  {#each last as j (j.id)}
    <a class="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-[var(--pd-content-card-hover-bg)] no-underline" href={href(`/c/${CONN_ID}/aap-jobs?job=${j.id}`)}>
      <span class="w-28 shrink-0"><StatusDot object={{ status: j.status }} /></span>
      <span class="text-[var(--pd-content-card-text)] tabular-nums w-10">{j.id}</span>
      <span class="text-[var(--pd-content-card-header-text)] grow truncate">{j.name}</span>
      <span class="text-[var(--pd-content-card-text)] text-xs">{j.started ? `${humanAge(j.started)} ago` : 'pending'}</span>
    </a>
  {/each}
</div>
