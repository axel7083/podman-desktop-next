<script lang="ts">
/**
 * Simple connection switcher (P12–P14): a button (icon tile + name +
 * "Podman · running" + chevrons) and, under it, a plain dropdown as wide as
 * the nav: connections grouped Engines / Kubernetes / Other (provider icon,
 * name, status dot, check on the current one), a filter only above 8
 * connections, then "Add connection" and "Manage connections". With a single
 * connection the button is just a label (no chevrons) and the menu only has
 * the two actions.
 */
import { faCheck, faChevronDown, faChevronUp, faGear, faMagnifyingGlass, faPlus } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn, STATUS_DOT } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import ConnIcon from '../ui/ConnIcon.svelte';
import { labConns, switchGroup } from './simple.ts';

interface Props {
  selected: string;
  onselect: (id: string) => void;
  /** "Manage connections" (opens Settings › Resources). */
  onmanage: () => void;
  /** Icon-only button (collapsed nav); the menu then gets a fixed width. */
  collapsed?: boolean;
  /** Surface behind the button (status dot ring). */
  surface?: string;
}

let { selected, onselect, onmanage, collapsed = false, surface = 'var(--pd-secondary-nav-bg)' }: Props = $props();

// svelte-ignore state_referenced_locally
let open = $state(lab.openKey);
let filter = $state('');
let root = $state<HTMLDivElement>();

const conns = $derived(labConns());
const single = $derived(conns.length <= 1);
const current = $derived(findConn(selected));
const f = $derived(filter.trim().toLowerCase());
const groups = $derived(
  (['Engines', 'Kubernetes', 'Other'] as const)
    .map(g => [g, conns.filter(c => switchGroup(c) === g && (!f || c.name.toLowerCase().includes(f) || c.product.toLowerCase().includes(f)))] as const)
    .filter(([, list]) => list.length > 0),
);

function pick(id: string): void {
  onselect(id);
  open = false;
  filter = '';
}

function onpointer(e: PointerEvent): void {
  if (open && root && !root.contains(e.target as Node)) open = false;
}
</script>

<svelte:window onpointerdown={onpointer} onkeydown={(e): void => { if (e.key === 'Escape') open = false; }} />

<div bind:this={root} class="relative">
  <button
    type="button"
    aria-haspopup="menu"
    aria-expanded={open}
    title={current?.name}
    class="w-full flex items-center gap-2 p-1.5 rounded-lg text-left hover:bg-[var(--pd-secondary-nav-text-hover-bg)] {open ? 'bg-[var(--pd-secondary-nav-text-hover-bg)]' : ''}"
    onclick={(): void => { open = !open; }}>
    <span class="w-8 h-8 shrink-0 rounded-md flex items-center justify-center bg-[var(--pd-content-card-bg)] border border-[var(--pd-global-nav-bg-border)]">
      <ConnIcon connId={current?.id} size={18} ring={surface} />
    </span>
    {#if !collapsed && current}
      <span class="flex-1 min-w-0 leading-tight">
        <span class="block font-semibold truncate text-[var(--pd-secondary-nav-header-text)]">{current.name}</span>
        <span class="block text-xs truncate text-[var(--pd-content-sub-header)]">{current.product} · {current.status}</span>
      </span>
      {#if !single}<span class="flex flex-col text-[8px] opacity-60 leading-none"><AppIcon icon={faChevronUp} /><AppIcon icon={faChevronDown} /></span>{/if}
    {/if}
  </button>
  {#if open}
    <div
      role="menu"
      class="absolute top-full mt-1 z-40 py-1 rounded-lg border border-[var(--pd-dropdown-border)] bg-[var(--pd-dropdown-bg)] text-[var(--pd-dropdown-item-text)] shadow-xl {collapsed ? 'left-0 w-64' : 'left-0 right-0'}">
      {#if !single}
        {#if conns.length > 8}
          <label class="flex items-center gap-2 h-7 mx-1.5 mb-1 px-2 rounded-md border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-bg)] text-[var(--pd-input-field-icon)]">
            <AppIcon icon={faMagnifyingGlass} size="xs" />
            <!-- svelte-ignore a11y_autofocus -->
            <input autofocus class="flex-1 min-w-0 bg-transparent outline-none text-sm text-[var(--pd-input-field-focused-text)] placeholder:text-[var(--pd-input-field-placeholder-text)]" placeholder="Filter connections" bind:value={filter} />
          </label>
        {/if}
        <div class="max-h-[60vh] overflow-auto">
          {#each groups as [g, list] (g)}
            <div class="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">{g}</div>
            {#each list as c (c.id)}
              <button type="button" role="menuitem" class="w-full flex items-center gap-2 h-7 px-3 text-left hover:bg-[var(--pd-dropdown-item-hover-bg)]" onclick={(): void => pick(c.id)}>
                <ConnIcon connId={c.id} size={16} dot={false} />
                <span class="flex-1 min-w-0 truncate" class:font-semibold={c.id === selected}>{c.name}</span>
                <span class="w-1.5 h-1.5 rounded-full shrink-0 {STATUS_DOT[c.status]}" title={c.status}></span>
                <span class="w-3 shrink-0 text-[10px] text-[var(--pd-tab-text-highlight)]">{#if c.id === selected}<AppIcon icon={faCheck} />{/if}</span>
              </button>
            {/each}
          {:else}
            <div class="px-3 py-2 text-sm opacity-60">No connection matches.</div>
          {/each}
        </div>
        <div class="my-1 border-t border-[var(--pd-content-divider)]"></div>
      {/if}
      <button type="button" role="menuitem" class="w-full flex items-center gap-2 h-7 px-3 text-left hover:bg-[var(--pd-dropdown-item-hover-bg)]" onclick={(): void => { open = false; lab.openCreate('Add connection'); }}>
        <span class="w-4 flex justify-center"><AppIcon icon={faPlus} size="xs" /></span>Add connection
      </button>
      <button type="button" role="menuitem" class="w-full flex items-center gap-2 h-7 px-3 text-left hover:bg-[var(--pd-dropdown-item-hover-bg)]" onclick={(): void => { open = false; onmanage(); }}>
        <span class="w-4 flex justify-center"><AppIcon icon={faGear} size="xs" /></span>Manage connections
      </button>
    </div>
  {/if}
</div>
