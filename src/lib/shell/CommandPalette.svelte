<script lang="ts">
/**
 * Command palette (Ctrl/⌘K) – markup from PD's dialogs/CommandPalette.svelte.
 * Finds every contributed command, connection, resource and page: the scaling
 * escape hatch (docs/ia.md rule 6, P17 search providers).
 */
import { faArrowRight, faBolt, faCube, faMagnifyingGlass, faPlus, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { tick } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ExtensionMeta, IconRef } from '#lib/ext/types.ts';
import ArrowDownIcon from '#lib/images/ArrowDownIcon.svelte';
import ArrowUpIcon from '#lib/images/ArrowUpIcon.svelte';
import EnterIcon from '#lib/images/EnterIcon.svelte';
import { connectionHome, coreResourcesOf, navigate, startVerb } from '#lib/nav.ts';
import { ui } from '#lib/ui.svelte.ts';
import { shortImage, startConnection, stopConnection, world } from '#lib/world.svelte.ts';

type Category = 'goto' | 'command' | 'resource';

interface PaletteItem {
  id: string;
  label: string;
  detail?: string;
  category: Category;
  icon?: IconRef;
  ext?: ExtensionMeta;
  run: () => void;
}

const TABS: { id: Category | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'goto', label: 'Go to' },
  { id: 'command', label: 'Commands' },
  { id: 'resource', label: 'Resources' },
];

let query = $state('');
let tab = $state<Category | 'all'>('all');
let selected = $state(0);
let input = $state<HTMLInputElement>();

const items: PaletteItem[] = $derived.by(() => {
  const out: PaletteItem[] = [];
  const go = (path: string) => (): void => navigate(path);
  out.push({ id: 'go:dashboard', label: 'Dashboard', category: 'goto', icon: faArrowRight, run: go('/') });
  out.push({ id: 'go:extensions', label: 'Extensions', category: 'goto', icon: faArrowRight, run: go('/extensions') });
  out.push({ id: 'go:accounts', label: 'Accounts', category: 'goto', icon: faArrowRight, run: go('/accounts') });
  for (const s of ['resources', 'cli-tools', 'registries', 'proxy', 'preferences']) {
    out.push({ id: `go:settings:${s}`, label: `Settings › ${s.replace('-', ' ')}`, category: 'goto', icon: faArrowRight, run: go(`/settings/${s}`) });
  }
  for (const s of registry.settings) {
    out.push({ id: `go:settings:${s.id}`, label: `Settings › ${s.title}`, category: 'goto', icon: s.icon ?? s.ext.icon, ext: s.ext, run: go(`/settings/${s.id}`) });
  }
  for (const c of registry.activeConnections) {
    out.push({ id: `go:${c.id}`, label: c.name, detail: c.providerName, category: 'goto', icon: c.icon, ext: c.ext, run: go(connectionHome(c)) });
    for (const r of coreResourcesOf(c)) {
      out.push({ id: `go:${c.id}:${r.id}`, label: `${c.name} › ${r.label}`, category: 'goto', icon: r.icon as IconRef, run: go(`/c/${c.id}/${r.id}`) });
    }
    for (const s of registry.navSectionsFor(c)) {
      out.push({ id: `go:${c.id}:${s.id}`, label: `${c.name} › ${s.label}`, category: 'goto', icon: s.icon ?? s.ext.icon, ext: s.ext, run: go(`/c/${c.id}/${s.id}`) });
    }
    if (c.status === 'stopped') {
      out.push({ id: `cmd:start:${c.id}`, label: `${startVerb(c)} ${c.name}`, category: 'command', icon: faPlay, run: (): void => startConnection(c.id, c.name) });
    } else if (c.status === 'started') {
      out.push({ id: `cmd:stop:${c.id}`, label: `Stop ${c.name}`, category: 'command', icon: faStop, run: (): void => stopConnection(c.id, c.name) });
    }
  }
  for (const t of registry.tools) {
    out.push({ id: `go:tool:${t.id}`, label: t.label, detail: 'Tool', category: 'goto', icon: t.icon ?? t.ext.icon, ext: t.ext, run: go(`/tools/${t.id}`) });
  }
  for (const f of registry.factories) {
    out.push({ id: `cmd:factory:${f.id}`, label: f.label, category: 'command', icon: faPlus, ext: f.ext, run: go(`/settings/create/${f.id}`) });
  }
  for (const c of registry.commands) {
    out.push({ id: `cmd:${c.id}`, label: c.category ? `${c.category}: ${c.title}` : c.title, category: 'command', icon: c.icon ?? faBolt, ext: c.ext, run: c.run });
  }
  const conns = new Map(registry.activeConnections.map(c => [c.id, c]));
  for (const c of world.containers) {
    const conn = conns.get(c.engineId);
    if (!conn) continue;
    out.push({ id: `res:c:${c.id}`, label: c.name, detail: `container · ${conn.name}`, category: 'resource', icon: faCube, run: go(`/c/${c.engineId}/containers/${c.id}/summary`) });
  }
  for (const i of world.images) {
    const conn = conns.get(i.engineId);
    if (!conn) continue;
    out.push({ id: `res:i:${i.id}`, label: `${shortImage(i.name)}:${i.tag}`, detail: `image · ${conn.name}`, category: 'resource', icon: faCube, run: go(`/c/${i.engineId}/images/${i.id}/summary`) });
  }
  for (const [connId, objects] of Object.entries(world.kube)) {
    const conn = conns.get(connId);
    if (!conn) continue;
    for (const o of objects) {
      out.push({
        id: `res:k:${o.metadata.uid}`,
        label: o.metadata.name,
        detail: `${o.kind} · ${conn.name}`,
        category: 'resource',
        icon: faCube,
        run: go(`/c/${connId}/kube/${o.kind}~${o.metadata.namespace ?? '_'}~${o.metadata.name}/summary`),
      });
    }
  }
  return out;
});

