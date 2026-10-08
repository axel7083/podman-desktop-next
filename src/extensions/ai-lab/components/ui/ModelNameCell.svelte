<script lang="ts">
/** Model name + badges (quantization, validated, fit to local GPU). */
import { navigate } from '#lib/nav.ts';

import Chip from './Chip.svelte';

interface Props {
  object: { title: string; sub?: string; href?: string; chips: { label: string; tone?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'success' | 'warning' | 'error'; title?: string }[] };
}

let { object }: Props = $props();

function open(): void {
  if (object.href) navigate(object.href);
}
</script>

<button class="flex flex-col whitespace-nowrap max-w-full text-left min-w-0" onclick={open} disabled={!object.href} aria-label={object.title}>
  <div class="flex items-center gap-1.5 max-w-full min-w-0">
    <span class="truncate text-[var(--pd-table-body-text-highlight)] group-hover:text-[var(--pd-link)]" title={object.title}>{object.title}</span>
    {#each object.chips as c (c.label)}<Chip label={c.label} tone={c.tone} title={c.title} />{/each}
  </div>
  {#if object.sub}<span class="truncate text-xs text-[var(--pd-table-body-text)]">{object.sub}</span>{/if}
</button>
