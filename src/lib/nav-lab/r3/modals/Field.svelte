<script lang="ts">
/** Form row of a flow modal: 12px label, control, optional 12px muted hint. */
import type { Snippet } from 'svelte';

interface Props {
  label: string;
  hint?: string;
  children: Snippet;
}

let { label, hint, children }: Props = $props();
</script>

<div class="flex flex-col gap-1.5">
  <span class="text-[12px] font-medium text-[var(--pd-content-header)]">{label}</span>
  {@render children()}
  {#if hint}<span class="text-[12px] text-[var(--pd-table-body-text)]">{hint}</span>{/if}
</div>
