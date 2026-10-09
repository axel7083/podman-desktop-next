<script lang="ts">
/** Extensions › pages catalogue with a favourite star (pins the page into the left nav). */
import { faStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarO } from '@fortawesome/free-regular-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { TOOL_CATEGORIES, TOOLS } from '../data.ts';

interface Props {
  favs: string[];
  ontoggle: (id: string) => void;
  onopen: (id: string) => void;
}

let { favs, ontoggle, onopen }: Props = $props();
</script>

<div class="h-full overflow-auto">
  <div class="px-5 pt-4 pb-3">
    <h1 class="text-xl font-bold text-[var(--pd-content-header)]">Extensions</h1>
    <div class="text-sm text-[var(--pd-content-sub-header)]">{TOOLS.length} installed · pages contributed by extensions · ★ pins a page into the left navigation ({favs.length} pinned)</div>
  </div>
  <div class="flex gap-4 px-5 border-b border-[var(--pd-content-divider)] text-sm mb-3">
    {#each ['Installed', 'Catalog', 'Local'] as tb, i (tb)}
      <span class="py-2 border-b-2" class:border-[var(--pd-tab-highlight)]={i === 0} class:text-[var(--pd-tab-text-highlight)]={i === 0} class:border-transparent={i !== 0} class:text-[var(--pd-tab-text)]={i !== 0}>{tb}</span>
    {/each}
  </div>
  {#each TOOL_CATEGORIES as cat (cat)}
    <div class="px-5 pb-1 text-base font-semibold text-[var(--pd-content-card-header-text)]">{cat}</div>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2 px-5 pb-4">
      {#each TOOLS.filter(x => x.category === cat) as t (t.id)}
        {@const on = favs.includes(t.id)}
        <div class="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)]">
          <button type="button" class="flex items-center gap-3 flex-1 min-w-0 text-left" onclick={(): void => onopen(t.id)}>
            <AppIcon icon={t.icon} size="26px" />
            <span class="min-w-0">
              <span class="block font-semibold truncate text-[var(--pd-content-card-header-text)]">{t.name}</span>
              <span class="block text-sm truncate text-[var(--pd-content-card-text)]">{t.description}</span>
            </span>
          </button>
          <button
            type="button"
            aria-label="{on ? 'Unpin' : 'Pin'} {t.name}"
            aria-pressed={on}
            class="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--pd-content-card-hover-inset-bg)]"
            class:text-[var(--pd-status-degraded)]={on}
            class:text-[var(--pd-content-card-text)]={!on}
            onclick={(): void => ontoggle(t.id)}><AppIcon icon={on ? faStar : faStarO} /></button>
        </div>
      {/each}
    </div>
  {/each}
</div>
