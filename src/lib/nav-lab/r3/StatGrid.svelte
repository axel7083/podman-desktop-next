<script lang="ts">
/** Overview counters (dashboard-style cards): 20px icon, count, label; click opens the collection. */
import type { IconRef } from '#lib/ext/types.ts';

import LabIcon from '../ui/LabIcon.svelte';

interface Props {
  items: { label: string; count: number | string; icon?: IconRef; onclick?: () => void }[];
}

let { items }: Props = $props();
</script>

<div data-testid="stat-grid" class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
  {#each items as it, i (`${i}:${it.label}`)}
    <button type="button" class="flex flex-col items-start gap-1 p-4 rounded-lg bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)] text-left" onclick={it.onclick}>
      {#if it.icon}<span class="text-[var(--pd-content-card-icon)]"><LabIcon icon={it.icon} size={20} /></span>{/if}
      <span class="text-[20px] font-semibold leading-7 text-[var(--pd-content-header)]">{it.count}</span>
      <span class="text-[13px] text-[var(--pd-table-body-text)]">{it.label}</span>
    </button>
  {/each}
</div>
