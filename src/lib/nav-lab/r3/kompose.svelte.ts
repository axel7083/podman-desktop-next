/**
 * P13 Kompose extension: convert a compose project, a pod, a quadlet or a
 * selection of containers into Kubernetes resources (`kompose convert`
 * semantics: one Deployment + Service per service, PVCs for named volumes,
 * Route on OpenShift / Ingress elsewhere), deploy them as a bottom-panel task
 * and remember the deployment on the source (Synced / Drifted, Redeploy,
 * Undeploy). The tab is `{ kind: 'kompose', connId, resId: <source ids, comma separated> }`.
 */
import { conn, type LabResource, type LabTarget, resource, resourcesOf } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { composeServices, containerInfo, hash } from './details.ts';
import { addResource, runTask, sha } from './flows.svelte.ts';
import { selectedNs, setNs } from './kube-ns.svelte.ts';
import { deleteRes, live } from './live.svelte.ts';

export const KOMPOSE_ICON = 'icons/kubernetes.kompose.png';

export interface KService {
  name: string;
  image: string;
  controller: 'Deployment' | 'StatefulSet' | 'DaemonSet';
  replicas: number;
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer';
  expose: boolean;
  port?: number;
  volume?: { name: string; size: string; storageClass: string };
  strategy: 'keep' | 'quay' | 'load';
  /** Compose keys Kompose drops for this service. */
  dropped: string[];
}

export interface KDeployment {
  connId: string;
  ns: string;
  resIds: string[];
  at: string;
  drifted?: boolean;
}

class Kompose {
  /** Per source key (tab resId): per-service settings edited in the Services view. */
  cfg = $state<Record<string, KService[]>>({});
  /** Deployments per source key. */
  deployed = $state<Record<string, KDeployment>>({});
  /** Resources just created (highlighted in the tree). */
  fresh = $state<string[]>([]);
  /** Tree keys to expand on a connection (Compute folder, Deployments). */
  reveal = $state<{ connId: string; keys: string[] } | undefined>(undefined);
}

export const kompose = new Kompose();

export function sourcesOf(key: string): LabResource[] {
  return key
    .split(',')
    .map(id => resource(id))
    .filter((r): r is LabResource => !!r);
}

export function sourceLabel(key: string): string {
  const s = sourcesOf(key);
  return s.length === 1 ? s[0].name : `${s.length} containers`;
}

export function komposeTarget(rs: LabResource[]): LabTarget {
  return { kind: 'kompose', connId: rs[0]?.connId, resId: rs.map(r => r.id).join(',') };
}

/** Open the Kompose tab for resources (installs the extension from Vanilla promotions only). */
export function openKompose(rs: LabResource[], onopen: (t: LabTarget, o: { preview?: boolean }) => void): void {
  if (rs.length) onopen(komposeTarget(rs), {});
}

const clean = (s: string): string => s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');

/** Services of a source (compose services, pod containers, containers, quadlet unit). */
function initial(key: string): KService[] {
  const out: KService[] = [];
  for (const r of sourcesOf(key)) {
    let members: { name: string; ctr: LabResource }[];
    if (r.sectionId === 'compose') members = composeServices(r).map(s => ({ name: s.service, ctr: s.ctr }));
    else if (r.sectionId === 'pods') {
      const ctrs = resourcesOf(r.connId, 'containers').filter(c => c.group === r.name && !c.name.endsWith('infra'));
      members = (ctrs.length ? ctrs : [{ ...r, name: `${r.name}-app`, sub: `quay.io/acme/${r.name}:1.0` }]).map(c => ({ name: c.name, ctr: c }));
    } else members = [{ name: r.name.replace(/\.(container|kube|pod)$/, ''), ctr: r }];
    for (const m of members) {
      const ci = containerInfo(m.ctr);
      const stateful = /db|postgres|cache|valkey|redis|kafka/.test(m.name);
      out.push({
        name: clean(m.name),
        image: m.ctr.sectionId === 'containers' ? ci.image : m.ctr.sub || `quay.io/acme/${m.name}:1.0`,
        controller: stateful && /db|postgres/.test(m.name) ? 'StatefulSet' : 'Deployment',
        replicas: 1,
        type: 'ClusterIP',
        expose: !stateful && ci.ports.length > 0,
        port: ci.ports.length ? 8080 : stateful ? 5432 : undefined,
        volume: stateful ? { name: `${clean(m.name)}-data`, size: '1Gi', storageClass: 'default' } : undefined,
        strategy: ci.image.startsWith('localhost/') || ci.image.includes('/acme/') ? 'load' : 'keep',
        dropped: [...(stateful ? [] : ['depends_on']), ...(r.sectionId === 'compose' ? ['networks'] : []), ...(hash(m.name) % 3 === 0 ? ['healthcheck → livenessProbe'] : []), ...(ci.image.includes('/acme/') ? ['build'] : [])],
      });
    }
  }
  return out;
}

