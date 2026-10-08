<script lang="ts">
/** Status dot + label cell (navigator run status, EDA event status). */
import { Spinner } from '@podman-desktop/ui-svelte';

interface Props {
  object: { status: string; label?: string };
}

let { object }: Props = $props();

const COLOR: Record<string, string> = {
  successful: 'bg-[var(--pd-state-success)]',
  ok: 'bg-[var(--pd-state-success)]',
  failed: 'bg-[var(--pd-state-error)]',
  error: 'bg-[var(--pd-state-error)]',
  throttled: 'bg-[var(--pd-state-warning)]',
  canceled: 'bg-[var(--pd-status-stopped)]',
};
</script>

<div class="flex items-center gap-2 text-[var(--pd-table-body-text)]" aria-label="Status {object.label ?? object.status}">
  {#if object.status === 'running' || object.status === 'pending'}
    <Spinner size="12px" />
  {:else}
    <span class="w-2.5 h-2.5 rounded-full shrink-0 {COLOR[object.status] ?? 'bg-[var(--pd-status-unknown)]'}"></span>
  {/if}
  <span class="capitalize">{object.label ?? object.status}</span>
</div>
