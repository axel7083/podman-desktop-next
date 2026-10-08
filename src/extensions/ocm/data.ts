/**
 * OCM `GET /api/clusters_mgmt/v1/clusters` items (subset of fields) and the
 * Kubernetes objects discovered once a cluster is connected.
 */
import { hexId, kube, type KubeObject } from '#lib/world.svelte.ts';

export const OCM_ID = 'redhat.openshift-cluster-manager';

export type ClusterState = 'installing' | 'ready' | 'error' | 'hibernating' | 'powering_down' | 'resuming' | 'uninstalling' | 'pending' | 'waiting' | 'unknown';

export interface OcmCluster {
  id: string;
  name: string;
  display_name?: string;
  state: ClusterState;
  openshift_version: string;
  product: { id: 'rosa' | 'osd' | 'ocp' | 'osdtrial' | 'aro' };
  hypershift?: { enabled: boolean };
  cloud_provider: { id: 'aws' | 'gcp' | 'azure' | 'baremetal' };
  region: { id: string };
  multi_az?: boolean;
  nodes: { compute: number };
  console?: { url: string };
  api: { url: string; listening?: 'external' | 'internal' };
  creation_timestamp: string;
  /** Available z/y upgrade (from `version.available_upgrades`). */
  available_upgrade?: string;
}

export const CLUSTERS: OcmCluster[] = [
  {
    id: '2l8v9q6e4b1c7d0f3a5h8k2m4n6p8r0s',
    name: 'ocp-prod',
    display_name: 'Payments prod',
    state: 'ready',
    openshift_version: '4.21.9',
    product: { id: 'rosa' },
    hypershift: { enabled: true },
    cloud_provider: { id: 'aws' },
    region: { id: 'us-east-1' },
    multi_az: true,
    nodes: { compute: 9 },
    console: { url: 'https://console-openshift-console.apps.rosa.ocp-prod.x7k2.p3.openshiftapps.com' },
    api: { url: 'https://api.ocp-prod.x7k2.p3.openshiftapps.com:443', listening: 'external' },
    creation_timestamp: '2026-02-11T14:22:07Z',
    available_upgrade: '4.22.3',
  },
  {
    id: '2m1a3c5e7g9i1k3m5o7q9s1u3w5y7a9c',
    name: 'ocp-dev',
    display_name: 'Payments dev',
    state: 'ready',
    openshift_version: '4.22.3',
    product: { id: 'ocp' },
    cloud_provider: { id: 'baremetal' },
    region: { id: '' },
    nodes: { compute: 3 },
    console: { url: 'https://console-openshift-console.apps.ocp-dev.acme.internal' },
    api: { url: 'https://api.ocp-dev.acme.internal:6443', listening: 'external' },
    creation_timestamp: '2026-06-03T09:10:44Z',
  },
  {
    id: '2n4b6d8f0h2j4l6n8p0r2t4v6x8z0b2d',
    name: 'ocp-qa',
    state: 'hibernating',
    openshift_version: '4.21.9',
    product: { id: 'osd' },
    cloud_provider: { id: 'gcp' },
    region: { id: 'europe-west4' },
    nodes: { compute: 4 },
    api: { url: 'https://api.ocp-qa.d4f1.s2.devshift.org:6443' },
    creation_timestamp: '2025-11-19T16:45:00Z',
  },
  {
    id: '2p7c9e1g3i5k7m9o1q3s5u7w9y1a3c5e',
    name: 'rosa-sandbox-jd',
    state: 'installing',
    openshift_version: '4.22.3',
    product: { id: 'rosa' },
    hypershift: { enabled: true },
    cloud_provider: { id: 'aws' },
    region: { id: 'eu-west-1' },
    nodes: { compute: 2 },
    api: { url: 'https://api.rosa-sandbox-jd.k3m9.p3.openshiftapps.com:443' },
    creation_timestamp: '2026-10-08T07:58:31Z',
  },
];

export function productLabel(c: OcmCluster): string {
  const base = { rosa: 'ROSA', osd: 'OSD', ocp: 'OpenShift Container Platform', osdtrial: 'OSD trial', aro: 'ARO' }[c.product.id];
  return c.hypershift?.enabled ? `${base} (hosted control planes)` : base;
}

export function locationLabel(c: OcmCluster): string {
  const cloud = { aws: 'AWS', gcp: 'Google Cloud', azure: 'Azure', baremetal: 'Bare metal' }[c.cloud_provider.id];
  return c.region.id ? `${cloud} · ${c.region.id}` : cloud;
}

/** kubeconfig context written by `oc login --web`. */
export function contextName(c: OcmCluster): string {
  return `default/${c.api.url.replace(/^https:\/\//, '').replace(/[.:]/g, '-')}/jdoe`;
}

