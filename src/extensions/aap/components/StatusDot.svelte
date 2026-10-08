<script lang="ts">
/** AAP job / template status: colored dot (spinner while running) + label. */
import { Spinner } from '@podman-desktop/ui-svelte';

interface Props {
  object: { status: string };
}

let { object }: Props = $props();

const COLOR: Record<string, string> = {
  successful: 'bg-[var(--pd-state-success)]',
  failed: 'bg-[var(--pd-state-error)]',
  error: 'bg-[var(--pd-state-error)]',
  canceled: 'bg-[var(--pd-status-stopped)]',
  new: 'bg-[var(--pd-state-info)]',
  'never updated': 'bg-[var(--pd-status-unknown)]',
};
</script>

<div class="flex items-center gap-2 text-[var(--pd-table-body-text)]" aria-label="Status {object.status}">
  {#if object.status === 'running' || object.status === 'pending' || object.status === 'waiting'}
    <Spinner size="12px" />
  {:else}
    <span class="w-2.5 h-2.5 rounded-full shrink-0 {COLOR[object.status] ?? 'bg-[var(--pd-status-unknown)]'}"></span>
  {/if}
  <span class="capitalize">{object.status}</span>
</div>
