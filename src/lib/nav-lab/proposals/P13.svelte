<script lang="ts">
/**
 * P13 P1 without the rail: editor tabs with the Dashboard as a fixed first
 * tab (home glyph), one shared compact header for every tab (lists with the
 * search inline), PD tables for lists (Quadlets included), PD details tabs,
 * logs / terminals / TTY as side-by-side panes in the bottom panel, Grype scan
 * tabs, Ctrl+F inside code views. One left panel: the connection switcher, a
 * filter, then the selected connection as a tree (resource types ▸ resources,
 * contributed sections with their extension logo, extension sub-trees) and its
 * Extensions pages. Right-click a tree item for its actions. Lab toggle
 * "Install: Vanilla | All extensions" switches what is installed.
 */
import { faChevronDown, faChevronRight, faCircleInfo, faEllipsisVertical, faMagnifyingGlass, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { untrack } from 'svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { IconRef } from '#lib/ext/types.ts';

import {
  conn as findConn,
  FEW_TABS,
  type LabResource,
  type LabTarget,
  MANY_TABS,
  PANEL_SESSIONS,
  resource,
  resourcesOf,
  section as findSection,
  STATUS_DOT,
  targetKey,
  tool as findTool,
} from '../data.ts';
import { HOME, lab, Workbench } from '../lab.svelte.ts';
import Frame from '../r2/Frame.svelte';
import SimpleSwitcher from '../r2/SimpleSwitcher.svelte';
import { extPagesFor, labConns } from '../r2/simple.ts';
import TitleActions from '../r2/TitleActions.svelte';
import ConnView from '../r3/ConnView.svelte';
import ExtensionsView from '../r3/ExtensionsView.svelte';
import { connVisible, isInstalled, sectionVisible, toolVisible } from '../r3/exts.ts';
import HomeDashboard from '../r3/HomeDashboard.svelte';
import KubePlayView from '../r3/KubePlayView.svelte';
import ListView from '../r3/ListView.svelte';
import ScanView from '../r3/ScanView.svelte';
import SettingsView from '../r3/SettingsView.svelte';
import { connActions, isUp, live, type MenuItem, openMenu, resActions, resStatus } from '../r3/live.svelte.ts';
import NodeView from '../r3/NodeView.svelte';
import { TREE_PROVIDERS, type TreeNode, treeRoot } from '../r3/trees.ts';
import BottomPanel from '../ui/BottomPanel.svelte';
import Content from '../ui/Content.svelte';
import TabStrip from '../ui/TabStrip.svelte';

const wb = new Workbench();
wb.home = { kind: 'dashboard' };

function targetVisible(t: LabTarget): boolean {
  const c = findConn(t.connId);
  if (c && !connVisible(c)) return false;
  const s = findSection(c, t.sectionId);
  if (s && !sectionVisible(s)) return false;
  const tl = findTool(t.toolId);
  return !tl || toolVisible(tl);
}

$effect.pre(() => {
  const mode = lab.tabs;
  void lab.install;
  untrack(() => wb.reset((mode === 'many' ? MANY_TABS : FEW_TABS).filter(targetVisible)));
});

$effect(() => {
  live.ondelete = (resId: string): void => {
    for (const t of wb.tabs.filter(x => x.target.resId === resId)) wb.close(t.key);
  };
  return (): void => {
    live.ondelete = undefined;
  };
});

// svelte-ignore state_referenced_locally
let sel = $state(lab.ctx ?? 'podman-machine-default');
let filter = $state('');
/** Expanded tree keys, remembered per connection (sections collapsed by default). */
let expanded = $state<Record<string, string[]>>({});

const c = $derived(findConn(labConns().some(x => x.id === sel) ? sel : labConns()[0]?.id));
const f = $derived(filter.trim().toLowerCase());
const open1 = $derived(c ? (expanded[c.id] ?? []) : []);
const trees = $derived(c ? TREE_PROVIDERS.filter(p => p.connIds.includes(c.id) && isInstalled(p.extId)) : []);
const sections = $derived(c ? c.sections.filter(s => sectionVisible(s) && !trees.some(p => p.replaces.includes(s.id))) : []);
const pages = $derived(extPagesFor(c).filter(t => !trees.some(p => p.extId === t.id) && (!f || t.name.toLowerCase().includes(f))));
const activeKind = $derived(wb.activeTarget?.kind);
const sessions = $derived.by(() => {
  void lab.install;
  void lab.conns;
  return untrack(() => {
    const ids = labConns().map(x => x.id);
    return PANEL_SESSIONS.filter(s => ids.includes(s.connId));
  });
});

function toggle(key: string): void {
  if (!c) return;
  const cur = expanded[c.id] ?? [];
  expanded[c.id] = cur.includes(key) ? cur.filter(x => x !== key) : [...cur, key];
}

function open(t: LabTarget, opts: { preview?: boolean } = {}): void {
  if (t.kind === 'dashboard') {
    wb.active = HOME;
    return;
  }
  if (t.connId && t.connId !== c?.id && labConns().some(x => x.id === t.connId)) sel = t.connId;
  wb.open(t, opts);
}

function select(id: string): void {
  sel = id;
  filter = '';
  open({ kind: 'connection', connId: id }, { preview: true });
}

function rows(sectionId: string): LabResource[] {
  if (!c) return [];
  return resourcesOf(c.id, sectionId).filter(r => !live.deleted.includes(r.id) && (!f || r.name.toLowerCase().includes(f)));
}

function nodeMatches(n: TreeNode): boolean {
  return n.label.toLowerCase().includes(f) || (n.children ?? []).some(nodeMatches);
}

function flat(x: TreeNode): TreeNode[] {
  return [x, ...(x.children ?? []).flatMap(flat)];
}

function nodeMenu(n: TreeNode): MenuItem[] {
  const st = n.status ? (live.status[n.id] ?? n.status) : undefined;
  return [
    { label: 'Open', run: (): void => open({ kind: 'node', connId: c?.id, nodeId: n.id }) },
    { label: 'Start', icon: faPlay, disabled: !st || isUp(st), run: (): void => void (live.status[n.id] = 'running'), sep: true },
    { label: 'Stop', icon: faStop, disabled: !st || !isUp(st), run: (): void => void (live.status[n.id] = 'stopped') },
  ];
}

function rowMenu(t: LabTarget): MenuItem[] | undefined {
  if (t.kind === 'resource') {
    const r = resource(t.resId);
    return r ? resActions(r, open) : undefined;
  }
  if (t.kind === 'connection' && c) return connActions(c, open);
  if (t.kind === 'node' && t.nodeId && c) {
    const n = trees.flatMap(p => flat(treeRoot(p, c.id))).find(x => x.id === t.nodeId);
    return n ? nodeMenu(n) : undefined;
  }
  return undefined;
}
</script>

{#snippet row(depth: number, label: string, o: { key?: string; chevron?: boolean; open?: boolean; target: LabTarget; icon?: IconRef; status?: string; count?: number | string; dim?: string })}
  {@const on = wb.active === targetKey(o.target)}
  {@const menu = rowMenu(o.target)}
  <div
    role="treeitem"
    tabindex="-1"
    aria-selected={on}
    aria-expanded={o.chevron ? o.open : undefined}
    data-key={o.key}
    class="group/row flex items-center gap-1.5 h-6 pr-1 cursor-pointer whitespace-nowrap text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]"
    class:bg-[var(--pd-secondary-nav-selected-bg)]={on}
    class:!text-[var(--pd-secondary-nav-text-selected)]={on}
    style:padding-left="{6 + depth * 14}px"
    onclick={(): void => open(o.target, { preview: true })}
    ondblclick={(): void => open(o.target)}
    oncontextmenu={(e): void => {
      if (menu) openMenu(e, menu);
    }}
    onkeydown={(e): void => {
      if (e.key === 'Enter') open(o.target);
    }}>
    <span
      class="w-3 shrink-0 text-[9px] opacity-70"
      role="presentation"
      data-chevron={o.chevron ? o.key : undefined}
      onclick={(e): void => {
        if (o.chevron && o.key) {
          e.stopPropagation();
          toggle(o.key);
        }
      }}>{#if o.chevron}<AppIcon icon={o.open ? faChevronDown : faChevronRight} />{/if}</span>
    {#if o.status}
      <span class="w-2 h-2 mx-1 rounded-full shrink-0 {STATUS_DOT[o.status] ?? STATUS_DOT.running}" data-status={o.status}></span>
    {:else if o.icon}
      <span class="flex w-4 h-4 items-center justify-center shrink-0" style:font-size="13px"><AppIcon icon={o.icon} size="15px" /></span>
    {/if}
    <span class="truncate">{label}</span>
    {#if o.dim}<span class="truncate text-sm opacity-50">{o.dim}</span>{/if}
    <span class="flex-1"></span>
    {#if o.count !== undefined}<span class="text-sm opacity-50 {menu ? 'group-hover/row:hidden' : ''}">{o.count}</span>{/if}
    {#if menu}
      <button
        type="button"
        aria-label="Actions for {label}"
        class="w-5 h-5 shrink-0 items-center justify-center rounded hover:bg-[var(--pd-content-card-hover-inset-bg)] text-[10px] hidden group-hover/row:flex"
        onclick={(e): void => openMenu(e, menu)}><AppIcon icon={faEllipsisVertical} /></button>
    {/if}
  </div>
{/snippet}

{#snippet nodeRows(n: TreeNode, depth: number)}
  {@const isOpen = open1.includes(n.id) || (!!f && nodeMatches(n))}
  {@const st = n.status ? (live.status[n.id] ?? n.status) : undefined}
  {@const leaf = !n.children?.length}
  {@render row(depth, n.label, { key: n.id, chevron: !leaf, open: isOpen, target: { kind: 'node', connId: c?.id, nodeId: n.id }, icon: n.icon, status: st, dim: leaf ? n.detail : undefined, count: leaf ? undefined : n.detail })}
  {#if isOpen}
    {#each (n.children ?? []).filter(x => !f || nodeMatches(x) || n.label.toLowerCase().includes(f)) as ch (ch.id)}
      {@render nodeRows(ch, depth + 1)}
    {/each}
  {/if}
{/snippet}

{#snippet titleLeft()}<TitleActions side="left" dashboard={false} active={activeKind} onopen={(t): void => open(t)} />{/snippet}
{#snippet titleRight()}<TitleActions side="right" active={activeKind} onopen={(t): void => open(t)} />{/snippet}

<Frame {titleLeft} {titleRight}>
  {#if c}
    <aside class="flex flex-col w-[272px] shrink-0 h-full bg-[var(--pd-secondary-nav-bg)] border-r border-[var(--pd-global-nav-bg-border)]">
      <div class="px-2 pt-2 pb-1 shrink-0">
        <SimpleSwitcher selected={c.id} onselect={select} onmanage={(): void => open({ kind: 'settings' })} />
      </div>
      <div class="px-2 pb-2 shrink-0">
        <label class="flex items-center gap-2 h-7 px-2 rounded-md border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-bg)] text-[var(--pd-input-field-icon)]">
          <AppIcon icon={faMagnifyingGlass} size="xs" />
          <input class="flex-1 min-w-0 bg-transparent outline-none text-[var(--pd-input-field-focused-text)] placeholder:text-[var(--pd-input-field-placeholder-text)]" placeholder="Filter {c.name}" bind:value={filter} />
        </label>
      </div>
      <div role="tree" aria-label="{c.name} resources" data-testid="p13-tree" class="flex-1 min-h-0 overflow-auto pb-2 text-base">
        {#if !f}{@render row(0, 'Overview', { target: { kind: 'connection', connId: c.id }, icon: faCircleInfo })}{/if}
        {#each sections.filter(s => !f || rows(s.id).length > 0) as s (s.id)}
          {@const list = rows(s.id)}
          {@const sOpen = open1.includes(s.id) || !!f}
          {@render row(0, s.label, { key: s.id, chevron: list.length > 0, open: sOpen, target: { kind: 'list', connId: c.id, sectionId: s.id }, icon: s.ext?.icon ?? s.icon, count: f ? list.length : s.count - live.deleted.filter(id => id.startsWith(`${c.id}/${s.id}/`)).length })}
          {#if sOpen}
            {#each list.slice(0, 40) as r (r.id)}
              {@render row(1, r.name, { target: { kind: 'resource', connId: c.id, sectionId: s.id, resId: r.id }, status: resStatus(r), dim: r.group })}
            {/each}
          {/if}
        {/each}
        {#each trees as p (p.id)}
          {@const root = treeRoot(p, c.id)}
          {#if !f || nodeMatches(root)}{@render nodeRows(root, 0)}{/if}
        {/each}
        {#if pages.length}
          <div class="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">Extensions</div>
          {#each pages as t (t.id)}
            {@render row(0, t.name, { target: { kind: 'tool', toolId: t.id }, icon: t.icon })}
          {/each}
        {/if}
      </div>
    </aside>
  {/if}
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <TabStrip {wb} />
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key wb.active}
        {@const t = wb.activeTarget}
        {@const tc = findConn(t?.connId)}
        {@const ts = findSection(tc, t?.sectionId)}
        {@const tr = resource(t?.resId)}
        {#if t?.kind === 'dashboard'}
          <HomeDashboard onopen={open} />
        {:else if t?.kind === 'list' && tc && ts}
          <ListView c={tc} s={ts} onopen={open} />
        {:else if t?.kind === 'scan' && tr}
          <ScanView res={tr} onopen={open} />
        {:else if t?.kind === 'settings'}
          <SettingsView />
        {:else if t?.kind === 'kubeplay' && tc}
          <KubePlayView connId={tc.id} onopen={open} />
        {:else if t?.kind === 'connection' && tc}
          <ConnView c={tc} onopen={open} />
        {:else if t?.kind === 'node' && t.nodeId}
          <NodeView nodeId={t.nodeId} onopen={open} />
        {:else if t?.kind === 'extensions'}
          <ExtensionsView />
        {:else}
          <Content target={t} onopen={open} selectedRes={t?.resId} />
        {/if}
      {/key}
    </div>
    <BottomPanel {sessions} />
  </div>
</Frame>
