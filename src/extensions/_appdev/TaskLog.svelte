<script lang="ts">
/** Live view of a task (progress + log), used by inline wizards. */
import { LinearProgress } from '@podman-desktop/ui-svelte';

import { world } from '#lib/world.svelte.ts';

interface Props {
  taskId: string | undefined;
  label?: string;
}

let { taskId, label = 'Task progress' }: Props = $props();

const task = $derived(taskId ? world.tasks.find(t => t.id === taskId) : undefined);
let pre = $state<HTMLPreElement>();

$effect(() => {
  void task?.logs.length;
  pre?.scrollTo({ top: pre.scrollHeight });
});
</script>

{#if task}
  <div class="rounded-md bg-[var(--pd-content-card-inset-bg)] p-3 space-y-2" aria-label={label}>
    <div class="flex justify-between text-[var(--pd-content-card-text)]">
      <span class="font-medium">{task.status === 'in-progress' ? (task.step ?? 'Working') : task.status === 'success' ? 'Done' : (task.error ?? 'Canceled')}</span>
      <span class="tabular-nums">{task.progress}%</span>
    </div>
    {#if task.status === 'in-progress'}<LinearProgress />{/if}
    <pre bind:this={pre} class="max-h-48 overflow-auto text-xs font-mono leading-5 text-[var(--pd-content-card-text)]" role="log">{task.logs.join('\n')}</pre>
  </div>
{/if}
