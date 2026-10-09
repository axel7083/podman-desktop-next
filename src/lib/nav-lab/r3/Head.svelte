<script lang="ts">
/**
 * Compact single-line tab header (P13): icon, name, status pill, connection
 * chip, then views toggle and actions on the right.
 */
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
  views?: [string, string][];
  view?: string;
  onview?: (v: string) => void;
  actions?: Snippet;
}

let { icon, title, status, connId, onconn, sub, views = [], view, onview, actions }: Props = $props();
const c = $derived(findConn(connId));
</script>

<div class="flex items-center gap-2 h-10 shrink-0 px-3 border-b border-[var(--pd-content-divider)] bg-[var(--pd-content-bg)]">
  <span class="flex w-[18px] justify-center shrink-0 text-[var(--pd-content-header-icon)]"><AppIcon {icon} size="16px" /></span>
  <h1 class="text-base font-semibold text-[var(--pd-content-header)] truncate min-w-0 max-w-[40%]" {title}>{title}</h1>
  {#if status}
    <span data-testid="head-status" class="flex items-center gap-1 h-5 px-1.5 rounded-full bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] text-xs shrink-0"
      ><span class="w-1.5 h-1.5 rounded-full {STATUS_DOT[status] ?? STATUS_DOT.stopped}"></span>{status}</span>
  {/if}
  {#if c}
    <button type="button" class="flex items-center gap-1 h-5 pl-1 pr-1.5 rounded-full border border-[var(--pd-content-divider)] text-xs text-[var(--pd-content-sub-header)] hover:text-[var(--pd-content-header)] shrink-0" title="Open {c.name}" onclick={onconn}
      ><ConnIcon connId={c.id} size={12} dot={false} />{c.name}</button>
  {/if}
  {#if sub}<span class="text-xs text-[var(--pd-content-sub-header)] truncate min-w-0">{sub}</span>{/if}
  <span class="flex-1"></span>
  {#if views.length > 1}
    <div role="radiogroup" aria-label="View" class="flex items-center p-0.5 rounded-md border border-[var(--pd-content-divider)] bg-[var(--pd-content-card-inset-bg)] shrink-0">
      {#each views as [id, label] (id)}
        <button
          type="button"
          role="radio"
          aria-checked={view === id}
          class="px-2 h-5 rounded text-xs whitespace-nowrap"
          class:bg-[var(--pd-button-primary-bg)]={view === id}
          class:text-[var(--pd-button-primary-text)]={view === id}
          class:text-[var(--pd-tab-text)]={view !== id}
          onclick={(): void => onview?.(id)}>{label}</button>
      {/each}
    </div>
  {/if}
  {#if actions}<div class="flex items-center gap-0.5 pl-1 ml-1 border-l border-[var(--pd-content-divider)] shrink-0 text-[var(--pd-action-button-details-text)]">{@render actions()}</div>{/if}
</div>
