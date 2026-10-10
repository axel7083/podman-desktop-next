<script lang="ts">
/**
 * P13 resource list: the shared header with the search inline, the
 * segmented filter (All / Running / Stopped) and the page actions per rule D11
 * (⋯ for Prune / Load / Import, secondary "Pull image", primary last), then the table.
 */
import {
  faAlignLeft,
  faArrowCircleDown,
  faCube,
  faDownload,
  faEllipsisVertical,
  faFileImport,
  faPlay,
  faPlusCircle,
  faStop,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen, FilteredEmptyScreen } from '@podman-desktop/ui-svelte';

import type { IconRef } from '#lib/ext/types.ts';

import { type LabConnection, type LabResource, type LabSection, type LabTarget, resourcesOf, section as findSection } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import type { LabRow } from './cells/types.ts';
import { containerInfo, hash, imageInfo, usedByCount } from './details.ts';
import { dismiss, isDismissed } from './dismiss.svelte.ts';
import ActBtn from './ActBtn.svelte';
import Btn from './Btn.svelte';
import { ext, installExt, isInstalled } from './exts.ts';
import { altFor, HB_CONN, hbNodeId } from './hb-data.ts';
import LabIcon from '../ui/LabIcon.svelte';
import Head from './Head.svelte';
import { can, deleteRes, imageMenu, isUp, live, type MenuItem, openMenu, resActions, resStatus, showGroupLogs, startRes, stopRes } from './live.svelte.ts';
import RowsTable from './RowsTable.svelte';
import { komposeTarget } from './kompose.svelte.ts';
import SegFilter from './SegFilter.svelte';

