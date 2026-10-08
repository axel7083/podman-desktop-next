<script lang="ts">
/** Section card (AI Lab details pages: Models / Server / Client code cards). */
import type { Snippet } from 'svelte';

interface Props {
  title?: string;
  class?: string;
  actions?: Snippet;
  children: Snippet;
}

let { title, class: className = '', actions, children }: Props = $props();
</script>

<section class="rounded-md bg-[var(--pd-content-card-bg)] p-4 {className}" aria-label={title}>
  {#if title || actions}
    <div class="flex items-center mb-2 gap-2">
      {#if title}<h2 class="grow text-sm font-semibold text-[var(--pd-content-card-header-text)]">{title}</h2>{/if}
      {@render actions?.()}
    </div>
  {/if}
  <div class="text-sm text-[var(--pd-content-card-text)]">
    {@render children()}
  </div>
</section>
