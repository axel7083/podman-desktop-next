<script lang="ts">
/** Inline progress + log of a task started from a form (same markup as the factory wizard). */
import { LinearProgress } from '@podman-desktop/ui-svelte';

import { world } from '#lib/world.svelte.ts';

interface Props {
  taskId: string;
  label: string;
}

let { taskId, label }: Props = $props();

const task = $derived(world.tasks.find(t => t.id === taskId));
</script>

{#if task}
  <div class="rounded-md bg-[var(--pd-content-card-inset-surface)] p-3 space-y-2" aria-label={label}>
    <div class="flex justify-between text-[var(--pd-content-card-text)]">
      <span>{task.status === 'in-progress' ? (task.step ?? 'Working') : task.status === 'success' ? 'Done' : (task.error ?? 'Canceled')}</span>
      <span class="tabular-nums">{task.progress}%</span>
    </div>
    {#if task.status === 'in-progress'}<LinearProgress />{/if}
    <pre class="max-h-40 overflow-auto text-xs font-mono leading-5 text-[var(--pd-content-card-text)] whitespace-pre-wrap">{task.logs.join('\n')}</pre>
  </div>
{/if}
