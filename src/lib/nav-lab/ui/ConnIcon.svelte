<script lang="ts">
/** Provider icon with a status dot (or a Lens-style colour avatar). */
import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn, STATUS_DOT } from '../data.ts';

interface Props {
  connId: string | undefined;
  size?: number;
  dot?: boolean;
  avatar?: boolean;
  /** Border colour around the dot (matches the surface behind). */
  ring?: string;
}

let { connId, size = 20, dot = true, avatar = false, ring = 'var(--pd-global-nav-bg)' }: Props = $props();
const c = $derived(findConn(connId));
const dotSize = $derived(Math.max(8, Math.round(size / 2.6)));
</script>

{#if c}
  <span class="relative inline-flex shrink-0 items-center justify-center" style:width="{size}px" style:height="{size}px">
    {#if avatar}
      <span
        class="flex items-center justify-center w-full h-full rounded-md font-bold text-white tracking-tight"
        style:background={c.color}
        style:font-size="{Math.round(size / 2.9)}px"
        style:opacity={c.status === 'stopped' ? 0.55 : 1}>{c.initials}</span>
      <span class="absolute -top-1 -left-1 rounded-sm bg-[var(--pd-content-card-bg)] p-px flex" style:width="{Math.round(size / 2.3)}px" style:height="{Math.round(size / 2.3)}px">
        <AppIcon icon={c.icon} size="{Math.round(size / 2.3) - 2}px" />
      </span>
    {:else}
      <AppIcon icon={c.icon} size="{size}px" class={c.status === 'stopped' ? 'opacity-60' : ''} />
    {/if}
    {#if dot}
      <span
        class="absolute -bottom-0.5 -right-0.5 rounded-full {STATUS_DOT[c.status]}"
        style:width="{dotSize}px"
        style:height="{dotSize}px"
        style:border="2px solid {ring}"
        aria-label={c.status}></span>
    {/if}
  </span>
{/if}
