<script lang="ts">
/** Fake terminal with scripted answers (PD uses xterm.js with pd-terminal tokens). */
import { tick } from 'svelte';

interface Props {
  prompt: string;
  /** command → output; unknown commands print "command not found". */
  answers: Record<string, string>;
  banner?: string;
}

let { prompt, answers, banner = '' }: Props = $props();

let lines = $state<string[]>([]);
let current = $state('');
let input = $state<HTMLInputElement>();
let scroller = $state<HTMLDivElement>();

$effect(() => {
  lines = banner ? [banner] : [];
});

function onKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Enter') return;
  const cmd = current.trim();
  current = '';
  if (cmd === 'clear') {
    lines = [];
    return;
  }
  const out = cmd === '' ? '' : (answers[cmd] ?? `sh: ${cmd.split(' ')[0]}: command not found`);
  lines = [...lines, `${prompt}${cmd}`, ...(out ? out.split('\n') : [])];
  tick()
    .then(() => scroller?.scrollTo({ top: scroller.scrollHeight }))
    .catch(console.error);
}

function focus(): void {
  input?.focus();
}
</script>

<div
  bind:this={scroller}
  class="h-full p-3 overflow-auto bg-[var(--pd-terminal-background)] text-[var(--pd-terminal-foreground)] font-mono text-sm leading-5 cursor-text"
  role="textbox"
  tabindex="-1"
  aria-label="Terminal"
  onclick={focus}
  onkeydown={focus}>
  {#each lines as line, i (i)}
    <div class="whitespace-pre-wrap">{line}</div>
  {/each}
  <div class="flex">
    <span class="whitespace-pre">{prompt}</span>
    <!-- svelte-ignore a11y_autofocus -->
    <input
      bind:this={input}
      bind:value={current}
      onkeydown={onKeydown}
      autofocus
      aria-label="Terminal input"
      spellcheck="false"
      class="grow bg-transparent outline-hidden text-[var(--pd-terminal-foreground)] caret-[var(--pd-terminal-cursor)]" />
  </div>
</div>
