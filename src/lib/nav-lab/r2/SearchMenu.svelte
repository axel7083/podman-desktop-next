<script lang="ts" module>
import type { IconRef } from '#lib/ext/types.ts';

export interface MenuItem {
  id: string;
  label: string;
  icon?: IconRef;
  connId?: string;
  count?: number;
  sub?: string;
  ext?: string;
  /** Group header row (not selectable). */
  header?: boolean;
  indent?: boolean;
}
</script>

<script lang="ts">
/** Small searchable dropdown (P7 breadcrumb Kind / resource segments). */
import { faCheck, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import TabIcon from '../ui/TabIcon.svelte';

interface Props {
  items: MenuItem[];
  selected?: string;
  onpick: (id: string) => void;
  onclose: () => void;
  placeholder?: string;
  class?: string;
}

let { items, selected, onpick, onclose, placeholder = 'Filter', class: cls = '' }: Props = $props();
let query = $state('');
const shown = $derived.by(() => {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(i => !i.header && i.label.toLowerCase().includes(q));
});
</script>

<div
  role="listbox"
  tabindex="-1"
  aria-label={placeholder}
  class="absolute z-50 w-80 max-h-[min(480px,70vh)] flex flex-col rounded-lg border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] shadow-2xl {cls}"
  onkeydown={(e): void => { if (e.key === 'Escape') onclose(); }}>
  <label class="flex items-center gap-2 m-2 h-8 px-2 rounded-md border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-bg)] text-[var(--pd-input-field-icon)]">
    <AppIcon icon={faMagnifyingGlass} size="xs" />
    <!-- svelte-ignore a11y_autofocus -->
    <input autofocus class="flex-1 bg-transparent outline-none text-[var(--pd-input-field-focused-text)] placeholder:text-[var(--pd-input-field-placeholder-text)]" {placeholder} bind:value={query} />
  </label>
  <div class="flex-1 min-h-0 overflow-y-auto pb-1 border-t border-[var(--pd-dropdown-border)]">
    {#each shown as it (it.id)}
      {#if it.header}
        <div class="px-3 pt-2 pb-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">{it.label}</div>
      {:else}
        <button
          type="button"
          role="option"
          aria-selected={selected === it.id}
          class="w-full flex items-center gap-2 h-8 pr-3 text-left text-[var(--pd-dropdown-item-text)] hover:bg-[var(--pd-dropdown-item-hover-bg)] {it.indent ? 'pl-7' : 'pl-3'}"
          onclick={(): void => { onpick(it.id); onclose(); }}>
          <span class="w-3 text-[10px] text-[var(--pd-tab-highlight)]">{#if selected === it.id}<AppIcon icon={faCheck} />{/if}</span>
          {#if it.icon}<TabIcon icon={it.icon} connId={it.connId} size={15} />{/if}
          <span class="truncate">{it.label}</span>
          {#if it.ext}<AppIcon icon={it.ext} size="11px" />{/if}
          {#if it.sub}<span class="text-xs opacity-55 truncate">{it.sub}</span>{/if}
          <span class="flex-1"></span>
          {#if it.count !== undefined}<span class="text-sm opacity-60 tabular-nums">{it.count}</span>{/if}
        </button>
      {/if}
    {/each}
  </div>
</div>
