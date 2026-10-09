<script lang="ts">
/**
 * P5 Lens-style: thin hotbar of connection avatars (colour + initials +
 * provider icon + status), an activity column with grouped sections for the
 * selected connection, a Catalog home, tabs, and a bottom dock with
 * terminals, logs and Edit YAML.
 */
import { faChevronDown, faChevronRight, faCircleInfo, faEllipsisVertical, faLayerGroup, faPlus, faToolbox } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import SettingsIcon from '#lib/images/SettingsIcon.svelte';

import { CONN_GROUPS, CONNECTIONS, conn as findConn, type LabSection, type LabTarget, PANEL_SESSIONS, STATUS_DOT, TOOL_CATEGORIES, TOOLS, YAML_SESSION } from '../data.ts';
import { HOME, lab, Workbench } from '../lab.svelte.ts';
import AppFrame from '../ui/AppFrame.svelte';
import BottomPanel from '../ui/BottomPanel.svelte';
import ConnIcon from '../ui/ConnIcon.svelte';
import Content from '../ui/Content.svelte';
import Rail from '../ui/Rail.svelte';
import TabStrip from '../ui/TabStrip.svelte';

const wb = new Workbench();
let sel = $state('ocp-dev');
let catalogTab = $state<'connections' | 'tools'>('connections');
let collapsed = $state<string[]>([]);
wb.home = { kind: 'list', connId: 'ocp-dev', sectionId: 'kpods' };
$effect.pre(() => {
  wb.resetFor(lab.tabs);
});

const items = [
  { id: 'catalog', label: 'Catalog', icon: faLayerGroup },
  ...CONNECTIONS.map(c => ({ id: c.id, label: c.name, connId: c.id, group: c.group })),
  { id: 'tools', label: 'Tools', icon: faToolbox, group: 'Tools' },
];

const c = $derived(findConn(sel));

const LENS_GROUPS: [string, string[]][] = [
  ['Workloads', ['kpods', 'deployments', 'jobs', 'cronjobs', 'containers', 'pods']],
  ['Images & storage', ['images', 'volumes', 'pvcs']],
  ['Network', ['services', 'routes', 'networks']],
  ['Config', ['config']],
  ['Cluster', ['nodes']],
];

const groups = $derived.by((): [string, LabSection[]][] => {
  if (!c) return [];
  const used = new Set<string>();
  const out: [string, LabSection[]][] = [];
  for (const [g, ids] of LENS_GROUPS) {
    const list = c.sections.filter(s => !s.ext && ids.includes(s.id));
    list.forEach(s => used.add(s.id));
    if (list.length) out.push([g, list]);
  }
  const rest = c.sections.filter(s => !s.ext && !used.has(s.id));
  if (rest.length) out.push(['More', rest]);
  const ext = c.sections.filter(s => s.ext);
  if (ext.length) out.push(['Extensions', ext]);
  return out;
});

function onrail(id: string): void {
  if (id === 'add') {
    lab.openCreate('Add connection');
    return;
  }
  if (id === 'settings') {
    wb.open({ kind: 'settings' });
    return;
  }
  sel = id;
  const cc = findConn(id);
  if (cc) wb.goHome({ kind: 'connection', connId: cc.id });
  else if (id === 'catalog') wb.goHome({ kind: 'dashboard' });
}

function open(t: LabTarget, opts: { preview?: boolean } = {}): void {
  if (t.kind === 'list' || t.kind === 'connection') {
    if (t.connId) sel = t.connId;
    wb.goHome(t);
    return;
  }
  wb.open(t, opts);
}

function toggle(g: string): void {
  collapsed = collapsed.includes(g) ? collapsed.filter(x => x !== g) : [...collapsed, g];
}
</script>

