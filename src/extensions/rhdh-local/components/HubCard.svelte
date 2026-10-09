<script lang="ts">
/** Dashboard card (P17): catalog / template / plugin counts of each local Developer Hub. */
import { registry } from '#lib/ext/registry.svelte.ts';
import { href, STATUS_LABEL } from '#lib/nav.ts';

import { isService } from '../../_appdev/services.ts';
import { hub } from '../data.ts';
import CardHeader from '../../_appdev/CardHeader.svelte';

const conns = $derived(registry.activeConnections.filter(c => isService(c, 'rhdh')));
</script>

<CardHeader icon="icons/redhat.rhdh-local.png" title="Developer Hub" />
<div class="space-y-2 text-[var(--pd-content-card-text)]">
  {#each conns as c (c.id)}
    {@const h = hub(c.id)}
    <div>
      <a class="font-semibold no-underline text-[var(--pd-content-card-header-text)] hover:text-[var(--pd-link)]" href={href(`/c/${c.id}/catalog`)}>{c.name}</a>
      <span class="text-sm opacity-80">· {STATUS_LABEL[c.status]} · {c.endpoint}</span>
    </div>
    <div class="grid grid-cols-3 gap-2 text-center">
      <a class="rounded-md py-1 no-underline bg-[var(--pd-content-card-inset-surface)] text-[var(--pd-content-card-text)] hover:text-[var(--pd-link)]" href={href(`/c/${c.id}/catalog?kind=Component`)}>
        <div class="text-lg font-semibold tabular-nums">{h.entities.filter(e => e.kind === 'Component').length}</div><div class="text-xs">Components</div>
      </a>
      <a class="rounded-md py-1 no-underline bg-[var(--pd-content-card-inset-surface)] text-[var(--pd-content-card-text)] hover:text-[var(--pd-link)]" href={href(`/c/${c.id}/templates`)}>
        <div class="text-lg font-semibold tabular-nums">{h.templates.length}</div><div class="text-xs">Templates</div>
      </a>
      <a class="rounded-md py-1 no-underline bg-[var(--pd-content-card-inset-surface)] text-[var(--pd-content-card-text)] hover:text-[var(--pd-link)]" href={href(`/c/${c.id}/plugins`)}>
        <div class="text-lg font-semibold tabular-nums">{h.plugins.filter(p => !p.disabled).length}</div><div class="text-xs">Plugins</div>
      </a>
    </div>
  {:else}
    <p class="text-sm">No local Developer Hub. Create one from the Services catalog.</p>
  {/each}
</div>
