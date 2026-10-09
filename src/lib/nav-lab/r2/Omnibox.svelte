<script lang="ts">
/**
 * P11 title-bar omnibox (k9s `:`, Linear ⌘K, Docker Quick Search): live
 * results over the real lab dataset; `@` connections, `>` commands,
 * `#` extension pages; `@conn text` searches inside a connection. Results
 * carry the connection icon and context colour.
 */
import { faMagnifyingGlass, faTerminal } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import ConnIcon from '../ui/ConnIcon.svelte';
import TabIcon from '../ui/TabIcon.svelte';
import { CTX_LABEL, ctxColor, type OmniResult, omniSearch } from './ctx.ts';

interface Props {
  onpick: (r: OmniResult) => void;
  initialQuery?: string;
  initialOpen?: boolean;
}

let { onpick, initialQuery = '', initialOpen = false }: Props = $props();

// svelte-ignore state_referenced_locally
let query = $state(initialQuery);
// svelte-ignore state_referenced_locally
let open = $state(initialOpen);
let idx = $state(0);
let input = $state<HTMLInputElement>();

const res = $derived(omniSearch(query));
const flat = $derived(res.groups.flatMap(g => g.items));

$effect(() => {
  if (initialOpen) input?.focus();
});

function pick(r: OmniResult): void {
  if (r.id.startsWith('hint-')) {
    query = r.label;
    idx = 0;
    input?.focus();
    return;
  }
  onpick(r);
  open = false;
  query = '';
}

function onkey(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    idx = Math.min(flat.length - 1, idx + 1);
    e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    idx = Math.max(0, idx - 1);
    e.preventDefault();
  } else if (e.key === 'Enter' && flat[idx]) {
    pick(flat[idx]);
  } else if (e.key === 'Escape') {
    open = false;
    input?.blur();
  }
}

function globalKey(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    open = true;
    input?.focus();
  }
}
</script>

<svelte:window onkeydown={globalKey} />

<div class="relative w-[600px] max-w-[46vw]">
  <label
    class="flex items-center gap-2 h-7 px-2.5 rounded-md border text-base bg-[var(--pd-input-field-bg)] text-[var(--pd-input-field-icon)] {open ? 'border-[var(--pd-tab-highlight)]' : 'border-[var(--pd-input-field-stroke)]'}">
    <AppIcon icon={faMagnifyingGlass} size="xs" />
    <input
      bind:this={input}
      class="flex-1 min-w-0 bg-transparent outline-none text-[var(--pd-input-field-focused-text)] placeholder:text-[var(--pd-input-field-placeholder-text)]"
      placeholder="Go to anything · @connection · > command · # extension"
      bind:value={query}
      onfocus={(): void => { open = true; }}
      oninput={(): void => { idx = 0; open = true; }}
      onkeydown={onkey} />
    <kbd class="text-xs opacity-70">⌘K</kbd>
  </label>
  {#if open}
    <button type="button" aria-label="Close" class="fixed inset-0 z-40 cursor-default" tabindex="-1" onclick={(): void => { open = false; }}></button>
    <div role="listbox" aria-label="Results" class="absolute left-0 right-0 top-full mt-1 z-50 max-h-[min(560px,75vh)] overflow-y-auto rounded-lg border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] shadow-2xl py-1 text-base text-[var(--pd-dropdown-item-text)]">
      {#each res.groups as g (g.title)}
        <div class="px-3 pt-2 pb-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">{g.title}</div>
        {#each g.items as r (r.kind + r.id)}
          {@const i = flat.indexOf(r)}
          {@const col = r.connId && lab.color ? ctxColor(r.connId) : undefined}
          <button
            type="button"
            role="option"
            aria-selected={i === idx}
            class="w-full flex items-center gap-2.5 h-9 px-3 text-left {i === idx ? 'bg-[var(--pd-dropdown-item-hover-bg)]' : 'hover:bg-[var(--pd-dropdown-item-hover-bg)]'}"
            onmouseenter={(): void => { idx = i; }}
            onclick={(): void => pick(r)}>
            {#if col}<span class="w-1 h-5 rounded-full shrink-0" style:background={col}></span>{/if}
            <span class="w-5 flex justify-center shrink-0">
              {#if r.kind === 'connection'}<ConnIcon connId={r.connId} size={18} ring="var(--pd-dropdown-bg)" />
              {:else if r.kind === 'command'}<AppIcon icon={faTerminal} size="14px" />
              {:else if r.icon}<TabIcon icon={r.icon} connId={r.connId} size={16} />{/if}
            </span>
            <span class="truncate font-medium">{r.label}</span>
            {#if r.sub}<span class="truncate text-sm opacity-60">{r.sub}</span>{/if}
            <span class="flex-1"></span>
            {#if r.connId && r.kind !== 'connection'}
              <span class="flex items-center gap-1 text-sm opacity-80 shrink-0"><ConnIcon connId={r.connId} size={13} dot={false} />{findConn(r.connId)?.name}</span>
            {/if}
            {#if r.connId && CTX_LABEL[r.connId]}<span class="px-1 rounded text-[9px] font-bold text-white bg-[var(--pd-status-dead)]">{CTX_LABEL[r.connId]}</span>{/if}
          </button>
        {/each}
      {:else}
        <div class="px-3 py-4 text-center opacity-60">No match for “{query}”</div>
      {/each}
      <div class="flex items-center gap-3 px-3 pt-2 mt-1 h-7 text-xs border-t border-[var(--pd-dropdown-border)] text-[var(--pd-nav-group-header)]">
        <span>{res.total} results</span><span>↑↓ move · ↵ open</span><span class="flex-1"></span><span>@ connection · &gt; command · # extension</span>
      </div>
    </div>
  {/if}
</div>
