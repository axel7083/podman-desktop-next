<script lang="ts">
import { StatusIcon } from '@podman-desktop/ui-svelte';

import type { StatusCellData } from './types.ts';

interface Props {
  object: StatusCellData;
}

let { object }: Props = $props();
</script>

{#key object.status + String(object.icon)}
  <StatusIcon icon={object.icon} status={object.status} />
{/key}
