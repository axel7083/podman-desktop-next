<script lang="ts">
/** Summary card (rule E19): card background, 8px radius, 16px padding, 14px title. */
import type { Snippet } from 'svelte';

interface Props {
  title: string;
  testid?: string;
  children: Snippet;
}

let { title, testid, children }: Props = $props();
</script>

<section data-testid={testid} class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 min-w-0">
  <h2 class="pb-2 text-[14px] font-semibold text-[var(--pd-content-header)]">{title}</h2>
  {@render children()}
</section>
