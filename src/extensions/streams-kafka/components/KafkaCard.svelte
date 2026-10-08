<script lang="ts">
/** Dashboard card (P17): total consumer lag across local Kafka services. */
import { registry } from '#lib/ext/registry.svelte.ts';
import { href } from '#lib/nav.ts';

import { isService } from '../../_appdev/services.ts';
import { cluster, lagOf } from '../data.ts';

const conns = $derived(registry.activeConnections.filter(c => isService(c, 'kafka')));
</script>

<div class="space-y-1 text-[var(--pd-content-card-text)]">
  {#each conns as c (c.id)}
    {@const groups = cluster(c.id).groups}
    {@const lag = groups.reduce((s, g) => s + lagOf(g), 0)}
    <a class="flex items-center gap-2 no-underline text-[var(--pd-content-card-text)] hover:text-[var(--pd-link)]" href={href(`/c/${c.id}/consumer-groups`)}>
      <span class="font-semibold text-[var(--pd-content-card-header-text)]">{c.name}</span>
      <span class="grow">{groups.length} groups</span>
      <span class="tabular-nums {lag > 0 ? 'text-[var(--pd-state-warning)]' : ''}">lag {lag}</span>
    </a>
  {/each}
</div>
