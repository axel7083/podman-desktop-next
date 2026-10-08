<script lang="ts">
// PD table/columns/ContainerEngineEnvironmentColumn.svelte
import AppIcon from '#lib/components/AppIcon.svelte';
import Label from '#lib/components/Label.svelte';
import ProviderInfoCircle from '#lib/components/ProviderInfoCircle.svelte';

import type { LabelCellData } from './types.ts';

interface Props {
  object: LabelCellData;
}

let { object }: Props = $props();
</script>

<Label tip={object.tip} name={object.name}>
  {#if object.icon}
    <AppIcon icon={object.icon} size="12px" />
  {:else}
    <ProviderInfoCircle type={object.type} />
  {/if}
</Label>
