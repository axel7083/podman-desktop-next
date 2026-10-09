<script lang="ts">
/**
 * Searchable connection picker (P6 scope chip, P7 breadcrumb segment, P10
 * status-bar context): pinned, recent, grouped; multi-select with group
 * toggles and "only"; every row offers "connection › Kind" shortcuts so the
 * picker can land directly on a list (the ≤3-actions journey).
 */
import { faCheck, faMagnifyingGlass, faThumbtack } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { CONN_GROUPS, CONNECTIONS, conn as findConn, type LabConnection } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import ConnIcon from '../ui/ConnIcon.svelte';
import { CTX_LABEL, ctxColor, ENGINES, kindsOf, PINNED_CONNS, RECENT_CONNS, RUNNING } from './ctx.ts';

interface Props {
  multi?: boolean;
  selected: string[];
  onchange: (ids: string[]) => void;
  /** Jump to connection › kind (closes). */
  onkind?: (connId: string, kindId: string) => void;
  onclose: () => void;
  /** Offer an "All connections" entry in single mode. */
  allowAll?: boolean;
  class?: string;
  /** Prefilled search (capture). */
  initialQuery?: string;
}

let { multi = false, selected, onchange, onkind, onclose, allowAll = false, class: cls = '', initialQuery = '' }: Props = $props();

// svelte-ignore state_referenced_locally
let query = $state(initialQuery);
let hover = $state<string | undefined>(undefined);

const q = $derived(query.trim().toLowerCase());
const match = (c: LabConnection): boolean => !q || c.name.toLowerCase().includes(q) || c.product.toLowerCase().includes(q);
const pinned = $derived(q ? [] : PINNED_CONNS.map(id => findConn(id)).filter((c): c is LabConnection => !!c));
const recent = $derived(q ? [] : RECENT_CONNS.filter(id => !PINNED_CONNS.includes(id)).map(id => findConn(id)).filter((c): c is LabConnection => !!c));
const firstId = $derived(q ? CONNECTIONS.find(match)?.id : pinned[0]?.id);

function toggle(id: string): void {
  if (!multi) {
    onchange([id]);
    onclose();
    return;
  }
  onchange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
}

function toggleGroup(g: string): void {
  const ids = CONNECTIONS.filter(c => c.group === g).map(c => c.id);
  const all = ids.every(id => selected.includes(id));
  onchange(all ? selected.filter(x => !ids.includes(x)) : [...new Set([...selected, ...ids])]);
}

function preset(ids: string[]): void {
  onchange(ids);
}
</script>

