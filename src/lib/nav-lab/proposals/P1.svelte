<script lang="ts">
/**
 * P1 IDE / Explorer: activity rail, Explorer tool window (tree connection →
 * resource type → resources, JetBrains Services-like), editor tabs with
 * preview tabs and provider badges, bottom panel.
 */
import { faChevronDown, faChevronRight, faDiagramProject, faFolderTree, faMagnifyingGlass, faMinus, faPlus, faPuzzlePiece, faToolbox, faUser } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';
import DashboardIcon from '#lib/images/DashboardIcon.svelte';
import SettingsIcon from '#lib/images/SettingsIcon.svelte';

import { CONN_GROUPS, CONNECTIONS, type LabTarget, PANEL_SESSIONS, resourcesOf, STATUS_DOT, targetKey, TOOL_CATEGORIES, TOOLS, WORKFLOWS } from '../data.ts';
import { lab, Workbench } from '../lab.svelte.ts';
import AppFrame from '../ui/AppFrame.svelte';
import BottomPanel from '../ui/BottomPanel.svelte';
import ConnIcon from '../ui/ConnIcon.svelte';
import Content from '../ui/Content.svelte';
import Rail from '../ui/Rail.svelte';
import TabStrip from '../ui/TabStrip.svelte';

type TreeIcon = { type: 'conn'; id: string } | { type: 'section'; icon: IconRef; ext?: string } | { type: 'dot'; status: string };

const wb = new Workbench();
$effect.pre(() => {
  wb.resetFor(lab.tabs);
});

let activity = $state<'explorer' | 'workflows' | 'tools' | undefined>('explorer');
let filter = $state('');
let scope = $state<'all' | 'running'>('all');
let expanded = $state<string[]>(['g:Engines', 'g:Kubernetes', 'g:VMs & services', 'podman-machine-default', 'podman-machine-default/containers', 'ocp-dev']);

const activeKey = $derived(wb.active);

function toggle(id: string): void {
  expanded = expanded.includes(id) ? expanded.filter(x => x !== id) : [...expanded, id];
}

function onrail(id: string): void {
  if (id === 'explorer' || id === 'workflows' || id === 'tools') {
    activity = activity === id ? undefined : id;
    return;
  }
  const map: Record<string, LabTarget> = { dashboard: { kind: 'dashboard' }, extensions: { kind: 'extensions' }, accounts: { kind: 'accounts' }, settings: { kind: 'settings' } };
  wb.open(map[id]);
}

function open(t: LabTarget, opts: { preview?: boolean } = {}): void {
  wb.open(t, opts);
}

const f = $derived(filter.trim().toLowerCase());
const conns = $derived(CONNECTIONS.filter(c => scope === 'all' || c.status === 'running'));

function matches(connId: string, sectionId: string): number {
  return f ? resourcesOf(connId, sectionId).filter(r => r.name.toLowerCase().includes(f)).length : 0;
}
</script>