interface Props {
  c: LabConnection;
  s: LabSection;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { c, s, onopen }: Props = $props();

let search = $state('');
let filter = $state('all');

const icon = $derived(s.ext?.icon ?? s.icon);
const all = $derived.by(() => {
  void live.added;
  return resourcesOf(c.id, s.id).filter(r => !live.deleted.includes(r.id));
});
/** Vanilla: Hummingbird promotion above the Images list of its connection (rule E21, once per surface). */
const hbPromo = $derived(s.id === 'images' && c.id === HB_CONN && !isInstalled('hummingbird') && !isDismissed('hb-promo'));
/** Installed: the real hint (also dismissible). */
const hbHint = $derived(s.id === 'images' && c.id === HB_CONN && isInstalled('hummingbird') && !isDismissed('hb-hint'));
const hbCount = $derived(all.filter(r => altFor(r.name)).length);
const tabs = $derived<[string, string][]>(
  s.id === 'containers' || s.id === 'pods' ? [['all', 'All'], ['running', 'Running'], ['stopped', 'Stopped']] : s.id === 'images' || s.id === 'volumes' ? [['all', 'All'], ['used', 'Used'], ['unused', 'Unused']] : [],
);

function used(r: LabResource): boolean {
  return usedByCount(r) > 0;
}

/** Leading dot only for images / volumes in use (rule B7), with its tooltip. */
function usedDot(r: LabResource): { status: string; dotTitle?: string } {
  const n = usedByCount(r);
  return n ? { status: 'RUNNING', dotTitle: `In use by ${n} container${n > 1 ? 's' : ''}` } : { status: '' };
}

const visible = $derived(
  all.filter(r => {
    const t = search.toLowerCase();
    if (t && !r.name.toLowerCase().includes(t) && !r.sub.toLowerCase().includes(t)) return false;
    if (filter === 'running') return isUp(resStatus(r));
    if (filter === 'stopped') return !isUp(resStatus(r));
    if (filter === 'used') return used(r);
    if (filter === 'unused') return !used(r);
    return true;
  }),
);

function openRes(r: LabResource, preview = true): void {
  onopen({ kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id }, { preview });
}

function upper(st: string): string {
  return st === 'ready' ? 'RUNNING' : st === 'error' ? 'DEGRADED' : st.toUpperCase();
}

function toRow(r: LabResource): LabRow {
  const st = resStatus(r);
  const up = isUp(st);
  const startStop = can.start(s.id)
    ? [up ? { title: 'Stop', icon: faStop, run: (): void => stopRes(r) } : { title: 'Start', icon: faPlay, run: (): void => startRes(r) }]
    : [];
  const del = { title: 'Delete', icon: faTrash, danger: true, run: (): void => deleteRes(r) };
  if (s.id === 'images') {
    const im = imageInfo(r);
    const [repo, tag] = r.name.split(/:(?=[^:/]+$)/);
    return {
      name: r.id,
      r,
      ...usedDot(r),
      icon,
      title: repo,
      shortId: (hash(r.name) * 2654435761).toString(16).slice(0, 12).padEnd(12, '0'),
      sub: [tag ?? 'latest'],
      cols: { age: r.age, size: im.size, arch: im.arch },
      open: (): void => openRes(r),
      pin: (): void => openRes(r, false),
      buttons: [{ title: 'Run Image', icon: faPlay, run: (): void => lab.openCreate(`Run ${r.name}`) }, del],
      menu: () => imageMenu(r, onopen),
    };
  }
  if (s.id === 'containers') {
    const ci = containerInfo(r);
    return {
      name: r.id,
      r,
      status: upper(st),
      icon,
      title: r.name,
      sub: [st.toUpperCase(), ci.ports.length ? `PORT${ci.ports.length > 1 ? 'S' : ''} ${ci.ports.join(', ')}` : ''].filter(Boolean),
      cols: { image: ci.image, uptime: up ? r.age : '' },
      open: (): void => openRes(r),
      pin: (): void => openRes(r, false),
      buttons: [...startStop, del],
      menu: () => resActions(r, onopen),
    };
  }
  return {
    name: r.id,
    r,
    ...(s.id === 'volumes' ? usedDot(r) : { status: upper(st) }),
    icon,
    title: r.name,
    sub: [r.sub],
    cols: { age: r.age },
    open: (): void => openRes(r),
      pin: (): void => openRes(r, false),
    buttons: [...startStop, del],
    menu: () => resActions(r, onopen),
  };
}

const rows = $derived.by((): LabRow[] => {
  void live.status;
  const out: LabRow[] = [];
  const groups = new Map<string, LabRow>();
  for (const r of visible) {
    const row = toRow(r);
    if (r.group && s.id === 'containers') {
      let g = groups.get(r.group);
      if (!g) {
        const pod = r.group.endsWith('pod');
        const gicon = pod ? (findSection(c, 'pods')?.icon ?? icon) : (ext('compose')?.icon ?? icon);
        const project = pod ? undefined : resourcesOf(c.id, 'compose').find(x => x.name === r.group);
        g = {
          name: `g:${c.id}:${r.group}`,
          status: 'RUNNING',
          icon: gicon,
          title: r.group,
          chip: pod ? 'Pod' : 'Compose',
          sub: [],
          cols: {},
          buttons: [],
          children: [],
          pin: project ? (): void => onopen({ kind: 'resource', connId: c.id, sectionId: 'compose', resId: project.id }, {}) : undefined,
        };
        groups.set(r.group, g);
        out.push(g);
      }
      g.children!.push(row);
    } else out.push(row);
  }
  for (const g of groups.values()) {
    const kids = g.children ?? [];
    const upN = kids.filter(k => k.status === 'RUNNING').length;
    g.status = upN === kids.length ? 'RUNNING' : upN ? 'DEGRADED' : 'EXITED';
    g.sub = [`${kids.length} container${kids.length > 1 ? 's' : ''}`];
    g.agg = `${upN}/${kids.length} running`;
    const members = kids.map(k => k.r!).filter(Boolean);
    const project = g.chip === 'Compose' ? resourcesOf(c.id, 'compose').find(x => x.name === g.title) : undefined;
    const gIcon = g.icon;
    const pod = resourcesOf(c.id, 'pods').find(x => x.name === g.title);
    const source = project ?? pod;
    const convert = (): void => onopen(komposeTarget(source ? [source] : members), {});
    g.menu = (): MenuItem[] => [{ label: isInstalled('kompose') ? 'Convert to Kubernetes' : 'Convert to Kubernetes (install Kompose)', icon: ext('kompose')?.icon, run: convert }];
    g.buttons = [
      upN ? { title: 'Stop group', icon: faStop, run: (): void => members.forEach(stopRes) } : { title: 'Start group', icon: faPlay, run: (): void => members.forEach(startRes) },
      { title: 'See logs', icon: faAlignLeft, run: (): void => showGroupLogs(g.title, c.id, members, project ? { kind: 'resource', connId: c.id, sectionId: 'compose', resId: project.id } : undefined, gIcon) },
      { title: 'Delete group', icon: faTrash, danger: true, run: (): void => members.forEach(deleteRes) },
    ];
  }
  return out;
});

const cols = $derived<[string, string, string, boolean?][]>(
  s.id === 'containers'
    ? [['Image', 'image', 'minmax(6rem, 3fr)'], ['Uptime', 'uptime', '100px', true]]
    : s.id === 'images'
      ? [['Age', 'age', '100px', true], ['Size', 'size', '90px', true], ['Arch', 'arch', '70px']]
      : [['Age', 'age', '110px', true]],
);

const noun = $derived(s.label.toLowerCase());
const modern = $derived(lab.table !== 'classic');
</script>

{#snippet more(items: [string, IconRef][])}
  <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, items.map(([label, ic]) => ({ label, icon: ic, run: (): void => lab.openCreate(label) })))} />
{/snippet}

