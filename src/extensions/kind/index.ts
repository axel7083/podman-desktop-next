/**
 * podman-desktop.kind – built-in Kind extension: the kind-dev cluster as a
 * Kubernetes connection (running inside podman-machine-default), a
 * "Create Kind cluster" factory, the kind CLI and a P10 grouper for the
 * cluster's node containers.
 */
import { faDharmachakra } from '@fortawesome/free-solid-svg-icons';

import { mkContainer } from '#lib/ext/helpers.ts';
import type { ConnectionDef, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { addKube, hexId, kube, type World } from '#lib/world.svelte.ts';

const ID = 'podman-desktop.kind';

function seedCluster(world: World, connId: string, clusterName: string, withApps: boolean): void {
  const node = `${clusterName}-control-plane`;
  const pod = (name: string, ns: string, ready = '1/1', restarts = 0, age: { d?: number; h?: number; m?: number } = { d: 2 }) =>
    kube('v1', 'Pod', name, ns, { nodeName: node }, { phase: 'Running', ready, restarts }, age);
  const objects = [
    kube('v1', 'Node', node, undefined, {}, { ready: true, roles: 'control-plane', kubeletVersion: 'v1.34.0', osImage: 'Debian GNU/Linux 12 (bookworm)' }, { d: 5 }, { 'kubernetes.io/hostname': node }),
    kube('apps/v1', 'Deployment', 'coredns', 'kube-system', { replicas: 2, image: 'registry.k8s.io/coredns/coredns:v1.12.1' }, { readyReplicas: 2 }, { d: 5 }),
    kube('apps/v1', 'Deployment', 'local-path-provisioner', 'local-path-storage', { replicas: 1, image: 'docker.io/kindest/local-path-provisioner:v20250214' }, { readyReplicas: 1 }, { d: 5 }),
    pod(`coredns-674b8bbfcf-${hexId(5)}`, 'kube-system', '1/1', 0, { d: 5 }),
    pod(`coredns-674b8bbfcf-${hexId(5)}`, 'kube-system', '1/1', 0, { d: 5 }),
    pod(`etcd-${node}`, 'kube-system', '1/1', 0, { d: 5 }),
    pod(`kube-apiserver-${node}`, 'kube-system', '1/1', 0, { d: 5 }),
    kube('v1', 'Service', 'kubernetes', 'default', { type: 'ClusterIP', clusterIP: '10.96.0.1', ports: '443/TCP' }, {}, { d: 5 }),
    kube('v1', 'Service', 'kube-dns', 'kube-system', { type: 'ClusterIP', clusterIP: '10.96.0.10', ports: '53/UDP,53/TCP,9153/TCP' }, {}, { d: 5 }),
    kube('v1', 'ConfigMap', 'kube-root-ca.crt', 'default', { data: { 'ca.crt': '-----BEGIN CERTIFICATE-----…' } }, {}, { d: 5 }),
    kube('v1', 'ConfigMap', 'coredns', 'kube-system', { data: { Corefile: '.:53 { errors health … }' } }, {}, { d: 5 }),
  ];
  if (withApps) {
    objects.push(
      kube('apps/v1', 'Deployment', 'productpage-v1', 'bookinfo', { replicas: 1, image: 'docker.io/istio/examples-bookinfo-productpage-v1:1.20.2' }, { readyReplicas: 1 }, { h: 20 }, { app: 'productpage' }),
      kube('apps/v1', 'Deployment', 'reviews-v1', 'bookinfo', { replicas: 2, image: 'docker.io/istio/examples-bookinfo-reviews-v1:1.20.2' }, { readyReplicas: 1 }, { h: 20 }, { app: 'reviews' }),
      kube('apps/v1', 'Deployment', 'postgres', 'bookinfo', { replicas: 1, image: 'docker.io/library/postgres:16.4' }, { readyReplicas: 1 }, { h: 20 }, { app: 'postgres' }),
      pod(`productpage-v1-7d9c6c9f8b-${hexId(5)}`, 'bookinfo', '1/1', 0, { h: 20 }),
      pod(`reviews-v1-5b8d6c8f7c-${hexId(5)}`, 'bookinfo', '1/1', 0, { h: 20 }),
      kube('v1', 'Pod', `reviews-v1-5b8d6c8f7c-${hexId(5)}`, 'bookinfo', { nodeName: node }, { phase: 'Pending', ready: '0/1', restarts: 3 }, { m: 12 }),
      pod('postgres-0', 'bookinfo', '1/1', 1, { h: 20 }),
      kube('v1', 'Service', 'productpage', 'bookinfo', { type: 'NodePort', clusterIP: '10.96.141.12', ports: '9080:30080/TCP' }, {}, { h: 20 }),
      kube('v1', 'Service', 'reviews', 'bookinfo', { type: 'ClusterIP', clusterIP: '10.96.88.201', ports: '9080/TCP' }, {}, { h: 20 }),
      kube('v1', 'Secret', 'postgres-credentials', 'bookinfo', { type: 'Opaque' }, {}, { h: 20 }),
      kube('v1', 'PersistentVolumeClaim', 'data-postgres-0', 'bookinfo', { storage: '1Gi', storageClassName: 'standard' }, { phase: 'Bound' }, { h: 20 }),
    );
  }
  addKube(connId, objects);
}

const extension: MockExtension = {
  id: ID,
  displayName: 'Kind',
  publisher: 'podman-desktop',
  description: 'Create and run local Kubernetes clusters with Kind (Kubernetes in containers).',
  version: '1.29.0',
  icon: 'icons/podman-desktop.kind.png',
  builtin: true,
  dependsOn: ['podman-desktop.podman'],
  tags: ['community'],
  pApis: ['P1', 'P10', 'P12'],
  contributes: {
    connections: [
      {
        id: 'kind-dev',
        name: 'kind-dev',
        kind: 'kubernetes',
        providerId: 'kind',
        providerName: 'Kind',
        initialStatus: 'started',
        endpoint: 'https://127.0.0.1:45231',
        version: 'v1.34.0',
        details: { Context: 'kind-kind-dev', Nodes: '1', 'Runs on': 'podman-machine-default', Ingress: 'Contour' },
        capabilities: ['kube', 'kube.local', 'kind'],
        parentId: 'podman-machine-default',
      },
    ],
    connectionFactories: [
      {
        id: 'kind-cluster',
        label: 'Create Kind cluster',
        providerId: 'kind',
        kind: 'kubernetes',
        description: 'A local Kubernetes cluster running in a Podman container.',
        fields: [
          { id: 'name', label: 'Name', type: 'text', default: 'kind-cluster', required: true },
          { id: 'provider', label: 'Provider type', type: 'select', default: 'podman', options: [{ value: 'podman', label: 'podman' }, { value: 'docker', label: 'docker' }] },
          { id: 'httpPort', label: 'HTTP port', type: 'number', default: 9090 },
          { id: 'httpsPort', label: 'HTTPS port', type: 'number', default: 9443 },
          { id: 'ingress', label: 'Setup an ingress controller (Contour)', type: 'checkbox', default: true },
          { id: 'nodeImage', label: 'Node’s container image (optional)', type: 'text', placeholder: 'kindest/node:v1.34.0' },
        ],
        steps: v => [
          { label: 'Ensuring node image (kindest/node:v1.34.0)', ms: 2200, log: ['Creating cluster "' + String(v.name) + '" ...'] },
          { label: 'Preparing nodes', ms: 1500 },
          { label: 'Writing configuration', ms: 500 },
          { label: 'Starting control-plane', ms: 2200 },
          { label: 'Installing CNI and StorageClass', ms: 1000 },
          ...(v.ingress ? [{ label: 'Installing Contour ingress controller', ms: 1500 }] : []),
        ],
        createConnection: (v): ConnectionDef => ({
          id: String(v.name),
          name: String(v.name),
          kind: 'kubernetes',
          providerId: 'kind',
          providerName: 'Kind',
          initialStatus: 'started',
          endpoint: `https://127.0.0.1:${40000 + Math.floor(Math.random() * 9999)}`,
          version: 'v1.34.0',
          details: { Context: `kind-${String(v.name)}`, Nodes: '1', 'Runs on': 'podman-machine-default' },
          capabilities: ['kube', 'kube.local', 'kind'],
          parentId: 'podman-machine-default',
        }),
        onCreated: (world, conn): void => {
          seedCluster(world, conn.id, conn.name, false);
          world.containers.push(
            mkContainer('podman-machine-default', {
              name: `${conn.name}-control-plane`,
              image: 'docker.io/kindest/node:v1.34.0',
              ports: [[40000, 6443]],
              labels: { 'io.x-k8s.kind.cluster': conn.name, 'io.x-k8s.kind.role': 'control-plane' },
              upM: 0,
            }),
          );
        },
      },
    ],
    groupers: [{ id: 'kind-cluster', label: 'io.x-k8s.kind.cluster', typeName: 'kind cluster', icon: 'icons/podman-desktop.kind.png' }],
    cliTools: [
      {
        id: 'kind',
        name: 'kind',
        displayName: 'Kind',
        description: 'Kind is a tool for running local Kubernetes clusters using container nodes.',
        version: '0.29.0',
        latest: '0.30.0',
        path: '/home/user/.local/share/containers/podman-desktop/extensions-storage/podman-desktop.kind/kind',
      },
    ],
    commands: [
      { id: 'kind.create', title: 'Create Kind cluster', category: 'Kind', icon: faDharmachakra, run: (): void => navigate('/settings/create/kind-cluster') },
    ],
  },
  seed(world): void {
    seedCluster(world, 'kind-dev', 'kind-dev', true);
    world.containers.push(
      mkContainer('podman-machine-default', {
        name: 'kind-dev-control-plane',
        image: 'docker.io/kindest/node:v1.34.0',
        ports: [[45231, 6443], [9090, 80], [9443, 443]],
        labels: { 'io.x-k8s.kind.cluster': 'kind-dev', 'io.x-k8s.kind.role': 'control-plane' },
        upM: 600,
      }),
    );
    world.currentKubeContext ??= 'kind-dev';
  },
};

export default extension;
