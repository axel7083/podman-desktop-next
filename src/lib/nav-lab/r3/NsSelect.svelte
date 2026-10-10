<script lang="ts">
/**
 * P13 namespace multi-select for Kubernetes headers: a 28px trigger
 * ("All namespaces" / "orders" / "3 namespaces") opening an elevated dropdown
 * with a filter, "All namespaces", pinned namespaces (star toggle) then the
 * others, one checkbox per namespace. The selection is remembered per cluster.
 */
import { faCheck, faChevronDown, faLayerGroup, faStar } from '@fortawesome/free-solid-svg-icons';

import LabIcon from '../ui/LabIcon.svelte';
import FilterInput from './FilterInput.svelte';
import { allNs, kubeNs, namespacesOf, nsLabel, pinnedNs, selectedNs, setNs, toggleNs, togglePin } from './kube-ns.svelte.ts';

interface Props {
  connId: string;
}

let { connId }: Props = $props();

let open = $state(false);
let filter = $state('');
let root = $state<HTMLDivElement>();

const all = $derived(allNs(connId));
const sel = $derived(selectedNs(connId));
const pinned = $derived(pinnedNs(connId));
const names = $derived(namespacesOf(connId).filter(n => n.includes(filter.trim().toLowerCase())));
const groups = $derived<[string, string[]][]>(
  [
    ['Pinned', names.filter(n => pinned.includes(n))],
    ['Namespaces', names.filter(n => !pinned.includes(n))],
  ].filter((g): g is [string, string[]] => g[1].length > 0),
);

// "Select namespaces…" from the cluster menu opens this picker.
$effect(() => {
  if (kubeNs.picker === connId) {
    open = true;
    kubeNs.picker = undefined;
  }
});

function close(): void {
  open = false;
  filter = '';
}

function outside(e: MouseEvent): void {
  if (open && root && !root.contains(e.target as Node)) close();
}
</script>

<svelte:window onmousedown={outside} />

{#snippet check(on: boolean)}
  <span class="flex w-3.5 h-3.5 shrink-0 items-center justify-center rounded-sm border {on ? 'bg-[var(--pd-button-primary-bg)] border-[var(--pd-button-primary-bg)] text-[var(--pd-button-primary-text)]' : 'border-[var(--pd-input-field-stroke,var(--pd-content-divider))]'}">
    {#if on}<LabIcon icon={faCheck} size={14} />{/if}
  </span>
{/snippet}

<div bind:this={root} class="relative shrink-0">
  <button
    type="button"
    data-testid="ns-select"
    aria-haspopup="menu"
    aria-expanded={open}
    title={sel.includes('*') ? 'All namespaces' : sel.join(', ')}
    class="flex items-center gap-1.5 h-7 max-w-52 px-2 rounded-md border border-[var(--pd-content-divider)] text-[12px] text-[var(--pd-content-header)] hover:bg-[var(--pd-action-button-details-bg)]"
    onclick={(): void => (open ? close() : void (open = true))}>
    <span class="text-[var(--pd-table-body-text)]"><LabIcon icon={faLayerGroup} size={14} /></span>
    <span class="truncate">{nsLabel(connId)}</span>
    <span class="text-[var(--pd-table-body-text)]"><LabIcon icon={faChevronDown} size={14} /></span>
  </button>
  {#if open}
    <div
      role="menu"
      tabindex="-1"
      aria-label="Namespaces"
      data-testid="ns-menu"
      class="absolute right-0 top-full mt-1 z-50 w-72 flex flex-col rounded-lg border border-[var(--pd-dropdown-border,var(--pd-content-divider))] bg-[var(--pd-dropdown-bg)] shadow-lg text-[12px] text-[var(--pd-dropdown-item-text,var(--pd-content-header))]"
      onkeydown={(e): void => {
        if (e.key === 'Escape') close();
      }}>
      <div class="p-2 border-b border-[var(--pd-content-divider)]">
        <FilterInput placeholder="Filter namespaces" testid="ns-filter" bind:value={filter} />
      </div>
      <div class="max-h-80 overflow-auto py-1">
        <button type="button" role="menuitemcheckbox" data-testid="ns-all" aria-checked={all} class="flex w-full items-center gap-2 h-7 px-3 text-left hover:bg-[var(--pd-dropdown-item-hover-bg,var(--pd-action-button-details-bg))]" onclick={(): void => setNs(connId, ['*'])}>
          {@render check(all)}All namespaces
        </button>
        {#each groups as [title, list] (title)}
          <div class="px-3 pt-2 pb-1 text-[11px] font-semibold text-[var(--pd-table-body-text)]">{title}</div>
          {#each list as n (n)}
            {@const on = all || sel.includes(n)}
            {@const pin = pinned.includes(n)}
            <div class="group flex items-center pr-1 hover:bg-[var(--pd-dropdown-item-hover-bg,var(--pd-action-button-details-bg))]">
              <button type="button" role="menuitemcheckbox" data-testid="ns-item" data-ns={n} aria-checked={on} class="flex flex-1 min-w-0 items-center gap-2 h-7 pl-3 text-left" onclick={(): void => toggleNs(connId, n)}>
                {@render check(on)}<span class="truncate">{n}</span>
              </button>
              <button
                type="button"
                aria-label="{pin ? 'Unpin' : 'Pin'} {n}"
                title={pin ? 'Unpin' : 'Pin'}
                class="flex w-6 h-6 shrink-0 items-center justify-center rounded {pin ? 'text-[var(--pd-content-header)]' : 'text-[var(--pd-table-body-text)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}"
                onclick={(): void => togglePin(connId, n)}><LabIcon icon={faStar} size={14} /></button>
            </div>
          {/each}
        {:else}
          <div class="px-3 py-2 text-[var(--pd-table-body-text)]">No namespace matches “{filter}”.</div>
        {/each}
      </div>
    </div>
  {/if}
</div>