/* ------------------------------------------------------------------ */
/* Discovered objects                                                  */
/* ------------------------------------------------------------------ */

export function crd(name: string, age: { d?: number } = { d: 60 }): KubeObject {
  const [plural, ...group] = name.split('.');
  return kube('apiextensions.k8s.io/v1', 'CustomResourceDefinition', name, undefined, { group: group.join('.'), names: { plural }, scope: 'Namespaced' }, { established: true }, age);
}

function rs(): string {
  return `${hexId(9).replace(/[^a-f0-9]/g, '')}`;
}

function pod(name: string, ns: string, node: string, ready = '1/1', phase = 'Running', restarts = 0, age: { d?: number; h?: number; m?: number } = { d: 3 }, labels?: Record<string, string>): KubeObject {
  return kube('v1', 'Pod', name, ns, { nodeName: node }, { phase, ready, restarts }, age, labels);
}

function deploy(name: string, ns: string, image: string, replicas: number, ready: number, age: { d?: number; h?: number } = { d: 3 }): KubeObject {
  return kube('apps/v1', 'Deployment', name, ns, { replicas, image }, { readyReplicas: ready }, age, { app: name });
}

function node(name: string, roles: string, version: string): KubeObject {
  return kube('v1', 'Node', name, undefined, {}, { ready: true, roles, kubeletVersion: version, osImage: 'Red Hat Enterprise Linux CoreOS 9.6 (Plow)' }, { d: 120 });
}

export function prodObjects(): KubeObject[] {
  const kv = 'v1.34.4';
  const workers = Array.from({ length: 9 }, (_, i) => `ip-10-0-${(i % 3) * 32 + 12}-${40 + i * 7}.ec2.internal`);
  return [
    ...workers.map(w => node(w, 'worker', kv)),
    crd('applications.argoproj.io'),
    crd('clusterextensions.olm.operatorframework.io'),
    crd('clustercatalogs.olm.operatorframework.io'),
    crd('routes.route.openshift.io'),
    deploy('payments-api', 'payments', 'quay.io/acme/payments-api:1.4.0', 3, 3, { d: 17 }),
    deploy('ledger-worker', 'payments', 'quay.io/acme/ledger-worker:2.3.1', 2, 2, { d: 17 }),
    deploy('openshift-gitops-server', 'openshift-gitops', 'registry.redhat.io/openshift-gitops-1/argocd-rhel9:v1.19.1', 1, 1, { d: 60 }),
    deploy('central', 'stackrox', 'registry.redhat.io/advanced-cluster-security/rhacs-main-rhel8:4.10.0', 1, 1, { d: 60 }),
    deploy('scanner-v4-indexer', 'stackrox', 'registry.redhat.io/advanced-cluster-security/rhacs-scanner-v4-rhel8:4.10.0', 2, 2, { d: 60 }),
    pod(`payments-api-7f9c8d6b5-${rs().slice(0, 5)}`, 'payments', workers[0], '1/1', 'Running', 0, { d: 2 }, { app: 'payments-api' }),
    pod(`payments-api-7f9c8d6b5-${rs().slice(0, 5)}`, 'payments', workers[3], '1/1', 'Running', 0, { d: 2 }, { app: 'payments-api' }),
    pod(`payments-api-7f9c8d6b5-${rs().slice(0, 5)}`, 'payments', workers[6], '1/1', 'Running', 0, { d: 2 }, { app: 'payments-api' }),
    pod(`ledger-worker-5d8b9c7f4-${rs().slice(0, 5)}`, 'payments', workers[1], '1/1', 'Running', 0, { d: 5 }, { app: 'ledger-worker' }),
    pod(`ledger-worker-5d8b9c7f4-${rs().slice(0, 5)}`, 'payments', workers[4], '1/1', 'Running', 1, { d: 5 }, { app: 'ledger-worker' }),
    pod(`central-6c9f7d8b5-${rs().slice(0, 5)}`, 'stackrox', workers[2], '1/1', 'Running', 0, { d: 20 }),
    kube('v1', 'Service', 'payments-api', 'payments', { type: 'ClusterIP', clusterIP: '172.30.88.14', ports: '8080/TCP' }, {}, { d: 17 }),
    kube('v1', 'Service', 'central', 'stackrox', { type: 'ClusterIP', clusterIP: '172.30.12.201', ports: '443/TCP' }, {}, { d: 60 }),
    kube('v1', 'ConfigMap', 'payments-api-config', 'payments', { data: { 'application.properties': 'quarkus.http.port=8080', LOG_LEVEL: 'INFO' } }, {}, { d: 17 }),
    kube('v1', 'Secret', 'payments-db', 'payments', { type: 'Opaque' }, {}, { d: 17 }),
    kube('v1', 'PersistentVolumeClaim', 'central-db', 'stackrox', { storage: '100Gi', storageClassName: 'gp3-csi' }, { phase: 'Bound' }, { d: 60 }),
  ];
}

