<script lang="ts">
import { StatusIcon } from '@podman-desktop/ui-svelte';

import type { StatusCellData } from './types.ts';

interface Props {
  object: StatusCellData;
}

let { object }: Props = $props();
</script>

{#key object.status + String(object.icon)}
  {#if object.label}
    <span class="inline-flex" title={object.label} aria-label={object.label} role="img">
      <StatusIcon icon={object.icon} status={object.status} />
    </span>
  {:else}
    <StatusIcon icon={object.icon} status={object.status} />
  {/if}
{/key}
