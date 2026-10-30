<script lang="ts">
/**
 * P13 view tab: a saved or draft query over every reachable connection, the
 * query field, a one-line result summary, then the virtualized table. Saving is
 * the header's primary action (Ctrl+S): a new view asks for its name and icon.
 * Rename and icon are actions (⋮, the sidebar, the tab), the title is not an input.
 */
import { faEllipsisVertical, faFloppyDisk, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { FilteredEmptyScreen } from '@podman-desktop/ui-svelte';
import { goto } from '$app/navigation';

import { href } from '#lib/nav.ts';
import type { IconRef } from '#lib/ext/types.ts';

import { conn, type LabResource, type LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import ActBtn from './ActBtn.svelte';
import Btn from './Btn.svelte';
import type { LabRow } from './cells/types.ts';
import { openModal } from './flows.svelte.ts';
import Head from './Head.svelte';
import { type MenuItem, openMenu, resStatus } from './live.svelte.ts';
import { labelsOf } from './query/labels.ts';
import { runQuery } from './query/match.ts';
import { parseQuery } from './query/parse.ts';
import { kindOf } from './query/resources.ts';
import { plural } from './query/suggest.ts';
import QueryInput from './QueryInput.svelte';
import { resourceRow } from './rows.ts';
import { isDirty, isSaved, revert, save, setQuery, setSort, viewColor, viewIcon, viewName, viewQuery, viewSort, type ViewSort } from './views.svelte.ts';
import VirtualTable, { type ViewColumn, type ViewItem } from './VirtualTable.svelte';

interface Props {
  viewId: string;
  currentConnId?: string;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
  /** Rename, change icon, duplicate, delete. */
  actions: () => MenuItem[];
  /** The tab was edited: a preview tab becomes a real one. */
  onedit: () => void;
}

let { viewId, currentConnId, onopen, actions: viewActions, onedit }: Props = $props();

const query = $derived(viewQuery(viewId));
const dirty = $derived(isDirty(viewId));
const saved = $derived(isSaved(viewId));
const canSave = $derived(dirty && query.trim() !== '');
const terms = $derived(parseQuery(query));
const result = $derived(runQuery(terms, { currentConnId }));
const groupBy = $derived(result.groupBy);
const groupLabel = $derived(result.groupLabel);

/** `label:key` becomes a column (at most two); `label:key=value` would repeat one value on every row. */
const labelCols = $derived([...new Set(terms.filter(t => t.key === 'label' && !t.negated && t.value && !t.value.includes('=')).map(t => t.value))].slice(0, 2));
const showNs = $derived(result.rows.some(r => !!r.ns));

const columns = $derived.by((): ViewColumn[] => [
  // The group row already says it.
  ...(groupBy === 'kind' ? [] : [{ key: 'kind', title: 'Type', width: '110px' }]),
  ...(groupBy === 'env' ? [] : [{ key: 'env', title: 'Connection', width: 'minmax(8rem, 1fr)' }]),
  ...(showNs ? [{ key: 'ns', title: 'Namespace', width: '130px' }] : []),
  ...labelCols.map(k => ({ key: `label:${k}`, title: k, width: 'minmax(6rem, 1fr)' })),
  { key: 'age', title: 'Age', width: '100px' },
]);

const DEFAULT_SORT: ViewSort = { col: 'name', asc: true };
const sort = $derived(viewSort(viewId) ?? DEFAULT_SORT);
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const AGE_UNITS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400, w: 604800, y: 31536000 };

function ageSeconds(age: string): number {
  const m = /([\d.]+)\s*(\w)?/.exec(age);
  if (!m) return 0;
  // "2 minutes", "5 hours", "12s": the first letter of the unit is enough.
  return Number(m[1]) * (AGE_UNITS[m[2] ?? 's'] ?? 1);
}

function sortText(r: LabResource, col: string): string {
  if (col === 'status') return resStatus(r);
  if (col === 'kind') return kindOf(r).label;
  if (col === 'env') return conn(r.connId)?.name ?? r.connId;
  if (col === 'ns') return r.ns ?? '';
  if (col.startsWith('label:')) return labelsOf(r)[col.slice(6)] ?? '';
  return r.name;
}

/** Sorted across all results: the table only ever holds what is on screen. */
const sorted = $derived.by((): LabResource[] => {
  const { col, asc } = sort;
  const dir = asc ? 1 : -1;
  if (col === 'age') {
    const keyed = result.rows.map(r => [ageSeconds(r.age), r] as const);
    return keyed.sort((a, b) => dir * (a[0] - b[0])).map(x => x[1]);
  }
  const keyed = result.rows.map(r => [sortText(r, col), r] as const);
  return keyed.sort((a, b) => dir * collator.compare(a[0], b[0])).map(x => x[1]);
});

/** Key of the bucket for resources without a value: always the last group. */
const NO_GROUP = '~';

function groupOf(r: LabResource): { key: string; title: string; icon: IconRef; chip: string } {
  switch (groupBy) {
    case 'env': {
      const c = conn(r.connId);
      return { key: r.connId, title: c?.name ?? r.connId, icon: c?.icon ?? faLayerGroup, chip: c?.group === 'Kubernetes' ? 'Cluster' : 'Engine' };
    }
    case 'kind': {
      const k = kindOf(r);
      return { key: k.id, title: k.label, icon: k.icon, chip: 'Type' };
    }
    case 'label': {
      const value = labelsOf(r)[groupLabel ?? ''];
      return { key: value ?? NO_GROUP, title: value ?? `No ${groupLabel}`, icon: faLayerGroup, chip: groupLabel ?? 'Label' };
    }
    default: {
      const app = labelsOf(r)['part-of'];
      return { key: app ?? NO_GROUP, title: app ?? 'No application', icon: faLayerGroup, chip: 'App' };
    }
  }
}

/** Collapsed groups of this tab. */
let collapsed = $state<string[]>([]);

const items = $derived.by((): ViewItem[] => {
  if (groupBy === 'none') return sorted.map(r => ({ kind: 'row', key: r.id, r }));
  const groups = new Map<string, { g: ReturnType<typeof groupOf>; rows: LabResource[] }>();
  for (const r of sorted) {
    const g = groupOf(r);
    const entry = groups.get(g.key);
    if (entry) entry.rows.push(r);
    else groups.set(g.key, { g, rows: [r] });
  }
  const out: ViewItem[] = [];
  const ordered = [...groups.values()].sort((a, b) => Number(a.g.key === NO_GROUP) - Number(b.g.key === NO_GROUP) || collator.compare(a.g.key, b.g.key));
  for (const { g, rows } of ordered) {
    const open = !collapsed.includes(g.key);
    out.push({ kind: 'group', key: `g:${g.key}`, title: g.title, icon: g.icon, chip: g.chip, count: rows.length, open });
    if (open) out.push(...rows.map((r): ViewItem => ({ kind: 'row', key: r.id, r })));
  }
  return out;
});

function rowOf(r: LabResource): LabRow {
  const row = resourceRow(r, onopen);
  const labels = labelsOf(r);
  const extra = Object.fromEntries(labelCols.map(k => [`label:${k}`, labels[k] ?? '']));
  return { ...row, cols: { ...row.cols, ...extra, kind: kindOf(r).label, env: conn(r.connId)?.name ?? r.connId, ns: r.ns ?? '', age: r.age } };
}

function onsort(col: string): void {
  setSort(viewId, { col, asc: sort.col === col ? !sort.asc : true });
}

function ontoggle(key: string): void {
  const k = key.slice(2);
  collapsed = collapsed.includes(k) ? collapsed.filter(x => x !== k) : [...collapsed, k];
}

function onQuery(value: string): void {
  setQuery(viewId, value);
  onedit();
}

function doSave(): void {
  if (!canSave) return;
  if (saved) save(viewId);
  else openModal('view', { id: viewId, mode: 'save' });
}

function onWindowKey(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    doSave();
  }
}

