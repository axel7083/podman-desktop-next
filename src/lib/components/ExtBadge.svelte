<script lang="ts">
/** Small extension-icon badge ("from <extension>") shown next to contributed items. */
import { Tooltip } from '@podman-desktop/ui-svelte';

import type { ExtensionMeta } from '#lib/ext/types.ts';
import { assetUrl } from '#lib/nav.ts';

interface Props {
  ext: ExtensionMeta;
  size?: number;
}

let { ext, size = 14 }: Props = $props();
</script>

<Tooltip left tip="From {ext.displayName}">
  <img
    src={assetUrl(ext.icon)}
    alt="From {ext.displayName}"
    class="shrink-0 rounded-[3px] object-contain opacity-90"
    style:width="{size}px"
    style:height="{size}px"
    draggable="false" />
</Tooltip>
