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

/** Result groups, in display order (docs/ia.md rule 6 at scale). */
const GROUP_ORDER = ['Pages', 'Connections', 'Sections', 'Tools', 'Create', 'Commands', 'Containers and images', 'Kubernetes objects'] as const;
type Group = (typeof GROUP_ORDER)[number];

interface PaletteItem {
  id: string;
  label: string;
  detail?: string;
  /** Extra searchable text not shown (e.g. a container's full image reference). */
  keywords?: string;
  category: Category;
  group: Group;
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
/** Width of the title-bar search field: the palette input replaces it exactly (Scaling rule 11). */
let fieldWidth = $state(340);

$effect(() => {
  if (!ui.paletteOpen) return;
  const field = document.getElementById('Search button');
  if (field) fieldWidth = Math.round(field.getBoundingClientRect().width);
});

const items: PaletteItem[] = $derived.by(() => {
  const out: PaletteItem[] = [];
  const go = (path: string) => (): void => navigate(path);
  out.push({ id: 'go:dashboard', group: 'Pages', label: 'Dashboard', category: 'goto', icon: faArrowRight, run: go('/') });
  out.push({ id: 'go:extensions', group: 'Pages', label: 'Extensions', category: 'goto', icon: faArrowRight, run: go('/extensions') });
  out.push({ id: 'go:accounts', group: 'Pages', label: 'Accounts', category: 'goto', icon: faArrowRight, run: go('/accounts') });
  for (const [s, title] of [['resources', 'Resources'], ['cli-tools', 'CLI Tools'], ['registries', 'Registries'], ['proxy', 'Proxy'], ['preferences', 'Preferences']]) {
    out.push({ id: `go:settings:${s}`, group: 'Pages', label: `Settings › ${title}`, category: 'goto', icon: faArrowRight, run: go(`/settings/${s}`) });
  }
  for (const s of registry.settings) {
    out.push({ id: `go:settings:${s.id}`, group: 'Pages', label: `Settings › ${s.title}`, category: 'goto', icon: s.icon ?? s.ext.icon, ext: s.ext, run: go(`/settings/${s.id}`) });
  }
  for (const c of registry.activeConnections) {
    out.push({ id: `go:${c.id}`, group: 'Connections', label: c.name, detail: c.providerName, category: 'goto', icon: c.icon, ext: c.ext, run: go(connectionHome(c)) });
    for (const r of coreResourcesOf(c)) {
      out.push({ id: `go:${c.id}:${r.id}`, group: 'Sections', label: `${c.name} › ${r.label}`, category: 'goto', icon: r.icon as IconRef, run: go(`/c/${c.id}/${r.id}`) });
    }
    for (const s of registry.navSectionsFor(c)) {
      out.push({ id: `go:${c.id}:${s.id}`, group: 'Sections', label: `${c.name} › ${s.label}`, category: 'goto', icon: s.icon ?? s.ext.icon, ext: s.ext, run: go(`/c/${c.id}/${s.id}`) });
    }
    if (c.status === 'stopped') {
      out.push({ id: `cmd:start:${c.id}`, group: 'Commands', label: `${startVerb(c)} ${c.name}`, category: 'command', icon: faPlay, run: (): void => startConnection(c.id, c.name) });
    } else if (c.status === 'started') {
      out.push({ id: `cmd:stop:${c.id}`, group: 'Commands', label: `Stop ${c.name}`, category: 'command', icon: faStop, run: (): void => stopConnection(c.id, c.name) });
    }
  }
  for (const t of registry.tools) {
    out.push({ id: `go:tool:${t.id}`, group: 'Tools', label: t.label, category: 'goto', icon: t.icon ?? t.ext.icon, ext: t.ext, run: go(`/tools/${t.id}`) });
  }
  for (const f of registry.factories) {
    out.push({ id: `cmd:factory:${f.id}`, group: 'Create', label: f.label, category: 'command', icon: faPlus, ext: f.ext, run: go(`/settings/create/${f.id}`) });
  }
  for (const c of registry.commands) {
    out.push({ id: `cmd:${c.id}`, group: 'Commands', label: c.category ? `${c.category}: ${c.title}` : c.title, category: 'command', icon: c.icon ?? faBolt, ext: c.ext, run: c.run });
  }
  const conns = new Map(registry.activeConnections.map(c => [c.id, c]));
  for (const c of world.containers) {
    const conn = conns.get(c.engineId);
    if (!conn) continue;
    out.push({ id: `res:c:${c.id}`, group: 'Containers and images', label: c.name, detail: `container · ${shortImage(c.image)} · ${conn.name}`, keywords: c.image, category: 'resource', icon: faCube, run: go(`/c/${c.engineId}/containers/${c.id}/summary`) });
  }
  for (const i of world.images) {
    const conn = conns.get(i.engineId);
    if (!conn) continue;
    out.push({ id: `res:i:${i.id}`, group: 'Containers and images', label: `${shortImage(i.name)}:${i.tag}`, detail: `image · ${conn.name}`, keywords: `${i.name}:${i.tag}`, category: 'resource', icon: faCube, run: go(`/c/${i.engineId}/images/${i.id}/summary`) });
  }
  for (const [connId, objects] of Object.entries(world.kube)) {
    const conn = conns.get(connId);
    if (!conn) continue;
    for (const o of objects) {
      out.push({
        id: `res:k:${o.metadata.uid}`, group: 'Kubernetes objects',
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

const PER_GROUP_IDLE = 4;
const PER_GROUP_QUERY = 8;

/** Filtered results grouped by kind; each group capped, with a "+n more" hint. */
const groups = $derived.by(() => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matched = items
    .filter(i => tab === 'all' || i.category === tab)
    .filter(i => {
      const hay = `${i.label} ${i.detail ?? ''} ${i.keywords ?? ''} ${i.ext?.displayName ?? ''}`.toLowerCase();
      return terms.every(t => hay.includes(t));
    });
  const cap = tab !== 'all' ? 60 : terms.length ? PER_GROUP_QUERY : PER_GROUP_IDLE;
  return GROUP_ORDER.map(g => {
    const all = matched.filter(i => i.group === g);
    return { group: g, items: all.slice(0, cap), more: Math.max(0, all.length - cap) };
  }).filter(g => g.items.length);
});

const filtered = $derived(groups.flatMap(g => g.items));

/** Provenance chip only when it adds information (not "Ansible … Ansible"). */
function showProvenance(item: PaletteItem): boolean {
  if (!item.ext) return false;
  const ext = item.ext.displayName.toLowerCase();
  const label = item.label.toLowerCase();
  return !ext.includes(label) && !label.includes(ext);
}

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
  <!--
    Grows out of the title-bar search field (TitleBar: 38px bar, 26px field 6px from
    the top, centred in the window): the palette input sits exactly over that field,
    replacing it in place, and the results open below it.
  -->
  <div class="fixed inset-x-0 top-[5px] z-50 pointer-events-none" role="dialog" aria-label="Command palette">
    <div class="flex justify-center items-start">
      <div class="pointer-events-auto bg-[var(--pd-content-card-bg)] w-[700px] max-w-[calc(100vw-24px)] max-h-fit shadow-lg px-2 pb-2 rounded-md border border-[var(--pd-modal-border)] text-base">
        <div style:width="{fieldWidth}px" class="mx-auto max-w-full h-[26px] flex flex-row gap-2 items-center px-3 border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-focused-bg)] rounded-md">
          <Icon icon={faMagnifyingGlass} class="text-[var(--pd-input-field-placeholder-text)]" />
          <input
            bind:this={input}
            bind:value={query}
            oninput={onInput}
            aria-label="Command palette command input"
            placeholder="Search connections, resources and commands…"
            class="w-full h-full py-0 bg-transparent outline-hidden text-[var(--pd-input-field-focused-text)] placeholder:text-[var(--pd-input-field-placeholder-text)]" />
        </div>
        <div class="flex flex-row m-2">
          {#each TABS as t (t.id)}
            <Button type="tab" selected={tab === t.id} onclick={selectTab.bind(undefined, t.id)}>{t.label}</Button>
          {/each}
        </div>
        <ul class="max-h-[56vh] overflow-y-auto flex flex-col mt-1" aria-label="Results">
          {#each groups as g (g.group)}
            <li class="px-1 pt-2 pb-0.5 flex items-baseline gap-2 text-sm font-semibold text-[var(--pd-nav-group-header)]" role="presentation">
              {g.group}
              {#if g.more}<span class="font-normal text-[var(--pd-table-body-text)]">+{g.more} more{query ? '' : ' – type to filter'}</span>{/if}
            </li>
            {#each g.items as item (item.id)}
              {@const i = filtered.indexOf(item)}
              <li class="flex w-full flex-row" aria-label={item.label}>
                <button
                  onclick={runItem.bind(undefined, i)}
                  class="text-[var(--pd-dropdown-item-text)] text-left relative w-full rounded-sm px-1 {i === selected
                    ? 'bg-[var(--pd-modal-dropdown-highlight)]'
                    : 'hover:bg-[var(--pd-dropdown-bg)]'}">
                  <div class="text-base py-[3pt] flex items-center gap-2">
                    <span class="w-4 h-4 flex items-center justify-center shrink-0"><AppIcon icon={item.icon} size="16px" /></span>
                    <span class="truncate">{item.label}</span>
                    {#if item.detail && item.detail !== item.ext?.displayName}<span class="text-xs text-[var(--pd-table-body-text)] truncate">{item.detail}</span>{/if}
                    <span class="grow"></span>
                    {#if item.ext && showProvenance(item)}
                      <span class="flex items-center gap-1 text-xs text-[var(--pd-table-body-text)] shrink-0" title="Contributed by {item.ext.displayName}">
                        <AppIcon icon={item.ext.icon} size="12px" />{item.ext.displayName}
                      </span>
                    {/if}
                  </div>
                </button>
              </li>
            {/each}
          {/each}
        </ul>
        {#if filtered.length === 0}
          <div class="flex grow items-center flex-col gap-2 py-4 text-[var(--pd-content-text)]">
            <div class="text-lg font-bold">No results matching '{query}' found</div>
          </div>
        {/if}
        <div class="border-[var(--pd-global-nav-bg-border)] border-t-[1px] flex flex-row items-center px-3 pt-2 mt-1 gap-4 text-sm text-[var(--pd-table-body-text)]">
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
