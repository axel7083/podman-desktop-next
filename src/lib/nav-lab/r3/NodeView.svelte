<script lang="ts">
/**
 * Tab for an extension tree-provider node (MCP servers, Helm releases, AI Lab…).
 * Three shapes, picked from the node (rules E17 / E18):
 * - overview: the extension's "Overview" node (or a root whose children are
 *   groups): counters opening each collection + key/value card;
 * - list: a root or a group of entities (MCP servers, Helm releases, Models…):
 *   a ModernTable with provider columns, filter, All / Running / Stopped, one
 *   primary action. Never a generic key/value summary;
 * - entity: a single item (MCP server, release, model…): Summary (key/value +
 *   its child collections as tables) | Inspect.
 * Quadlets and bootc have dedicated views.
 */
import { faAlignLeft, faArrowCircleDown, faCirclePlus, faEllipsisVertical, faPlay, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';

import type { IconRef } from '#lib/ext/types.ts';

import { conn as findConn, type LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import ActBtn from './ActBtn.svelte';
import BootcView from './BootcView.svelte';
import Btn from './Btn.svelte';
import Card from './Card.svelte';
import type { LabRow } from './cells/types.ts';
import CodeView from './CodeView.svelte';
import { ext } from './exts.ts';
import Head from './Head.svelte';
import KV from './KV.svelte';
import { isUp, live, type MenuItem, openMenu } from './live.svelte.ts';
import ModernTable from './ModernTable.svelte';
import QuadletList from './QuadletList.svelte';
import QuadletView from './QuadletView.svelte';
import Section from './Section.svelte';
import SegFilter from './SegFilter.svelte';
import StatGrid from './StatGrid.svelte';
import { findNode, OVERVIEW_ICON, type TreeNode } from './trees.ts';

interface Props {
  nodeId: string;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { nodeId, onopen }: Props = $props();

let view = $state('summary');
let search = $state('');
let filter = $state('all');

const f = $derived(findNode(nodeId));
const e = $derived(ext(f?.provider.extId));
const n = $derived(f?.node);
const isRoot = $derived(!!f && f.node === f.root);
const kids = $derived((n?.children ?? []).filter(x => x.label !== 'Overview'));
const groupsOnly = $derived(kids.length > 0 && kids.every(x => !x.status && !!x.children));
const shape = $derived<'overview' | 'list' | 'entity'>(
  n?.label === 'Overview' || (isRoot && groupsOnly) ? 'overview' : (isRoot || (!n?.status && kids.length > 0)) && !groupsOnly ? 'list' : 'entity',
);
const variant = $derived(lab.table === 'grid' ? 'grid' : 'modern');

function stOf(x: TreeNode): string | undefined {
  return x.status ? (live.status[x.id] ?? x.status) : undefined;
}

function openNode(x: TreeNode, preview = true): void {
  onopen({ kind: 'node', connId: f?.connId, nodeId: x.id }, { preview });
}

function toggle(x: TreeNode): void {
  const s = stOf(x);
  live.status[x.id] = s && isUp(s) ? 'stopped' : 'running';
}

function logs(x: TreeNode): void {
  if (!f) return;
  lab.addSession({
    id: `logs-node-${x.id}`,
    kind: 'logs',
    title: x.label,
    label: f.provider.id === 'mcp' ? 'mcp server logs' : 'logs',
    connId: f.connId,
    lines: [`${x.label} | starting`, `${x.label} | listening (${x.data?.transport ?? 'stdio'})`, `${x.label} | ready`],
    stream: true,
    target: { kind: 'node', connId: f.connId, nodeId: x.id },
    icon: x.icon,
  });
}

function menu(x: TreeNode): MenuItem[] {
  const s = stOf(x);
  return [
    { label: 'Open', run: (): void => openNode(x, false) },
    ...(s ? [{ label: isUp(s) ? 'Stop' : 'Start', icon: isUp(s) ? faStop : faPlay, run: (): void => toggle(x), sep: true }, { label: 'Show logs', icon: faAlignLeft, run: (): void => logs(x) }] : []),
    { label: 'Delete', icon: faTrash, danger: true, run: (): void => lab.openCreate(`Remove ${x.label}`), sep: true },
  ];
}

interface ListCfg {
  cols: [string, string, string, boolean?][];
  mono?: string[];
  primary?: [string, IconRef];
  noun: string;
}

/** Provider columns for a list of entities. */
const cfg = $derived.by((): ListCfg => {
  const p = f?.provider.id;
  if (p === 'mcp' && isRoot)
    return {
      noun: 'MCP servers',
      cols: [['Transport', 'transport', '130px'], ['Tools', 'tools', '70px', true], ['Clients', 'clients', 'minmax(8rem, 1fr)'], ['Image / command', 'command', 'minmax(12rem, 2fr)']],
      mono: ['command'],
      primary: ['Add MCP server', faCirclePlus],
    };
  if (p === 'helm' && isRoot)
    return { noun: 'releases', cols: [['Chart', 'chart', 'minmax(10rem, 1fr)'], ['Revision', 'revision', '90px', true], ['Namespace', 'namespace', '120px'], ['Updated', 'updated', '120px']], primary: ['Install chart', faCirclePlus] };
  if (n?.label === 'Models') return { noun: 'models', cols: [['Size', 'detail', '100px', true]], primary: ['Download model', faArrowCircleDown] };
  if (n?.label === 'Services') return { noun: 'services', cols: [['Port', 'detail', '100px']], primary: ['New service', faCirclePlus] };
  if (n?.label === 'Playgrounds') return { noun: 'playgrounds', cols: [['Model', 'detail', '160px']], primary: ['New playground', faCirclePlus] };
  return { noun: (n?.label ?? 'items').toLowerCase(), cols: kids.some(x => x.detail) ? [['Detail', 'detail', 'minmax(8rem, 1fr)']] : [] };
});

const hasStatus = $derived(kids.some(x => x.status));

function toRow(x: TreeNode): LabRow {
  const s = stOf(x);
  const up = !!s && isUp(s);
  return {
    name: x.id,
    status: s ? (up ? 'RUNNING' : 'EXITED') : '',
    icon: x.icon ?? '',
    title: x.label,
    sub: [],
    cols: { detail: x.detail ?? '', ...x.data },
    open: (): void => openNode(x),
    pin: (): void => openNode(x, false),
    buttons: s
      ? [
          up ? { title: 'Stop', icon: faStop, run: (): void => toggle(x) } : { title: 'Start', icon: faPlay, run: (): void => toggle(x) },
          { title: 'Show logs', icon: faAlignLeft, run: (): void => logs(x) },
          { title: 'Delete', icon: faTrash, danger: true, run: (): void => lab.openCreate(`Remove ${x.label}`) },
        ]
      : [],
    menu: (): MenuItem[] => menu(x),
  };
}

const rows = $derived.by((): LabRow[] => {
  void live.status;
  const t = search.toLowerCase();
  return kids
    .filter(x => !t || x.label.toLowerCase().includes(t) || (x.detail ?? '').toLowerCase().includes(t))
    .filter(x => {
      const s = stOf(x);
      return filter === 'all' || (filter === 'running' ? !!s && isUp(s) : !s || !isUp(s));
    })
    .map(toRow);
});

const headIcon = $derived(shape === 'overview' ? OVERVIEW_ICON : isRoot ? f?.provider.icon : (n?.icon ?? f?.provider.icon));
const headTitle = $derived(shape === 'overview' ? `${f?.root.label} · Overview` : isRoot ? (f?.provider.label ?? '') : (n?.label ?? ''));
const st = $derived(n ? stOf(n) : undefined);

function openParent(): void {
  if (!n) return;
  const p = findNode(n.id.split('/').slice(0, -1).join('/'));
  if (p) openNode(p.node, false);
}
</script>

{#snippet listActions()}
  {#if cfg.primary}<Btn kind="primary" icon={cfg.primary[1]} onclick={(): void => lab.openCreate(cfg.primary![0])}>{cfg.primary[0]}</Btn>{/if}
{/snippet}

{#snippet entityActions()}
  {#if n && st}
    <ActBtn icon={isUp(st) ? faStop : faPlay} label={isUp(st) ? 'Stop' : 'Start'} onclick={(): void => toggle(n)} />
    <ActBtn icon={faAlignLeft} label="Show logs" onclick={(): void => logs(n)} />
  {/if}
  {#if n}
    <ActBtn icon={faTrash} label="Delete" danger onclick={(): void => lab.openCreate(`Remove ${n.label}`)} />
    <ActBtn
      icon={faEllipsisVertical}
      label="More actions"
      onclick={(ev): void => openMenu(ev, [...menu(n).slice(1), { label: `Open ${e?.name ?? 'extension'}`, icon: e?.icon, run: (): void => onopen({ kind: 'tool', toolId: f?.provider.extId }, {}), sep: true }])} />
  {/if}
{/snippet}

{#snippet seg()}
  <SegFilter tabs={[['all', 'All'], ['running', 'Running'], ['stopped', 'Stopped']]} value={filter} onpick={(v): void => void (filter = v)} />
{/snippet}

{#if f && f.provider.id === 'quadlets'}
  {#if f.node === f.root}<QuadletList {f} {onopen} />{:else}<QuadletView {f} {onopen} />{/if}
{:else if f && f.provider.id === 'bootc'}
  <BootcView {f} {onopen} />
{:else if f && n}
  <div data-testid="node-view" data-shape={shape} class="flex flex-col h-full min-h-0">
    {#if shape === 'list'}
      <Head
        icon={headIcon}
        title={headTitle}
        connId={f.connId}
        onconn={(): void => onopen({ kind: 'connection', connId: f.connId }, {})}
        sub={!isRoot ? f.path.slice(1).join(' › ') || undefined : undefined}
        provenance={e?.name}
        placeholder="Filter {cfg.noun}"
        bind:search
        filters={hasStatus ? seg : undefined}
        actions={cfg.primary ? listActions : undefined} />
      <div data-testid="node-list" class="flex flex-1 min-h-0 overflow-auto">
        {#if rows.length}
          <ModernTable {rows} cols={cfg.cols} mono={cfg.mono} {variant} />
        {:else}
          <div class="flex items-center gap-2 px-4 py-3 text-[12px] text-[var(--pd-table-body-text)]">
            No {cfg.noun} match.
            <button type="button" class="hover:text-[var(--pd-link)] hover:underline" onclick={(): void => { search = ''; filter = 'all'; }}>Clear filters</button>
          </div>
        {/if}
      </div>
    {:else if shape === 'overview'}
      {@const groups = (f.root.children ?? []).filter(x => x.label !== 'Overview')}
      <Head icon={headIcon} title={headTitle} connId={f.connId} onconn={(): void => onopen({ kind: 'connection', connId: f.connId }, {})} provenance={e?.name} />
      <div data-testid="node-overview" class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
        {#if groups.length && groups.every(x => !x.status && !!x.children)}
          <StatGrid items={groups.filter(x => x.children).map(x => ({ label: x.label, count: x.children?.length ?? 0, icon: x.icon, onclick: (): void => openNode(x, false) }))} />
        {:else}
          <StatGrid items={[{ label: f.root.label, count: groups.length, icon: f.provider.icon, onclick: (): void => openNode(f.root, false) }, { label: 'Running', count: groups.filter(x => stOf(x) && isUp(stOf(x)!)).length, onclick: (): void => openNode(f.root, false) }]} />
        {/if}
        <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
          <Card title="About">
            <KV
              rows={[
                { k: 'Extension', v: e?.name ?? f.provider.label },
                { k: 'Description', v: e?.description },
                { k: 'Connection', v: findConn(f.connId)?.name, onclick: (): void => onopen({ kind: 'connection', connId: f.connId }, {}) },
              ]} />
          </Card>
        </div>
      </div>
    {:else}
      <Head
        icon={headIcon}
        title={headTitle}
        status={st}
        connId={f.connId}
        onconn={(): void => onopen({ kind: 'connection', connId: f.connId }, {})}
        sub={f.path.slice(1).join(' › ') || undefined}
        provenance={e?.name}
        views={[['summary', 'Summary'], ['inspect', 'Inspect']]}
        {view}
        onview={(v): void => {
          view = v;
        }}
        actions={entityActions} />
      {#if view === 'inspect'}
        <CodeView lang="json" testid="inspect" lines={JSON.stringify({ id: n.id, name: n.label, status: st, detail: n.detail, ...n.data, provider: f.provider.id, children: n.children?.map(x => x.label) }, null, 2).split('\n')} />
      {:else}
        <div data-testid="summary" class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
          <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
            <Card title="Details">
              <KV
                rows={[
                  { k: 'Name', v: n.label },
                  ...(st ? [{ k: 'Status', v: st }] : []),
                  ...(n.data?.transport ? [{ k: 'Transport', v: n.data.transport }, { k: 'Image / command', v: n.data.command, mono: true }, { k: 'Clients', v: n.data.clients }] : []),
                  ...(n.data?.chart ? [{ k: 'Chart', v: n.data.chart }, { k: 'Namespace', v: n.data.namespace }, { k: 'Updated', v: n.data.updated }] : []),
                  ...(!n.data && n.detail ? [{ k: 'Detail', v: n.detail }] : []),
                  ...(f.path.length > 1 ? [{ k: 'Parent', v: f.path.at(-1), onclick: openParent }] : []),
                  { k: 'Connection', v: findConn(f.connId)?.name, onclick: (): void => onopen({ kind: 'connection', connId: f.connId }, {}) },
                  { k: 'Provided by', v: e?.name },
                ]} />
            </Card>
          </div>
          {#if kids.some(x => x.children)}
            {#each kids as g (g.id)}
              <Section title={g.label} count={g.children?.length ?? 0} testid="node-section">
                {#if g.children?.length}
                  <ModernTable {variant} readonly initialSort="" rows={g.children.map(toRow)} cols={g.children.some(x => x.detail) ? [['Detail', 'detail', 'minmax(8rem, 1fr)']] : []} />
                {:else}
                  <div class="py-2 text-[13px] text-[var(--pd-table-body-text)]">No {g.label.toLowerCase()}.</div>
                {/if}
              </Section>
            {/each}
          {:else if kids.length}
            <Section title={f.provider.id === 'helm' ? 'Revisions' : 'Items'} count={kids.length} testid="node-section">
              <ModernTable {variant} readonly initialSort="" rows={kids.map(toRow)} cols={[['Detail', 'detail', 'minmax(8rem, 1fr)']]} />
            </Section>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
{/if}
