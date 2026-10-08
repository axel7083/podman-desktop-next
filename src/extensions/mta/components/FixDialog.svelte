<script lang="ts">
/** Konveyor AI solution review: unified diff with Reject / Accept. */
import { Button } from '@podman-desktop/ui-svelte';

import Dialog from '#lib/components/Dialog.svelte';

import { acceptFix, FIXES, rejectFix } from '../data.ts';

interface Props {
  incident: string;
}

let { incident }: Props = $props();

const fix = $derived(FIXES[incident]);

function lineClass(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---')) return 'font-semibold text-[var(--pd-modal-text)]';
  if (line.startsWith('@@')) return 'text-[var(--pd-state-info)]';
  if (line.startsWith('+')) return 'text-[var(--pd-state-success)]';
  if (line.startsWith('-')) return 'text-[var(--pd-state-error)]';
  return 'text-[var(--pd-modal-text)] opacity-80';
}

function reject(): void {
  rejectFix(incident);
}

function accept(): void {
  acceptFix(incident);
}
</script>

<Dialog title="Review proposed fix" onclose={reject}>
  {#snippet content()}
    {#if fix}
      <div class="space-y-3 w-[640px] max-w-full">
        <p class="text-sm">Konveyor AI · {fix.model} served by AI Lab (local inference) · {fix.files.length} files</p>
        <p>{fix.explanation}</p>
        <pre class="rounded-md bg-[var(--pd-content-card-inset-bg)] p-3 text-xs font-mono leading-5 overflow-auto" aria-label="Proposed diff">{#each fix.diff as line, i (i)}<div class={lineClass(line)}>{line}</div>{/each}</pre>
      </div>
    {/if}
  {/snippet}
  {#snippet buttons()}
    <Button type="link" onclick={reject}>Reject</Button>
    <Button onclick={accept}>Accept</Button>
  {/snippet}
</Dialog>
