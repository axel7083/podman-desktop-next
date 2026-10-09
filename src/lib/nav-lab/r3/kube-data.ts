/**
 * P13 Kubernetes fake data: realistic resources per kind and namespace for
 * every Kubernetes connection (kind, MicroShift, OpenShift Local, OpenShift,
 * OpenShift AI, Developer Sandbox). Each cluster is described once (nodes,
 * namespaces, apps, jobs…) and expanded into every kind: deployments →
 * replica sets → pods, services → endpoints / slices, routes or ingresses,
 * PVCs → PVs, config maps, secrets, service accounts, RBAC.
 * Imported by `data.ts` (build): type-only imports from it.
 */
import type { LabConnection, LabResource, LabSection } from '../data.ts';

type Flavour = 'kind' | 'microshift' | 'openshift';
type PodState = 'Running' | 'CrashLoopBackOff' | 'ImagePullBackOff' | 'Pending' | 'Completed' | 'Error';

interface App {
  ns: string;
  name: string;
  image: string;
  replicas: number;
  /** deploy / sts / ds, or `pod` for static and catalog pods (name is the pod name). */
  kind: 'deploy' | 'sts' | 'ds' | 'pod';
  port?: number;
  /** Service name when it differs from the app (kube-dns, router-internal-default…). */
  svc?: string;
  svcType?: 'ClusterIP' | 'NodePort' | 'LoadBalancer';
  /** Exposed through a Route (OpenShift, MicroShift) or an Ingress (kind). */
  expose?: boolean;
  /** PVC size (one claim per replica for stateful sets). */
  storage?: string;
  /** State of the last replica. */
  failing?: PodState;
  sidecar?: string;
  age?: string;
  config?: boolean;
  /** Database credentials secret. */
  db?: boolean;
}

interface NodeSpec {
  name: string;
  roles: string;
  cpu: string;
  mem: string;
  cordoned?: boolean;
}

