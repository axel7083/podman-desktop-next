<script lang="ts">
/**
 * P13 command palette (Ctrl/⌘K or the title-bar search): "Workflows" (guided
 * tours of the Red Hat flows, `r3/tours.svelte.ts`) and "Connections".
 */
import { faMagnifyingGlass, faRoute } from '@fortawesome/free-solid-svg-icons';
import { tick } from 'svelte';

import type { IconRef } from '#lib/ext/types.ts';

import { labConns } from '../r2/simple.ts';
import LabIcon from '../ui/LabIcon.svelte';
import { startTour, TOURS } from './tours.svelte.ts';

interface Props {
  open: boolean;
  onselect: (connId: string) => void;
}

let { open = $bindable(), onselect }: Props = $props();

interface Item {
  id: string;
  group: 'Workflows' | 'Connections';
  label: string;
  detail?: string;
  icon?: IconRef;
  run: () => void;
}

let query = $state('');
let sel = $state(0);
let input = $state<HTMLInputElement>();

const items = $derived<Item[]>([
  ...TOURS.map(t => ({ id: `tour:${t.id}`, group: 'Workflows' as const, label: `Tour: ${t.title}`, detail: t.outcome, icon: faRoute, run: (): void => startTour(t.id) })),
  ...labConns().map(c => ({ id: `conn:${c.id}`, group: 'Connections' as const, label: c.name, detail: c.group, icon: c.icon, run: (): void => onselect(c.id) })),
]);
const filtered = $derived.by(() => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(i => terms.every(x => `${i.label} ${i.detail ?? ''}`.toLowerCase().includes(x)));
});
const groups = $derived((['Workflows', 'Connections'] as const).map(g => ({ g, list: filtered.filter(i => i.group === g) })).filter(x => x.list.length));

$effect(() => {
  if (!open) return;
  query = '';
  sel = 0;
  tick()
    .then(() => input?.focus())
    .catch(console.error);
});

function run(i: Item | undefined): void {
  if (!i) return;
  open = false;
  i.run();
}

function onkey(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    open = !open;
    return;
  }
  if (!open) return;
  if (e.key === 'Escape') open = false;
  else if (e.key === 'ArrowDown') {
    e.preventDefault();
    sel = Math.min(filtered.length - 1, sel + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    sel = Math.max(0, sel - 1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    run(filtered[sel]);
  }
}
</script>

<svelte:window onkeydown={onkey} />

{#if open}
  <button type="button" class="fixed inset-0 z-[110] bg-black/25 cursor-default" aria-label="Close command palette" onclick={(): void => void (open = false)}></button>
  <div data-testid="p13-palette" role="dialog" aria-label="Command palette" class="fixed left-1/2 top-[6px] -translate-x-1/2 z-[111] w-[640px] max-w-[calc(100vw-24px)] p-2 rounded-lg border border-[var(--pd-content-divider)] bg-[var(--pd-content-card-bg)] shadow-xl text-[12px]">
    <div class="flex items-center gap-2 h-7 px-2 rounded-md border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-focused-bg)]">
      <LabIcon icon={faMagnifyingGlass} size={14} />
      <input
        bind:this={input}
        bind:value={query}
        oninput={(): void => void (sel = 0)}
        data-testid="palette-input"
        aria-label="Command palette input"
        placeholder="Search workflows and connections…"
        class="flex-1 h-full bg-transparent outline-hidden text-[var(--pd-input-field-focused-text)] placeholder:text-[var(--pd-input-field-placeholder-text)]" />
    </div>
    <ul class="max-h-[60vh] overflow-y-auto pt-1" aria-label="Results">
      {#each groups as { g, list } (g)}
        <li role="presentation" class="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]" data-testid="palette-group">{g}</li>
        {#each list as it (it.id)}
          {@const i = filtered.indexOf(it)}
          <li>
            <button
              type="button"
              data-testid="palette-item"
              data-id={it.id}
              class="w-full flex items-center gap-2 h-7 px-2 rounded text-left text-[var(--pd-content-header)] {i === sel ? 'bg-[var(--pd-modal-dropdown-highlight)]' : 'hover:bg-[var(--pd-dropdown-item-hover-bg)]'}"
              onmouseenter={(): void => void (sel = i)}
              onclick={(): void => run(it)}>
              <LabIcon icon={it.icon} size={14} />
              <span class="truncate">{it.label}</span>
              {#if it.detail}<span class="truncate text-[11px] text-[var(--pd-table-body-text)]">{it.detail}</span>{/if}
            </button>
          </li>
        {/each}
      {:else}
        <li class="px-2 py-3 text-[var(--pd-table-body-text)]">No match.</li>
      {/each}
    </ul>
  </div>
{/if}
