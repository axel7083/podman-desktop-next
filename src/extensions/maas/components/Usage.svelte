<script lang="ts">
/** MaaS › Subscriptions & quota (MaaSSubscription tokenRateLimits, usage from Limitador metrics). */
import { NavPage, ProgressBar } from '@podman-desktop/ui-svelte';

import type { ConnectionView } from '#lib/ext/types.ts';

import Card from '../../ai-lab/components/ui/Card.svelte';
import Chip from '../../ai-lab/components/ui/Chip.svelte';
import { maasUsage } from '../../ai-lab/shared.ts';
import { SUBSCRIPTIONS } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();
const usage = $derived(maasUsage());

function used(model: string): number {
  if (model === 'granite-3-3-8b-instruct') return usage?.used ?? 0;
  return model.startsWith('llama') ? 18_240 : 3_100;
}
</script>

<NavPage title="Subscriptions & quota" searchEnabled={false}>
  {#snippet content()}
    <div class="flex flex-col gap-4 px-5 py-4 w-full overflow-auto">
      {#each SUBSCRIPTIONS as s (s.name + s.model)}
        {@const pct = Math.round((used(s.model) / s.limit) * 100)}
        <Card title={s.model}>
          {#snippet actions()}<Chip label={s.name} tone="primary" />{#if s.costCenter}<Chip label={s.costCenter} />{/if}{/snippet}
          <div class="flex justify-between text-xs mb-1"><span>{used(s.model).toLocaleString('en-US')} / {s.limit.toLocaleString('en-US')} tokens per {s.window}</span><span class:text-[var(--pd-state-error)]={pct >= 100} class:text-[var(--pd-state-warning)]={pct >= 80 && pct < 100}>{pct}%</span></div>
          <ProgressBar progress={pct} width="w-full" height="h-2" />
        </Card>
      {/each}
    </div>
  {/snippet}
</NavPage>