{#snippet row(c: LabConnection, keyPrefix: string)}
  {@const on = selected.includes(c.id)}
  {@const showKinds = !!onkind && (hover === `${keyPrefix}${c.id}` || (hover === undefined && keyPrefix === 'p:' && c.id === firstId) || (q && c.id === firstId && hover === undefined))}
  {@const col = lab.color ? ctxColor(c.id) : undefined}
  <div
    role="option"
    aria-selected={on}
    tabindex="-1"
    class="group/row flex items-center gap-2 h-8 pl-3 pr-2 cursor-pointer text-[var(--pd-dropdown-item-text)] hover:bg-[var(--pd-dropdown-item-hover-bg)]"
    class:bg-[var(--pd-dropdown-item-hover-bg)]={showKinds}
    onmouseenter={(): void => { hover = `${keyPrefix}${c.id}`; }}
    onclick={(): void => toggle(c.id)}
    onkeydown={(e): void => { if (e.key === 'Enter') toggle(c.id); }}>
    {#if multi}
      <span class="w-4 h-4 flex items-center justify-center rounded-sm border text-[9px] shrink-0 {on ? 'bg-[var(--pd-input-checkbox-checked)] border-[var(--pd-input-checkbox-checked)] text-white' : 'border-[var(--pd-input-field-stroke)]'}">{#if on}<AppIcon icon={faCheck} />{/if}</span>
    {:else}
      <span class="w-4 text-[10px] text-[var(--pd-tab-highlight)]">{#if on}<AppIcon icon={faCheck} />{/if}</span>
    {/if}
    {#if col}<span class="w-1 h-5 rounded-full shrink-0" style:background={col}></span>{/if}
    <ConnIcon connId={c.id} size={16} ring="var(--pd-dropdown-bg)" />
    <span class="truncate font-medium" class:opacity-60={c.status === 'stopped'}>{c.name}</span>
    {#if CTX_LABEL[c.id]}<span class="px-1 rounded text-[9px] font-bold text-white bg-[var(--pd-status-dead)]">{CTX_LABEL[c.id]}</span>{/if}
    <span class="text-xs opacity-55 truncate">{c.product}</span>
    <span class="flex-1"></span>
    {#if multi && !showKinds}
      <button
        type="button"
        class="invisible group-hover/row:visible text-xs px-1.5 rounded hover:underline text-[var(--pd-link)]"
        onclick={(e): void => {
          e.stopPropagation();
          onchange([c.id]);
        }}>only</button>
    {/if}
  </div>
  {#if showKinds}
    <div class="flex items-center gap-1 pl-12 pr-2 pb-1.5 bg-[var(--pd-dropdown-item-hover-bg)]" role="group" aria-label="{c.name} kinds" onmouseenter={(): void => { hover = `${keyPrefix}${c.id}`; }}>
      <span class="text-xs opacity-60 mr-1">Go to</span>
      {#each kindsOf(c).slice(0, 5) as k (k.id)}
        <button
          type="button"
          title="{c.name} › {k.label}"
          aria-label="{c.name} › {k.label}"
          class="flex items-center gap-1 h-6 px-1.5 rounded text-xs border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] hover:border-[var(--pd-tab-highlight)] hover:text-[var(--pd-tab-text-highlight)]"
          onclick={(e): void => {
            e.stopPropagation();
            onkind?.(c.id, k.id);
            onclose();
          }}><AppIcon icon={k.icon} size="12px" />{k.label}</button>
      {/each}
    </div>
  {/if}
{/snippet}

<div
  role="listbox"
  aria-label="Connections"
  aria-multiselectable={multi}
  tabindex="-1"
  class="absolute z-50 w-[440px] max-h-[min(560px,75vh)] flex flex-col rounded-lg border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] shadow-2xl text-base {cls}"
  onmouseleave={(): void => { hover = undefined; }}
  onkeydown={(e): void => { if (e.key === 'Escape') onclose(); }}>
  <label class="flex items-center gap-2 m-2 h-8 px-2 rounded-md border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-bg)] text-[var(--pd-input-field-icon)]">
    <AppIcon icon={faMagnifyingGlass} size="xs" />
    <!-- svelte-ignore a11y_autofocus -->
    <input autofocus class="flex-1 bg-transparent outline-none text-[var(--pd-input-field-focused-text)] placeholder:text-[var(--pd-input-field-placeholder-text)]" placeholder="Filter {CONNECTIONS.length} connections" bind:value={query} />
  </label>
  {#if multi}
    <div class="flex items-center gap-1 px-2 pb-2 text-sm">
      {#each [['All running', RUNNING], ['All engines', ENGINES], ['All', CONNECTIONS.map(c => c.id)]] as [l, ids] (l)}
        <button type="button" class="px-2 h-6 rounded-full border border-[var(--pd-dropdown-border)] hover:bg-[var(--pd-dropdown-item-hover-bg)]" onclick={(): void => preset(ids as string[])}>{l}</button>
      {/each}
      <span class="flex-1"></span>
      <span class="opacity-60">{selected.length} selected</span>
    </div>
  {/if}
  <div class="flex-1 min-h-0 overflow-y-auto pb-1 border-t border-[var(--pd-dropdown-border)]">
    {#if allowAll && !q}
      <div
        role="option"
        aria-selected={selected.length !== 1}
        tabindex="-1"
        class="flex items-center gap-2 h-8 pl-3 pr-2 cursor-pointer hover:bg-[var(--pd-dropdown-item-hover-bg)]"
        onclick={(): void => { onchange([]); onclose(); }}
        onkeydown={(): void => undefined}>
        <span class="w-4 text-[10px] text-[var(--pd-tab-highlight)]">{#if selected.length !== 1}<AppIcon icon={faCheck} />{/if}</span>
        <span class="font-medium">All connections</span><span class="text-xs opacity-55">aggregated, Connection column</span>
      </div>
    {/if}
    {#if pinned.length}
      <div class="flex items-center gap-1 px-3 pt-2 pb-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]"><AppIcon icon={faThumbtack} size="9px" />Pinned</div>
      {#each pinned as c (c.id)}{@render row(c, 'p:')}{/each}
    {/if}
    {#if recent.length}
      <div class="px-3 pt-2 pb-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">Recent</div>
      {#each recent as c (c.id)}{@render row(c, 'r:')}{/each}
    {/if}
    {#each CONN_GROUPS as g (g)}
      {@const list = CONNECTIONS.filter(c => c.group === g && match(c))}
      {#if list.length}
        <div class="flex items-center px-3 pt-2 pb-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">
          <span class="flex-1">{g} · {list.length}</span>
          {#if multi}<button type="button" class="normal-case font-normal text-[var(--pd-link)] hover:underline" onclick={(): void => toggleGroup(g)}>toggle group</button>{/if}
        </div>
        {#each list as c (c.id)}{@render row(c, 'g:')}{/each}
      {/if}
    {/each}
  </div>
  <div class="flex items-center gap-2 px-3 h-7 text-xs border-t border-[var(--pd-dropdown-border)] text-[var(--pd-nav-group-header)]">
    <span>↑↓ move · ↵ {multi ? 'toggle' : 'switch'} · hover a row for <b>connection › Kind</b></span>
    <span class="flex-1"></span>
    <span>Esc</span>
  </div>
</div>
