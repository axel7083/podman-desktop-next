<script lang="ts">
/**
 * P13 header, the same for every tab (lists, details, extension pages):
 * [kind icon] Title · status · connection chip · sub ······ [search] [actions],
 * then the PD details tabs (underlined) when `views` has more than one entry.
 */
import { SearchInput } from '@podman-desktop/ui-svelte';
import type { Snippet } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

import { conn as findConn, STATUS_DOT } from '../data.ts';
import ConnIcon from '../ui/ConnIcon.svelte';

interface Props {
  icon: IconRef | undefined;
  title: string;
  status?: string;
  connId?: string;
  onconn?: () => void;
  /** Dim text after the chip (image, extension…). */
  sub?: string;
  /** Extra inline content after the title (short id, tag…). */
  extra?: Snippet;
  /** Inline search (lists): bound value; undefined = no search. */
  search?: string;
  views?: [string, string][];
  view?: string;
  onview?: (v: string) => void;
  actions?: Snippet;
}

let { icon, title, status, connId, onconn, sub, extra, search = $bindable(), views = [], view, onview, actions }: Props = $props();
const c = $derived(findConn(connId));
</script>

<div class="shrink-0 bg-[var(--pd-content-bg)]" class:border-b={views.length < 2} class:border-[var(--pd-content-divider)]={views.length < 2}>
  <div data-testid="tab-head" class="flex items-center gap-2 h-12 px-4">
    <span class="flex w-5 justify-center shrink-0 text-[var(--pd-content-header-icon)]"><AppIcon {icon} size="18px" /></span>
    <h1 class="text-[15px] font-semibold text-[var(--pd-content-header)] truncate min-w-0 max-w-[40%]" {title}>{title}</h1>
    {#if extra}{@render extra()}{/if}
    {#if status}
      <span data-testid="head-status" class="flex items-center gap-1 h-5 px-1.5 rounded-full bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] text-xs shrink-0"
        ><span class="w-1.5 h-1.5 rounded-full {STATUS_DOT[status] ?? STATUS_DOT.stopped}"></span>{status}</span>
    {/if}
    {#if c}
      <button
        type="button"
        data-testid="head-conn"
        class="flex items-center gap-1 h-5 pl-1 pr-1.5 rounded-full border border-[var(--pd-content-divider)] text-xs text-[var(--pd-content-sub-header)] hover:text-[var(--pd-content-header)] shrink-0"
        title="Open {c.name}"
        onclick={onconn}><ConnIcon connId={c.id} size={12} dot={false} />{c.name}</button>
    {/if}
    {#if sub}<span class="text-xs text-[var(--pd-content-sub-header)] truncate min-w-0">{sub}</span>{/if}
    <span class="flex-1"></span>
    {#if search !== undefined}
      <div class="w-64 shrink-0" data-testid="head-search"><SearchInput title={title} bind:searchTerm={search} /></div>
    {/if}
    {#if actions}<div class="flex items-center gap-1.5 shrink-0 text-[var(--pd-action-button-details-text)]">{@render actions()}</div>{/if}
  </div>
  {#if views.length > 1}
    <div role="tablist" aria-label="Views" class="flex gap-5 px-5 border-b border-[var(--pd-content-divider)] text-[13px]">
      {#each views as [id, label] (id)}
        <button
          type="button"
          role="tab"
          aria-selected={view === id}
          class="pb-1.5 border-b-[3px] whitespace-nowrap"
          class:border-[var(--pd-tab-highlight)]={view === id}
          class:text-[var(--pd-tab-text-highlight)]={view === id}
          class:border-transparent={view !== id}
          class:text-[var(--pd-tab-text)]={view !== id}
          class:hover:border-[var(--pd-tab-hover)]={view !== id}
          onclick={(): void => onview?.(id)}>{label}</button>
      {/each}
    </div>
  {/if}
</div>
