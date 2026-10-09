<script lang="ts">
/**
 * P13 Kubernetes resource tab, any kind: the shared header (kind icon, name,
 * status, cluster chip, namespace, per-kind quick actions + `⋯`) with the
 * views Summary | YAML | Events. Summary (default, rule E18): Details and a
 * kind-specific key/value card, then related collections as tables (pods of
 * a workload / service / node, replica sets, containers, endpoints, jobs of a
 * cron job, resources of a namespace, conditions); Events is its own view. Logs and terminals open in
 * the bottom panel; every reference opens its tab (rule F25).
 */
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';

import { type LabConnection, type LabResource, type LabSection, type LabTarget, resourcesOf } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import ActBtn from './ActBtn.svelte';
import Card from './Card.svelte';
import type { LabRow } from './cells/types.ts';
import CodeView from './CodeView.svelte';
import Head from './Head.svelte';
import { conditionsOf, eventsOf, KUBE_COLS, kindOf, kubeActs, kubeMenu, liveCols, manifest, podsOf, replicasOf, rowStatus } from './kube-details.svelte.ts';
import { setNs } from './kube-ns.svelte.ts';
import KV, { type KvRow } from './KV.svelte';
import { live, openMenu, resStatus } from './live.svelte.ts';
import ModernTable from './ModernTable.svelte';
import Section from './Section.svelte';

