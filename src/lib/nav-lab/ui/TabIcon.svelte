<script lang="ts">
/** Target icon with the provider icon as a small badge (bottom-right). */
import AppIcon from '#lib/components/AppIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

import { conn as findConn } from '../data.ts';

interface Props {
  icon: IconRef;
  connId?: string;
  size?: number;
}

let { icon, connId, size = 16 }: Props = $props();
const c = $derived(findConn(connId));
</script>

<span class="relative inline-flex shrink-0 items-center justify-center" style:width="{size}px" style:height="{size}px" style:font-size="{size - 2}px">
  <AppIcon {icon} size={typeof icon === 'string' ? `${size}px` : `${size}px`} />
  {#if c}
    <span class="absolute -bottom-1 -right-1.5 flex items-center justify-center rounded-sm bg-[var(--pd-content-bg)] p-px" title={c.name}>
      <AppIcon icon={c.icon} size="10px" />
    </span>
  {/if}
</span>
