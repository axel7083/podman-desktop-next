<script lang="ts">
/** OCM "Connection" cell: connection progress lives here only (small spinner + "Connecting"). */
import { Spinner } from '@podman-desktop/ui-svelte';

interface Props {
  object: { label: string; busy: boolean };
}

let { object }: Props = $props();
</script>

<div class="flex items-center gap-1.5 min-w-0 text-sm text-[var(--pd-table-body-text)]">
  {#if object.busy}<Spinner size="0.9em" />{/if}
  <span class="truncate">{object.label}</span>
</div>
