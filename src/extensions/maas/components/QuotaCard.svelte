<script lang="ts">
/** Dashboard card (P17): MaaS token quota. */
import { ProgressBar } from '@podman-desktop/ui-svelte';

import { maasUsage } from '../../ai-lab/shared.ts';

const usage = $derived(maasUsage());
const pct = $derived(usage ? Math.round((usage.used / usage.limit) * 100) : 0);
</script>

{#if usage}
  <div class="flex flex-col gap-1 text-sm text-[var(--pd-content-card-text)]">
    <div class="text-base text-[var(--pd-content-card-header-text)]">MaaS token quota</div>
    <div>{usage.subscription} · granite-3-3-8b-instruct</div>
    <ProgressBar progress={pct} width="w-full" height="h-1.5" />
    <div class="text-xs">{usage.used.toLocaleString('en-US')} / {usage.limit.toLocaleString('en-US')} tokens this {usage.window}</div>
  </div>
{/if}