function showAllConnections(): void {
  lab.conns = 'many';
  goto(href(`/?${lab.query()}`), { replaceState: true }).catch(() => undefined);
}
</script>

<svelte:window onkeydown={onWindowKey} />

{#snippet actions()}
  <ActBtn icon={faEllipsisVertical} label="View actions" testid="view-actions" onclick={(e): void => openMenu(e, viewActions())} />
  {#if dirty && saved}
    <Btn testid="view-discard" onclick={(): void => revert(viewId)}>Discard</Btn>
  {/if}
  <Btn kind="primary" icon={faFloppyDisk} disabled={!canSave} testid="view-save" title={canSave ? 'Save this view (Ctrl+S)' : dirty ? 'Enter a query to save this view' : 'No unsaved changes'} onclick={doSave}>Save</Btn>
{/snippet}

<div data-testid="view-page" class="flex flex-col h-full min-h-0">
  <Head icon={viewIcon(viewId)} iconColor={viewColor(viewId)} title={viewName(viewId)} {actions} />
  <div class="shrink-0 px-4 pt-3 pb-2">
    <QueryInput value={query} {currentConnId} focusOnMount={query === ''} oninput={onQuery} />
    <div data-testid="view-summary" class="flex items-center gap-2 pt-2 text-[12px] text-[var(--pd-table-body-text)]">
      <span>{plural(result.rows.length, 'resource')} across {plural(result.envCount, 'environment')}</span>
      {#if result.unreachable.length}
        <span title={result.unreachable.join(', ')}>· {plural(result.unreachable.length, 'stopped environment')} not searched</span>
      {/if}
      {#if lab.conns === 'one'}
        <span>·</span>
        <button type="button" data-testid="view-all-conns" class="text-[var(--pd-link)] hover:underline" onclick={showAllConnections}>Show all connections</button>
      {/if}
    </div>
  </div>
  {#if items.length}
    <VirtualTable {items} {columns} {sort} {rowOf} {onsort} {ontoggle} />
  {:else}
    <div class="flex flex-1 min-h-0 overflow-auto px-2 pb-2">
      <FilteredEmptyScreen icon={viewIcon(viewId)} kind="resources" searchTerm={query} onResetFilter={(): void => onQuery('')} />
    </div>
  {/if}
</div>
