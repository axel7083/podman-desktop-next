<script lang="ts">
import { StatusIcon } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';

import type { LabRow } from './types.ts';

interface Props {
  object: LabRow;
}

let { object }: Props = $props();
</script>

{#key object.status + String(object.icon)}
  {#if typeof object.icon === 'string'}
    <span class="relative inline-flex" title={object.status}><AppIcon icon={object.icon} size="20px" /><span class="absolute -bottom-0.5 -right-1 w-2 h-2 rounded-full border border-[var(--pd-content-bg)] {object.status === 'RUNNING' ? 'bg-[var(--pd-status-running)]' : object.status === 'DEGRADED' ? 'bg-[var(--pd-status-degraded)]' : 'bg-[var(--pd-status-stopped)]'}"></span></span>
  {:else}
    <StatusIcon icon={object.icon} status={object.status} />
  {/if}
{/key}
