<script lang="ts">
/** Compose status chip (ComposeStatus.image_status.status). */
import { Spinner } from '@podman-desktop/ui-svelte';

import type { ComposeState } from '../data.ts';

interface Props {
  object: ComposeState;
}

let { object }: Props = $props();

const CLASS: Record<ComposeState, string> = {
  pending: 'text-[var(--pd-status-starting)]',
  building: 'text-[var(--pd-status-starting)]',
  uploading: 'text-[var(--pd-status-starting)]',
  registering: 'text-[var(--pd-status-starting)]',
  success: 'text-[var(--pd-status-running)]',
  failure: 'text-[var(--pd-status-terminated)]',
};
</script>

<span class="flex items-center gap-1.5 text-sm capitalize {CLASS[object]}" aria-label="Compose status {object}">
  {#if object === 'success' || object === 'failure'}
    <span class="w-2.5 h-2.5 rounded-full {object === 'success' ? 'bg-[var(--pd-status-running)]' : 'bg-[var(--pd-status-terminated)]'}"></span>
  {:else}
    <Spinner size="0.9em" />
  {/if}
  {object}
</span>
