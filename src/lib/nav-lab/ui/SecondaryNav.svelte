<script lang="ts">
/** v1-style secondary nav: selected connection header + core and contributed sections. */
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import type { LabConnection } from '../data.ts';
import ConnIcon from './ConnIcon.svelte';

interface Props {
  c: LabConnection;
  selected?: string;
  onselect: (sectionId: string | undefined) => void;
}

let { c, selected, onselect }: Props = $props();
const core = $derived(c.sections.filter(s => !s.ext));
const contributed = $derived(c.sections.filter(s => s.ext));
</script>

{#snippet row(id: string | undefined, label: string, icon: unknown, count?: number, ext?: string)}
  {@const sel = selected === id}
  <button
    type="button"
    class="w-full flex items-center gap-2 h-8 pl-3 pr-2 text-left border-l-[3px] text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]"
    class:border-l-[var(--pd-secondary-nav-selected-highlight)]={sel}
    class:bg-[var(--pd-secondary-nav-selected-bg)]={sel}
    class:!text-[var(--pd-secondary-nav-text-selected)]={sel}
    class:border-l-transparent={!sel}
    onclick={(): void => onselect(id)}>
    <span class="w-4 flex justify-center" style:font-size="14px"><AppIcon icon={icon as never} size="16px" /></span>
    <span class="flex-1 truncate">{label}</span>
    {#if ext}<AppIcon icon={ext} size="12px" />{/if}
    {#if count !== undefined}<span class="text-sm opacity-60">{count}</span>{/if}
  </button>
{/snippet}

<aside class="flex flex-col w-[188px] shrink-0 h-full bg-[var(--pd-secondary-nav-bg)] border-r border-[var(--pd-global-nav-bg-border)] overflow-auto">
  <div class="flex items-center gap-2 px-3 pt-3 pb-2">
    <ConnIcon connId={c.id} size={22} ring="var(--pd-secondary-nav-bg)" />
    <div class="min-w-0">
      <div class="font-semibold truncate text-[var(--pd-secondary-nav-header-text)]">{c.name}</div>
      <div class="text-xs truncate text-[var(--pd-content-sub-header)]">{c.product} · {c.status}</div>
    </div>
  </div>
  {@render row(undefined, 'Overview', faCircleInfo)}
  {#each core as s (s.id)}{@render row(s.id, s.label, s.icon, s.count)}{/each}
  {#if contributed.length}
    <div class="flex items-center gap-2 px-3 pt-3 pb-1 text-sm font-semibold text-[var(--pd-nav-group-header)]">Extensions<span class="flex-1 border-t border-[var(--pd-global-nav-bg-border)]"></span></div>
    {#each contributed as s (s.id)}{@render row(s.id, s.label, s.icon, s.count, s.ext?.icon)}{/each}
  {/if}
</aside>