export function devObjects(): KubeObject[] {
  const kv = 'v1.35.2';
  const masters = ['master-0', 'master-1', 'master-2'].map(n => `${n}.ocp-dev.acme.internal`);
  const workers = ['worker-0', 'worker-1', 'worker-2'].map(n => `${n}.ocp-dev.acme.internal`);
  return [
    ...masters.map(m => node(m, 'control-plane,master', kv)),
    ...workers.map(w => node(w, 'worker', kv)),
    crd('pipelineruns.tekton.dev'),
    crd('applications.argoproj.io'),
    crd('virtualmachines.kubevirt.io'),
    crd('clusterextensions.olm.operatorframework.io'),
    crd('clustercatalogs.olm.operatorframework.io'),
    crd('sites.skupper.io'),
    crd('olsconfigs.ols.openshift.io'),
    crd('routes.route.openshift.io'),
    deploy('payments-api', 'payments', 'quay.io/acme/payments-api:1.4.0', 1, 1, { d: 2 }),
    deploy('ledger-worker', 'ledger', 'quay.io/acme/ledger-worker:2.4.0-rc1', 1, 0, { h: 3 }),
    deploy('ledger-api', 'ledger', 'quay.io/acme/ledger-api:2.4.0-rc1', 1, 1, { d: 1 }),
    deploy('lightspeed-app-server', 'openshift-lightspeed', 'registry.redhat.io/openshift-lightspeed/lightspeed-service-api-rhel9:1.0.6', 1, 1, { d: 30 }),
    pod(`payments-api-6d4b9f8c7-${rs().slice(0, 5)}`, 'payments', workers[0], '1/1', 'Running', 0, { d: 2 }, { app: 'payments-api' }),
    pod('ledger-worker-6b9f7c5d8-q2x8z', 'ledger', workers[1], '0/1', 'CrashLoopBackOff', 7, { m: 34 }, { app: 'ledger-worker' }),
    pod(`ledger-api-58c7d9f6b-${rs().slice(0, 5)}`, 'ledger', workers[2], '1/1', 'Running', 0, { d: 1 }, { app: 'ledger-api' }),
    pod(`lightspeed-app-server-7b8c9d5f6-${rs().slice(0, 5)}`, 'openshift-lightspeed', workers[0], '2/2', 'Running', 0, { d: 30 }),
    kube('v1', 'Service', 'payments-api', 'payments', { type: 'ClusterIP', clusterIP: '172.30.41.7', ports: '8080/TCP' }, {}, { d: 2 }),
    kube('v1', 'Service', 'ledger-api', 'ledger', { type: 'ClusterIP', clusterIP: '172.30.77.120', ports: '8080/TCP' }, {}, { d: 1 }),
    kube('v1', 'Secret', 'ledger-db', 'ledger', { type: 'Opaque', data: { username: 'bGVkZ2Vy', password: '••••' } }, {}, { m: 65 }, { 'acme.com/rotated-at': '2026-10-08T08-55' }),
    kube('v1', 'ConfigMap', 'ledger-worker-config', 'ledger', { data: { DB_HOST: 'payments-db', DB_PORT: '5432', DB_NAME: 'ledger' } }, {}, { d: 1 }),
    kube('v1', 'PersistentVolumeClaim', 'rhel9-db-01-rootdisk', 'payments', { storage: '30Gi', storageClassName: 'ocs-storagecluster-ceph-rbd-virtualization' }, { phase: 'Bound' }, { d: 86 }),
  ];
}

/** Last lines of ledger-worker logs (shared with the Lightspeed journey). */
export const LEDGER_WORKER_LOGS = [
  '2026-10-08T09:21:02Z INFO  [io.quarkus] ledger-worker 2.4.0-rc1 on JVM (powered by Quarkus 3.27.0) started in 1.204s.',
  '2026-10-08T09:21:02Z INFO  [io.agroal.pool] Datasource \'<default>\': Initial size smaller than min. Connections will be created when necessary',
  '2026-10-08T09:21:03Z ERROR [io.agroal.pool] Datasource \'<default>\': FATAL: password authentication failed for user "ledger"',
  'Error: FATAL: password authentication failed for user "ledger"',
  '2026-10-08T09:21:03Z INFO  [io.quarkus] ledger-worker stopped in 0.031s',
];
