<script lang="ts">
/** Logs streamed from canned lines (one new line every ~1.2 s while running). */
import { onDestroy } from 'svelte';

import { ui } from '#lib/ui.svelte.ts';

interface Props {
  lines: string[];
  streaming: boolean;
  /** Lines appended periodically while streaming. */
  tail?: string[];
}

let { lines, streaming, tail = [] }: Props = $props();

let shown = $state<string[]>([]);
let scroller = $state<HTMLDivElement>();
let timer: ReturnType<typeof setInterval> | undefined;
let index = 0;

$effect(() => {
  shown = [...lines];
  clearInterval(timer);
  if (streaming && tail.length) {
    timer = setInterval(() => {
      const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
      shown = [...shown, tail[index % tail.length].replace('{ts}', ts)];
      index += 1;
      queueMicrotask(() => scroller?.scrollTo({ top: scroller.scrollHeight }));
    }, ui.ms(1200));
  }
});

onDestroy(() => clearInterval(timer));
</script>

<div
  bind:this={scroller}
  class="h-full p-3 overflow-auto bg-[var(--pd-terminal-background)] text-[var(--pd-terminal-foreground)] font-mono text-sm leading-5"
  role="log"
  aria-label="Logs">
  {#if shown.length === 0}
    <div class="opacity-60">No log output</div>
  {/if}
  {#each shown as line, i (i)}
    <div class="whitespace-pre-wrap">{line}</div>
  {/each}
</div>