const filtered = $derived.by(() => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return items
    .filter(i => tab === 'all' || i.category === tab)
    .filter(i => {
      const hay = `${i.label} ${i.detail ?? ''} ${i.ext?.displayName ?? ''}`.toLowerCase();
      return terms.every(t => hay.includes(t));
    })
    .slice(0, 60);
});

$effect(() => {
  if (ui.paletteOpen) {
    query = '';
    selected = 0;
    tick()
      .then(() => input?.focus())
      .catch(console.error);
  }
});

function close(): void {
  ui.paletteOpen = false;
}

function runItem(index: number): void {
  const item = filtered[index];
  if (!item) return;
  close();
  item.run();
}

function onInput(): void {
  selected = 0;
}

function selectTab(id: Category | 'all'): void {
  tab = id;
  selected = 0;
  input?.focus();
}

function onWindowKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    ui.paletteOpen = !ui.paletteOpen;
    return;
  }
  if (!ui.paletteOpen) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowDown') {
    e.preventDefault();
    selected = Math.min(filtered.length - 1, selected + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selected = Math.max(0, selected - 1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    runItem(selected);
  }
}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if ui.paletteOpen}
  <button class="fixed inset-0 bg-[var(--pd-modal-fade)] opacity-60 z-50 cursor-default" aria-label="Close command palette" onclick={close}></button>
  <div class="absolute m-auto left-0 right-0 top-[38px] z-50" role="dialog" aria-label="Command palette">
    <div class="flex justify-center items-center mt-1">
      <div class="bg-[var(--pd-content-card-bg)] w-[700px] max-h-fit shadow-lg p-2 rounded-sm shadow-[var(--pd-input-field-stroke)] text-base">
        <div class="w-full flex flex-row gap-2 items-center px-1 border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-focused-bg)] rounded-sm">
          <Icon icon={faMagnifyingGlass} class="text-[var(--pd-input-field-placeholder-text)]" />
          <input
            bind:this={input}
            bind:value={query}
            oninput={onInput}
            aria-label="Command palette command input"
            placeholder="Search connections, resources and commands…"
            class="w-full py-1.5 bg-transparent outline-hidden text-[var(--pd-input-field-focused-text)] placeholder:text-[var(--pd-input-field-placeholder-text)]" />
        </div>
        <div class="flex flex-row m-2">
          {#each TABS as t (t.id)}
            <Button type="tab" selected={tab === t.id} onclick={selectTab.bind(undefined, t.id)}>{t.label}</Button>
          {/each}
        </div>
        <ul class="max-h-[50vh] overflow-y-auto flex flex-col mt-1">
          {#each filtered as item, i (item.id)}
            <li class="flex w-full flex-row" aria-label={item.label}>
              <button
                onclick={runItem.bind(undefined, i)}
                class="text-[var(--pd-dropdown-item-text)] text-left relative w-full rounded-sm px-1 {i === selected
                  ? 'bg-[var(--pd-modal-dropdown-highlight)]'
                  : 'hover:bg-[var(--pd-dropdown-bg)]'}">
                <div class="text-base py-[3pt] flex items-center gap-2">
                  <span class="w-4 h-4 flex items-center justify-center shrink-0"><AppIcon icon={item.icon} size="16px" /></span>
                  <span class="truncate">{item.label}</span>
                  {#if item.detail}<span class="text-xs text-[var(--pd-content-sub-header)] truncate">{item.detail}</span>{/if}
                  <span class="grow"></span>
                  {#if item.ext}
                    <span class="flex items-center gap-1 text-xs text-[var(--pd-content-sub-header)]">
                      <AppIcon icon={item.ext.icon} size="12px" />{item.ext.displayName}
                    </span>
                  {/if}
                </div>
              </button>
            </li>
          {/each}
        </ul>
        {#if filtered.length === 0}
          <div class="flex grow items-center flex-col gap-2 py-4 text-[var(--pd-content-text)]">
            <div class="text-lg font-bold">No results matching '{query}' found</div>
          </div>
        {/if}
        <div class="border-[var(--pd-global-nav-bg-border)] border-t-[1px] flex flex-row items-center px-3 pt-2 mt-1 gap-4 text-sm text-[var(--pd-button-tab-text)]">
          <span class="flex items-center gap-2"><span class="bg-[var(--pd-action-button-bg)] rounded-sm p-1.5"><EnterIcon size="12" /></span>To select</span>
          <span class="flex items-center gap-2">
            <span class="bg-[var(--pd-action-button-bg)] rounded-sm p-1.5"><ArrowUpIcon size="12" /></span>
            <span class="bg-[var(--pd-action-button-bg)] rounded-sm p-1.5"><ArrowDownIcon size="12" /></span>To navigate
          </span>
          <span class="flex items-center gap-2"><span class="bg-[var(--pd-action-button-bg)] rounded-sm text-base px-1 py-0.5">esc</span>To close</span>
          <span class="grow text-right">{items.length} items from {registry.extensions.length} extensions</span>
        </div>
      </div>
    </div>
  </div>
{/if}
