<script lang="ts">
/**
 * P13 resource list (today's PD lists): the shared header with the search
 * inline and the page actions (Prune, Create / Pull, Build…), filter tabs
 * (All / Running / Stopped), then the ui-svelte Table.
 */
import {
  faArrowCircleDown,
  faCube,
  faDownload,
  faFileImport,
  faPlay,
  faPlusCircle,
  faStop,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen, FilteredEmptyScreen } from '@podman-desktop/ui-svelte';

import { type LabConnection, type LabResource, type LabSection, type LabTarget, resourcesOf } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import type { LabRow } from './cells/types.ts';
import { containerInfo, hash, imageInfo } from './details.ts';
import Head from './Head.svelte';
import { can, deleteRes, imageMenu, isUp, live, resActions, resStatus, startRes, stopRes } from './live.svelte.ts';
import RowsTable from './RowsTable.svelte';

interface Props {
  c: LabConnection;
  s: LabSection;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { c, s, onopen }: Props = $props();

let search = $state('');
let filter = $state('all');

const icon = $derived(s.ext?.icon ?? s.icon);
const all = $derived(resourcesOf(c.id, s.id).filter(r => !live.deleted.includes(r.id)));
const tabs = $derived<[string, string][]>(
  s.id === 'containers' || s.id === 'pods' ? [['all', 'All'], ['running', 'Running'], ['stopped', 'Stopped']] : s.id === 'images' ? [['all', 'All'], ['used', 'Used'], ['unused', 'Unused']] : [],
);

function used(r: LabResource): boolean {
  return imageInfo(r).usedBy.length > 0;
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
      status: im.usedBy.length ? 'USED' : 'UNUSED',
      icon,
      title: repo,
      shortId: (hash(r.name) * 2654435761).toString(16).slice(0, 12).padEnd(12, '0'),
      sub: [tag ?? 'latest'],
      cols: { age: r.age, size: im.size, arch: im.arch },
      open: (): void => openRes(r),
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
      buttons: [...startStop, del],
      menu: () => resActions(r, onopen),
    };
  }
  return {
    name: r.id,
    r,
    status: upper(st),
    icon,
    title: r.name,
    sub: [r.sub],
    cols: { age: r.age },
    open: (): void => openRes(r),
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
        g = { name: `g:${r.group}`, status: 'RUNNING', icon, title: r.group, chip: pod ? 'Pod' : 'Compose', sub: [], cols: {}, buttons: [], children: [] };
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
    const members = kids.map(k => k.r!).filter(Boolean);
    g.buttons = [
      upN ? { title: 'Stop group', icon: faStop, run: (): void => members.forEach(stopRes) } : { title: 'Start group', icon: faPlay, run: (): void => members.forEach(startRes) },
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
</script>

{#snippet actions()}
  {#if s.id === 'images'}
    <Button type="secondary" icon={faTrash} onclick={(): void => lab.openCreate('Prune unused images')}>Prune</Button>
    <Button type="secondary" icon={faFileImport} onclick={(): void => lab.openCreate('Load images')}>Load</Button>
    <Button type="secondary" icon={faDownload} onclick={(): void => lab.openCreate('Import images')}>Import</Button>
    <Button type="secondary" icon={faArrowCircleDown} onclick={(): void => lab.openCreate('Pull an image')}>Pull</Button>
    <Button icon={faCube} onclick={(): void => lab.openCreate('Build an image')}>Build</Button>
  {:else if s.id === 'containers'}
    <Button type="secondary" icon={faTrash} onclick={(): void => lab.openCreate('Prune stopped containers')}>Prune</Button>
    <Button icon={faPlusCircle} onclick={(): void => lab.openCreate('Create a container')}>Create</Button>
  {:else if s.id === 'pods'}
    <Button type="secondary" icon={faTrash} onclick={(): void => lab.openCreate('Prune pods')}>Prune</Button>
    <Button icon={faPlay} onclick={(): void => onopen({ kind: 'kubeplay', connId: c.id }, {})}>Play Kubernetes YAML</Button>
  {:else if s.id === 'volumes' || s.id === 'networks'}
    <Button type="secondary" icon={faTrash} onclick={(): void => lab.openCreate(`Prune ${noun}`)}>Prune</Button>
    <Button icon={faPlusCircle} onclick={(): void => lab.openCreate(`Create ${noun.replace(/s$/, '')}`)}>Create</Button>
  {:else}
    <Button icon={faPlusCircle} onclick={(): void => lab.openCreate(`Create ${noun.replace(/s$/, '')}`)}>Create</Button>
  {/if}
{/snippet}

<div data-testid="list-view" class="flex flex-col h-full min-h-0">
  <Head {icon} title={s.label} connId={c.id} onconn={(): void => onopen({ kind: 'connection', connId: c.id }, {})} sub={s.ext ? s.ext.name : undefined} bind:search {actions} />
  {#if tabs.length}
    <div class="flex items-center gap-1 px-4 pt-2 shrink-0 border-b border-[var(--pd-content-divider)]">
      {#each tabs as [id, label] (id)}
        <Button type="tab" selected={filter === id} onclick={(): void => { filter = id; }}>{label}</Button>
      {/each}
    </div>
  {/if}
  <div class="flex flex-1 min-h-0 overflow-auto px-2 pb-2">
    {#if rows.length}
      <RowsTable kind="p13-{s.id}" {rows} {cols} />
    {:else if all.length}
      <FilteredEmptyScreen {icon} kind={noun} searchTerm={search || filter} onResetFilter={(): void => { search = ''; filter = 'all'; }} />
    {:else}
      <EmptyScreen {icon} title="No {noun}" message="Nothing here yet on {c.name}." />
    {/if}
  </div>
</div>
