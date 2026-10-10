<script lang="ts">
/**
 * "Layers · <image>" tab (podman-desktop.layers-explorer), opened from the
 * image header / ⋯ "Explore layers". Summary strip (total size, layers,
 * wasted space), left: layers as a ModernTable (index, proportional size
 * bar, created-by, short digest, +added ~modified −removed), right: the file
 * tree of the selected layer, "All layers" (filesystem up to this layer) or
 * "Only this layer". Changes relative to the previous layer are coloured:
 * added green, modified amber, removed red strike-through. The header filter
 * (Ctrl+F, `/`) filters paths. Vanilla: PD empty-state promotion.
 */
import { faChevronDown, faChevronRight, faFile, faFolder, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { SvelteSet } from 'svelte/reactivity';

import AppIcon from '#lib/components/AppIcon.svelte';

import type { LabResource, LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import type { LabRow } from './cells/types.ts';
import { ext, isInstalled } from './exts.ts';
import Head from './Head.svelte';
import { type Change, filesystemAt, fmtSize, type LayerFile, layersOf, wastedBytes } from './layers.ts';
import ModernTable from './ModernTable.svelte';
import PromoEmpty from './PromoEmpty.svelte';
import SegFilter from './SegFilter.svelte';

interface Props {
  res: LabResource;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { res, onopen }: Props = $props();

const installed = $derived(isInstalled('layers-explorer'));
const layers = $derived(layersOf(res));
const total = $derived(layers.reduce((n, l) => n + l.size, 0));
const biggest = $derived(Math.max(1, ...layers.map(l => l.size)));
const wasted = $derived(wastedBytes(layers));
let sel = $state(0);
let scope = $state<'all' | 'only'>('only');
let search = $state('');
const collapsed = new SvelteSet<string>();

const rows = $derived<LabRow[]>(
  layers.map(l => ({
    name: `layer-${l.index}`,
    selected: l.index === sel,
    status: '',
    icon: faLayerGroup,
    title: String(l.index + 1),
    sub: [],
    bar: l.size / biggest,
    cols: { size: fmtSize(l.size), cmd: l.cmd, digest: l.id.slice(0, 12), files: `+${l.added} ~${l.modified} −${l.removed}` },
    open: (): void => void (sel = l.index),
    buttons: [],
  })),
);

interface Node {
  path: string;
  name: string;
  depth: number;
  dir: boolean;
  size: number;
  perm: string;
  mark?: Change;
  link?: string;
}

/** Flattened tree rows (dirs first, then files), filtered by path. */
const tree = $derived.by((): Node[] => {
  const files: (LayerFile & { mark?: Change })[] = scope === 'all' ? filesystemAt(layers, sel) : (layers[sel]?.files.map(f => ({ ...f, mark: f.change })) ?? []);
  const q = search.trim().toLowerCase();
  const match = q ? files.filter(f => f.path.toLowerCase().includes(q)) : files;
  const dirs = new Map<string, number>();
  for (const f of match) {
    const parts = f.path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const d = parts.slice(0, i).join('/');
      dirs.set(d, (dirs.get(d) ?? 0) + (f.mark === 'removed' ? 0 : f.size));
    }
  }
  const nodes: Node[] = [
    ...[...dirs].map(([d, size]) => ({ path: `${d}/`, name: d.split('/').at(-1)!, depth: d.split('/').length - 1, dir: true, size, perm: 'drwxr-xr-x' })),
    ...match.map(f => ({ path: f.path, name: f.path.split('/').at(-1)!, depth: f.path.split('/').length - 1, dir: false, size: f.size, perm: f.perm, mark: f.mark, link: f.link })),
  ];
  // Sort by path with directories before files at the same level.
  const key = (n: Node): string =>
    n.path
      .replace(/\/$/, '')
      .split('/')
      .map((p, i, a) => (i < a.length - 1 || n.dir ? `0${p}` : `1${p}`))
      .join('/');
  nodes.sort((a, b) => key(a).localeCompare(key(b)));
  return nodes.filter(n => !n.path.split('/').some((_, i, a) => i < a.length - (n.dir ? 2 : 1) && collapsed.has(`${a.slice(0, i + 1).join('/')}/`)));
});

const sel_ = $derived(layers[sel]);

const MARK: Record<Change, string> = { added: 'text-[var(--pd-status-running)]', modified: 'text-[var(--pd-status-degraded)]', removed: 'text-[var(--pd-status-terminated)] line-through' };

function toggle(n: Node): void {
  if (collapsed.has(n.path)) collapsed.delete(n.path);
  else collapsed.add(n.path);
}
</script>

{#snippet seg()}
  <SegFilter tabs={[['only', 'Only this layer'], ['all', 'All layers']]} value={scope} label="Files shown" testid="layers-scope" onpick={(v): void => void (scope = v as 'all' | 'only')} />
{/snippet}

<div data-testid="layers-view" class="flex flex-col h-full min-h-0">
  <Head
    icon={ext('layers-explorer')?.icon}
    title="Layers · {res.name}"
    connId={res.connId}
    onconn={(): void => onopen({ kind: 'connection', connId: res.connId }, {})}
    provenance="Layers explorer"
    placeholder="Filter paths"
    bind:search={(): string | undefined => (installed ? search : undefined), (v: string | undefined): void => void (search = v ?? '')}
    filters={installed ? seg : undefined} />
  {#if !installed}
    <PromoEmpty
      icon={ext('layers-explorer')?.icon ?? ''}
      title="No layers explorer"
      description="See what every layer of an image adds, changes or removes, find the biggest files and the space wasted by files overwritten in later layers."
      extId="layers-explorer"
      info="github.com/podman-desktop/extension-layers-explorer"
      actionLabel="Explore layers"
      onaction={(): void => undefined}
      onbrowse={(): void => onopen({ kind: 'extensions' }, {})} />
  {:else}
    <div data-testid="layers-summary" class="flex items-center gap-6 h-9 shrink-0 px-5 border-b border-[var(--pd-content-divider)] text-[12px] text-[var(--pd-table-body-text)]">
      <span>Total size <b class="font-semibold text-[var(--pd-content-header)]">{fmtSize(total)}</b></span>
      <span>Layers <b class="font-semibold text-[var(--pd-content-header)]">{layers.length}</b></span>
      <span title="Bytes shipped in a layer then overwritten or removed by a later one">Wasted space <b class="font-semibold text-[var(--pd-content-header)]">{fmtSize(wasted)}</b> ({((wasted / Math.max(1, total)) * 100).toFixed(1)}%)</span>
      <span class="flex-1"></span>
      <span class="flex items-center gap-3">
        <span class="text-[var(--pd-status-running)]">+ added</span><span class="text-[var(--pd-status-degraded)]">~ modified</span><span class="text-[var(--pd-status-terminated)] line-through">− removed</span>
      </span>
    </div>
    <div class="flex-1 min-h-0 grid grid-cols-[minmax(560px,3fr)_minmax(320px,2fr)]">
      <div data-testid="layers-table" class="min-h-0 min-w-0 overflow-auto border-r border-[var(--pd-content-divider)]">
        <ModernTable
          {rows}
          variant={lab.table === 'grid' ? 'grid' : 'modern'}
          initialSort=""
          readonly
          noActs
          nameCol={['#', '44px']}
          bars={['size']}
          mono={['cmd', 'digest', 'files']}
          cols={[
            ['Size', 'size', '96px'],
            ['Created by', 'cmd', 'minmax(8rem, 1fr)'],
            ['Digest', 'digest', '104px'],
            ['Files', 'files', '96px'],
          ]} />
      </div>
      <div data-testid="layer-files" class="flex flex-col min-h-0 min-w-0">
        <div class="flex items-center gap-2 h-8 shrink-0 px-3 border-b border-[var(--pd-content-divider)] text-[12px]">
          <span class="font-semibold text-[var(--pd-content-header)]">Layer {sel + 1}</span>
          <span class="truncate font-mono text-[var(--pd-table-body-text)]" title={sel_?.cmd}>{sel_?.cmd}</span>
        </div>
        <div role="tree" aria-label="Files of layer {sel + 1}" class="flex-1 min-h-0 overflow-auto py-1 font-mono text-[12px]">
          {#each tree as n (n.path)}
            <div
              role="treeitem"
              aria-selected="false"
              aria-expanded={n.dir ? !collapsed.has(n.path) : undefined}
              tabindex="-1"
              data-testid="layer-file"
              data-change={n.mark}
              class="grid grid-cols-[88px_72px_minmax(0,1fr)] items-center h-6 px-3 hover:bg-[var(--pd-content-card-hover-bg)]"
              onclick={(): void => (n.dir ? toggle(n) : undefined)}
              onkeydown={(e): void => (e.key === 'Enter' && n.dir ? toggle(n) : undefined)}>
              <span class="text-[var(--pd-table-body-text)] opacity-70">{n.perm}</span>
              <span class="pr-3 text-right text-[var(--pd-table-body-text)]">{n.link || (n.dir && !n.size) ? '' : fmtSize(n.size)}</span>
              <span class="flex items-center gap-1.5 min-w-0" style:padding-left="{n.depth * 14}px" title={n.path}>
                <span class="w-3 shrink-0 text-[var(--pd-table-body-text)]">{#if n.dir}<AppIcon icon={collapsed.has(n.path) ? faChevronRight : faChevronDown} size="xs" />{/if}</span>
                <span class="shrink-0 text-[var(--pd-table-body-text)] opacity-70"><AppIcon icon={n.dir ? faFolder : faFile} size="xs" /></span>
                <span class="truncate {n.mark ? MARK[n.mark] : 'text-[var(--pd-content-header)]'}">{n.name}</span>
                {#if n.link}<span class="truncate text-[var(--pd-table-body-text)]">→ {n.link}</span>{/if}
              </span>
            </div>
          {:else}
            <div class="px-3 py-2 font-sans text-[var(--pd-table-body-text)]">{search ? `No paths match "${search}".` : 'This layer changes no files (metadata only).'}</div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