{#snippet treeRow(depth: number, key: string, label: string, opts: { chevron?: boolean; open?: boolean; onclick: () => void; ondbl?: () => void; icon?: TreeIcon; count?: number; dim?: string; sel?: boolean })}
  <div
    role="treeitem"
    tabindex="-1"
    aria-selected={opts.sel}
    aria-expanded={opts.chevron ? opts.open : undefined}
    class="flex items-center gap-1.5 h-6 pr-2 cursor-pointer whitespace-nowrap text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]"
    class:bg-[var(--pd-secondary-nav-selected-bg)]={opts.sel}
    class:!text-[var(--pd-secondary-nav-text-selected)]={opts.sel}
    style:padding-left="{6 + depth * 14}px"
    onclick={opts.onclick}
    ondblclick={opts.ondbl}
    onkeydown={(): void => undefined}>
    <span
      class="w-3 shrink-0 text-[9px] opacity-70"
      role="presentation"
      onclick={(e): void => {
        if (opts.chevron) {
          e.stopPropagation();
          toggle(key);
        }
      }}>{#if opts.chevron}<AppIcon icon={opts.open ? faChevronDown : faChevronRight} />{/if}</span>
    {#if opts.icon?.type === 'conn'}
      <ConnIcon connId={opts.icon.id} size={16} ring="var(--pd-secondary-nav-bg)" />
    {:else if opts.icon?.type === 'section'}
      <span class="relative flex w-4 h-4 items-center justify-center shrink-0" style:font-size="13px"
        ><AppIcon icon={opts.icon.icon} size="15px" />{#if opts.icon.ext}<span class="absolute -bottom-1 -right-1.5 flex"><AppIcon icon={opts.icon.ext} size="9px" /></span>{/if}</span>
    {:else if opts.icon?.type === 'dot'}
      <span class="w-2 h-2 mx-1 rounded-full shrink-0 {STATUS_DOT[opts.icon.status] ?? STATUS_DOT.running}"></span>
    {/if}
    <span class="truncate">{label}</span>
    {#if opts.dim}<span class="truncate text-sm opacity-50">{opts.dim}</span>{/if}
    <span class="flex-1"></span>
    {#if opts.count !== undefined}<span class="text-sm opacity-50">{opts.count}</span>{/if}
  </div>
{/snippet}

<AppFrame>
  <Rail
    mode={lab.rail}
    selected={activity}
    onselect={onrail}
    label="Activities"
    items={[
      { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
      { id: 'explorer', label: 'Explorer', icon: faFolderTree },
      { id: 'workflows', label: 'Workflows', icon: faDiagramProject },
      { id: 'tools', label: 'Tools', icon: faToolbox, badge: TOOLS.length },
      { id: 'extensions', label: 'Extensions', icon: faPuzzlePiece },
    ]}
    bottom={[
      { id: 'accounts', label: 'Accounts', icon: faUser },
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ]} />
  {#if activity}
    <aside class="flex flex-col w-[272px] shrink-0 h-full bg-[var(--pd-secondary-nav-bg)] border-r border-[var(--pd-global-nav-bg-border)]">
      <div class="flex items-center h-9 px-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">
        <span class="flex-1">{activity === 'explorer' ? 'Explorer' : activity === 'tools' ? `Tools (${TOOLS.length})` : 'Workflows'}</span>
        {#if activity === 'explorer'}
          <button type="button" aria-label="New connection" title="New connection" class="w-6 h-6 rounded hover:bg-[var(--pd-secondary-nav-text-hover-bg)]" onclick={(): void => lab.openCreate('Create connection')}><AppIcon icon={faPlus} size="xs" /></button>
          <button type="button" aria-label="Collapse all" title="Collapse all" class="w-6 h-6 rounded hover:bg-[var(--pd-secondary-nav-text-hover-bg)]" onclick={(): void => { expanded = ['g:Engines', 'g:Kubernetes', 'g:VMs & services']; }}><AppIcon icon={faMinus} size="xs" /></button>
        {/if}
      </div>
      <div class="px-2 pb-2 flex flex-col gap-1.5 shrink-0">
        <label class="flex items-center gap-2 h-7 px-2 rounded-md border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-bg)] text-[var(--pd-input-field-icon)]">
          <AppIcon icon={faMagnifyingGlass} size="xs" />
          <input class="flex-1 min-w-0 bg-transparent outline-none text-[var(--pd-input-field-focused-text)]" placeholder={activity === 'explorer' ? 'Filter connections and resources' : 'Filter'} bind:value={filter} />
        </label>
        {#if activity === 'explorer'}
          <div class="flex gap-1 text-sm">
            {#each [['all', `All ${CONNECTIONS.length}`], ['running', `Running ${CONNECTIONS.filter(c => c.status === 'running').length}`]] as [id, l] (id)}
              <button type="button" class="px-2 h-5 rounded-full border" class:border-[var(--pd-tab-highlight)]={scope === id} class:text-[var(--pd-tab-text-highlight)]={scope === id} class:border-[var(--pd-content-divider)]={scope !== id} onclick={(): void => { scope = id as typeof scope; }}>{l}</button>
            {/each}
          </div>
        {/if}
      </div>
      <div role="tree" class="flex-1 min-h-0 overflow-auto pb-2 text-base">
        {#if activity === 'explorer'}
          {#each CONN_GROUPS as g (g)}
            {@const list = conns.filter(c => c.group === g && (!f || c.name.includes(f) || c.sections.some(s => matches(c.id, s.id) > 0)))}
            {#if list.length}
              {@render treeRow(0, `g:${g}`, g, { chevron: true, open: expanded.includes(`g:${g}`), onclick: () => toggle(`g:${g}`), count: list.length })}
              {#if expanded.includes(`g:${g}`) || f}
                {#each list as c (c.id)}
                  {@const cOpen = expanded.includes(c.id) || !!f}
                  {@render treeRow(1, c.id, c.name, {
                    chevron: true,
                    open: cOpen,
                    sel: activeKey === targetKey({ kind: 'connection', connId: c.id }),
                    onclick: () => { toggle(c.id); open({ kind: 'connection', connId: c.id }, { preview: true }); },
                    ondbl: () => open({ kind: 'connection', connId: c.id }),
                    icon: { type: 'conn', id: c.id },
                    dim: c.status === 'running' ? undefined : c.status,
                  })}
                  {#if cOpen}
                    {#each c.sections.filter(s => !f || matches(c.id, s.id) > 0) as s (s.id)}
                      {@const key = `${c.id}/${s.id}`}
                      {@const sOpen = expanded.includes(key) || !!f}
                      {@render treeRow(2, key, s.label, {
                        chevron: s.count > 0,
                        open: sOpen,
                        sel: activeKey === targetKey({ kind: 'list', connId: c.id, sectionId: s.id }),
                        onclick: () => open({ kind: 'list', connId: c.id, sectionId: s.id }, { preview: true }),
                        ondbl: () => open({ kind: 'list', connId: c.id, sectionId: s.id }),
                        icon: { type: 'section', icon: s.icon, ext: s.ext?.icon },
                        count: f ? matches(c.id, s.id) : s.count,
                      })}
                      {#if sOpen}
                        {#each resourcesOf(c.id, s.id).filter(r => !f || r.name.toLowerCase().includes(f)).slice(0, 40) as r (r.id)}
                          {@const t = { kind: 'resource', connId: c.id, sectionId: s.id, resId: r.id } as LabTarget}
                          {@render treeRow(3, r.id, r.name, {
                            sel: activeKey === targetKey(t),
                            onclick: () => open(t, { preview: true }),
                            ondbl: () => open(t),
                            icon: { type: 'dot', status: r.status },
                            dim: r.group,
                          })}
                        {/each}
                      {/if}
                    {/each}
                  {/if}
                {/each}
              {/if}
            {/if}
          {/each}
        {:else if activity === 'tools'}
          {#each TOOL_CATEGORIES as cat (cat)}
            {@const list = TOOLS.filter(t => t.category === cat && t.name.toLowerCase().includes(f))}
            {#if list.length}
              <div class="px-3 pt-2 pb-1 text-sm font-semibold text-[var(--pd-nav-group-header)]">{cat}</div>
              {#each list as t (t.id)}
                {@const tk = targetKey({ kind: 'tool', toolId: t.id })}
                <button type="button" class="w-full flex items-center gap-2 h-7 px-3 text-left text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]" class:bg-[var(--pd-secondary-nav-selected-bg)]={activeKey === tk} onclick={(): void => open({ kind: 'tool', toolId: t.id })}>
                  <AppIcon icon={t.icon} size="16px" /><span class="truncate">{t.name}</span>
                </button>
              {/each}
            {/if}
          {/each}
        {:else}
          {#each WORKFLOWS as w (w.id)}
            <button type="button" class="w-full flex items-center gap-2 h-8 px-3 text-left text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]" onclick={(): void => open({ kind: 'workflow', workflowId: w.id })}>
              <AppIcon icon={w.icon} size="16px" /><span class="truncate">{w.name}</span>
            </button>
          {/each}
        {/if}
      </div>
    </aside>
  {/if}
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <TabStrip {wb} />
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key wb.active}<Content target={wb.activeTarget} onopen={open} selectedRes={wb.activeTarget?.resId} />{/key}
    </div>
    <BottomPanel sessions={PANEL_SESSIONS} />
  </div>
</AppFrame>