interface Props {
  res: LabResource;
  c: LabConnection;
  s: LabSection;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { res, c, s, onopen }: Props = $props();

// svelte-ignore state_referenced_locally
let view = $state(live.view[res.id] === 'inspect' ? 'yaml' : (live.view[res.id] ?? 'summary'));

// Inspect (YAML) from a menu while the tab is open.
$effect(() => {
  const v = live.view[res.id];
  if (v) {
    view = v === 'inspect' ? 'yaml' : v;
    delete live.view[res.id];
  }
});

const VIEWS: [string, string][] = [
  ['summary', 'Summary'],
  ['yaml', 'YAML'],
  ['events', 'Events'],
];

const st = $derived(resStatus(res));
const deleted = $derived(live.deleted.includes(res.id));
const kind = $derived(kindOf(res)[0]);
const cols = $derived.by(() => {
  void live.status;
  void live.added;
  return liveCols(res);
});
const variant = $derived(lab.table === 'grid' ? 'grid' : 'modern');
const acts = $derived.by(() => {
  void live.status;
  return kubeActs(res, onopen);
});

function find(sectionId: string, name: string | undefined, ns?: string): LabResource | undefined {
  if (!name) return undefined;
  void live.added;
  return resourcesOf(c.id, sectionId).find(r => r.name === name && (!ns || r.ns === ns) && !live.deleted.includes(r.id));
}

function openRes(r: LabResource): void {
  onopen({ kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id }, {});
}

/** Reference row: opens the referenced resource when it exists. */
function ref(k: string, sectionId: string, name: string | undefined, ns?: string): KvRow {
  const r = find(sectionId, name, ns);
  return { k, v: name ?? '—', onclick: r ? (): void => openRes(r) : undefined };
}

const OWNER_SECTION: Record<string, string> = { ReplicaSet: 'replicasets', Deployment: 'deployments', StatefulSet: 'statefulsets', DaemonSet: 'daemonsets', Job: 'jobs', Node: 'nodes' };

const details = $derived.by((): KvRow[] => {
  const [ownerKind, ownerName] = (cols.owner ?? '').split('/');
  return [
    { k: 'Name', v: res.name },
    { k: 'Kind', v: kind },
    ...(res.ns ? [ref('Namespace', 'namespaces', res.ns)] : []),
    { k: 'Created', v: `${res.age} ago` },
    ...(res.ns && res.sectionId !== 'portforwards' ? [{ k: 'Labels', v: `app=${cols.app ?? res.name}` }] : []),
    ...(ownerName ? [{ ...ref('Controlled by', OWNER_SECTION[ownerKind] ?? '', ownerName, ownerKind === 'Node' ? undefined : res.ns), v: `${ownerKind} ${ownerName}` }] : []),
    { k: 'Cluster', v: `${c.name} · ${c.product}`, onclick: (): void => onopen({ kind: 'connection', connId: c.id }, {}) },
  ];
});

/** Kind-specific card: [title, rows]. */
const spec = $derived.by((): [string, KvRow[]] | undefined => {
  const x = cols;
  switch (res.sectionId) {
    case 'deployments':
    case 'statefulsets': {
      const { desired, ready } = replicasOf(res);
      return [
        res.sectionId === 'deployments' ? 'Deployment' : 'Stateful set',
        [
          { k: 'Replicas', v: `${ready}/${desired} ready` },
          { k: 'Image', v: x.image, mono: true },
          { k: 'Selector', v: x.selector ?? `app=${res.name}`, mono: true },
          res.sectionId === 'deployments' ? { k: 'Strategy', v: 'RollingUpdate · 25% max surge · 25% max unavailable' } : ref('Service', 'services', x.service, res.ns),
          ...(res.sectionId === 'statefulsets' ? [{ k: 'Pod management', v: 'OrderedReady' }] : []),
        ],
      ];
    }
    case 'daemonsets':
      return ['Daemon set', [{ k: 'Pods', v: `${x.ready}/${x.desired} ready` }, { k: 'Node selector', v: x.nodeSelector, mono: true }, { k: 'Image', v: x.image, mono: true }, { k: 'Update strategy', v: 'RollingUpdate · 10% max unavailable' }]];
    case 'replicasets':
      return ['Replica set', [{ k: 'Pods', v: `${x.ready}/${x.desired} ready` }, { k: 'Image', v: x.image, mono: true }, { k: 'Selector', v: x.selector, mono: true }]];
    case 'kpods':
      return [
        'Pod',
        [
          { k: 'Status', v: x.status },
          { k: 'Ready', v: x.ready },
          ref('Node', 'nodes', x.node === '—' ? undefined : x.node),
          { k: 'Pod IP', v: x.ip, mono: true },
          { k: 'Restarts', v: x.restarts ?? '0' },
          { k: 'QoS class', v: 'Burstable' },
          ref('Service account', 'serviceaccounts', 'default', res.ns),
        ],
      ];
    case 'services': {
      const route = resourcesOf(c.id, 'routes').find(r => r.ns === res.ns && r.cols?.service?.split(':')[0] === res.name);
      return [
        'Service',
        [
          { k: 'Type', v: x.type },
          { k: 'Cluster IP', v: x.clusterIp, mono: true },
          { k: 'External IP', v: x.externalIp },
          { k: 'Ports', v: x.ports, mono: true },
          { k: 'Selector', v: x.selector, mono: true },
          { k: 'Session affinity', v: 'None' },
          ...(route ? [ref(kindOf(route)[0], 'routes', route.name, res.ns)] : []),
        ],
      ];
    }
    case 'routes':
      return [
        kind,
        [
          { k: 'Host', v: x.host, href: `${x.tls && x.tls !== '—' ? 'https' : 'http'}://${x.host}${x.path ?? '/'}` },
          { k: 'Path', v: x.path },
          ref('Service', 'services', x.service?.split(':')[0], res.ns),
          { k: 'TLS termination', v: x.tls },
          { k: kind === 'Ingress' ? 'Ingress class' : 'Router', v: x.class ?? 'default' },
        ],
      ];
    case 'pvcs':
      return ['Claim', [{ k: 'Status', v: x.status }, ref('Volume', 'pvs', x.volume), { k: 'Capacity', v: x.capacity }, { k: 'Access modes', v: x.access === 'RWX' ? 'ReadWriteMany' : 'ReadWriteOnce' }, ref('Storage class', 'storageclasses', x.storageclass), { k: 'Volume mode', v: 'Filesystem' }]];
    case 'pvs':
      return ['Volume', [{ k: 'Status', v: x.status }, { k: 'Capacity', v: x.capacity }, { k: 'Reclaim policy', v: x.reclaim }, ref('Claim', 'pvcs', x.claim?.split('/')[1], x.claim?.split('/')[0]), ref('Storage class', 'storageclasses', x.storageclass)]];
    case 'nodes':
      return [
        'Node',
        [
          { k: 'Status', v: x.status },
          { k: 'Roles', v: x.roles },
          { k: 'Internal IP', v: x.ip, mono: true },
          { k: 'Kubelet', v: x.version },
          { k: 'OS image', v: x.os },
          { k: 'Container runtime', v: x.runtime },
          { k: 'Capacity', v: `${x.cpu} CPU · ${x.memory} · 250 pods` },
        ],
      ];
    case 'jobs':
      return ['Job', [{ k: 'Status', v: x.status }, { k: 'Completions', v: x.completions }, { k: 'Duration', v: x.duration }, { k: 'Image', v: x.image, mono: true }, { k: 'Backoff limit', v: 6 }]];
    case 'cronjobs':
      return ['Cron job', [{ k: 'Schedule', v: x.schedule, mono: true }, { k: 'Suspend', v: x.suspend }, { k: 'Last schedule', v: x.last }, { k: 'Active jobs', v: x.active }, { k: 'Concurrency policy', v: 'Allow' }, { k: 'Image', v: x.image, mono: true }]];
    case 'portforwards':
      return [
        'Port forward',
        [
          { k: 'Local address', v: x.local, href: `http://${x.local}` },
          { ...ref('Target', x.kind === 'Service' ? 'services' : 'kpods', x.target?.split(':')[0], res.ns), v: x.target },
          { k: 'Target kind', v: x.kind },
        ],
      ];
    case 'rolebindings':
    case 'clusterrolebindings': {
      const [rk, rn] = (x.role ?? '').split('/');
      return ['Binding', [ref('Role', rk === 'Role' ? 'roles' : 'clusterroles', rn, rk === 'Role' ? res.ns : undefined), { k: 'Subjects', v: x.subjects }]];
    }
    case 'endpoints':
    case 'endpointslices':
      return ['Endpoints', [{ k: 'Addresses', v: x.endpoints, mono: true }, ...(x.ports ? [{ k: 'Ports', v: x.ports }] : []), ref('Service', 'services', x.service ?? res.name, res.ns)]];
    default: {
      const rows = Object.entries(x).filter(([k]) => !['app', 'data'].includes(k));
      const labels = Object.fromEntries((KUBE_COLS[res.sectionId] ?? []).map(([t, k]) => [k, t]));
      return rows.length ? [kind, rows.map(([k, v]) => ({ k: labels[k] ?? k, v }))] : undefined;
    }
  }
});

/** Config map / secret data (secret values masked). */
const data = $derived(res.sectionId === 'configmaps' || res.sectionId === 'secrets' ? (cols.data ?? '').split(', ').filter(Boolean) : []);

/** Table row of a related resource: status dot, columns, its quick actions and menu, opens its tab. */
function resRow(r: LabResource): LabRow {
  return {
    name: r.id,
    r,
    status: rowStatus(resStatus(r)),
    icon: s.icon,
    title: r.name,
    sub: [],
    cols: { ...liveCols(r), ns: r.ns ?? '', age: r.age },
    open: (): void => openRes(r),
    pin: (): void => openRes(r),
    buttons: kubeActs(r, onopen)
      .filter(a => a.row)
      .map(a => ({ title: a.label, icon: a.icon, run: a.run, danger: a.danger, enabled: !a.disabled })),
    menu: () => kubeMenu(r, onopen),
  };
}

/** Read-only text rows (containers, conditions, events). */
function textRows(rows: string[][], keys: string[], status?: (r: string[]) => string): LabRow[] {
  return rows.map((r, i) => ({ name: `${i}:${r.join('|')}`, status: status?.(r) ?? '', icon: s.icon, title: r[0], sub: [], cols: Object.fromEntries(keys.map((k, j) => [k, r[j + 1] ?? ''])), buttons: [] }));
}

const POD_KINDS = ['deployments', 'statefulsets', 'daemonsets', 'replicasets', 'jobs', 'services', 'nodes', 'pvcs'];
const pods = $derived.by(() => {
  void live.status;
  return POD_KINDS.includes(res.sectionId) ? podsOf(res).map(resRow) : [];
});
const replicaSets = $derived.by(() => {
  void live.added;
  return res.sectionId === 'deployments' ? resourcesOf(c.id, 'replicasets').filter(r => r.ns === res.ns && r.cols?.owner === `Deployment/${res.name}` && !live.deleted.includes(r.id)).map(resRow) : [];
});
const jobs = $derived.by(() => {
  void live.added;
  return res.sectionId === 'cronjobs' ? resourcesOf(c.id, 'jobs').filter(r => r.ns === res.ns && r.name.startsWith(`${res.name}-`) && !live.deleted.includes(r.id)).map(resRow) : [];
});
const containers = $derived(
  res.sectionId === 'kpods'
    ? (cols.containers ?? res.name).split(', ').map((n, i) => [n, i ? `${n.includes('proxy') ? 'registry.redhat.io/openshift4/ose-oauth-proxy-rhel9:v4.20' : (cols.image ?? '')}` : (cols.image ?? ''), i ? 'Running' : (cols.status ?? 'Running'), i ? '0' : (cols.restarts ?? '0')])
    : [],
);
/** Endpoints of a service: ready pod IPs. */
const endpoints = $derived(res.sectionId === 'services' ? pods.filter(p => p.status === 'RUNNING').map(p => [`${p.cols.ip}:${/(\d+)/.exec(cols.ports ?? '')?.[1] ?? ''}`, p.title, p.cols.node]) : []);
const NS_KINDS = ['deployments', 'statefulsets', 'kpods', 'services', 'routes', 'pvcs', 'configmaps', 'secrets', 'jobs', 'cronjobs', 'serviceaccounts'];
const nsResources = $derived.by((): LabRow[] => {
  void live.added;
  if (res.sectionId !== 'namespaces') return [];
  return c.sections
    .filter(x => NS_KINDS.includes(x.id))
    .map(x => {
      const n = resourcesOf(c.id, x.id).filter(r => r.ns === res.name && !live.deleted.includes(r.id)).length;
      return {
        name: x.id,
        status: '',
        icon: x.icon,
        title: x.label,
        sub: [],
        cols: { count: String(n) },
        buttons: [],
        open: (): void => {
          setNs(c.id, [res.name]);
          onopen({ kind: 'list', connId: c.id, sectionId: x.id }, {});
        },
      };
    });
});
const conditions = $derived.by(() => {
  void live.status;
  return conditionsOf(res);
});
const events = $derived.by(() => {
  void live.status;
  return eventsOf(res);
});
const yaml = $derived.by(() => {
  void live.status;
  void live.added;
  return manifest(res);
});
const podCols = $derived<[string, string, string, boolean?][]>([...(KUBE_COLS.kpods ?? []), ['Age', 'age', '90px', true]]);
</script>

{#snippet actions()}
  {#each acts.slice(0, 5) as a (a.label)}
    <ActBtn icon={a.icon} label={a.label} danger={a.danger} disabled={a.disabled} onclick={a.run} />
  {/each}
  <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, kubeMenu(res, onopen))} />
{/snippet}

<div data-testid="kube-resource" data-kind={s.id} class="flex flex-col h-full min-h-0 bg-[var(--pd-content-bg)]">
  <Head
    icon={s.icon}
    title={res.name}
    status={deleted ? 'deleted' : st}
    connId={c.id}
    onconn={(): void => onopen({ kind: 'connection', connId: c.id }, {})}
    sub={res.ns ? `${kind} · namespace ${res.ns}` : kind}
    views={VIEWS}
    {view}
    onview={(v): void => void (view = v)}
    actions={deleted ? undefined : actions} />
  {#if deleted}
    <div class="flex-1 flex items-center justify-center text-[13px] text-[var(--pd-table-body-text)]">{res.name} was deleted.</div>
  {:else if view === 'yaml'}
    <CodeView lines={yaml} lang="yaml" numbered testid="kube-yaml" />
  {:else if view === 'events'}
    <div data-testid="kube-events" class="flex-1 min-h-0 overflow-auto px-5 py-4">
      <Section title="Events" count={events.length}>
        {#if events.length}
          <ModernTable
            {variant}
            readonly
            initialSort=""
            rows={textRows(events.map(([t, r, m, a]) => [r, t, m, a]), ['type', 'message', 'age'], r => (r[1] === 'Warning' ? 'DEGRADED' : 'RUNNING'))}
            cols={[['Type', 'type', '90px'], ['Message', 'message', 'minmax(14rem, 4fr)'], ['Age', 'age', '70px']]} />
        {:else}
          <div class="py-2 text-[13px] text-[var(--pd-table-body-text)]">No events for this {kind.toLowerCase()} in the last hour.</div>
        {/if}
      </Section>
    </div>
  {:else}
    <div data-testid="summary" class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
      <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
        <Card title="Details"><KV rows={details} /></Card>
        {#if spec}<Card title={spec[0]}><KV rows={spec[1]} /></Card>{/if}
        {#if data.length}
          <Card title="Data ({data.length})"><KV rows={data.map(k => ({ k, v: res.sectionId === 'secrets' ? '••••••••' : k === 'LOG_LEVEL' ? 'info' : '…', mono: true }))} /></Card>
        {/if}
      </div>

      {#if res.sectionId === 'kpods'}
        <Section title="Containers" count={containers.length} testid="kube-containers">
          <ModernTable {variant} readonly initialSort="" mono={['image']} rows={textRows(containers, ['image', 'state', 'restarts'], r => (r[2] === 'Running' ? 'RUNNING' : 'DEGRADED'))} cols={[['Image', 'image', 'minmax(12rem, 3fr)'], ['State', 'state', '140px'], ['Restarts', 'restarts', '80px', true]]} />
        </Section>
      {/if}
      {#if replicaSets.length}
        <Section title="Replica sets" count={replicaSets.length} testid="kube-replicasets">
          <ModernTable {variant} readonly initialSort="" rows={replicaSets} cols={[...(KUBE_COLS.replicasets ?? []).slice(0, 3), ['Age', 'age', '90px', true]]} />
        </Section>
      {/if}
      {#if POD_KINDS.includes(res.sectionId)}
        <Section title="Pods" count={pods.length} testid="kube-pods">
          {#if pods.length}
            <ModernTable {variant} readonly initialSort="" rows={pods} cols={podCols} />
          {:else}
            <div class="py-2 text-[13px] text-[var(--pd-table-body-text)]">No pods.</div>
          {/if}
        </Section>
      {/if}
      {#if res.sectionId === 'services'}
        <Section title="Endpoints" count={endpoints.length} testid="kube-endpoints">
          {#if endpoints.length}
            <ModernTable {variant} readonly initialSort="" mono={['__name']} rows={textRows(endpoints, ['pod', 'node'], () => 'RUNNING')} cols={[['Pod', 'pod', 'minmax(12rem, 2fr)'], ['Node', 'node', 'minmax(8rem, 1fr)']]} />
          {:else}
            <div class="py-2 text-[13px] text-[var(--pd-table-body-text)]">No ready endpoints: no pod matches {cols.selector ?? 'the selector'}.</div>
          {/if}
        </Section>
      {/if}
      {#if res.sectionId === 'cronjobs'}
        <Section title="Jobs" count={jobs.length} testid="kube-jobs">
          <ModernTable {variant} readonly initialSort="" rows={jobs} cols={[...(KUBE_COLS.jobs ?? []), ['Age', 'age', '90px', true]]} />
        </Section>
      {/if}
      {#if nsResources.length}
        <Section title="Resources" testid="kube-ns-resources">
          <ModernTable {variant} readonly initialSort="" rows={nsResources} cols={[['Count', 'count', '80px', true]]} />
        </Section>
      {/if}
      {#if conditions.length}
        <Section title="Conditions" count={conditions.length} testid="kube-conditions">
          <ModernTable {variant} readonly initialSort="" rows={textRows(conditions, ['status', 'reason'], r => (r[1] === 'True' === !/Pressure/.test(r[0]) ? 'RUNNING' : 'DEGRADED'))} cols={[['Status', 'status', '90px'], ['Reason', 'reason', 'minmax(10rem, 2fr)']]} />
        </Section>
      {/if}
    </div>
  {/if}
</div>