{#snippet secRow(id: string | undefined, label: string, icon: unknown, count?: number, ext?: string)}
  {@const on = c && wb.active === HOME && wb.home?.connId === c.id && (id ? wb.home?.sectionId === id : wb.home?.kind === 'connection')}
  <button
    type="button"
    class="w-full flex items-center gap-2 h-7 pl-6 pr-2 text-left text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]"
    class:bg-[var(--pd-secondary-nav-selected-bg)]={on}
    class:!text-[var(--pd-secondary-nav-text-selected)]={on}
    onclick={(): void => {
      if (c) wb.goHome(id ? { kind: 'list', connId: c.id, sectionId: id } : { kind: 'connection', connId: c.id });
    }}>
    <span class="w-4 flex justify-center" style:font-size="13px"><AppIcon icon={icon as never} size="15px" /></span>
    <span class="flex-1 truncate">{label}</span>
    {#if ext}<AppIcon icon={ext} size="12px" />{/if}
    {#if count !== undefined}<span class="text-sm opacity-50">{count}</span>{/if}
  </button>
{/snippet}

<AppFrame>
  <Rail
    mode={lab.rail}
    avatar
    selected={sel}
    onselect={onrail}
    {items}
    bottom={[
      { id: 'add', label: 'Add connection', icon: faPlus },
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ]}
    label="Hotbar" />
  {#if c}
    <aside class="flex flex-col w-[220px] shrink-0 h-full bg-[var(--pd-secondary-nav-bg)] border-r border-[var(--pd-global-nav-bg-border)] overflow-auto">
      <div class="flex items-center gap-2 px-3 h-12 shrink-0 border-b border-[var(--pd-global-nav-bg-border)]">
        <ConnIcon connId={c.id} avatar size={28} ring="var(--pd-secondary-nav-bg)" />
        <div class="min-w-0 flex-1">
          <div class="font-semibold truncate text-[var(--pd-secondary-nav-header-text)]">{c.name}</div>
          <div class="text-xs truncate text-[var(--pd-content-sub-header)]">{c.product} · {c.status}</div>
        </div>
        <AppIcon icon={faEllipsisVertical} />
      </div>
      <div class="py-1">
        {@render secRow(undefined, 'Overview', faCircleInfo)}
        {#each groups as [g, list] (g)}
          <button type="button" class="w-full flex items-center gap-1.5 h-7 px-2 text-left font-semibold text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]" onclick={(): void => toggle(g)}>
            <span class="w-3 text-[9px]"><AppIcon icon={collapsed.includes(g) ? faChevronRight : faChevronDown} /></span>{g}
          </button>
          {#if !collapsed.includes(g)}
            {#each list as s (s.id)}{@render secRow(s.id, s.label, s.icon, s.count, s.ext?.icon)}{/each}
          {/if}
        {/each}
      </div>
    </aside>
  {:else if sel === 'tools'}
    <aside class="flex flex-col w-[220px] shrink-0 h-full bg-[var(--pd-secondary-nav-bg)] border-r border-[var(--pd-global-nav-bg-border)] overflow-auto py-1">
      {#each TOOL_CATEGORIES as cat (cat)}
        <div class="px-3 pt-2 pb-1 text-sm font-semibold text-[var(--pd-nav-group-header)]">{cat}</div>
        {#each TOOLS.filter(t => t.category === cat) as t (t.id)}
          <button type="button" class="w-full flex items-center gap-2 h-7 px-3 text-left text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]" onclick={(): void => wb.open({ kind: 'tool', toolId: t.id })}>
            <AppIcon icon={t.icon} size="16px" /><span class="truncate">{t.name}</span>
          </button>
        {/each}
      {/each}
    </aside>
  {/if}
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <TabStrip {wb} homeLabel={sel === 'catalog' ? 'Catalog' : undefined} />
    <div class="flex-1 min-h-0 overflow-hidden">
      {#if sel === 'catalog' && wb.active === HOME}
        <div class="h-full overflow-auto">
          <div class="flex items-center gap-4 px-5 pt-4 pb-2">
            <h1 class="text-xl font-bold text-[var(--pd-content-header)]">Catalog</h1>
            {#each [['connections', `Connections (${CONNECTIONS.length})`], ['tools', `Tools (${TOOLS.length})`]] as [id, l] (id)}
              <button type="button" class="pb-1 border-b-2" class:border-[var(--pd-tab-highlight)]={catalogTab === id} class:border-transparent={catalogTab !== id} onclick={(): void => { catalogTab = id as typeof catalogTab; }}>{l}</button>
            {/each}
          </div>
          {#if catalogTab === 'connections'}
            <div class="px-5">
              {#each CONN_GROUPS as g (g)}
                <div class="pt-3 pb-1 text-sm font-semibold text-[var(--pd-nav-group-header)]">{g}</div>
                {#each CONNECTIONS.filter(x => x.group === g) as cc (cc.id)}
                  <button type="button" class="w-full grid grid-cols-[40px_1fr_200px_100px] items-center h-10 px-2 text-left border-b border-[var(--pd-content-divider)] hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => onrail(cc.id)}>
                    <ConnIcon connId={cc.id} avatar size={26} dot={false} />
                    <span class="font-medium truncate">{cc.name}</span>
                    <span class="text-sm opacity-70 truncate">{cc.product}</span>
                    <span class="flex items-center gap-1.5 text-sm"><span class="w-2 h-2 rounded-full {STATUS_DOT[cc.status]}"></span>{cc.status}</span>
                  </button>
                {/each}
              {/each}
            </div>
          {:else}
            <Content target={{ kind: 'tools' }} onopen={open} />
          {/if}
        </div>
      {:else}
        {#key wb.active === HOME ? JSON.stringify(wb.home) : wb.active}<Content target={wb.activeTarget} onopen={open} />{/key}
      {/if}
    </div>
    <BottomPanel sessions={[...PANEL_SESSIONS.slice(0, 2), YAML_SESSION, ...PANEL_SESSIONS.slice(2)]} />
  </div>
</AppFrame>
