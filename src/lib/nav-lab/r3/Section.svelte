<script lang="ts">
/** Titled collection inside a Summary (rule E18): 14px title + count, then a table. */
import type { Snippet } from 'svelte';

interface Props {
  title: string;
  count?: number;
  testid?: string;
  children: Snippet;
}

let { title, count, testid, children }: Props = $props();
</script>

<section data-testid={testid} class="flex flex-col min-w-0">
  <h2 class="flex items-baseline gap-2 pb-1 text-[14px] font-semibold text-[var(--pd-content-header)]">
    {title}{#if count !== undefined}<span class="text-[11px] font-normal text-[var(--pd-table-body-text)]">{count}</span>{/if}
  </h2>
  <div class="flex min-w-0 overflow-x-auto">{@render children()}</div>
</section>