export function servicesOf(key: string): KService[] {
  return kompose.cfg[key] ?? initial(key);
}

/** Edit a service (Services view menus); a deployed source becomes Drifted. */
export function editService(key: string, name: string, patch: Partial<KService>): void {
  const list = (kompose.cfg[key] ??= initial(key));
  const s = list.find(x => x.name === name);
  if (s) Object.assign(s, patch);
  const d = kompose.deployed[key];
  if (d) d.drifted = true;
}

/** Route on OpenShift-flavoured clusters, Ingress elsewhere. */
export function exposeKind(connId: string): 'Route' | 'Ingress' {
  return /openshift|microshift|sandbox/i.test(conn(connId)?.product ?? '') || connId === 'sandbox' ? 'Route' : 'Ingress';
}

export function hostOf(svc: string, connId: string, ns: string): string {
  if (connId === 'kind-dev') return `${svc}.localtest.me`;
  if (connId === 'openshift-local') return `${svc}-${ns}.apps-crc.testing`;
  return `${svc}-${ns}.apps.${connId}.example.com`;
}

export interface Manifest {
  file: string;
  kind: string;
  lines: string[];
}

/** `kompose convert` output for a source on a target. */
export function manifestsOf(key: string, connId: string, ns: string, generator: string): Manifest[] {
  const out: Manifest[] = [];
  const route = exposeKind(connId);
  for (const s of servicesOf(key)) {
    const ann = generator === 'kompose' ? ['  annotations:', '    kompose.cmd: kompose convert -f compose.yaml', '    kompose.version: 1.38.0'] : generator === 'podman' ? ['  annotations:', '    io.podman.annotations.generated: podman kube generate --type deployment'] : ['  annotations:', '    score.dev/source: score.yaml'];
    if (s.volume)
      out.push({
        file: `${s.volume.name}-persistentvolumeclaim.yaml`,
        kind: 'PersistentVolumeClaim',
        lines: ['apiVersion: v1', 'kind: PersistentVolumeClaim', 'metadata:', `  name: ${s.volume.name}`, `  namespace: ${ns}`, 'spec:', '  accessModes: [ReadWriteOnce]', ...(s.volume.storageClass !== 'default' ? [`  storageClassName: ${s.volume.storageClass}`] : []), '  resources:', '    requests:', `      storage: ${s.volume.size}`],
      });
    out.push({
      file: `${s.name}-${s.controller.toLowerCase()}.yaml`,
      kind: s.controller,
      lines: [
        'apiVersion: apps/v1',
        `kind: ${s.controller}`,
        'metadata:',
        `  name: ${s.name}`,
        `  namespace: ${ns}`,
        ...ann,
        `  labels: { io.kompose.service: ${s.name}, app.kubernetes.io/managed-by: podman-desktop }`,
        'spec:',
        ...(s.controller !== 'DaemonSet' ? [`  replicas: ${s.replicas}`] : []),
        `  selector: { matchLabels: { io.kompose.service: ${s.name} } }`,
        ...(s.volume ? ['  strategy: { type: Recreate }'] : []),
        '  template:',
        `    metadata: { labels: { io.kompose.service: ${s.name} } }`,
        '    spec:',
        '      containers:',
        `        - name: ${s.name}`,
        `          image: ${s.strategy === 'quay' ? `quay.io/acme/${s.name}:latest` : s.image}`,
        ...(s.strategy === 'load' ? ['          imagePullPolicy: IfNotPresent'] : []),
        ...(s.port ? [`          ports: [{ containerPort: ${s.port} }]`] : []),
        ...(s.volume ? ['          volumeMounts: [{ name: data, mountPath: /var/lib/data }]', `      volumes: [{ name: data, persistentVolumeClaim: { claimName: ${s.volume.name} } }]`] : []),
      ],
    });
    if (s.port)
      out.push({
        file: `${s.name}-service.yaml`,
        kind: 'Service',
        lines: ['apiVersion: v1', 'kind: Service', 'metadata:', `  name: ${s.name}`, `  namespace: ${ns}`, 'spec:', `  type: ${s.type}`, `  selector: { io.kompose.service: ${s.name} }`, `  ports: [{ name: "${s.port}", port: ${s.port}, targetPort: ${s.port} }]`],
      });
    if (s.expose && s.port)
      out.push({
        file: `${s.name}-${route.toLowerCase()}.yaml`,
        kind: route,
        lines:
          route === 'Route'
            ? ['apiVersion: route.openshift.io/v1', 'kind: Route', 'metadata:', `  name: ${s.name}`, `  namespace: ${ns}`, 'spec:', `  host: ${hostOf(s.name, connId, ns)}`, `  to: { kind: Service, name: ${s.name} }`, '  tls: { termination: edge }']
            : ['apiVersion: networking.k8s.io/v1', 'kind: Ingress', 'metadata:', `  name: ${s.name}`, `  namespace: ${ns}`, 'spec:', '  rules:', `    - host: ${hostOf(s.name, connId, ns)}`, '      http:', '        paths:', `          - { path: /, pathType: Prefix, backend: { service: { name: ${s.name}, port: { number: ${s.port} } } } }`],
      });
  }
  return out;
}