{#snippet actions()}
  {#if s.id === 'images'}
    {@render more([['Prune unused images', faTrash], ['Load images', faFileImport], ['Import images', faDownload]])}
    <Btn icon={faArrowCircleDown} testid="list-secondary" onclick={(): void => lab.openCreate('Pull an image')}>Pull image</Btn>
    <Btn kind="primary" icon={faCube} onclick={(): void => lab.openCreate('Build an image')}>Build</Btn>
  {:else if s.id === 'containers'}
    {@render more([['Prune stopped containers', faTrash]])}
    <Btn kind="primary" icon={faPlusCircle} onclick={(): void => lab.openCreate('Create a container')}>Create</Btn>
  {:else if s.id === 'pods'}
    {@render more([['Prune pods', faTrash]])}
    <Btn kind="primary" icon={faPlay} onclick={(): void => onopen({ kind: 'kubeplay', connId: c.id }, {})}>Play Kubernetes YAML</Btn>
  {:else if s.id === 'volumes' || s.id === 'networks'}
    {@render more([[`Prune unused ${noun}`, faTrash]])}
    <Btn kind="primary" icon={faPlusCircle} onclick={(): void => lab.openCreate(`Create ${noun.replace(/s$/, '')}`)}>Create</Btn>
  {:else}
    <Btn kind="primary" icon={faPlusCircle} onclick={(): void => lab.openCreate(`Create ${noun.replace(/s$/, '')}`)}>Create</Btn>
  {/if}
{/snippet}

{#snippet seg()}
  <SegFilter {tabs} value={filter} onpick={(v): void => { filter = v; }} />
{/snippet}

<div data-testid="list-view" class="flex flex-col h-full min-h-0">
  <Head {icon} title={s.label} connId={c.id} onconn={(): void => onopen({ kind: 'connection', connId: c.id }, {})} provenance={s.ext?.name} bind:search {actions} filters={modern && tabs.length ? seg : undefined} />
  {#if tabs.length && !modern}
    <div class="flex items-center gap-1 px-4 pt-2 shrink-0 border-b border-[var(--pd-content-divider)]">
      {#each tabs as [id, label] (id)}
        <Button type="tab" selected={filter === id} onclick={(): void => { filter = id; }}>{label}</Button>
      {/each}
    </div>
  {/if}
  {#if hbPromo}
    <div data-testid="hb-promo" class="flex items-center gap-3 mx-4 mt-3 p-3 rounded-lg bg-[var(--pd-content-card-bg)] shrink-0">
      <LabIcon icon={ext('hummingbird')?.icon ?? ''} size={32} />
      <div class="flex-1 min-w-0">
        <div class="text-[14px] font-semibold text-[var(--pd-content-header)]">Use hardened base images</div>
        <div class="text-[13px] text-[var(--pd-table-body-text)]">Hummingbird suggests minimal, zero-CVE Red Hat Hardened Images for your images.</div>
      </div>
      <Btn icon={faDownload} testid="hb-promo-install" onclick={(): void => installExt('hummingbird')}>Install Hummingbird</Btn>
      <ActBtn icon={faXmark} label="Dismiss" testid="hb-promo-dismiss" onclick={(): void => dismiss('hb-promo')} />
    </div>
  {:else if hbHint && hbCount}
    <div data-testid="hb-hint" class="flex items-center gap-3 mx-4 mt-3 px-3 h-10 rounded-lg bg-[var(--pd-content-card-bg)] shrink-0 text-[13px]">
      <LabIcon icon={ext('hummingbird')?.icon ?? ''} size={16} />
      <span class="flex-1 min-w-0 truncate text-[var(--pd-content-header)]">{hbCount} image{hbCount > 1 ? 's have' : ' has'} a hardened alternative</span>
      <Btn testid="hb-hint-review" onclick={(): void => onopen({ kind: 'node', connId: c.id, nodeId: hbNodeId(c.id, 'Alternatives') }, {})}>Review</Btn>
      <ActBtn icon={faXmark} label="Dismiss" testid="hb-hint-dismiss" onclick={(): void => dismiss('hb-hint')} />
    </div>
  {/if}
  <div class="flex flex-1 min-h-0 overflow-auto" class:px-2={!modern} class:pb-2={!modern}>
    {#if rows.length}
      <RowsTable kind="p13-{s.id}" {rows} {cols} bulkActions={s.id === 'containers' ? [{ label: 'Convert to Kubernetes', icon: ext('kompose')?.icon, run: (sel): void => onopen(komposeTarget(sel.map(x => x.r).filter((x): x is LabResource => !!x)), {}) }] : undefined} />
    {:else if all.length && modern}
      <div class="flex items-center gap-2 px-4 py-3 text-[12px] text-[var(--pd-table-body-text)]">
        No {noun} match “{search || filter}”.
        <button type="button" class="hover:text-[var(--pd-link)] hover:underline" onclick={(): void => { search = ''; filter = 'all'; }}>Clear filters</button>
      </div>
    {:else if all.length}
      <FilteredEmptyScreen {icon} kind={noun} searchTerm={search || filter} onResetFilter={(): void => { search = ''; filter = 'all'; }} />
    {:else}
      <EmptyScreen {icon} title="No {noun}" message="Nothing here yet on {c.name}." />
    {/if}
  </div>
</div>
