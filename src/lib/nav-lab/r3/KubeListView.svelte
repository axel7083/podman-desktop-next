<script lang="ts">
/**
 * P13 Kubernetes list, one per kind: the shared header (kind icon, cluster
 * chip, segmented filter where meaningful, namespace picker for namespaced
 * kinds, filter, one primary "Create <kind>" / "Apply YAML"), then the table
 * with the kind's columns (+ Namespace when several namespaces are shown),
 * per-kind hover quick actions and the same actions in `⋯` / right-click.
 */
import { faFileImport, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { EmptyScreen } from '@podman-desktop/ui-svelte';

import { type LabConnection, type LabResource, type LabSection, type LabTarget, resourcesOf } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import Btn from './Btn.svelte';
import type { LabRow } from './cells/types.ts';
import Head from './Head.svelte';
import { KIND, KUBE_COLS, kindOf, kubeActs, kubeMenu, liveCols, namespaced, rowStatus } from './kube-details.svelte.ts';
import { inNs, multiNs, nsLabel, setNs } from './kube-ns.svelte.ts';
import { live, resStatus } from './live.svelte.ts';
import NsSelect from './NsSelect.svelte';
import RowsTable from './RowsTable.svelte';
import SegFilter from './SegFilter.svelte';

interface Props {
  c: LabConnection;
  s: LabSection;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { c, s, onopen }: Props = $props();

let search = $state('');
let filter = $state('all');

const scoped = $derived(namespaced(s.id));
/** Every resource of the kind on the cluster, then those in the selected namespaces. */
const base = $derived.by(() => {
  void live.added;
  return resourcesOf(c.id, s.id).filter(r => !live.deleted.includes(r.id));
});
const all = $derived(base.filter(inNs));
const noun = $derived(s.label.toLowerCase());

const WORKLOADS = ['deployments', 'statefulsets', 'daemonsets', 'replicasets'];
const tabs = $derived.by((): [string, string][] => {
  if (s.id === 'kpods') return [['all', 'All'], ['running', 'Running'], ['failing', 'Not ready'], ['completed', 'Completed']];
  if (WORKLOADS.includes(s.id)) return [['all', 'All'], ['ready', 'Ready'], ['failing', 'Not ready']];
  if (s.id === 'jobs') return [['all', 'All'], ['Running', 'Running'], ['Complete', 'Complete'], ['Failed', 'Failed']];
  if (s.id === 'services') {
    const types = [...new Set(all.map(r => r.cols?.type).filter((t): t is string => !!t))];
    return types.length > 1 ? [['all', 'All'], ...types.map((t): [string, string] => [t, t])] : [];
  }
  return [];
});

function matches(r: LabResource): boolean {
  if (filter === 'all') return true;
  const st = resStatus(r);
  if (filter === 'running' || filter === 'ready') return st === 'running' || st === 'ready';
  if (filter === 'failing') return ['error', 'degraded', 'starting'].includes(st);
  if (filter === 'completed') return st === 'exited' || st === 'stopped';
  return liveCols(r)[s.id === 'jobs' ? 'status' : 'type'] === filter;
}

const visible = $derived.by(() => {
  void live.status;
  const t = search.trim().toLowerCase();
  return all.filter(r => (!t || r.name.toLowerCase().includes(t) || r.sub.toLowerCase().includes(t) || (r.ns ?? '').includes(t)) && matches(r));
});

function openRes(r: LabResource, preview = true): void {
  onopen({ kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id }, { preview });
}

const rows = $derived.by((): LabRow[] => {
  void live.status;
  return visible.map(r => ({
    name: r.id,
    r,
    status: rowStatus(resStatus(r)),
    icon: s.icon,
    title: r.name,
    sub: [],
    cols: { ...liveCols(r), ns: r.ns ?? '', age: r.age },
    open: (): void => openRes(r),
    pin: (): void => openRes(r, false),
    buttons: kubeActs(r, onopen)
      .filter(a => a.row)
      .map(a => ({ title: a.label, icon: a.icon, run: a.run, danger: a.danger, enabled: !a.disabled })),
    menu: () => kubeMenu(r, onopen),
  }));
});

const cols = $derived<[string, string, string, boolean?][]>([
  ...(scoped && multiNs(c.id) ? ([['Namespace', 'ns', '150px']] as [string, string, string][]) : []),
  ...(KUBE_COLS[s.id] ?? []),
  ['Age', 'age', '100px', true],
]);

/** Primary page action: create the kind, or apply a manifest for kinds created by controllers. */
const READ_ONLY = ['nodes', 'kpods', 'replicasets', 'endpoints', 'endpointslices', 'portforwards'];
const kindName = $derived(all[0] ? kindOf(all[0])[0] : (KIND[s.id]?.[0] ?? s.label));

function clear(): void {
  search = '';
  filter = 'all';
}
</script>

{#snippet filters()}
  {#if tabs.length}<SegFilter {tabs} value={filter} onpick={(v): void => void (filter = v)} />{/if}
  {#if scoped}<NsSelect connId={c.id} />{/if}
{/snippet}

{#snippet actions()}
  {#if READ_ONLY.includes(s.id)}
    {#if s.id !== 'portforwards'}<Btn kind="primary" icon={faFileImport} onclick={(): void => lab.openCreate(`Apply YAML on ${c.name}`)}>Apply YAML</Btn>{/if}
  {:else}
    <Btn kind="primary" icon={faPlusCircle} onclick={(): void => lab.openCreate(`Create ${kindName}`)}>Create {kindName}</Btn>
  {/if}
{/snippet}

<div data-testid="kube-list" data-kind={s.id} class="flex flex-col h-full min-h-0">
  <Head icon={s.icon} title={s.label} connId={c.id} onconn={(): void => onopen({ kind: 'connection', connId: c.id }, {})} bind:search {filters} {actions} />
  <div class="flex flex-1 min-h-0 overflow-auto" class:px-2={lab.table === 'classic'} class:pb-2={lab.table === 'classic'}>
    {#if rows.length}
      <RowsTable kind="p13-kube-{s.id}" {rows} {cols} />
    {:else if all.length}
      <div class="flex items-center gap-2 px-4 py-3 text-[12px] text-[var(--pd-table-body-text)]">
        No {noun} match “{search || filter}”.
        <button type="button" class="hover:text-[var(--pd-link)] hover:underline" onclick={clear}>Clear filters</button>
      </div>
    {:else if base.length}
      <EmptyScreen icon={s.icon} title="No {noun} in {nsLabel(c.id)}" message="{base.length} {noun} in other namespaces of {c.name}.">
        <Btn onclick={(): void => setNs(c.id, ['*'])}>Show all namespaces</Btn>
      </EmptyScreen>
    {:else}
      <EmptyScreen icon={s.icon} title="No {noun}" message={c.product === 'Developer Sandbox' && !scoped ? `Your Developer Sandbox user cannot list ${noun} of this cluster.` : `Nothing here yet on ${c.name}.`} />
    {/if}
  </div>
</div>
