<script lang="ts">
/**
 * P13 view tab: a saved or draft query over every reachable connection, the
 * query field, a one-line result summary, then the shared table. Saving is on
 * the page header (primary action, Ctrl+S); the tab shows a dot while unsaved.
 */
import { faFilter, faFloppyDisk, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { FilteredEmptyScreen } from '@podman-desktop/ui-svelte';
import { goto } from '$app/navigation';

import { href } from '#lib/nav.ts';
import type { IconRef } from '#lib/ext/types.ts';

import { conn, type LabResource, type LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import Btn from './Btn.svelte';
import type { LabRow } from './cells/types.ts';
import Head from './Head.svelte';
import { labelsOf } from './query/labels.ts';
import { runQuery, type SortBy } from './query/match.ts';
import { parseQuery } from './query/parse.ts';
import { kindOf } from './query/resources.ts';
import { plural } from './query/suggest.ts';
import QueryInput from './QueryInput.svelte';
import { resourceRow } from './rows.ts';
import RowsTable from './RowsTable.svelte';
import { isDirty, isSaved, rename, revert, save, setQuery, viewName, viewQuery, views } from './views.svelte.ts';

interface Props {
  viewId: string;
  currentConnId?: string;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
  /** The tab was edited: a preview tab becomes a real one. */
  onedit: () => void;
}

let { viewId, currentConnId, onopen, onedit }: Props = $props();

let nameInput = $state<HTMLInputElement>();

const query = $derived(viewQuery(viewId));
const name = $derived(viewName(viewId));
const dirty = $derived(isDirty(viewId));
const canSave = $derived(dirty && (isSaved(viewId) || query.trim() !== ''));
const terms = $derived(parseQuery(query));
const result = $derived(runQuery(terms, { currentConnId }));

/** Labels asked for become columns (strings, so the table only remounts when they change). */
const labelCols = $derived(
  [...new Set(terms.filter(t => t.key === 'label' && !t.negated && t.value).map(t => t.value.split('=')[0]))]
    .slice(0, 2)
    .join('\n'),
);
const showNs = $derived(result.rows.some(r => !!r.ns));

const groupBy = $derived(result.groupBy);

const cols = $derived.by((): [string, string, string, boolean?][] => [
  // The group row already says it.
  ...(groupBy === 'kind' ? [] : ([['Type', 'kind', '110px']] as [string, string, string][])),
  ...(groupBy === 'env' ? [] : ([['Environment', 'env', 'minmax(8rem, 1fr)']] as [string, string, string][])),
  ...(showNs ? ([['Namespace', 'ns', '130px']] as [string, string, string][]) : []),
  ...labelCols
    .split('\n')
    .filter(Boolean)
    .map((k): [string, string, string] => [k, `label:${k}`, 'minmax(6rem, 1fr)']),
  ['Age', 'age', '100px', true],
]);

const SORT_COLUMN: Record<SortBy, string> = { name: 'Name', age: 'Age', status: 'Status', env: 'Environment' };
const defaultSort = $derived(result.sort && !(result.sort === 'env' && groupBy === 'env') ? SORT_COLUMN[result.sort] : 'Name');

function toRow(r: LabResource): LabRow {
  const row = resourceRow(r, onopen);
  const labels = labelsOf(r);
  const extra = Object.fromEntries(
    labelCols
      .split('\n')
      .filter(Boolean)
      .map(k => [`label:${k}`, labels[k] ?? '']),
  );
  return { ...row, cols: { ...row.cols, ...extra, kind: kindOf(r).label, env: conn(r.connId)?.name ?? r.connId, ns: r.ns ?? '', age: r.age } };
}

function groupOf(r: LabResource): { key: string; title: string; icon: IconRef; chip: string } {
  switch (result.groupBy) {
    case 'env': {
      const c = conn(r.connId);
      return { key: r.connId, title: c?.name ?? r.connId, icon: c?.icon ?? faLayerGroup, chip: c?.group === 'Kubernetes' ? 'Cluster' : 'Engine' };
    }
    case 'kind': {
      const k = kindOf(r);
      return { key: k.id, title: k.label, icon: k.icon, chip: 'Type' };
    }
    default: {
      const app = labelsOf(r)['part-of'];
      return { key: app ?? '~', title: app ?? 'No application', icon: faLayerGroup, chip: 'App' };
    }
  }
}

const modern = $derived(lab.table !== 'classic');

const rows = $derived.by((): LabRow[] => {
  if (result.groupBy === 'none') return result.rows.map(toRow);
  const groups = new Map<string, LabRow>();
  for (const r of result.rows) {
    const g = groupOf(r);
    let row = groups.get(g.key);
    if (!row) {
      row = { name: `g:${g.key}`, status: '', icon: g.icon, title: g.title, chip: g.chip, sub: [], cols: {}, buttons: [], children: [] };
      groups.set(g.key, row);
    }
    row.children?.push(toRow(r));
  }
  for (const row of groups.values()) {
    const kids = row.children ?? [];
    row.status = kids.some(k => k.status === 'DEGRADED') ? 'DEGRADED' : kids.some(k => k.status === 'RUNNING') ? 'RUNNING' : '';
    row.sub = [plural(kids.length, 'resource')];
  }
  return [...groups.values()];
});

function onQuery(value: string): void {
  setQuery(viewId, value);
  onedit();
}

function commitName(): void {
  const v = nameInput?.value.trim() ?? '';
  if (v && v !== name) {
    rename(viewId, v);
    onedit();
  } else if (nameInput) nameInput.value = name;
}

function doSave(): void {
  commitName();
  if (canSave) save(viewId);
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

// "Rename" from the sidebar menu.
$effect(() => {
  if (views.renaming !== viewId || !nameInput) return;
  views.renaming = undefined;
  nameInput.focus();
  nameInput.select();
});
</script>

<svelte:window onkeydown={onWindowKey} />

{#snippet titleEditor()}
  <input
    bind:this={nameInput}
    value={name}
    aria-label="View name"
    data-testid="view-name"
    class="text-[16px] font-semibold text-[var(--pd-content-header)] bg-transparent min-w-0 w-[280px] px-1 -mx-1 rounded outline-none border border-transparent hover:border-[var(--pd-input-field-stroke)] focus:border-[var(--pd-input-field-hover-stroke)]"
    onchange={commitName}
    onkeydown={(e): void => {
      if (e.key === 'Enter') e.currentTarget.blur();
    }} />
{/snippet}

{#snippet actions()}
  {#if dirty && isSaved(viewId)}
    <Btn testid="view-discard" onclick={(): void => revert(viewId)}>Discard</Btn>
  {/if}
  <Btn kind="primary" icon={faFloppyDisk} disabled={!canSave} testid="view-save" title={canSave ? 'Save this view (Ctrl+S)' : dirty ? 'Enter a query to save this view' : 'No unsaved changes'} onclick={doSave}>Save</Btn>
{/snippet}

<div data-testid="view-page" class="flex flex-col h-full min-h-0">
  <Head icon={faFilter} title={name} {titleEditor} {actions} />
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
  <div class="flex flex-1 min-h-0 overflow-auto" class:px-2={!modern} class:pb-2={!modern}>
    {#if rows.length}
      {#key defaultSort}
        <RowsTable kind="p13-view" {rows} {cols} {defaultSort} />
      {/key}
    {:else}
      <FilteredEmptyScreen icon={faFilter} kind="resources" searchTerm={query} onResetFilter={(): void => onQuery('')} />
    {/if}
  </div>
</div>
