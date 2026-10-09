<script lang="ts">
/** Tab icon (16px) with the provider icon as an 8px badge (bottom-right), rule B5. */
import type { IconRef } from '#lib/ext/types.ts';

import { conn as findConn } from '../data.ts';
import LabIcon from './LabIcon.svelte';

interface Props {
  icon: IconRef;
  connId?: string;
  /** 16 in P13; other proposals keep their own sizes. */
  size?: number;
}

let { icon, connId, size = 16 }: Props = $props();
const c = $derived(findConn(connId));
</script>

<span class="relative inline-flex shrink-0">
  <LabIcon {icon} {size} />
  {#if c}
    <span data-badge class="absolute -bottom-0.5 -right-1 flex rounded-[2px] bg-[var(--pd-secondary-nav-bg)] p-px" title={c.name}>
      <LabIcon icon={c.icon} size={Math.max(8, Math.round(size / 2))} />
    </span>
  {/if}
</span>
