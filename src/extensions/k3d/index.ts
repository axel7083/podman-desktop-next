/**
 * podman-desktop.k3d – k3s clusters in Podman containers (k3d v5.9.0): one
 * Kubernetes connection per cluster (P1, context `k3d-<name>`), a "Create k3d
 * cluster" factory (P12) and a grouper for the node containers labelled
 * `k3d.cluster` (P10). Sample from docs/research/podman-desktop.k3d.md.
 */
import { faDharmachakra } from '@fortawesome/free-solid-svg-icons';

import { mkContainer } from '#lib/ext/helpers.ts';
import type { ConnectionDef, FormValues, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { addKube, type Container, hexId, kube, type World } from '#lib/world.svelte.ts';

const ID = 'podman-desktop.k3d';
const K3S_IMAGE = 'docker.io/rancher/k3s:v1.34.1-k3s1';
const PROXY_IMAGE = 'ghcr.io/k3d-io/k3d-proxy:5.9.0';
const REGISTRY_IMAGE = 'docker.io/library/registry:2';
const K8S = 'v1.34.1+k3s1';

interface ClusterShape {
  servers: number;
  agents: number;
  lb: boolean;
  /** `8081:80@loadbalancer` → host 8081. */
  lbHostPort?: number;
  apiPort: number;
  registry?: { name: string; port: number };
  image?: string;
}

function seedKube(connId: string, cluster: string, shape: ClusterShape, withApps: boolean): void {
  const server0 = `k3d-${cluster}-server-0`;
  const node = (name: string, roles: string) =>
    kube('v1', 'Node', name, undefined, {}, { ready: true, roles, kubeletVersion: K8S, osImage: 'K3s v1.34.1+k3s1' }, { d: 3 }, { 'kubernetes.io/hostname': name, 'k3s.io/hostname': name });
  const pod = (name: string, ns: string, nodeName = server0, age: { d?: number; h?: number; m?: number } = { d: 3 }) =>
    kube('v1', 'Pod', name, ns, { nodeName }, { phase: 'Running', ready: '1/1', restarts: 0 }, age);
  const objects = [
    ...Array.from({ length: shape.servers }, (_, i) => node(`k3d-${cluster}-server-${i}`, 'control-plane,master')),
    ...Array.from({ length: shape.agents }, (_, i) => node(`k3d-${cluster}-agent-${i}`, '<none>')),
    kube('apps/v1', 'Deployment', 'coredns', 'kube-system', { replicas: 1, image: 'rancher/mirrored-coredns-coredns:1.12.3' }, { readyReplicas: 1 }, { d: 3 }),
    kube('apps/v1', 'Deployment', 'local-path-provisioner', 'kube-system', { replicas: 1, image: 'rancher/local-path-provisioner:v0.0.32' }, { readyReplicas: 1 }, { d: 3 }),
    kube('apps/v1', 'Deployment', 'traefik', 'kube-system', { replicas: 1, image: 'rancher/mirrored-library-traefik:3.5.1' }, { readyReplicas: 1 }, { d: 3 }),
    kube('apps/v1', 'Deployment', 'metrics-server', 'kube-system', { replicas: 1, image: 'rancher/mirrored-metrics-server:v0.8.0' }, { readyReplicas: 1 }, { d: 3 }),
    pod(`coredns-6d668d687-${hexId(5)}`, 'kube-system'),
    pod(`local-path-provisioner-5cf85fd84d-${hexId(5)}`, 'kube-system'),
    pod(`traefik-5d45fc8cc9-${hexId(5)}`, 'kube-system', shape.agents ? `k3d-${cluster}-agent-0` : server0),
    pod(`svclb-traefik-${hexId(5)}`, 'kube-system'),
    pod(`metrics-server-7bfffcd44-${hexId(5)}`, 'kube-system'),
    kube('v1', 'Service', 'kubernetes', 'default', { type: 'ClusterIP', clusterIP: '10.43.0.1', ports: '443/TCP' }, {}, { d: 3 }),
    kube('v1', 'Service', 'traefik', 'kube-system', { type: 'LoadBalancer', clusterIP: '10.43.84.17', ports: '80:31080/TCP,443:31443/TCP' }, {}, { d: 3 }),
    kube('v1', 'ConfigMap', 'kube-root-ca.crt', 'default', { data: { 'ca.crt': '-----BEGIN CERTIFICATE-----…' } }, {}, { d: 3 }),
  ];
  if (withApps) {
    const agent = shape.agents ? `k3d-${cluster}-agent-1` : server0;
    objects.push(
      kube('apps/v1', 'Deployment', 'orders-api', 'orders', { replicas: 2, image: `dev-registry:5001/acme/orders-api:2.3` }, { readyReplicas: 2 }, { h: 6 }, { app: 'orders-api' }),
      kube('apps/v1', 'Deployment', 'orders-worker', 'orders', { replicas: 1, image: `dev-registry:5001/acme/orders-worker:2.3` }, { readyReplicas: 1 }, { h: 6 }, { app: 'orders-worker' }),
      pod(`orders-api-6f8b9c7d5-${hexId(5)}`, 'orders', agent, { h: 6 }),
      pod(`orders-api-6f8b9c7d5-${hexId(5)}`, 'orders', `k3d-${cluster}-agent-0`, { h: 6 }),
      pod(`orders-worker-58c6d9f4b-${hexId(5)}`, 'orders', agent, { h: 6 }),
      kube('v1', 'Service', 'orders-api', 'orders', { type: 'ClusterIP', clusterIP: '10.43.201.9', ports: '8080/TCP' }, {}, { h: 6 }),
    );
  }
  addKube(connId, objects);
}

function nodeContainers(engineId: string, cluster: string, shape: ClusterShape, running: boolean, upM: number): Container[] {
  const state = running ? 'RUNNING' : 'EXITED';
  const labels = (role: string): Record<string, string> => ({ app: 'k3d', 'k3d.cluster': cluster, 'k3d.role': role, 'k3d.version': 'v5.9.0' });
  const out: Container[] = [];
  for (let i = 0; i < shape.servers; i++) {
    out.push(mkContainer(engineId, { name: `k3d-${cluster}-server-${i}`, image: K3S_IMAGE, state, labels: labels('server'), command: 'server --tls-san 0.0.0.0', upM }));
  }
  for (let i = 0; i < shape.agents; i++) {
    out.push(mkContainer(engineId, { name: `k3d-${cluster}-agent-${i}`, image: K3S_IMAGE, state, labels: labels('agent'), command: 'agent', upM }));
  }
  if (shape.lb) {
    out.push(
      mkContainer(engineId, {
        name: `k3d-${cluster}-serverlb`,
        image: PROXY_IMAGE,
        state,
        ports: [[shape.apiPort, 6443], ...(shape.lbHostPort ? [[shape.lbHostPort, 80] as [number, number]] : [])],
        labels: labels('loadbalancer'),
        upM,
      }),
    );
  }
  if (shape.registry) {
    out.push(mkContainer(engineId, { name: shape.registry.name, image: REGISTRY_IMAGE, state, ports: [[shape.registry.port, 5000]], labels: labels('registry'), upM }));
  }
  return out;
}

function connectionFor(cluster: string, shape: ClusterShape, status: ConnectionDef['initialStatus']): ConnectionDef {
  return {
    id: `k3d-${cluster}`,
    name: `k3d-${cluster}`,
    kind: 'kubernetes',
    providerId: 'k3d',
    providerName: 'k3d',
    initialStatus: status,
    endpoint: `https://0.0.0.0:${shape.apiPort}`,
    version: K8S,
    details: {
      Context: `k3d-${cluster}`,
      Servers: String(shape.servers),
      Agents: String(shape.agents),
      'Load balancer': shape.lb ? `k3d-${cluster}-serverlb${shape.lbHostPort ? ` (${shape.lbHostPort}:80)` : ''}` : 'None',
      ...(shape.registry ? { Registry: `${shape.registry.name}:${shape.registry.port}` } : {}),
      Image: shape.image ?? K3S_IMAGE,
      'Runs on': 'podman-machine-default',
    },
    capabilities: ['kube', 'kube.local', 'k3d', 'k3s'],
    parentId: 'podman-machine-default',
  };
}

const DEV: ClusterShape = { servers: 1, agents: 2, lb: true, lbHostPort: 8081, apiPort: 6550, registry: { name: 'dev-registry', port: 5001 } };
const EDGE: ClusterShape = { servers: 1, agents: 0, lb: false, apiPort: 6551 };

function shapeOf(v: FormValues): ClusterShape {
  const lbPort = /^(\d+):\d+@loadbalancer$/.exec(String(v.lbPort ?? ''))?.[1];
  return {
    servers: Number(v.servers) || 1,
    agents: Number(v.agents) || 0,
    lb: true,
    lbHostPort: lbPort ? Number(lbPort) : undefined,
    apiPort: 6552 + ([...String(v.name)].reduce((h, ch) => h + ch.charCodeAt(0), 0) % 40),
    registry: v.registry ? { name: `${String(v.name)}-registry`, port: 5002 } : undefined,
    image: String(v.image || K3S_IMAGE),
  };
}

const extension: MockExtension = {
  id: ID,
  displayName: 'k3d',
  publisher: 'podman-desktop',
  description: 'Lightweight k3s clusters in Podman containers, with a built-in load balancer and registry.',
  version: '0.1.0',
  icon: 'icons/podman-desktop.k3d.png',
  dependsOn: ['podman-desktop.podman'],
  tags: ['community'],
  pApis: ['P1', 'P10', 'P12'],
  contributes: {
    connections: [connectionFor('dev', DEV, 'started'), connectionFor('edge-sim', EDGE, 'stopped')],
    connectionFactories: [
      {
        id: 'k3d-cluster',
        label: 'Create k3d cluster',
        providerId: 'k3d',
        kind: 'kubernetes',
        description: 'A k3s cluster whose nodes run as containers on podman-machine-default.',
        fields: [
          { id: 'name', label: 'Cluster name', type: 'text', default: 'dev2', required: true, description: 'Kube context will be k3d-<name>.' },
          { id: 'servers', label: 'Servers', type: 'number', default: 1, min: 1, max: 5 },
          { id: 'agents', label: 'Agents', type: 'number', default: 2, min: 0, max: 10 },
          { id: 'lbPort', label: 'Load balancer port mapping', type: 'text', default: '8082:80@loadbalancer', placeholder: '8081:80@loadbalancer' },
          { id: 'registry', label: 'Create a local registry', type: 'checkbox', default: true },
          { id: 'image', label: 'k3s image', type: 'text', default: 'rancher/k3s:v1.34.1-k3s1' },
        ],
        steps: v => {
          const n = String(v.name);
          return [
            { label: `Preparing network k3d-${n}`, ms: 700, log: [`INFO[0000] Prep: Network`, `INFO[0000] Created network 'k3d-${n}'`, `INFO[0000] Created image volume k3d-${n}-images`] },
            ...(v.registry ? [{ label: `Creating registry ${n}-registry`, ms: 700, log: [`INFO[0001] Creating node '${n}-registry'`, `INFO[0001] Successfully created registry '${n}-registry'`] }] : []),
            { label: 'Creating nodes', ms: 1800, log: [`INFO[0002] Creating node 'k3d-${n}-server-0'`, ...Array.from({ length: Number(v.agents) || 0 }, (_, i) => `INFO[0002] Creating node 'k3d-${n}-agent-${i}'`), `INFO[0003] Creating LoadBalancer 'k3d-${n}-serverlb'`] },
            { label: 'Starting cluster', ms: 2200, log: ['INFO[0004] Starting Node', "INFO[0012] Injecting records for hostAliases (incl. host.k3d.internal) and for 3 network members into CoreDNS configmap..."] },
            { label: `Updating kubeconfig (context k3d-${n})`, ms: 600, log: [`INFO[0014] Cluster '${n}' created successfully!`, `INFO[0014] You can now use it like this:\nkubectl cluster-info`] },
          ];
        },
        createConnection: (v): ConnectionDef => connectionFor(String(v.name), shapeOf(v), 'started'),
        onCreated: (world, conn, v): void => {
          const name = String(v.name);
          const shape = shapeOf(v);
          seedKube(conn.id, name, shape, false);
          world.containers.push(...nodeContainers('podman-machine-default', name, shape, true, 0));
        },
      },
    ],
    groupers: [{ id: 'k3d-cluster', label: 'k3d.cluster', typeName: 'k3d cluster', icon: 'icons/podman-desktop.k3d.png' }],
    cliTools: [
      {
        id: 'k3d',
        name: 'k3d',
        displayName: 'k3d',
        description: 'k3d runs k3s (Rancher’s minimal Kubernetes) in containers.',
        version: '5.9.0',
        latest: '5.9.0',
        path: '/home/user/.local/share/containers/podman-desktop/extensions-storage/podman-desktop.k3d/k3d',
      },
    ],
    commands: [{ id: 'k3d.create', title: 'Create k3d cluster', category: 'k3d', icon: faDharmachakra, run: (): void => navigate('/settings/create/k3d-cluster') }],
  },
  seed(world: World): void {
    seedKube('k3d-dev', 'dev', DEV, true);
    seedKube('k3d-edge-sim', 'edge-sim', EDGE, false);
    world.containers.push(...nodeContainers('podman-machine-default', 'dev', DEV, true, 1440), ...nodeContainers('podman-machine-default', 'edge-sim', EDGE, false, 0));
  },
};

export default extension;
