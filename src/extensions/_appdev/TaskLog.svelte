<script lang="ts">
/** Live view of a task (progress + log), used by inline wizards. */
import { LinearProgress } from '@podman-desktop/ui-svelte';

import { world } from '#lib/world.svelte.ts';

interface Props {
  taskId: string | undefined;
  label?: string;
  /** Fold the log once the task succeeded (the caller shows the result instead). */
  collapseWhenDone?: boolean;
}

let { taskId, label = 'Task progress', collapseWhenDone = false }: Props = $props();

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
    {#if collapseWhenDone && task.status === 'success'}
      <details>
        <summary class="cursor-pointer text-sm text-[var(--pd-link)]">Show log ({task.logs.length} lines)</summary>
        <pre class="mt-2 max-h-[200px] overflow-auto text-xs font-mono leading-5 text-[var(--pd-content-card-text)]" role="log">{task.logs.join('\n')}</pre>
      </details>
    {:else}
      <!-- 10 lines of 20px: scrolled to the bottom, the first visible line is never cut -->
      <pre bind:this={pre} class="max-h-[200px] overflow-auto text-xs font-mono leading-5 text-[var(--pd-content-card-text)]" role="log">{task.logs.join('\n')}</pre>
    {/if}
  </div>
{/if}
