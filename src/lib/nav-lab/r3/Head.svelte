<script lang="ts">
/**
 * P13 header, one pattern for every tab (lists, details, extension pages):
 * [icon] Title · status · connection chip ······ [segmented] [filter] [actions].
 * The segmented control holds either the list filters (All / Running / Stopped)
 * or the views of a details tab (Summary / Inspect / …): no tabs in tabs.
 * Provenance (contributing extension) is a tooltip on the title icon only.
 */
import type { Snippet } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

import { conn as findConn, STATUS_DOT } from '../data.ts';
import ConnIcon from '../ui/ConnIcon.svelte';
import FilterInput from './FilterInput.svelte';
import SegFilter from './SegFilter.svelte';

interface Props {
  icon: IconRef | undefined;
  title: string;
  status?: string;
  connId?: string;
  onconn?: () => void;
  /** Muted text after the chip (product details, unit service…). Never provenance. */
  sub?: string;
  /** Contributing extension, shown as the title icon tooltip. */
  provenance?: string;
  /** Extra inline content after the title (short id, tag…). */
  extra?: Snippet;
  /** Inline filter (lists): bound value; undefined = no filter field. */
  search?: string;
  /** Filter placeholder (defaults to "Filter <title>"). */
  placeholder?: string;
  views?: [string, string][];
  view?: string;
  onview?: (v: string) => void;
  actions?: Snippet;
  /** Inline segmented filter (All / Running / Stopped) before the filter field. */
  filters?: Snippet;
}

let { icon, title, status, connId, onconn, sub, provenance, extra, search = $bindable(), placeholder, views = [], view, onview, actions, filters }: Props = $props();
const c = $derived(findConn(connId));
</script>

<div class="shrink-0 bg-[var(--pd-content-bg)] border-b border-[var(--pd-content-divider)]">
  <div data-testid="tab-head" class="flex items-center gap-2 h-12 px-4">
    <span class="flex w-5 justify-center shrink-0 text-[var(--pd-content-header-icon)]" title={provenance ? `Provided by ${provenance}` : undefined} data-testid="head-icon"><AppIcon {icon} size="18px" /></span>
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
        class="flex items-center gap-1 h-5 pl-1 pr-1.5 rounded-full border border-[var(--pd-content-divider)] text-xs text-[var(--pd-table-body-text)] hover:text-[var(--pd-content-header)] shrink-0"
        title="Open {c.name}"
        onclick={onconn}><ConnIcon connId={c.id} size={12} dot={false} />{c.name}</button>
    {/if}
    {#if sub}<span class="text-xs text-[var(--pd-table-body-text)] truncate min-w-0">{sub}</span>{/if}
    <span class="flex-1"></span>
    {#if views.length > 1}
      <SegFilter tabs={views} value={view ?? views[0][0]} label="Views" testid="head-views" onpick={(v): void => onview?.(v)} />
    {/if}
    {#if filters}{@render filters()}{/if}
    {#if search !== undefined}
      <FilterInput testid="head-search" class="w-60 shrink-0" placeholder={placeholder ?? `Filter ${title.toLowerCase()}`} kbd bind:value={search} />
    {/if}
    {#if actions}<div class="flex items-center gap-1.5 shrink-0 text-[var(--pd-action-button-details-text)]">{@render actions()}</div>{/if}
  </div>
</div>
