<script lang="ts">
/**
 * Status cell of the appdev tables: PD's StatusIcon, plus a solid
 * error-token box for FAILED (StatusIcon has no error state and would fall
 * back to DEGRADED orange, the same as a warning).
 */
import { StatusIcon } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import type { StatusCellData } from '#lib/table/types.ts';

interface Props {
  object: StatusCellData;
}

let { object }: Props = $props();
</script>

{#if object.status === 'FAILED'}
  <div class="grid place-content-center">
    <div class="grid place-content-center rounded-sm aspect-square p-1 bg-[var(--pd-state-error)] text-[var(--pd-status-contrast)]" role="status" title="FAILED">
      <Icon icon={object.icon} size={20} />
    </div>
  </div>
{:else}
  {#key object.status + String(object.icon)}
    <StatusIcon icon={object.icon} status={object.status} />
  {/key}
{/if}