interface Spec {
  flavour: Flavour;
  version: string;
  os: string;
  runtime: string;
  /** Age of the cluster (system resources). */
  age: string;
  /** Apps domain of routes. */
  domain: string;
  podNet: string;
  svcNet: string;
  nodeNet: string;
  /** Namespace selected by default (the developer's namespace). */
  home: string;
  /** User of the namespace admin role bindings (OpenShift). */
  user: string;
  /** Cluster-scoped kinds can be listed (false on the Developer Sandbox). */
  clusterAccess: boolean;
  nodes: NodeSpec[];
  namespaces: string[];
  nsLabels?: Record<string, string>;
  apps: App[];
  /** name, provisioner, default. */
  storageClasses: [string, string, boolean][];
  /** name, controller. */
  ingressClasses: [string, string][];
  /** ns, name, image, duration, state. */
  jobs: [string, string, string, string, PodState][];
  /** ns, name, schedule, image, last schedule. */
  cronjobs: [string, string, string, string, string][];
  /** ns, name, hostnames, parent gateways. */
  httproutes: [string, string, string, string][];
  /** ns, app, local port. */
  portforwards: [string, string, number][];
  /** ns, name, resources, verbs. */
  roles: [string, string, string, string][];
  /** ns, name, pod selector, policy types. */
  netpols: [string, string, string, string][];
  /** Extension / operator cluster roles: name, rules, service account namespace. */
  clusterRoles: [string, number, string][];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function hash(s: string): number {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const ALPHA = 'bcdfghjklmnpqrstvwxz2456789';

/** Kubernetes-style random suffix (replica set hash, pod suffix). */
function rand(seed: string, n: number): string {
  let h = hash(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    out += ALPHA[h % ALPHA.length];
    h = (Math.imul(h, 2654435761) + i + 1) >>> 0;
  }
  return out;
}

function ip(prefix: string, seed: string): string {
  const h = hash(seed);
  return `${prefix}.${h % 254}.${((h >>> 8) % 250) + 2}`;
}

function uuid(seed: string): string {
  const hex = (n: number, s: string): string => ((hash(`${seed}${s}`) * 2654435761) >>> 0).toString(16).padStart(8, '0').repeat(2).slice(0, n);
  return `${hex(8, 'a')}-${hex(4, 'b')}-4${hex(3, 'c')}-8${hex(3, 'd')}-${hex(12, 'e')}`;
}

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

const D = (ns: string, name: string, image: string, replicas = 1, o: Partial<App> = {}): App => ({ ns, name, image, replicas, kind: 'deploy', ...o });
const STS = (ns: string, name: string, image: string, replicas = 1, o: Partial<App> = {}): App => ({ ns, name, image, replicas, kind: 'sts', ...o });
const DS = (ns: string, name: string, image: string, o: Partial<App> = {}): App => ({ ns, name, image, replicas: 1, kind: 'ds', ...o });
const POD = (ns: string, name: string, image: string, o: Partial<App> = {}): App => ({ ns, name, image, replicas: 1, kind: 'pod', ...o });

const ose = (name: string, v = 'v4.20'): string => `registry.redhat.io/openshift4/ose-${name}-rhel9:${v}`;

/** Kinds without a namespace. */
export const CLUSTER_SCOPED = ['nodes', 'namespaces', 'pvs', 'storageclasses', 'ingressclasses', 'clusterroles', 'clusterrolebindings'];

/** Platform namespaces (kube-*, openshift-*, redhat-*, add-ons), as opposed to app namespaces. */
export function isSystemNs(ns: string): boolean {
  return /^(kube-|openshift|redhat-)/.test(ns) || ['default', 'local-path-storage', 'ingress-nginx'].includes(ns);
}

/* ------------------------------------------------------------------ */
/* Platform workloads                                                  */
/* ------------------------------------------------------------------ */

function kindSystem(node: string): App[] {
  const k = (n: string): string => `registry.k8s.io/${n}:v1.34.0`;
  return [
    D('kube-system', 'coredns', 'registry.k8s.io/coredns/coredns:v1.12.1', 2, { port: 53, svc: 'kube-dns' }),
    DS('kube-system', 'kube-proxy', k('kube-proxy')),
    DS('kube-system', 'kindnet', 'docker.io/kindest/kindnetd:v20250512-df8de77b'),
    POD('kube-system', `etcd-${node}`, 'registry.k8s.io/etcd:3.6.4-0'),
    POD('kube-system', `kube-apiserver-${node}`, k('kube-apiserver')),
    POD('kube-system', `kube-controller-manager-${node}`, k('kube-controller-manager')),
    POD('kube-system', `kube-scheduler-${node}`, k('kube-scheduler')),
    D('local-path-storage', 'local-path-provisioner', 'docker.io/kindest/local-path-provisioner:v20250214-acbabc1a'),
    D('ingress-nginx', 'ingress-nginx-controller', 'registry.k8s.io/ingress-nginx/controller:v1.13.0', 1, { port: 80, svcType: 'NodePort' }),
  ];
}

function microshiftSystem(): App[] {
  return [
    DS('openshift-dns', 'dns-default', ose('coredns'), { port: 53, sidecar: 'kube-rbac-proxy' }),
    DS('openshift-dns', 'node-resolver', ose('cli')),
    D('openshift-ingress', 'router-default', ose('haproxy-router'), 1, { port: 80, svc: 'router-internal-default' }),
    D('openshift-service-ca', 'service-ca', ose('service-ca-operator')),
    D('openshift-storage', 'lvms-operator', 'registry.redhat.io/lvms4/lvms-rhel9-operator:v4.20'),
    D('openshift-storage', 'topolvm-controller', 'registry.redhat.io/lvms4/topolvm-rhel9:v4.20', 1, { sidecar: 'csi-provisioner' }),
    DS('openshift-storage', 'topolvm-node', 'registry.redhat.io/lvms4/topolvm-rhel9:v4.20', { sidecar: 'csi-registrar' }),
    D('openshift-operator-lifecycle-manager', 'olm-operator', ose('operator-lifecycle-manager')),
    D('openshift-operator-lifecycle-manager', 'catalog-operator', ose('operator-lifecycle-manager')),
    DS('openshift-ovn-kubernetes', 'ovnkube-master', ose('ovn-kubernetes-microshift'), { sidecar: 'northd' }),
    DS('openshift-ovn-kubernetes', 'ovnkube-node', ose('ovn-kubernetes-microshift')),
  ];
}

function openshiftSystem(ha: boolean, v: string): App[] {
  const r = ha ? 2 : 1;
  const argo = 'registry.redhat.io/openshift-gitops-1/argocd-rhel8:v1.18.0';
  return [
    D('openshift-console', 'console', ose('console', v), r, { port: 443, expose: true }),
    D('openshift-console', 'downloads', ose('cli-artifacts', v), r, { port: 80, expose: true }),
    D('openshift-ingress', 'router-default', ose('haproxy-router', v), r, { port: 80, svc: ha ? 'router-default' : 'router-internal-default', svcType: ha ? 'LoadBalancer' : 'ClusterIP' }),
    DS('openshift-dns', 'dns-default', ose('coredns', v), { port: 53, sidecar: 'kube-rbac-proxy' }),
    DS('openshift-dns', 'node-resolver', ose('cli', v)),
    D('openshift-monitoring', 'cluster-monitoring-operator', ose('cluster-monitoring-operator', v)),
    D('openshift-monitoring', 'prometheus-operator', ose('prometheus-operator', v)),
    STS('openshift-monitoring', 'prometheus-k8s', ose('prometheus', v), r, { port: 9091, sidecar: 'config-reloader', storage: ha ? '100Gi' : undefined }),
    STS('openshift-monitoring', 'alertmanager-main', ose('prometheus-alertmanager', v), r, { port: 9094, sidecar: 'config-reloader' }),
    D('openshift-monitoring', 'kube-state-metrics', ose('kube-state-metrics', v), 1, { sidecar: 'kube-rbac-proxy-main' }),
    D('openshift-monitoring', 'thanos-querier', ose('thanos', v), r, { port: 9091, expose: true, sidecar: 'oauth-proxy' }),
    DS('openshift-monitoring', 'node-exporter', ose('prometheus-node-exporter', v), { sidecar: 'kube-rbac-proxy' }),
    D('openshift-marketplace', 'marketplace-operator', ose('operator-marketplace', v)),
    POD('openshift-marketplace', 'redhat-operators-6vxqk', `registry.redhat.io/redhat/redhat-operator-index:${v}`, { port: 50051, svc: 'redhat-operators' }),
    POD('openshift-marketplace', 'certified-operators-x2m4d', `registry.redhat.io/redhat/certified-operator-index:${v}`, { port: 50051, svc: 'certified-operators' }),
    POD('openshift-marketplace', 'community-operators-pq7zn', `registry.redhat.io/redhat/community-operator-index:${v}`, { port: 50051, svc: 'community-operators' }),
    D('openshift-image-registry', 'cluster-image-registry-operator', ose('cluster-image-registry-operator', v)),
    D('openshift-image-registry', 'image-registry', ose('docker-registry', v), r, { port: 5000, storage: ha ? '100Gi' : '20Gi' }),
    D('openshift-operator-lifecycle-manager', 'olm-operator', ose('operator-lifecycle-manager', v)),
    D('openshift-operator-lifecycle-manager', 'catalog-operator', ose('operator-lifecycle-manager', v)),
    D('openshift-operator-lifecycle-manager', 'packageserver', ose('operator-lifecycle-manager', v), 2),
    D('openshift-operators', 'gitops-operator-controller-manager', 'registry.redhat.io/openshift-gitops-1/gitops-rhel8-operator:v1.18.0'),
    D('openshift-gitops', 'openshift-gitops-server', argo, r, { port: 8080, expose: true }),
    D('openshift-gitops', 'openshift-gitops-repo-server', argo, 1, { port: 8081 }),
    STS('openshift-gitops', 'openshift-gitops-application-controller', argo, 1),
    D('openshift-gitops', 'openshift-gitops-redis', 'registry.redhat.io/rhel9/redis-7:1-35', 1, { port: 6379 }),
    D('openshift-gitops', 'openshift-gitops-dex-server', 'registry.redhat.io/openshift-gitops-1/dex-rhel8:v1.18.0', 1, { port: 5556 }),
    D('openshift-logging', 'cluster-logging-operator', 'registry.redhat.io/openshift-logging/cluster-logging-rhel9-operator:v6.3'),
    DS('openshift-logging', 'collector', 'registry.redhat.io/openshift-logging/vector-rhel9:v6.3'),
  ];
}

const OCP_ROLES: [string, number, string][] = [
  ['self-provisioner', 1, ''],
  ['basic-user', 4, ''],
  ['registry-viewer', 3, ''],
  ['cluster-reader', 61, ''],
  ['system:image-puller', 1, ''],
  ['system:deployer', 8, ''],
  ['system:image-builder', 2, ''],
  ['sudoer', 1, ''],
];

type Policy = [string, string, string, string];

const NS_POLICIES = (ns: string): Policy[] => [
  [ns, 'allow-from-openshift-ingress', '{}', 'Ingress'],
  [ns, 'allow-same-namespace', '{}', 'Ingress'],
  [ns, 'allow-from-openshift-monitoring', '{}', 'Ingress'],
];

const RHCOS = 'Red Hat Enterprise Linux CoreOS 9.6.20250925-0 (Plow)';
const CRIO = 'cri-o://1.33.4-2.rhaos4.20.el9';

/** AWS node names: 3 control planes, infra nodes, workers. */
function awsNodes(prefix: number, workers: number, infra = 0, big = false): NodeSpec[] {
  const n = (i: number): string => `ip-10-0-${prefix + i * 7}-${(i * 37 + 11) % 250}.ec2.internal`;
  return [
    ...range(3).map(i => ({ name: n(i), roles: 'control-plane,master', cpu: '8', mem: '32 GiB' })),
    ...range(infra).map(i => ({ name: n(3 + i), roles: 'infra,worker', cpu: '8', mem: '32 GiB' })),
    ...range(workers).map(i => ({ name: n(3 + infra + i), roles: 'worker', cpu: big ? '32' : '16', mem: big ? '128 GiB' : '64 GiB' })),
  ];
}

/* ------------------------------------------------------------------ */
/* Clusters                                                            */
/* ------------------------------------------------------------------ */

const SPECS: Record<string, Spec> = {
  'kind-dev': {
    flavour: 'kind',
    version: 'v1.34.0',
    os: 'Debian GNU/Linux 12 (bookworm)',
    runtime: 'containerd://2.1.3',
    age: '2 days',
    domain: 'localtest.me',
    podNet: '10.244',
    svcNet: '10.96',
    nodeNet: '10.89',
    home: 'default',
    user: 'kubernetes-admin',
    clusterAccess: true,
    nodes: [{ name: 'kind-dev-control-plane', roles: 'control-plane', cpu: '4', mem: '7.6 GiB' }],
    namespaces: ['default', 'orders', 'ingress-nginx', 'local-path-storage', 'kube-system', 'kube-public', 'kube-node-lease'],
    apps: [
      ...kindSystem('kind-dev-control-plane'),
      D('default', 'hello-web', 'docker.io/library/nginx:1.29', 2, { port: 80, expose: true, age: '2 days' }),
      D('default', 'redis', 'docker.io/library/redis:8.2', 1, { port: 6379, age: '2 days' }),
      D('orders', 'orders-api', 'quay.io/acme/orders-api:1.4', 3, { port: 8080, expose: true, config: true, age: '5 hours' }),
      D('orders', 'orders-worker', 'quay.io/acme/orders-worker:1.4', 1, { failing: 'CrashLoopBackOff', config: true, age: '5 hours' }),
      STS('orders', 'orders-db', 'docker.io/library/postgres:17', 1, { port: 5432, storage: '5Gi', db: true, age: '5 hours' }),
    ],
    storageClasses: [['standard', 'rancher.io/local-path', true]],
    ingressClasses: [['nginx', 'k8s.io/ingress-nginx']],
    jobs: [
      ['ingress-nginx', 'ingress-nginx-admission-create', 'registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.6.0', '4s', 'Completed'],
      ['ingress-nginx', 'ingress-nginx-admission-patch', 'registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.6.0', '5s', 'Completed'],
      ['orders', 'orders-db-migrate', 'quay.io/acme/orders-api:1.4', '12s', 'Completed'],
    ],
    cronjobs: [['orders', 'orders-report', '0 6 * * *', 'quay.io/acme/orders-report:1.0', '4 hours']],
    httproutes: [],
    portforwards: [['orders', 'orders-api', 8080]],
    roles: [
      ['orders', 'orders-config-reader', 'configmaps, secrets', 'get, list, watch'],
      ['ingress-nginx', 'ingress-nginx', 'configmaps, pods, secrets, endpoints', 'get, list, watch'],
      ['kube-system', 'extension-apiserver-authentication-reader', 'configmaps', 'get, list, watch'],
    ],
    netpols: [['orders', 'orders-db-allow-api', 'app=orders-db', 'Ingress']],
    clusterRoles: [
      ['local-path-provisioner-role', 4, 'local-path-storage'],
      ['ingress-nginx', 8, 'ingress-nginx'],
      ['kindnet', 2, 'kube-system'],
    ],
  },
  minc: {
    flavour: 'microshift',
    version: 'v1.33.5',
    os: 'Red Hat Enterprise Linux 9.6 (Plow)',
    runtime: CRIO,
    age: '6 days',
    domain: 'apps.127.0.0.1.nip.io',
    podNet: '10.42',
    svcNet: '10.43',
    nodeNet: '10.88',
    home: 'demo',
    user: 'kubeadmin',
    clusterAccess: true,
    nodes: [{ name: 'minc', roles: 'control-plane,master,worker', cpu: '4', mem: '7.6 GiB' }],
    namespaces: [
      'demo',
      'default',
      'kube-system',
      'kube-public',
      'kube-node-lease',
      'openshift-dns',
      'openshift-ingress',
      'openshift-service-ca',
      'openshift-storage',
      'openshift-operator-lifecycle-manager',
      'openshift-ovn-kubernetes',
    ],
    apps: [
      ...microshiftSystem(),
      D('demo', 'hello-openshift', 'quay.io/openshift/origin-hello-openshift:latest', 1, { port: 8080, expose: true, age: '20 minutes' }),
      D('demo', 'frontend', 'quay.io/acme/frontend-web:2.1', 2, { port: 8080, expose: true, age: '20 minutes' }),
      D('demo', 'redis', 'registry.redhat.io/rhel9/redis-7:1-35', 1, { port: 6379, storage: '1Gi', age: '20 minutes' }),
    ],
    storageClasses: [['topolvm-provisioner', 'topolvm.io', true]],
    ingressClasses: [['openshift-default', 'openshift.io/ingress-to-route']],
    jobs: [],
    cronjobs: [],
    httproutes: [],
    portforwards: [],
    roles: [['openshift-storage', 'topolvm-controller', 'leases, configmaps', 'get, list, watch, create, update']],
    netpols: [],
    clusterRoles: [
      ['topolvm-controller', 6, 'openshift-storage'],
      ['openshift-dns', 3, 'openshift-dns'],
      ['router', 7, 'openshift-ingress'],
    ],
  },
  'openshift-local': {
    flavour: 'openshift',
    version: 'v1.33.5',
    os: RHCOS,
    runtime: CRIO,
    age: '3 weeks',
    domain: 'apps-crc.testing',
    podNet: '10.217',
    svcNet: '10.217',
    nodeNet: '192.168',
    home: 'orders',
    user: 'developer',
    clusterAccess: true,
    nodes: [{ name: 'crc', roles: 'control-plane,master,worker', cpu: '4', mem: '10.5 GiB' }],
    namespaces: [
      'orders',
      'default',
      'openshift-console',
      'openshift-operators',
      'openshift-marketplace',
      'openshift-monitoring',
      'openshift-ingress',
      'openshift-dns',
      'openshift-image-registry',
      'openshift-operator-lifecycle-manager',
      'kube-system',
    ],
    apps: [
      ...openshiftSystem(false, 'v4.20'),
      D('orders', 'orders-api', 'quay.io/acme/orders-api:1.4', 2, { port: 8080, expose: true, config: true, age: '1 day' }),
      D('orders', 'orders-ui', 'quay.io/acme/orders-ui:2.0', 1, { port: 8080, expose: true, age: '1 day' }),
      STS('orders', 'postgresql', 'registry.redhat.io/rhel9/postgresql-16:1-48', 1, { port: 5432, storage: '10Gi', db: true, age: '1 day' }),
    ],
    storageClasses: [['crc-csi-hostpath-provisioner', 'kubevirt.io.hostpath-provisioner', true]],
    ingressClasses: [['openshift-default', 'openshift.io/ingress-to-route']],
    jobs: [['orders', 'orders-db-migrate', 'quay.io/acme/orders-api:1.4', '9s', 'Completed']],
    cronjobs: [
      ['openshift-operator-lifecycle-manager', 'collect-profiles', '*/15 * * * *', ose('operator-lifecycle-manager'), '6 minutes'],
      ['openshift-image-registry', 'image-pruner', '0 0 * * *', ose('cli'), '9 hours'],
    ],
    httproutes: [],
    portforwards: [['orders', 'postgresql', 5432]],
    roles: [
      ['orders', 'orders-api', 'configmaps, secrets', 'get, list, watch'],
      ['openshift-monitoring', 'prometheus-k8s', 'services, endpoints, pods', 'get, list, watch'],
    ],
    netpols: NS_POLICIES('orders').slice(0, 2),
    clusterRoles: OCP_ROLES,
  },
  'ocp-dev': {
    flavour: 'openshift',
    version: 'v1.33.5',
    os: RHCOS,
    runtime: CRIO,
    age: '84 days',
    domain: 'apps.dev.acme.com',
    podNet: '10.128',
    svcNet: '172.30',
    nodeNet: '10.0',
    home: 'checkout',
    user: 'jdeveloper',
    clusterAccess: true,
    nodes: awsNodes(12, 3),
    namespaces: [
      'checkout',
      'payments',
      'orders',
      'openshift-gitops',
      'default',
      'kube-system',
      'openshift-console',
      'openshift-ingress',
      'openshift-monitoring',
      'openshift-operators',
      'openshift-marketplace',
      'openshift-dns',
    ],
    apps: [
      ...openshiftSystem(true, 'v4.20'),
      D('checkout', 'checkout', 'quay.io/acme/checkout:2.8', 3, { port: 8080, expose: true, config: true, age: '3 hours' }),
      D('checkout', 'checkout-ui', 'quay.io/acme/checkout-ui:2.8', 2, { port: 8080, expose: true, age: '3 hours' }),
      STS('checkout', 'redis', 'registry.redhat.io/rhel9/redis-7:1-35', 1, { port: 6379, storage: '2Gi', age: '12 days' }),
      D('payments', 'payments-api', 'quay.io/acme/payments-api:1.4.0', 2, { port: 8080, expose: true, db: true, age: '1 day' }),
      D('payments', 'payments-worker', 'quay.io/acme/payments-worker:1.4.0', 2, { failing: 'CrashLoopBackOff', config: true, age: '1 day' }),
      D('payments', 'fraud-check', 'quay.io/acme/fraud-check:0.9', 1, { port: 8080, age: '6 days' }),
      D('orders', 'orders-api', 'quay.io/acme/orders-api:1.4', 2, { port: 8080, expose: true, config: true, age: '2 days' }),
      STS('orders', 'orders-db', 'registry.redhat.io/rhel9/postgresql-16:1-48', 1, { port: 5432, storage: '20Gi', db: true, age: '31 days' }),
    ],
    storageClasses: [
      ['gp3-csi', 'ebs.csi.aws.com', true],
      ['gp2-csi', 'ebs.csi.aws.com', false],
    ],
    ingressClasses: [['openshift-default', 'openshift.io/ingress-to-route']],
    jobs: [
      ['checkout', 'checkout-db-migrate-v42', 'quay.io/acme/checkout:2.8', '14s', 'Completed'],
      ['payments', 'payments-reconcile-manual', 'quay.io/acme/payments-worker:1.4.0', '2m 3s', 'Error'],
    ],
    cronjobs: [
      ['payments', 'payments-reconcile', '*/30 * * * *', 'quay.io/acme/payments-worker:1.4.0', '11 minutes'],
      ['orders', 'orders-report', '0 6 * * *', 'quay.io/acme/orders-report:1.0', '4 hours'],
    ],
    httproutes: [
      ['checkout', 'checkout', 'checkout.apps.dev.acme.com', 'openshift-ingress/acme-gateway'],
      ['payments', 'payments-api', 'payments.apps.dev.acme.com', 'openshift-ingress/acme-gateway'],
    ],
    portforwards: [['checkout', 'redis', 6379]],
    roles: [
      ['checkout', 'checkout-config-reader', 'configmaps', 'get, list, watch'],
      ['payments', 'payments-worker', 'secrets, configmaps', 'get, list'],
      ['openshift-gitops', 'openshift-gitops-server', 'applications, appprojects', 'get, list, watch, update'],
    ],
    netpols: [...NS_POLICIES('checkout'), ...NS_POLICIES('payments'), ['payments', 'payments-deny-egress', 'app=payments-api', 'Egress']],
    clusterRoles: [...OCP_ROLES, ['openshift-gitops-argocd-application-controller', 12, 'openshift-gitops']],
  },
  'ocp-prod': {
    flavour: 'openshift',
    version: 'v1.32.8',
    os: 'Red Hat Enterprise Linux CoreOS 9.6.20250812-0 (Plow)',
    runtime: 'cri-o://1.32.7-3.rhaos4.19.el9',
    age: '214 days',
    domain: 'apps.prod.acme.com',
    podNet: '10.129',
    svcNet: '172.30',
    nodeNet: '10.1',
    home: 'checkout',
    user: 'jdeveloper',
    clusterAccess: true,
    nodes: awsNodes(40, 6, 3, true).map((n, i) => (i === 10 ? { ...n, cordoned: true } : n)),
    namespaces: [
      'checkout',
      'payments',
      'catalog',
      'orders',
      'inventory',
      'notifications',
      'search',
      'default',
      'kube-system',
      'openshift-console',
      'openshift-ingress',
      'openshift-monitoring',
      'openshift-logging',
      'openshift-gitops',
      'openshift-dns',
      'openshift-operators',
      'openshift-marketplace',
    ],
    apps: [
      ...openshiftSystem(true, 'v4.19'),
      D('checkout', 'checkout', 'quay.io/acme/checkout:2.7.3', 6, { port: 8080, expose: true, config: true, age: '4 days' }),
      D('checkout', 'checkout-ui', 'quay.io/acme/checkout-ui:2.7.3', 4, { port: 8080, expose: true, age: '4 days' }),
      STS('checkout', 'redis', 'registry.redhat.io/rhel9/redis-7:1-35', 3, { port: 6379, storage: '8Gi', age: '96 days' }),
      D('payments', 'payments-api', 'quay.io/acme/payments-api:1.3.2', 4, { port: 8080, expose: true, db: true, age: '9 days' }),
      D('payments', 'payments-gateway', 'quay.io/acme/payments-gateway:3.1', 3, { port: 8443, expose: true, age: '9 days' }),
      D('payments', 'payments-worker', 'quay.io/acme/payments-worker:1.3.2', 3, { config: true, age: '9 days' }),
      D('catalog', 'catalog', 'quay.io/acme/catalog:5.2', 4, { port: 8080, expose: true, config: true, age: '2 days' }),
      D('catalog', 'catalog-admin', 'quay.io/acme/catalog-admin:5.2', 2, { port: 8080, expose: true, age: '2 days' }),
      D('search', 'search-api', 'quay.io/acme/search-api:1.9', 3, { port: 8080, expose: true, age: '17 days' }),
      STS('search', 'elasticsearch', 'docker.elastic.co/elasticsearch/elasticsearch:8.19.2', 3, { port: 9200, storage: '50Gi', age: '120 days' }),
      D('orders', 'orders-api', 'quay.io/acme/orders-api:1.3', 4, { port: 8080, expose: true, config: true, age: '6 days' }),
      D('orders', 'orders-worker', 'quay.io/acme/orders-worker:1.3', 3, { age: '6 days' }),
      STS('orders', 'orders-db', 'registry.redhat.io/rhel9/postgresql-16:1-48', 2, { port: 5432, storage: '100Gi', db: true, age: '180 days' }),
      STS('orders', 'acme-kafka-kafka', 'registry.redhat.io/amq-streams/kafka-40-rhel9:3.0.0', 3, { port: 9092, storage: '100Gi', age: '150 days' }),
      D('inventory', 'inventory', 'quay.io/acme/inventory:4.0', 3, { port: 8080, expose: true, db: true, age: '13 days' }),
      D('notifications', 'notifications', 'quay.io/acme/notifications:2.2', 2, { port: 8080, failing: 'Pending', config: true, age: '35 minutes' }),
    ],
    storageClasses: [
      ['gp3-csi', 'ebs.csi.aws.com', true],
      ['gp2-csi', 'ebs.csi.aws.com', false],
      ['efs-sc', 'efs.csi.aws.com', false],
    ],
    ingressClasses: [['openshift-default', 'openshift.io/ingress-to-route']],
    jobs: [
      ['catalog', 'catalog-reindex-v52', 'quay.io/acme/catalog:5.2', '3m 41s', 'Completed'],
      ['orders', 'orders-archive-2026-10', 'quay.io/acme/orders-api:1.3', '—', 'Running'],
    ],
    cronjobs: [
      ['catalog', 'catalog-import', '0 */4 * * *', 'quay.io/acme/catalog:5.2', '2 hours'],
      ['payments', 'payments-reconcile', '*/30 * * * *', 'quay.io/acme/payments-worker:1.3.2', '19 minutes'],
      ['search', 'elasticsearch-snapshot', '30 2 * * *', 'quay.io/acme/es-snapshot:1.1', '7 hours'],
    ],
    httproutes: [
      ['checkout', 'checkout', 'checkout.acme.com, www.acme.com', 'openshift-ingress/public-gateway'],
      ['payments', 'payments-gateway', 'pay.acme.com', 'openshift-ingress/public-gateway'],
      ['catalog', 'catalog', 'catalog.acme.com', 'openshift-ingress/public-gateway'],
    ],
    portforwards: [],
    roles: [
      ['checkout', 'checkout-config-reader', 'configmaps', 'get, list, watch'],
      ['payments', 'payments-worker', 'secrets, configmaps', 'get, list'],
      ['orders', 'strimzi-kafka', 'pods, services, configmaps', 'get, list, watch'],
      ['openshift-monitoring', 'prometheus-k8s', 'services, endpoints, pods', 'get, list, watch'],
    ],
    netpols: ['checkout', 'payments', 'catalog', 'orders', 'inventory'].flatMap((ns): Policy[] => [...NS_POLICIES(ns).slice(0, 2), [ns, 'default-deny-all', '{}', 'Ingress, Egress']]),
    clusterRoles: [...OCP_ROLES, ['openshift-gitops-argocd-application-controller', 12, 'openshift-gitops'], ['strimzi-cluster-operator', 18, 'openshift-operators'], ['collector', 5, 'openshift-logging']],
  },
  'rhoai-dev': {
    flavour: 'openshift',
    version: 'v1.33.5',
    os: RHCOS,
    runtime: CRIO,
    age: '41 days',
    domain: 'apps.dev.acme.com',
    podNet: '10.131',
    svcNet: '172.30',
    nodeNet: '10.0',
    home: 'fraud-detection',
    user: 'jdeveloper',
    clusterAccess: true,
    nodes: [...awsNodes(64, 2), { name: 'ip-10-0-77-12.ec2.internal', roles: 'worker,gpu', cpu: '8', mem: '32 GiB' }],
    namespaces: ['fraud-detection', 'rhoai-models', 'redhat-ods-applications', 'redhat-ods-operator', 'redhat-ods-monitoring', 'default', 'openshift-ingress'],
    nsLabels: {
      'fraud-detection': 'opendatahub.io/dashboard=true, modelmesh-enabled=false',
      'rhoai-models': 'opendatahub.io/dashboard=true, modelmesh-enabled=false',
    },
    apps: [
      ...openshiftSystem(true, 'v4.20').filter(a => a.ns === 'openshift-ingress'),
      D('redhat-ods-operator', 'rhods-operator', 'registry.redhat.io/rhoai/odh-rhel9-operator:v3.0'),
      D('redhat-ods-applications', 'rhods-dashboard', 'registry.redhat.io/rhoai/odh-dashboard-rhel9:v3.0', 2, { port: 8443, expose: true, sidecar: 'oauth-proxy' }),
      D('redhat-ods-applications', 'odh-model-controller', 'registry.redhat.io/rhoai/odh-model-controller-rhel9:v3.0'),
      D('redhat-ods-applications', 'kserve-controller-manager', 'registry.redhat.io/rhoai/odh-kserve-controller-rhel9:v3.0'),
      D('redhat-ods-applications', 'notebook-controller-deployment', 'registry.redhat.io/rhoai/odh-notebook-controller-rhel9:v3.0'),
      D('redhat-ods-applications', 'data-science-pipelines-operator-controller-manager', 'registry.redhat.io/rhoai/odh-data-science-pipelines-operator-controller-rhel9:v3.0'),
      D('redhat-ods-monitoring', 'blackbox-exporter', ose('prometheus-blackbox-exporter')),
      STS('fraud-detection', 'fraud-detection-workbench', 'image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/s2i-generic-data-science-notebook:2025.1', 1, {
        port: 8888,
        expose: true,
        storage: '20Gi',
        sidecar: 'oauth-proxy',
        age: '3 days',
      }),
      D('fraud-detection', 'ds-pipeline-dspa', 'registry.redhat.io/rhoai/odh-ml-pipelines-api-server-v2-rhel9:v3.0', 1, { port: 8888, sidecar: 'oauth-proxy', age: '3 days' }),
      D('fraud-detection', 'minio', 'quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z', 1, { port: 9000, storage: '10Gi', age: '3 days' }),
      D('fraud-detection', 'fraud-model-predictor', 'quay.io/modh/openvino_model_server:2025.2', 1, { port: 8888, sidecar: 'kserve-agent', age: '2 days' }),
      D('rhoai-models', 'granite-3-8b-predictor', 'quay.io/modh/vllm:rhoai-3.0-cuda', 1, { port: 8080, expose: true, sidecar: 'storage-initializer', age: '5 hours' }),
      D('rhoai-models', 'mistral-7b-predictor', 'quay.io/modh/vllm:rhoai-3.0-cuda', 1, { port: 8080, failing: 'Pending', age: '12 minutes' }),
    ],
    storageClasses: [['gp3-csi', 'ebs.csi.aws.com', true]],
    ingressClasses: [['openshift-default', 'openshift.io/ingress-to-route']],
    jobs: [['fraud-detection', 'fraud-train-run-7k2xq', 'quay.io/acme/fraud-train:0.3', '11m 52s', 'Completed']],
    cronjobs: [['fraud-detection', 'fraud-retrain-nightly', '0 1 * * *', 'quay.io/acme/fraud-train:0.3', '8 hours']],
    httproutes: [],
    portforwards: [['rhoai-models', 'granite-3-8b-predictor', 8080]],
    roles: [['fraud-detection', 'ds-pipeline-dspa', 'pods, pods/log, workflows', 'get, list, watch, create, delete']],
    netpols: [...NS_POLICIES('fraud-detection').slice(0, 2), ['rhoai-models', 'kserve-allow-ingress', 'serving.kserve.io/inferenceservice', 'Ingress']],
    clusterRoles: [...OCP_ROLES.slice(0, 4), ['rhods-dashboard', 10, 'redhat-ods-applications'], ['kserve-manager-role', 24, 'redhat-ods-applications'], ['odh-model-controller-role', 20, 'redhat-ods-applications']],
  },
  sandbox: {
    flavour: 'openshift',
    version: 'v1.33.5',
    os: RHCOS,
    runtime: CRIO,
    age: '17 days',
    domain: 'apps.sandbox-m2.ll9k.p1.openshiftapps.com',
    podNet: '10.130',
    svcNet: '172.30',
    nodeNet: '10.0',
    home: 'jdeveloper-dev',
    user: 'jdeveloper',
    clusterAccess: false,
    nodes: awsNodes(130, 3).slice(3),
    namespaces: ['jdeveloper-dev', 'jdeveloper-stage'],
    apps: [
      D('jdeveloper-dev', 'payments-api', 'quay.io/jdeveloper/payments-api:1.4.0', 1, { port: 8080, expose: true, db: true, age: '2 days' }),
      D('jdeveloper-dev', 'postgresql', 'registry.redhat.io/rhel9/postgresql-16:1-48', 1, { port: 5432, storage: '5Gi', db: true, age: '2 days' }),
      D('jdeveloper-dev', 'nodejs-sample', 'registry.access.redhat.com/ubi9/nodejs-22:9.6', 1, { port: 8080, expose: true, age: '9 days' }),
      D('jdeveloper-stage', 'payments-api', 'quay.io/jdeveloper/payments-api:1.3.2', 1, { port: 8080, expose: true, db: true, age: '6 days' }),
    ],
    storageClasses: [['gp3-csi', 'ebs.csi.aws.com', true]],
    ingressClasses: [['openshift-default', 'openshift.io/ingress-to-route']],
    jobs: [],
    cronjobs: [],
    httproutes: [],
    portforwards: [],
    roles: [],
    netpols: [...NS_POLICIES('jdeveloper-dev'), ...NS_POLICIES('jdeveloper-stage')],
    clusterRoles: [],
  },
};

/** Minimal kind-like cluster for Kubernetes connections without a description. */
function fallback(connId: string): Spec {
  const node = `${connId}-control-plane`;
  return {
    ...SPECS['kind-dev'],
    age: '2 minutes',
    nodes: [{ name: node, roles: 'control-plane', cpu: '4', mem: '7.6 GiB' }],
    namespaces: ['default', 'kube-system', 'local-path-storage'],
    apps: kindSystem(node),
    jobs: [],
    cronjobs: [],
    portforwards: [],
    roles: [],
    netpols: [],
  };
}

/* ------------------------------------------------------------------ */
/* Expansion                                                           */
/* ------------------------------------------------------------------ */

const K8S_CLUSTER_ROLES: [string, number, string][] = [
  ['cluster-admin', 2, ''],
  ['admin', 22, ''],
  ['edit', 18, ''],
  ['view', 14, ''],
  ['system:node', 12, ''],
  ['system:kube-scheduler', 14, ''],
  ['system:kube-controller-manager', 18, ''],
  ['system:controller:deployment-controller', 4, ''],
  ['system:discovery', 1, ''],
  ['system:basic-user', 2, ''],
];

const STATE: Record<PodState, string> = { Running: 'running', CrashLoopBackOff: 'error', ImagePullBackOff: 'error', Pending: 'starting', Completed: 'exited', Error: 'error' };

function workloadStatus(ready: number, desired: number): string {
  return desired === 0 ? 'stopped' : ready < desired ? 'degraded' : 'running';
}

function expand(connId: string, sp: Spec): Map<string, LabResource[]> {
  const out = new Map<string, LabResource[]>();
  const ids = new Set<string>();
  const kind = sp.flavour === 'kind';
  const openshift = sp.flavour === 'openshift';
  const workers = sp.nodes.filter(n => n.roles.includes('worker') && !n.cordoned);
  const sched = workers.length ? workers : sp.nodes;
  const control = sp.nodes.find(n => n.roles.includes('control-plane')) ?? sp.nodes[0];
  const sc = sp.storageClasses.find(x => x[2])?.[0] ?? 'standard';
  const nsAge = (ns: string): string => (isSystemNs(ns) ? sp.age : (sp.apps.find(a => a.ns === ns)?.age ?? sp.age));
  let next = 0;

  /** Add a resource: id `${conn}/${kind}/${name}`, namespace-qualified when the name is taken. */
  function add(sectionId: string, name: string, status: string, sub: string, age: string, cols: Record<string, string>, ns?: string): LabResource {
    let id = `${connId}/${sectionId}/${name}`;
    if (ids.has(id)) id = `${connId}/${sectionId}/${ns}/${name}`;
    ids.add(id);
    const r: LabResource = { id, name, connId, sectionId, status, sub, age, ns, cols };
    const list = out.get(sectionId);
    if (list) list.push(r);
    else out.set(sectionId, [r]);
    return r;
  }

  function pod(app: App, name: string, owner: string, state: PodState, node?: NodeSpec): LabResource {
    const h = hash(`${connId}/${app.ns}/${name}`);
    const containers = app.sidecar ? 2 : 1;
    const ready = state === 'Running' ? containers : state === 'CrashLoopBackOff' ? containers - 1 : 0;
    const restarts = state === 'CrashLoopBackOff' ? 9 + (h % 30) : h % 7 === 0 ? 1 : 0;
    const where = state === 'Pending' ? undefined : (node ?? sched[next++ % sched.length]);
    return add(
      'kpods',
      name,
      STATE[state],
      `${state} · ${ready}/${containers} · ${where?.name ?? 'unscheduled'}`,
      app.age ?? sp.age,
      {
        ready: `${ready}/${containers}`,
        status: state,
        restarts: String(restarts),
        node: where?.name ?? '—',
        ip: where ? ip(sp.podNet, `${connId}/${name}`) : '—',
        app: app.name,
        owner,
        image: app.image,
        containers: [app.kind === 'pod' ? (app.svc ? 'registry-server' : app.name.replace(`-${control.name}`, '')) : app.name, app.sidecar].filter(Boolean).join(', '),
      },
      app.ns,
    );
  }

  if (sp.clusterAccess)
    for (const n of sp.nodes)
      add('nodes', n.name, n.cordoned ? 'degraded' : 'ready', `${n.roles} · ${sp.version}`, sp.age, {
        status: n.cordoned ? 'Ready,SchedulingDisabled' : 'Ready',
        roles: n.roles,
        version: sp.version,
        cpu: n.cpu,
        memory: n.mem,
        ip: ip(sp.nodeNet, n.name),
        os: sp.os,
        runtime: sp.runtime,
        conditions: n.cordoned ? 'Ready, Unschedulable' : 'Ready',
      });

  // The API server service of every cluster.
  if (sp.namespaces.includes('default')) {
    const api = sp.nodes.filter(n => n.roles.includes('control-plane')).map(n => `${ip(sp.nodeNet, n.name)}:6443`);
    add('services', 'kubernetes', 'running', `ClusterIP ${sp.svcNet}.0.1 · 443/TCP`, sp.age, { type: 'ClusterIP', clusterIp: `${sp.svcNet}.0.1`, externalIp: '—', ports: '443/TCP', selector: '—' }, 'default');
    add('endpoints', 'kubernetes', 'ready', api.join(', '), sp.age, { endpoints: api.join(', ') }, 'default');
  }

  for (const app of sp.apps.filter(a => sp.namespaces.includes(a.ns))) {
    const age = app.age ?? sp.age;
    const n = app.replicas;
    const sel = `app=${app.name}`;
    const state = (i: number): PodState => (app.failing && i === n - 1 ? app.failing : 'Running');
    let pods: LabResource[];
    if (app.kind === 'deploy') {
      const rs = `${app.name}-${rand(`${connId}/${app.ns}/${app.name}`, 10)}`;
      pods = range(n).map(i => pod(app, `${rs}-${rand(`${rs}${i}`, 5)}`, `ReplicaSet/${rs}`, state(i)));
      const ready = pods.filter(p => p.cols?.status === 'Running').length;
      const st = workloadStatus(ready, n);
      add('deployments', app.name, st, `${ready}/${n} ready · ${app.image}`, age, { ready: `${ready}/${n}`, uptodate: String(n), available: String(ready), image: app.image, selector: sel, strategy: 'RollingUpdate' }, app.ns);
      add('replicasets', rs, st, `${ready}/${n} ready`, age, { desired: String(n), current: String(n), ready: String(ready), owner: `Deployment/${app.name}`, image: app.image, selector: sel }, app.ns);
      if (hash(app.name) % 3 === 0)
        add('replicasets', `${app.name}-${rand(`${rs}/previous`, 10)}`, 'stopped', 'scaled down', age, { desired: '0', current: '0', ready: '0', owner: `Deployment/${app.name}`, image: app.image, selector: sel }, app.ns);
    } else if (app.kind === 'sts') {
      pods = range(n).map(i => pod(app, `${app.name}-${i}`, `StatefulSet/${app.name}`, state(i)));
      const ready = pods.filter(p => p.cols?.status === 'Running').length;
      add('statefulsets', app.name, workloadStatus(ready, n), `${ready}/${n} ready · ${app.image}`, age, { ready: `${ready}/${n}`, image: app.image, service: app.svc ?? app.name, selector: sel }, app.ns);
    } else if (app.kind === 'ds') {
      pods = sp.nodes.map(nd => pod(app, `${app.name}-${rand(`${app.name}${nd.name}`, 5)}`, `DaemonSet/${app.name}`, 'Running', nd));
      const c = String(pods.length);
      add('daemonsets', app.name, 'running', `${c}/${c} ready · ${app.image}`, age, { desired: c, current: c, ready: c, available: c, nodeSelector: 'kubernetes.io/os=linux', image: app.image, selector: sel }, app.ns);
    } else {
      // Static control-plane pods (on the control plane) and OLM catalog pods.
      pods = [pod(app, app.name, app.svc ? `CatalogSource/${app.svc}` : `Node/${control.name}`, 'Running', app.svc ? undefined : control)];
    }

    if (app.port) {
      const svc = app.svc ?? app.name;
      const type = app.svcType ?? 'ClusterIP';
      const h = hash(`${connId}/${app.ns}/${svc}`);
      const clusterIp = ip(sp.svcNet, `${connId}/${app.ns}/${svc}`);
      const ports = app.port === 53 ? '53/UDP, 53/TCP, 9153/TCP' : type === 'NodePort' ? `${app.port}:${30000 + (h % 2767)}/TCP, 443:${30000 + ((h >>> 4) % 2767)}/TCP` : `${app.port}/TCP`;
      const externalIp = type === 'LoadBalancer' ? `a${rand(svc, 8)}${h % 1000}.us-east-1.elb.amazonaws.com` : '—';
      add('services', svc, 'running', `${type} ${clusterIp} · ${ports}`, age, { type, clusterIp, externalIp, ports, selector: sel, app: app.name }, app.ns);
      const eps = pods.filter(p => p.cols?.status === 'Running').map(p => `${p.cols?.ip}:${app.port}`);
      const shown = eps.length > 3 ? `${eps.slice(0, 3).join(', ')} +${eps.length - 3} more` : eps.join(', ') || '<none>';
      add('endpoints', svc, eps.length ? 'ready' : 'degraded', shown, age, { endpoints: shown, app: app.name }, app.ns);
      add(
        'endpointslices',
        `${svc}-${rand(`${svc}/slice`, 5)}`,
        eps.length ? 'ready' : 'degraded',
        `IPv4 · ${eps.length} endpoints`,
        age,
        { addressType: 'IPv4', ports: String(app.port), endpoints: eps.map(e => e.split(':')[0]).join(', ') || '<none>', service: svc, app: app.name },
        app.ns,
      );
      if (app.expose) {
        const host = kind ? `${app.name}.${sp.domain}` : `${app.name}-${app.ns}.${sp.domain}`;
        const tls = kind ? '—' : app.ns.startsWith('openshift') || app.port === 443 ? 'reencrypt' : 'edge';
        add('routes', app.name, 'running', host, age, { kind: kind ? 'Ingress' : 'Route', host, path: '/', service: `${svc}:${app.port}`, tls, class: kind ? 'nginx' : 'openshift-default', app: app.name }, app.ns);
      }
    }

    if (app.storage) {
      const claims = app.kind === 'sts' ? range(n).map(i => `data-${app.name}-${i}`) : [`${app.name}-data`];
      for (const claim of claims) {
        const vol = `pvc-${uuid(`${connId}/${app.ns}/${claim}`)}`;
        add('pvcs', claim, 'ready', `Bound · ${app.storage} · ${sc}`, age, { status: 'Bound', volume: vol, capacity: app.storage, access: 'RWO', storageclass: sc, app: app.name }, app.ns);
        if (sp.clusterAccess)
          add('pvs', vol, 'ready', `${app.storage} · ${app.ns}/${claim}`, age, { capacity: app.storage, access: 'RWO', reclaim: 'Delete', status: 'Bound', claim: `${app.ns}/${claim}`, storageclass: sc });
      }
    }
    if (app.config) add('configmaps', `${app.name}-config`, 'ready', '2 keys', age, { keys: '2', data: 'application.properties, LOG_LEVEL', app: app.name }, app.ns);
    if (app.db) add('secrets', `${app.name}-credentials`, 'ready', 'Opaque · 3 keys', age, { type: 'Opaque', keys: '3', data: 'database-name, database-password, database-user', app: app.name }, app.ns);
  }

  for (const ns of sp.namespaces) {
    const sys = isSystemNs(ns);
    const age = nsAge(ns);
    const labels = [`kubernetes.io/metadata.name=${ns}`, ...(openshift && sys ? ['openshift.io/cluster-monitoring=true'] : []), ...(sp.nsLabels?.[ns] ? [sp.nsLabels[ns]] : [])].join(', ');
    add('namespaces', ns, 'ready', 'Active', age, { status: 'Active', labels });
    add('configmaps', 'kube-root-ca.crt', 'ready', '1 key', age, { keys: '1', data: 'ca.crt' }, ns);
    if (!kind) add('configmaps', 'openshift-service-ca.crt', 'ready', '1 key', age, { keys: '1', data: 'service-ca.crt' }, ns);
    for (const sa of openshift && !sys ? ['default', 'builder', 'deployer'] : ['default']) {
      const dockercfg = openshift && !sys ? `${sa}-dockercfg-${rand(`${connId}/${ns}/${sa}`, 5)}` : undefined;
      add('serviceaccounts', sa, 'ready', dockercfg ? '1 secret' : '0 secrets', age, { secrets: dockercfg ? '1' : '0', pullSecrets: dockercfg ?? '—' }, ns);
      if (dockercfg) add('secrets', dockercfg, 'ready', 'kubernetes.io/dockercfg · 1 key', age, { type: 'kubernetes.io/dockercfg', keys: '1', data: '.dockercfg' }, ns);
    }
    if (openshift && !sys) {
      const bindings: [string, string, string][] = [
        ['admin', 'ClusterRole/admin', `User/${sp.user}`],
        ['system:image-pullers', 'ClusterRole/system:image-puller', `Group/system:serviceaccounts:${ns}`],
        ['system:deployers', 'ClusterRole/system:deployer', 'ServiceAccount/deployer'],
        ['system:image-builders', 'ClusterRole/system:image-builder', 'ServiceAccount/builder'],
      ];
      for (const [name, role, subjects] of bindings) add('rolebindings', name, 'ready', `${role} → ${subjects}`, age, { role, subjects }, ns);
    }
  }

  for (const [name, provisioner, def] of sp.storageClasses)
    add('storageclasses', name, 'ready', `${provisioner}${def ? ' · default' : ''}`, sp.age, {
      provisioner,
      reclaim: 'Delete',
      binding: 'WaitForFirstConsumer',
      expansion: provisioner === 'rancher.io/local-path' ? 'false' : 'true',
      default: def ? 'Yes' : 'No',
    });
  for (const [name, controller] of sp.ingressClasses) add('ingressclasses', name, 'ready', controller, sp.age, { controller, default: 'Yes', parameters: '—' });

  if (sp.clusterAccess) {
    for (const [name, rules] of [...K8S_CLUSTER_ROLES, ...sp.clusterRoles])
      add('clusterroles', name, 'ready', `${rules} rules`, sp.age, { rules: String(rules), aggregated: ['admin', 'edit', 'view'].includes(name) ? 'Yes' : 'No' });
    const bindings: [string, string, string][] = [
      ['cluster-admin', 'cluster-admin', 'Group/system:masters'],
      ['system:basic-user', 'system:basic-user', 'Group/system:authenticated'],
      ['system:discovery', 'system:discovery', 'Group/system:authenticated'],
      ['system:kube-scheduler', 'system:kube-scheduler', 'User/system:kube-scheduler'],
      ['system:kube-controller-manager', 'system:kube-controller-manager', 'User/system:kube-controller-manager'],
      ['system:node', 'system:node', 'Group/system:nodes'],
      ...(kind ? ([['kubeadm:cluster-admins', 'cluster-admin', 'Group/kubeadm:cluster-admins']] as [string, string, string][]) : []),
      ...(openshift
        ? ([
            ['cluster-admins', 'cluster-admin', 'Group/cluster-admins'],
            ['self-provisioners', 'self-provisioner', 'Group/system:authenticated:oauth'],
            ['basic-users', 'basic-user', 'Group/system:authenticated'],
          ] as [string, string, string][])
        : []),
      ...sp.clusterRoles.filter(([, , ns]) => ns).map(([name, , ns]): [string, string, string] => [name, name, `ServiceAccount/${ns}/${name}`]),
    ];
    for (const [name, role, subjects] of bindings) add('clusterrolebindings', name, 'ready', `${role} → ${subjects}`, sp.age, { role: `ClusterRole/${role}`, subjects });
  }

  const job = (ns: string, name: string, image: string, duration: string, st: PodState, age: string): void => {
    const done = st === 'Completed';
    const status = done ? 'Complete' : st === 'Error' ? 'Failed' : 'Running';
    add('jobs', name, done ? 'ready' : STATE[st], `${status} · ${duration}`, age, { completions: done ? '1/1' : '0/1', duration, status, image, app: name }, ns);
    pod({ ns, name, image, replicas: 1, kind: 'pod', age }, `${name}-${rand(`${connId}/${name}`, 5)}`, `Job/${name}`, st);
  };
  for (const [ns, name, image, duration, st] of sp.jobs) job(ns, name, image, duration, st, nsAge(ns));
  for (const [ns, name, schedule, image, last] of sp.cronjobs) {
    add('cronjobs', name, 'running', `${schedule} · last ${last} ago`, nsAge(ns), { schedule, suspend: 'False', active: '0', last: `${last} ago`, image, app: name }, ns);
    job(ns, `${name}-${29317440 + (hash(name) % 500)}`, image, `${(hash(name) % 50) + 4}s`, 'Completed', last);
  }
  for (const [ns, name, hostnames, parents] of sp.httproutes) add('httproutes', name, 'running', hostnames, sp.age, { hostnames, parents, backend: `${name}:8080`, app: name }, ns);
  for (const [ns, appName, local] of sp.portforwards) {
    const target = out.get('kpods')?.find(p => p.ns === ns && p.cols?.app === appName && p.cols.status === 'Running');
    const port = sp.apps.find(a => a.ns === ns && a.name === appName)?.port ?? local;
    if (target) add('portforwards', `${appName}-${local}`, 'running', `localhost:${local} → ${target.name}:${port}`, '1 hour', { local: `localhost:${local}`, target: `${target.name}:${port}`, kind: 'Pod', app: appName }, ns);
  }
  for (const [ns, name, resources, verbs] of sp.roles) {
    add('roles', name, 'ready', resources, sp.age, { resources, verbs, rules: String(resources.split(',').length) }, ns);
    add('rolebindings', name, 'ready', `Role/${name} → ServiceAccount/${name}`, sp.age, { role: `Role/${name}`, subjects: `ServiceAccount/${name}` }, ns);
    add('serviceaccounts', name, 'ready', '0 secrets', sp.age, { secrets: '0', pullSecrets: '—' }, ns);
  }
  for (const [ns, name, podSelector, types] of sp.netpols) add('netpols', name, 'ready', `${podSelector} · ${types}`, sp.age, { podSelector, types }, ns);
  return out;
}

const CACHE = new Map<string, Map<string, LabResource[]>>();

export function kubeResources(c: LabConnection, s: LabSection): LabResource[] {
  let all = CACHE.get(c.id);
  if (!all) {
    all = expand(c.id, SPECS[c.id] ?? fallback(c.id));
    CACHE.set(c.id, all);
  }
  return all.get(s.id) ?? [];
}

/** Developer namespace of a cluster (default namespace selection). */
export function kubeHomeNs(connId: string): string | undefined {
  return SPECS[connId]?.home;
}

/** Cluster flavour: Ingress (kind) or Route (MicroShift / OpenShift), API groups of manifests. */
export function kubeFlavour(connId: string): Flavour {
  return SPECS[connId]?.flavour ?? 'kind';
}

/** Apps domain of a cluster (route hosts). */
export function kubeDomain(connId: string): string {
  return SPECS[connId]?.domain ?? 'localtest.me';
}

/** Pod / service networks (IPs of resources created at runtime). */
export function kubeNets(connId: string): { pod: string; svc: string } {
  const sp = SPECS[connId];
  return { pod: sp?.podNet ?? '10.244', svc: sp?.svcNet ?? '10.96' };
}

/** Kubernetes-style random suffix, exported for pods created at runtime (scale up). */
export const kubeSuffix = rand;
export const kubeIp = ip;