/** Warnings: compose features Kompose drops or maps lossily. */
export function warningsOf(key: string): [string, string, 'warn' | 'info', string][] {
  const out: [string, string, 'warn' | 'info', string][] = [];
  for (const s of servicesOf(key))
    for (const d of s.dropped) {
      if (d === 'depends_on') out.push(['depends_on', s.name, 'warn', 'Dropped: start order is not kept; add an init container or retry logic.']);
      else if (d === 'networks') out.push(['networks', s.name, 'info', 'Flat cluster network; NetworkPolicies only with --generate-network-policies.']);
      else if (d === 'build') out.push(['build', s.name, 'warn', `Build context ignored: the image must be pushed or loaded into the cluster (${s.strategy === 'keep' ? 'currently: keep' : s.strategy === 'quay' ? 'push to Quay' : 'load into the cluster'}).`]);
      else out.push(['healthcheck', s.name, 'info', 'Compose healthcheck mapped to a livenessProbe (exec); no readinessProbe.']);
    }
  for (const s of servicesOf(key)) if (s.volume && s.volume.storageClass === 'default') out.push(['volumes', s.name, 'info', `Named volume → PVC ${s.volume.name} (${s.volume.size}) on the default StorageClass.`]);
  return out;
}

/** Dry run (`kubectl apply --dry-run=server`). */
export function dryRun(key: string, connId: string, ns: string, generator: string): void {
  const m = manifestsOf(key, connId, ns, generator);
  lab.panel = true;
  runTask({ title: `Dry run ${sourceLabel(key)}`, connId, icon: KOMPOSE_ICON, label: 'kubectl apply --dry-run=server', cmd: `kubectl apply --dry-run=server -n ${ns} -f kompose/`, lines: [...m.map(x => `${x.kind.toLowerCase()}/${x.file.replace(/-[a-z]+\.yaml$/, '')} created (server dry run)`), `✔ Dry run OK: ${m.length} resources valid on ${connId}`] });
}

