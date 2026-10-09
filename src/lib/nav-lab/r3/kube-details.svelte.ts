/**
 * P13 Kubernetes helpers shared by the list, details and overview tabs:
 * per-kind columns, live columns (ready counts after scaling, pod states),
 * related pods, per-kind actions (quick actions, `⋯` / right-click menu),
 * scaling, rollout restart, port forwarding, conditions, events and the
 * YAML manifest of a resource.
 */
import {
  faAlignLeft,
  faArrowRightArrowLeft,
  faArrowsUpDown,
  faArrowUpRightFromSquare,
  faBan,
  faCircleCheck,
  faCode,
  faPlay,
  faRotateRight,
  faStop,
  faTerminal,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import type { IconRef } from '#lib/ext/types.ts';

import { type LabResource, type LabTarget, resourcesOf } from '../data.ts';
import { addResource, runTask } from './flows.svelte.ts';
import { CLUSTER_SCOPED, kubeFlavour, kubeIp, kubeNets, kubeSuffix } from './kube-data.ts';
import { deleteRes, isUp, live, type MenuItem, openTerminal, resStatus, restartRes, showLogs, sourceOf } from './live.svelte.ts';

type Open = (t: LabTarget, o: { preview?: boolean }) => void;
export type Col = [string, string, string, boolean?];

/** Kubernetes kind and apiVersion per section. */
export const KIND: Record<string, [string, string]> = {
  nodes: ['Node', 'v1'],
  namespaces: ['Namespace', 'v1'],
  deployments: ['Deployment', 'apps/v1'],
  daemonsets: ['DaemonSet', 'apps/v1'],
  statefulsets: ['StatefulSet', 'apps/v1'],
  replicasets: ['ReplicaSet', 'apps/v1'],
  kpods: ['Pod', 'v1'],
  jobs: ['Job', 'batch/v1'],
  cronjobs: ['CronJob', 'batch/v1'],
  configmaps: ['ConfigMap', 'v1'],
  secrets: ['Secret', 'v1'],
  services: ['Service', 'v1'],
  endpoints: ['Endpoints', 'v1'],
  endpointslices: ['EndpointSlice', 'discovery.k8s.io/v1'],
  routes: ['Route', 'route.openshift.io/v1'],
  netpols: ['NetworkPolicy', 'networking.k8s.io/v1'],
  ingressclasses: ['IngressClass', 'networking.k8s.io/v1'],
  httproutes: ['HTTPRoute', 'gateway.networking.k8s.io/v1'],
  portforwards: ['PortForward', 'podman-desktop.io/v1'],
  pvcs: ['PersistentVolumeClaim', 'v1'],
  pvs: ['PersistentVolume', 'v1'],
  storageclasses: ['StorageClass', 'storage.k8s.io/v1'],
  serviceaccounts: ['ServiceAccount', 'v1'],
  roles: ['Role', 'rbac.authorization.k8s.io/v1'],
  rolebindings: ['RoleBinding', 'rbac.authorization.k8s.io/v1'],
  clusterroles: ['ClusterRole', 'rbac.authorization.k8s.io/v1'],
  clusterrolebindings: ['ClusterRoleBinding', 'rbac.authorization.k8s.io/v1'],
};

/** Kind of a resource (Routes are Ingresses on kind clusters). */
export function kindOf(r: LabResource): [string, string] {
  if (r.sectionId === 'routes' && (r.cols?.kind === 'Ingress' || (!r.cols?.kind && kubeFlavour(r.connId) === 'kind'))) return ['Ingress', 'networking.k8s.io/v1'];
  return KIND[r.sectionId] ?? [r.sectionId, 'v1'];
}

export function namespaced(sectionId: string): boolean {
  return !CLUSTER_SCOPED.includes(sectionId);
}

const W = 'minmax(8rem, 1fr)';
const WIDE = 'minmax(10rem, 2fr)';

/** List columns per kind (Name and Age are added by the views). */
export const KUBE_COLS: Record<string, Col[]> = {
  nodes: [['Status', 'status', '170px'], ['Roles', 'roles', '170px'], ['Version', 'version', '90px'], ['CPU', 'cpu', '60px', true], ['Memory', 'memory', '90px', true], ['Internal IP', 'ip', '110px']],
  namespaces: [['Status', 'status', '80px'], ['Labels', 'labels', WIDE]],
  deployments: [['Ready', 'ready', '70px'], ['Up-to-date', 'uptodate', '90px', true], ['Available', 'available', '80px', true], ['Image', 'image', WIDE]],
  daemonsets: [['Desired', 'desired', '70px', true], ['Current', 'current', '70px', true], ['Ready', 'ready', '70px', true], ['Node selector', 'nodeSelector', W], ['Image', 'image', WIDE]],
  statefulsets: [['Ready', 'ready', '70px'], ['Service', 'service', W], ['Image', 'image', WIDE]],
  replicasets: [['Desired', 'desired', '70px', true], ['Current', 'current', '70px', true], ['Ready', 'ready', '70px', true], ['Controlled by', 'owner', W]],
  kpods: [['Ready', 'ready', '60px'], ['Status', 'status', '140px'], ['Restarts', 'restarts', '70px', true], ['Node', 'node', W], ['IP', 'ip', '110px']],
  jobs: [['Status', 'status', '90px'], ['Completions', 'completions', '100px'], ['Duration', 'duration', '90px']],
  cronjobs: [['Schedule', 'schedule', '120px'], ['Suspend', 'suspend', '80px'], ['Active', 'active', '60px', true], ['Last schedule', 'last', '130px']],
  configmaps: [['Keys', 'keys', '60px', true], ['Data', 'data', WIDE]],
  secrets: [['Type', 'type', '200px'], ['Keys', 'keys', '60px', true]],
  services: [['Type', 'type', '100px'], ['Cluster IP', 'clusterIp', '110px'], ['External IP', 'externalIp', W], ['Ports', 'ports', W], ['Selector', 'selector', '140px']],
  endpoints: [['Endpoints', 'endpoints', 'minmax(12rem, 3fr)']],
  endpointslices: [['Address type', 'addressType', '100px'], ['Ports', 'ports', '70px'], ['Endpoints', 'endpoints', WIDE]],
  routes: [['Type', 'kind', '70px'], ['Host', 'host', WIDE], ['Path', 'path', '50px'], ['Service', 'service', '160px'], ['TLS', 'tls', '80px']],
  netpols: [['Pod selector', 'podSelector', W], ['Policy types', 'types', '130px']],
  ingressclasses: [['Controller', 'controller', WIDE], ['Default', 'default', '70px']],
  httproutes: [['Hostnames', 'hostnames', WIDE], ['Parents', 'parents', W]],
  portforwards: [['Local', 'local', '140px'], ['Target', 'target', WIDE], ['Kind', 'kind', '70px']],
  pvcs: [['Status', 'status', '70px'], ['Volume', 'volume', WIDE], ['Capacity', 'capacity', '80px'], ['Access', 'access', '60px'], ['Storage class', 'storageclass', W]],
  pvs: [['Capacity', 'capacity', '80px'], ['Access', 'access', '60px'], ['Reclaim', 'reclaim', '70px'], ['Status', 'status', '70px'], ['Claim', 'claim', WIDE], ['Storage class', 'storageclass', W]],
  storageclasses: [['Provisioner', 'provisioner', WIDE], ['Reclaim', 'reclaim', '70px'], ['Binding mode', 'binding', '170px'], ['Expansion', 'expansion', '80px'], ['Default', 'default', '70px']],
  serviceaccounts: [['Secrets', 'secrets', '70px', true], ['Pull secrets', 'pullSecrets', W]],
  roles: [['Resources', 'resources', WIDE], ['Verbs', 'verbs', W]],
  rolebindings: [['Role', 'role', W], ['Subjects', 'subjects', WIDE]],
  clusterroles: [['Rules', 'rules', '70px', true], ['Aggregated', 'aggregated', '90px']],
  clusterrolebindings: [['Role', 'role', W], ['Subjects', 'subjects', WIDE]],
};

/* ------------------------------------------------------------------ */
/* Live state                                                          */
/* ------------------------------------------------------------------ */

class KubeLive {
  /** Desired replicas set by "Scale" (deployments, stateful sets). */
  replicas = $state<Record<string, number>>({});
}

export const kubeLive = new KubeLive();

/** Last pointer position: anchors menus opened from buttons and menu items. */
let pointer = { x: 0, y: 0 };
if (typeof window !== 'undefined') window.addEventListener('pointerdown', e => (pointer = { x: e.clientX, y: e.clientY }), true);

function openMenuHere(items: MenuItem[]): void {
  live.menu = { x: Math.min(pointer.x, window.innerWidth - 230), y: Math.min(pointer.y + 8, window.innerHeight - items.length * 28 - 16), items };
}

function settle(id: string, now: string, then: string, ms = 900): void {
  live.status[id] = now;
  setTimeout(() => (live.status[id] = then), ms);
}

/** ModernTable status word for a lab status. */
export function rowStatus(st: string): string {
  if (st === 'running' || st === 'ready') return 'RUNNING';
  if (st === 'degraded' || st === 'error') return 'DEGRADED';
  return st === 'starting' ? 'CREATED' : 'EXITED';
}

/** Pods of a workload / service / node / job (same namespace, by app label, owner or name prefix). */
export function podsOf(r: LabResource): LabResource[] {
  void live.added;
  const all = resourcesOf(r.connId, 'kpods').filter(p => !live.deleted.includes(p.id));
  if (r.sectionId === 'nodes') return all.filter(p => p.cols?.node === r.name);
  const pods = all.filter(p => p.ns === r.ns);
  if (r.sectionId === 'replicasets') return pods.filter(p => p.cols?.owner === `ReplicaSet/${r.name}`);
  if (r.sectionId === 'jobs') return pods.filter(p => p.cols?.owner === `Job/${r.name}`);
  const app = r.cols?.app ?? r.name;
  return pods.filter(p => (p.cols?.app ? p.cols.app === app && !p.cols.owner?.startsWith('Job/') : p.name.startsWith(`${r.name}-`)));
}

/** Desired / ready replicas of a deployment or stateful set (after scaling, from its pods). */
export function replicasOf(r: LabResource): { desired: number; ready: number } {
  const pods = podsOf(r);
  const [readyCol, desiredCol] = (r.cols?.ready ?? '').split('/').map(Number);
  const desired = kubeLive.replicas[r.id] ?? (Number.isFinite(desiredCol) ? desiredCol : Math.max(1, pods.length));
  const ready = pods.length ? pods.filter(p => resStatus(p) === 'running').length : Number.isFinite(readyCol) ? readyCol : isUp(resStatus(r)) ? desired : 0;
  return { desired, ready: Math.min(ready, desired) };
}

const POD_STATE: Record<string, string> = { running: 'Running', starting: 'ContainerCreating', stopped: 'Terminating', exited: 'Completed', error: 'Error' };

/** Columns of a resource with the live changes applied (scaling, restarts, cordon…). */
export function liveCols(r: LabResource): Record<string, string> {
  const cols = { ...r.cols };
  const st = resStatus(r);
  if (r.sectionId === 'deployments' || r.sectionId === 'statefulsets') {
    const { desired, ready } = replicasOf(r);
    Object.assign(cols, { ready: `${ready}/${desired}`, uptodate: String(desired), available: String(ready) });
  } else if (r.sectionId === 'kpods') {
    const n = Number((cols.ready ?? '1/1').split('/')[1]) || 1;
    if (live.status[r.id] || !cols.status) cols.status = POD_STATE[st] ?? 'Running';
    if (live.status[r.id] || !cols.ready) cols.ready = `${st === 'running' ? n : 0}/${n}`;
  } else if (r.sectionId === 'nodes') cols.status = st === 'degraded' ? 'Ready,SchedulingDisabled' : 'Ready';
  else if (r.sectionId === 'jobs' && live.status[r.id]) cols.status = st === 'ready' ? 'Complete' : st === 'error' ? 'Failed' : 'Running';
  return cols;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

/** Scale a deployment / stateful set: adds or removes pods and updates its status. */
export function scaleRes(r: LabResource, n: number): void {
  const pods = podsOf(r);
  kubeLive.replicas[r.id] = n;
  if (n > pods.length) {
    const tpl = pods[0];
    const owner = tpl?.cols?.owner ?? (r.sectionId === 'statefulsets' ? `StatefulSet/${r.name}` : `ReplicaSet/${r.name}-${kubeSuffix(`${r.id}/rs`, 10)}`);
    const nets = kubeNets(r.connId);
    for (let i = pods.length; i < n; i++) {
      const name = r.sectionId === 'statefulsets' ? `${r.name}-${i}` : `${owner.split('/')[1]}-${kubeSuffix(`${r.id}/${i}/${Date.now()}`, 5)}`;
      const id = `${r.connId}/kpods/${r.ns}/${name}`;
      const containers = (tpl?.cols?.ready ?? '1/1').split('/')[1];
      addResource({
        id,
        name,
        connId: r.connId,
        sectionId: 'kpods',
        ns: r.ns,
        status: 'running',
        sub: `Running · ${containers}/${containers}`,
        age: 'just now',
        cols: {
          ...tpl?.cols,
          ready: `${containers}/${containers}`,
          status: 'Running',
          restarts: '0',
          node: tpl?.cols?.node ?? resourcesOf(r.connId, 'nodes')[0]?.name ?? '—',
          ip: kubeIp(nets.pod, id),
          app: r.cols?.app ?? r.name,
          owner,
          image: r.cols?.image ?? tpl?.cols?.image ?? '',
        },
      });
      settle(id, 'starting', 'running');
    }
  } else {
    // Scale down: failing pods go first, then the newest.
    const order = [...pods].sort((a, b) => Number(resStatus(a) === 'running') - Number(resStatus(b) === 'running') || b.name.localeCompare(a.name));
    order.slice(0, pods.length - n).forEach(deleteRes);
  }
  if (n === 0) live.status[r.id] = 'stopped';
  else settle(r.id, 'starting', 'running');
}

/** Rollout restart: every pod is recreated. */
export function rolloutRestart(r: LabResource): void {
  podsOf(r).forEach(restartRes);
  settle(r.id, 'starting', 'running');
}

/** Port forward a service or pod: adds a Port Forwarding resource, streams the kubectl output, opens it. */
export function portForward(r: LabResource, onopen: Open): void {
  const svc = r.sectionId === 'services' ? r : resourcesOf(r.connId, 'services').find(s => s.ns === r.ns && s.cols?.app && s.cols.app === r.cols?.app);
  const port = Number(/(\d+)/.exec(svc?.cols?.ports ?? '')?.[1]) || 8080;
  const local = port < 1024 ? port + 8000 : port;
  const app = r.cols?.app ?? r.name;
  const name = `${app}-${local}`;
  const id = `${r.connId}/portforwards/${r.ns}/${name}`;
  const kind = r.sectionId === 'services' ? 'Service' : 'Pod';
  addResource({
    id,
    name,
    connId: r.connId,
    sectionId: 'portforwards',
    ns: r.ns,
    status: 'running',
    sub: `localhost:${local} → ${r.name}:${port}`,
    age: 'just now',
    cols: { local: `localhost:${local}`, target: `${r.name}:${port}`, kind, app },
  });
  const target: LabTarget = { kind: 'resource', connId: r.connId, sectionId: 'portforwards', resId: id };
  runTask({
    title: `port-forward ${r.name}`,
    label: 'kubectl port-forward',
    connId: r.connId,
    cmd: `kubectl port-forward -n ${r.ns} ${kind.toLowerCase()}/${r.name} ${local}:${port}`,
    lines: [`Forwarding from 127.0.0.1:${local} -> ${port}`, `Forwarding from [::1]:${local} -> ${port}`],
    target,
    icon: sourceOf(r).icon,
  });
  onopen(target, {});
}

/** Create a Job from a CronJob ("Trigger now"). */
function triggerCron(r: LabResource, onopen: Open): void {
  const name = `${r.name}-manual-${kubeSuffix(`${r.id}/${Date.now()}`, 5)}`;
  const id = `${r.connId}/jobs/${r.ns}/${name}`;
  addResource({ id, name, connId: r.connId, sectionId: 'jobs', ns: r.ns, status: 'running', sub: 'Running', age: 'just now', cols: { completions: '0/1', duration: '—', status: 'Running', image: r.cols?.image ?? '', app: name } });
  settle(id, 'running', 'ready', 2500);
  onopen({ kind: 'resource', connId: r.connId, sectionId: 'jobs', resId: id }, { preview: true });
}

export function inspectYaml(r: LabResource, onopen: Open): void {
  live.view[r.id] = 'yaml';
  onopen({ kind: 'resource', connId: r.connId, sectionId: r.sectionId, resId: r.id }, {});
}

function scaleMenu(r: LabResource): void {
  const cur = replicasOf(r).desired;
  openMenuHere([0, 1, 2, 3, 4, 5].map(n => ({ label: `${n === cur ? '✓ ' : ''}${n} replica${n === 1 ? '' : 's'}`, run: (): void => scaleRes(r, n) })));
}

export interface KubeAct {
  label: string;
  icon: IconRef;
  run: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Shown as a quick action in table rows (details headers show every action). */
  row?: boolean;
}

/** Per-kind actions: quick actions (rows / details header) and the `⋯` / right-click menu. */
export function kubeActs(r: LabResource, onopen: Open): KubeAct[] {
  const st = resStatus(r);
  const up = isUp(st);
  const logs = { label: 'See logs', icon: faAlignLeft, run: (): void => showLogs(r), row: true };
  const del = { label: 'Delete', icon: faTrash, danger: true, run: (): void => deleteRes(r), row: true };
  const pf = { label: 'Port forward', icon: faArrowRightArrowLeft, run: (): void => portForward(r, onopen) };
  switch (r.sectionId) {
    case 'kpods':
      return [logs, { label: 'Open terminal', icon: faTerminal, disabled: st !== 'running', run: (): void => openTerminal(r), row: true }, pf, del];
    case 'deployments':
    case 'statefulsets':
      return [{ label: 'Scale', icon: faArrowsUpDown, run: (): void => scaleMenu(r), row: true }, logs, { label: 'Restart rollout', icon: faRotateRight, disabled: !up, run: (): void => rolloutRestart(r) }, del];
    case 'daemonsets':
      return [logs, { label: 'Restart rollout', icon: faRotateRight, run: (): void => rolloutRestart(r) }, del];
    case 'services':
      return [{ ...pf, row: true }, del];
    case 'routes': {
      const host = r.cols?.host ?? r.sub;
      const tls = r.cols?.tls && r.cols.tls !== '—';
      return [{ label: 'Open URL', icon: faArrowUpRightFromSquare, run: (): void => void window.open(`${tls ? 'https' : 'http'}://${host}${r.cols?.path ?? '/'}`, '_blank'), row: true }, del];
    }
    case 'jobs':
      return [{ ...logs, run: (): void => showLogs(podsOf(r)[0] ?? r) }, del];
    case 'cronjobs':
      return [{ label: 'Trigger now', icon: faPlay, run: (): void => triggerCron(r, onopen), row: true }, del];
    case 'portforwards':
      return [
        { label: 'Open in browser', icon: faArrowUpRightFromSquare, run: (): void => void window.open(`http://${r.cols?.local ?? 'localhost:8080'}`, '_blank'), row: true },
        { label: 'Stop port forward', icon: faStop, danger: true, run: (): void => deleteRes(r), row: true },
      ];
    case 'nodes':
      return st === 'degraded'
        ? [{ label: 'Uncordon', icon: faCircleCheck, run: (): void => void (live.status[r.id] = 'ready'), row: true }]
        : [{ label: 'Cordon', icon: faBan, run: (): void => void (live.status[r.id] = 'degraded'), row: true }];
    default:
      return [del];
  }
}

/** `⋯` / right-click menu: the same actions as the quick actions, plus Inspect (YAML); Delete last. */
export function kubeMenu(r: LabResource, onopen: Open): MenuItem[] {
  const acts = kubeActs(r, onopen);
  const destructive = acts.filter(a => a.danger);
  return [
    ...acts.filter(a => !a.danger).map(a => ({ label: a.label, icon: a.icon, run: a.run, disabled: a.disabled })),
    { label: 'Inspect (YAML)', icon: faCode, run: (): void => inspectYaml(r, onopen), sep: acts.length > destructive.length },
    ...destructive.map((a, i) => ({ label: a.label, icon: a.icon, run: a.run, danger: true, sep: i === 0 })),
  ];
}

/* ------------------------------------------------------------------ */
/* Conditions, events, manifest                                        */
/* ------------------------------------------------------------------ */

/** "5 hours" → "5h". */
export function shortAge(age: string): string {
  const m = /^(\d+)\s*(\w)/.exec(age);
  if (!m) return '1s';
  return m[2] === 'w' ? `${Number(m[1]) * 7}d` : `${m[1]}${m[2]}`;
}

/** Conditions: [type, status, reason]. */
export function conditionsOf(r: LabResource): [string, string, string][] {
  const st = resStatus(r);
  const ok = st === 'running' || st === 'ready';
  const cols = liveCols(r);
  switch (r.sectionId) {
    case 'kpods': {
      const scheduled = cols.node && cols.node !== '—';
      return [
        ['PodScheduled', scheduled ? 'True' : 'False', scheduled ? '' : 'Unschedulable'],
        ['Initialized', 'True', ''],
        ['ContainersReady', ok ? 'True' : 'False', ok ? '' : 'ContainersNotReady'],
        ['Ready', ok ? 'True' : 'False', ok ? '' : 'ContainersNotReady'],
      ];
    }
    case 'deployments':
    case 'statefulsets':
    case 'replicasets': {
      const { desired, ready } = r.sectionId === 'replicasets' ? { desired: Number(cols.desired), ready: Number(cols.ready) } : replicasOf(r);
      return [
        ['Available', ready >= desired ? 'True' : 'False', ready >= desired ? 'MinimumReplicasAvailable' : 'MinimumReplicasUnavailable'],
        ['Progressing', 'True', 'NewReplicaSetAvailable'],
      ];
    }
    case 'nodes':
      return [
        ['MemoryPressure', 'False', 'KubeletHasSufficientMemory'],
        ['DiskPressure', 'False', 'KubeletHasNoDiskPressure'],
        ['PIDPressure', 'False', 'KubeletHasSufficientPID'],
        ['Ready', 'True', 'KubeletReady'],
      ];
    case 'jobs':
      return st === 'running' ? [] : [[st === 'error' ? 'Failed' : 'Complete', 'True', st === 'error' ? 'BackoffLimitExceeded' : '']];
    case 'routes':
      return [['Admitted', 'True', '']];
    default:
      return [];
  }
}

/** Events: [type, reason, message, age]. */
export function eventsOf(r: LabResource): [string, string, string, string][] {
  const st = resStatus(r);
  const cols = liveCols(r);
  const ago = shortAge(r.age);
  switch (r.sectionId) {
    case 'kpods': {
      if (cols.status === 'Pending' || cols.node === '—')
        return [['Warning', 'FailedScheduling', `0/6 nodes are available: 3 Insufficient nvidia.com/gpu, 3 node(s) had untolerated taint {node-role.kubernetes.io/master: }.`, ago]];
      const base: [string, string, string, string][] = [
        ['Normal', 'Scheduled', `Successfully assigned ${r.ns}/${r.name} to ${cols.node}`, ago],
        ['Normal', 'Pulled', `Container image "${cols.image ?? ''}" already present on machine`, ago],
        ['Normal', 'Created', `Created container ${(cols.containers ?? r.name).split(',')[0]}`, ago],
        ['Normal', 'Started', `Started container ${(cols.containers ?? r.name).split(',')[0]}`, ago],
      ];
      if (cols.status === 'CrashLoopBackOff' && st !== 'running') base.push(['Warning', 'BackOff', `Back-off restarting failed container ${(cols.containers ?? r.name).split(',')[0]} in pod ${r.name}`, '40s']);
      if (cols.status === 'ImagePullBackOff') base.splice(1, 3, ['Warning', 'Failed', `Failed to pull image "${cols.image}": manifest unknown`, '2m']);
      return base;
    }
    case 'deployments': {
      const rs = podsOf(r)[0]?.cols?.owner?.split('/')[1] ?? `${r.name}-${kubeSuffix(r.id, 10)}`;
      return [['Normal', 'ScalingReplicaSet', `Scaled up replica set ${rs} to ${replicasOf(r).desired}`, ago]];
    }
    case 'statefulsets':
    case 'replicasets':
    case 'daemonsets':
      return podsOf(r).map(p => ['Normal', 'SuccessfulCreate', `Created pod: ${p.name}`, shortAge(p.age)]);
    case 'jobs':
      return [['Normal', 'SuccessfulCreate', `Created pod: ${podsOf(r)[0]?.name ?? r.name}`, ago], ...(st === 'ready' ? [['Normal', 'Completed', 'Job completed', ago] as [string, string, string, string]] : [])];
    case 'cronjobs':
      return [
        ['Normal', 'SuccessfulCreate', `Created job ${r.name}-${29317440 + (r.name.length % 500)}`, shortAge(cols.last ?? r.age)],
        ['Normal', 'SawCompletedJob', `Saw completed job: ${r.name}-${29317440 + (r.name.length % 500)}, condition: Complete`, shortAge(cols.last ?? r.age)],
      ];
    case 'pvcs':
      return [['Normal', 'ProvisioningSucceeded', `Successfully provisioned volume ${cols.volume ?? ''}`, ago]];
    case 'nodes':
      return [['Normal', 'Starting', 'Starting kubelet.', ago], ['Normal', 'NodeReady', `Node ${r.name} status is now: NodeReady`, ago], ...(st === 'degraded' ? [['Normal', 'NodeNotSchedulable', `Node ${r.name} status is now: NodeNotSchedulable`, '5m'] as [string, string, string, string]] : [])];
    default:
      return [];
  }
}

/** Approximate creation timestamp from an age ("5 hours" before 2026-10-09T09:30:00Z). */
function created(age: string): string {
  const m = /^(\d+)\s*(\w+)/.exec(age);
  const unit: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
  const secs = m ? Number(m[1]) * (unit[m[2][0]] ?? 60) : 5;
  return new Date(Date.UTC(2026, 9, 9, 9, 30) - secs * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
}

function uid(id: string): string {
  let h = 7;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const x = (s: number): string => ((h * s) >>> 0).toString(16).padStart(8, '0');
  return `${x(1)}-${x(3).slice(0, 4)}-4${x(5).slice(0, 3)}-9${x(7).slice(0, 3)}-${x(11)}${x(13).slice(0, 4)}`;
}

const list = (items: string[], indent: string): string[] => items.map(i => `${indent}- ${i}`);

/** YAML manifest of a resource (`kubectl get -o yaml` style). */
export function manifest(r: LabResource): string[] {
  const [kind, api] = kindOf(r);
  const c = liveCols(r);
  const app = c.app ?? r.name;
  const port = /(\d+)/.exec(c.ports ?? c.service?.split(':')[1] ?? '8080')?.[1] ?? '8080';
  const meta = [
    `apiVersion: ${api}`,
    `kind: ${kind}`,
    'metadata:',
    `  name: ${r.name}`,
    ...(r.ns ? [`  namespace: ${r.ns}`] : []),
    `  uid: ${uid(r.id)}`,
    `  creationTimestamp: "${created(r.age)}"`,
    ...(namespaced(r.sectionId) && r.sectionId !== 'portforwards' ? ['  labels:', `    app: ${app}`] : []),
    ...(c.owner ? ['  ownerReferences:', `  - apiVersion: ${c.owner.startsWith('Job') ? 'batch/v1' : 'apps/v1'}`, `    kind: ${c.owner.split('/')[0]}`, `    name: ${c.owner.split('/')[1]}`, '    controller: true'] : []),
  ];
  const container = (indent: string): string[] => [
    `${indent}containers:`,
    `${indent}- name: ${(c.containers ?? app).split(',')[0]}`,
    `${indent}  image: ${c.image ?? `quay.io/acme/${app}:latest`}`,
    `${indent}  ports:`,
    `${indent}  - containerPort: ${port}`,
    `${indent}    protocol: TCP`,
    `${indent}  resources:`,
    `${indent}    requests:`,
    `${indent}      cpu: 100m`,
    `${indent}      memory: 128Mi`,
  ];
  switch (r.sectionId) {
    case 'deployments':
    case 'statefulsets':
    case 'daemonsets': {
      const { desired, ready } = r.sectionId === 'daemonsets' ? { desired: Number(c.desired), ready: Number(c.ready) } : replicasOf(r);
      return [
        ...meta,
        'spec:',
        ...(r.sectionId === 'daemonsets' ? [] : [`  replicas: ${desired}`]),
        ...(r.sectionId === 'statefulsets' ? [`  serviceName: ${c.service ?? app}`] : []),
        '  selector:',
        '    matchLabels:',
        `      app: ${app}`,
        ...(r.sectionId === 'deployments' ? ['  strategy:', '    type: RollingUpdate', '    rollingUpdate:', '      maxSurge: 25%', '      maxUnavailable: 25%'] : []),
        '  template:',
        '    metadata:',
        '      labels:',
        `        app: ${app}`,
        '    spec:',
        ...container('      '),
        'status:',
        ...(r.sectionId === 'daemonsets' ? [`  desiredNumberScheduled: ${desired}`, `  numberReady: ${ready}`] : [`  replicas: ${desired}`, `  readyReplicas: ${ready}`, `  availableReplicas: ${ready}`]),
      ];
    }
    case 'kpods':
      return [
        ...meta,
        'spec:',
        ...(c.node && c.node !== '—' ? [`  nodeName: ${c.node}`] : []),
        '  serviceAccountName: default',
        ...container('  '),
        'status:',
        `  phase: ${c.status === 'Completed' ? 'Succeeded' : c.status === 'Pending' ? 'Pending' : c.status === 'Error' ? 'Failed' : 'Running'}`,
        ...(c.ip && c.ip !== '—' ? [`  podIP: ${c.ip}`] : []),
        '  qosClass: Burstable',
        '  containerStatuses:',
        `  - name: ${(c.containers ?? app).split(',')[0]}`,
        `    ready: ${resStatus(r) === 'running'}`,
        `    restartCount: ${c.restarts ?? 0}`,
        ...(c.status && c.status !== 'Running' ? ['    state:', '      waiting:', `        reason: ${c.status}`] : []),
      ];
    case 'services':
      return [
        ...meta,
        'spec:',
        `  type: ${c.type ?? 'ClusterIP'}`,
        `  clusterIP: ${c.clusterIp ?? kubeIp(kubeNets(r.connId).svc, r.id)}`,
        '  ports:',
        ...(c.ports ?? `${port}/TCP`).split(', ').flatMap(p => [`  - port: ${p.split(/[:/]/)[0]}`, `    protocol: ${p.split('/')[1] ?? 'TCP'}`, `    targetPort: ${p.split(/[:/]/)[0]}`]),
        ...(c.selector && c.selector !== '—' ? ['  selector:', `    ${c.selector.replace('=', ': ')}`] : []),
        '  sessionAffinity: None',
      ];
    case 'routes':
      return kind === 'Ingress'
        ? [...meta, 'spec:', `  ingressClassName: ${c.class ?? 'nginx'}`, '  rules:', `  - host: ${c.host ?? r.sub}`, '    http:', '      paths:', `      - path: ${c.path ?? '/'}`, '        pathType: Prefix', '        backend:', '          service:', `            name: ${(c.service ?? app).split(':')[0]}`, '            port:', `              number: ${port}`]
        : [...meta, 'spec:', `  host: ${c.host ?? r.sub}`, `  path: ${c.path ?? '/'}`, '  to:', '    kind: Service', `    name: ${(c.service ?? app).split(':')[0]}`, '  port:', `    targetPort: ${port}`, ...(c.tls && c.tls !== '—' ? ['  tls:', `    termination: ${c.tls}`, '    insecureEdgeTerminationPolicy: Redirect'] : []), 'status:', '  ingress:', `  - host: ${c.host ?? r.sub}`, '    routerName: default'];
    case 'configmaps':
      return [
        ...meta,
        'data:',
        ...(c.data ?? 'key').split(', ').flatMap(k =>
          k.endsWith('.crt')
            ? [`  ${k}: |`, '    -----BEGIN CERTIFICATE-----', '    MIIDMjCCAhqgAwIBAgIIZ4m0YkTqX2cwDQYJKoZIhvcNAQELBQAw…', '    -----END CERTIFICATE-----']
            : k === 'LOG_LEVEL'
              ? ['  LOG_LEVEL: info']
              : [`  ${k}: |`, '    quarkus.http.port=8080', `    app.name=${app}`],
        ),
      ];
    case 'secrets':
      return [...meta, `type: ${c.type ?? 'Opaque'}`, 'data:', ...(c.data ?? 'key').split(', ').map(k => `  ${k}: ${btoa(`${k}-${r.name}`).slice(0, 16)}…`)];
    case 'pvcs':
      return [...meta, 'spec:', '  accessModes:', `  - ${c.access === 'RWX' ? 'ReadWriteMany' : 'ReadWriteOnce'}`, '  resources:', '    requests:', `      storage: ${c.capacity ?? '1Gi'}`, `  storageClassName: ${c.storageclass ?? 'standard'}`, `  volumeName: ${c.volume ?? ''}`, '  volumeMode: Filesystem', 'status:', `  phase: ${c.status ?? 'Bound'}`];
    case 'pvs':
      return [...meta, 'spec:', '  capacity:', `    storage: ${c.capacity}`, '  accessModes:', '  - ReadWriteOnce', `  persistentVolumeReclaimPolicy: ${c.reclaim}`, `  storageClassName: ${c.storageclass}`, '  claimRef:', `    namespace: ${c.claim?.split('/')[0]}`, `    name: ${c.claim?.split('/')[1]}`, 'status:', `  phase: ${c.status}`];
    case 'jobs':
      return [...meta, 'spec:', '  backoffLimit: 6', '  completions: 1', '  template:', '    spec:', '      restartPolicy: Never', ...container('      '), 'status:', ...(c.status === 'Complete' ? ['  succeeded: 1'] : c.status === 'Failed' ? ['  failed: 1'] : ['  active: 1'])];
    case 'cronjobs':
      return [...meta, 'spec:', `  schedule: "${c.schedule}"`, `  suspend: ${c.suspend === 'True'}`, '  concurrencyPolicy: Allow', '  jobTemplate:', '    spec:', '      template:', '        spec:', '          restartPolicy: OnFailure', ...container('          '), 'status:', `  lastScheduleTime: "${created(c.last ?? r.age)}"`];
    case 'nodes':
      return [
        ...meta,
        '  labels:',
        ...(c.roles ?? 'worker').split(',').map(x => `    node-role.kubernetes.io/${x}: ""`),
        '    kubernetes.io/os: linux',
        'spec:',
        ...(resStatus(r) === 'degraded' ? ['  unschedulable: true'] : []),
        'status:',
        '  addresses:',
        '  - type: InternalIP',
        `    address: ${c.ip}`,
        '  capacity:',
        `    cpu: "${c.cpu}"`,
        `    memory: ${c.memory?.replace(' GiB', 'Gi')}`,
        '    pods: "250"',
        '  nodeInfo:',
        `    kubeletVersion: ${c.version}`,
        `    osImage: ${c.os}`,
        `    containerRuntimeVersion: ${c.runtime}`,
      ];
    case 'namespaces':
      return [...meta, '  labels:', ...(c.labels ?? '').split(', ').map(l => `    ${l.replace('=', ': ')}`), 'spec:', '  finalizers:', '  - kubernetes', 'status:', `  phase: ${c.status ?? 'Active'}`];
    case 'roles':
    case 'clusterroles':
      return [...meta, 'rules:', '- apiGroups:', '  - ""', '  resources:', ...list((c.resources ?? 'pods, services, configmaps').split(', '), '  '), '  verbs:', ...list((c.verbs ?? 'get, list, watch').split(', '), '  ')];
    case 'rolebindings':
    case 'clusterrolebindings': {
      const [sk, ...sn] = (c.subjects ?? 'ServiceAccount/default').split('/');
      return [...meta, 'roleRef:', '  apiGroup: rbac.authorization.k8s.io', `  kind: ${c.role?.split('/')[0]}`, `  name: ${c.role?.split('/')[1]}`, 'subjects:', `- kind: ${sk}`, ...(sn.length > 1 ? [`  namespace: ${sn[0]}`] : []), `  name: ${sn.at(-1)}`];
    }
    case 'netpols':
      return [...meta, 'spec:', '  podSelector:', ...(c.podSelector === '{}' ? ['    {}'] : ['    matchLabels:', `      ${c.podSelector?.replace('=', ': ')}`]), '  policyTypes:', ...list((c.types ?? 'Ingress').split(', '), '  '), ...(c.types?.includes('Ingress') && !r.name.startsWith('default-deny') ? ['  ingress:', '  - from:', '    - namespaceSelector:', '        matchLabels:', `          kubernetes.io/metadata.name: ${r.name.includes('ingress') ? 'openshift-ingress' : r.name.includes('monitoring') ? 'openshift-monitoring' : r.ns}`] : [])];
    case 'httproutes':
      return [...meta, 'spec:', '  parentRefs:', ...(c.parents ?? '').split(', ').flatMap(p => [`  - namespace: ${p.split('/')[0]}`, `    name: ${p.split('/')[1]}`]), '  hostnames:', ...list((c.hostnames ?? '').split(', ').map(h => `"${h}"`), '  '), '  rules:', '  - backendRefs:', `    - name: ${(c.backend ?? r.name).split(':')[0]}`, `      port: ${(c.backend ?? ':8080').split(':')[1]}`];
    default:
      return [...meta, ...Object.entries(c).filter(([k]) => k !== 'app' && k !== 'owner').flatMap(([k, v], i) => [...(i === 0 ? ['spec:'] : []), `  ${k}: ${v.includes(':') || v.includes(',') ? `"${v}"` : v}`])];
  }
}
