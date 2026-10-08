<script lang="ts">
/** Content card (PD `--pd-content-card-*`), optional title row with actions. */
import type { Snippet } from 'svelte';

interface Props {
  title?: string;
  subtitle?: string;
  actions?: Snippet;
  children?: Snippet;
  class?: string;
  inset?: boolean;
}

let { title, subtitle, actions, children, class: className = '', inset = false }: Props = $props();
</script>

<section
  class="rounded-lg p-4 text-[var(--pd-content-card-text)] {inset ? 'bg-[var(--pd-content-card-inset-bg)]' : 'bg-[var(--pd-content-card-bg)]'} {className}"
  aria-label={title}>
  {#if title || actions}
    <div class="flex items-start gap-3 mb-3">
      <div class="grow min-w-0">
        {#if title}<h2 class="text-base font-semibold text-[var(--pd-content-card-header-text)]">{title}</h2>{/if}
        {#if subtitle}<p class="text-sm opacity-80">{subtitle}</p>{/if}
      </div>
      {@render actions?.()}
    </div>
  {/if}
  {@render children?.()}
</section>