export function deploy(key: string, connId: string, ns: string, generator: string): void {
  const svcs = servicesOf(key);
  const m = manifestsOf(key, connId, ns, generator);
  const route = exposeKind(connId);
  const loader = connId === 'kind-dev' ? 'kind load docker-image --name dev' : connId === 'minc' ? 'podman save | podman exec -i microshift ctr import' : 'podman push';
  live.status[`conn:${connId}`] = 'running';
  lab.panel = true;
  runTask({
    title: `Deploy ${sourceLabel(key)}`,
    connId,
    icon: KOMPOSE_ICON,
    label: 'Kompose deploy',
    target: { kind: 'kompose', connId: sourcesOf(key)[0]?.connId, resId: key },
    cmd: `kompose convert -f compose.yaml --namespace ${ns} -o kompose/ && kubectl apply -n ${ns} -f kompose/`,
    lines: [
      ...svcs.filter(s => s.strategy !== 'keep').map(s => (s.strategy === 'quay' ? `$ podman push ${s.image} quay.io/acme/${s.name}:latest` : `$ ${loader} ${s.image}`)),
      `namespace/${ns} configured`,
      ...m.filter(x => x.kind === 'PersistentVolumeClaim').map(x => `persistentvolumeclaim/${x.file.replace('-persistentvolumeclaim.yaml', '')} created`),
      ...m.filter(x => x.kind === 'Service').map(x => `service/${x.file.replace('-service.yaml', '')} created`),
      ...m.filter(x => ['Deployment', 'StatefulSet', 'DaemonSet'].includes(x.kind)).map(x => `${x.kind.toLowerCase()}.apps/${x.file.replace(/-[a-z]+\.yaml$/, '')} created`),
      ...m.filter(x => x.kind === route).map(x => `${route === 'Route' ? 'route.route.openshift.io' : 'ingress.networking.k8s.io'}/${x.file.replace(/-[a-z]+\.yaml$/, '')} created`),
      `$ kubectl rollout status -n ${ns} deployment --timeout=120s`,
      ...svcs.map(s => `${s.controller.toLowerCase()} "${s.name}" successfully rolled out`),
      `✔ ${svcs.length} services deployed to ${connId}/${ns}`,
    ],
    done: () => {
      const ids: string[] = [];
      const add = (r: Omit<LabResource, 'connId' | 'age' | 'ns'>): void => {
        addResource({ ...r, connId, age: 'just now', ns });
        ids.push(r.id);
      };
      for (const s of svcs) {
        const sec = s.controller === 'StatefulSet' ? 'statefulsets' : s.controller === 'DaemonSet' ? 'daemonsets' : 'deployments';
        const image = s.strategy === 'quay' ? `quay.io/acme/${s.name}:latest` : s.image;
        add({ id: `${connId}/${sec}/${ns}/${s.name}`, name: s.name, sectionId: sec, status: 'running', sub: `${s.replicas}/${s.replicas} ready`, cols: { ready: `${s.replicas}/${s.replicas}`, upToDate: String(s.replicas), available: String(s.replicas), image, app: s.name } });
        const pod = s.controller === 'StatefulSet' ? `${s.name}-0` : `${s.name}-${sha(s.name + connId, 10)}-${sha(ns + s.name, 5)}`;
        add({ id: `${connId}/kpods/${ns}/${pod}`, name: pod, sectionId: 'kpods', status: 'running', sub: '1/1 ready', cols: { ready: '1/1', status: 'Running', restarts: '0', node: `${connId}-control-plane`, ip: `10.244.0.${hash(pod) % 250}`, image, app: s.name } });
        if (s.port) add({ id: `${connId}/services/${ns}/${s.name}`, name: s.name, sectionId: 'services', status: 'ready', sub: `${s.type} ${s.port}/TCP`, cols: { type: s.type, clusterIP: `10.96.${hash(s.name) % 250}.${hash(ns) % 250}`, ports: `${s.port}/TCP`, selector: `io.kompose.service=${s.name}`, app: s.name } });
        if (s.expose && s.port) add({ id: `${connId}/routes/${ns}/${s.name}`, name: s.name, sectionId: 'routes', status: 'ready', sub: hostOf(s.name, connId, ns), cols: { host: hostOf(s.name, connId, ns), path: '/', service: s.name, tls: route === 'Route' ? 'edge' : '—', kind: route, app: s.name } });
        if (s.volume) add({ id: `${connId}/pvcs/${ns}/${s.volume.name}`, name: s.volume.name, sectionId: 'pvcs', status: 'ready', sub: `Bound ${s.volume.size}`, cols: { status: 'Bound', capacity: s.volume.size, access: 'RWO', storageClass: s.volume.storageClass === 'default' ? 'standard' : s.volume.storageClass, app: s.name } });
      }
      kompose.deployed[key] = { connId, ns, resIds: [...new Set([...(kompose.deployed[key]?.resIds ?? []), ...ids])], at: 'just now', drifted: false };
      kompose.fresh = ids;
      kompose.reveal = { connId, keys: ['grp:Compute', 'deployments'] };
      const sel = selectedNs(connId);
      if (!sel.includes('*') && !sel.includes(ns)) setNs(connId, [...sel, ns]);
    },
  });
}

export function undeploy(key: string): void {
  const d = kompose.deployed[key];
  if (!d) return;
  lab.panel = true;
  runTask({
    title: `Undeploy ${sourceLabel(key)}`,
    connId: d.connId,
    icon: KOMPOSE_ICON,
    label: 'kubectl delete',
    cmd: `kubectl delete -n ${d.ns} -l app.kubernetes.io/managed-by=podman-desktop,io.kompose.service`,
    lines: [...d.resIds.map(id => `${id.split('/')[1]}/${id.split('/').pop()} deleted`), `✔ Removed ${d.resIds.length} resources from ${d.connId}/${d.ns}`],
    done: () => {
      for (const id of d.resIds) {
        const r = resource(id);
        if (r) deleteRes(r);
      }
      delete kompose.deployed[key];
    },
  });
}

/** Deployments whose source includes a resource (for its Summary card). */
export function deploymentsFor(resId: string): [string, KDeployment][] {
  return Object.entries(kompose.deployed).filter(([k]) => k.split(',').includes(resId));
}
