/**
 * Helm mock data: `helm history`-shaped revisions per Kubernetes connection
 * (the release list is the latest revision of each release, like
 * `helm list -A -o json`) and Artifact Hub search results.
 * Sample from docs/research/podman-desktop.helm.md.
 */
import { world } from '#lib/world.svelte.ts';

export const HELM_ID = 'podman-desktop.helm';

export type ReleaseStatus =
  | 'unknown'
  | 'deployed'
  | 'uninstalled'
  | 'superseded'
  | 'failed'
  | 'uninstalling'
  | 'pending-install'
  | 'pending-upgrade'
  | 'pending-rollback';

/** One `helm history` row (plus the release identity). */
export interface HelmRevision {
  name: string;
  namespace: string;
  revision: number;
  /** `helm list` format: `2026-10-08 09:14:02.1 +0000 UTC`. */
  updated: string;
  status: ReleaseStatus;
  chart: string;
  app_version: string;
  description: string;
}

export interface HelmRelease extends HelmRevision {
  /** Table key. */
  key: string;
  selected?: boolean;
}

export function helmTime(epochMs: number): string {
  return new Date(epochMs).toISOString().replace('T', ' ').replace(/(\.\d)\d+Z$/, '$1 +0000 UTC');
}

const H = 3600_000;

function rev(name: string, namespace: string, revision: number, status: ReleaseStatus, chart: string, app: string, agoH: number, description: string): HelmRevision {
  return { name, namespace, revision, status, chart, app_version: app, updated: helmTime(Date.now() - agoH * H), description };
}

export function seedRevisions(): HelmRevision[] {
  return [
    rev('orders', 'orders', 1, 'superseded', 'orders-0.3.0', '2.1', 240, 'Install complete'),
    rev('orders', 'orders', 2, 'superseded', 'orders-0.3.2', '2.2', 120, 'Upgrade complete'),
    rev('orders', 'orders', 3, 'superseded', 'orders-0.4.0', '2.3', 30, 'Upgrade complete'),
    rev('orders', 'orders', 4, 'failed', 'orders-0.4.0', '2.3', 1, 'Upgrade "orders" failed: context deadline exceeded (readiness probe failed for orders-api)'),
    rev('ingress-nginx', 'ingress-nginx', 1, 'deployed', 'ingress-nginx-4.13.3', '1.13.3', 120, 'Install complete'),
    rev('kube-prometheus-stack', 'monitoring', 1, 'superseded', 'kube-prometheus-stack-77.6.0', 'v0.85.0', 96, 'Install complete'),
    rev('kube-prometheus-stack', 'monitoring', 2, 'pending-upgrade', 'kube-prometheus-stack-78.2.1', 'v0.86.0', 0.2, 'Preparing upgrade'),
    rev('cert-manager', 'cert-manager', 1, 'superseded', 'cert-manager-v1.18.2', 'v1.18.2', 200, 'Install complete'),
    rev('cert-manager', 'cert-manager', 2, 'superseded', 'cert-manager-v1.19.0', 'v1.19.0', 72, 'Upgrade complete'),
    rev('cert-manager', 'cert-manager', 3, 'failed', 'cert-manager-v1.19.1', 'v1.19.1', 5, 'Upgrade "cert-manager" failed: CRD certificates.cert-manager.io is invalid'),
    rev('valkey', 'cache', 1, 'pending-install', 'valkey-3.0.31', '9.1.2', 0.05, 'Initial install underway'),
  ];
}

/** Revisions per connection id (read-only view; missing → []). */
export function revisionsOf(connId: string): HelmRevision[] {
  const all = world.ext[HELM_ID]?.revisions as Record<string, HelmRevision[]> | undefined;
  return all?.[connId] ?? [];
}

/** Mutable store for a connection. */
export function store(connId: string): HelmRevision[] {
  world.ext[HELM_ID] ??= {};
  const ext = world.ext[HELM_ID];
  ext.revisions ??= {};
  const all = ext.revisions as Record<string, HelmRevision[]>;
  all[connId] ??= [];
  return all[connId];
}

/** `helm list -A`: latest revision of every release not uninstalled. */
export function releasesOf(connId: string): HelmRelease[] {
  const latest = new Map<string, HelmRevision>();
  for (const r of revisionsOf(connId)) {
    const key = `${r.namespace}/${r.name}`;
    const cur = latest.get(key);
    if (!cur || r.revision > cur.revision) latest.set(key, r);
  }
  return [...latest.entries()].filter(([, r]) => r.status !== 'uninstalled').map(([key, r]) => ({ ...r, key }));
}

export const STATUS_CLASS: Record<ReleaseStatus, string> = {
  deployed: 'text-[var(--pd-status-running)]',
  superseded: 'text-[var(--pd-status-stopped)]',
  failed: 'text-[var(--pd-status-terminated)]',
  'pending-install': 'text-[var(--pd-status-starting)]',
  'pending-upgrade': 'text-[var(--pd-status-starting)]',
  'pending-rollback': 'text-[var(--pd-status-starting)]',
  uninstalling: 'text-[var(--pd-status-starting)]',
  uninstalled: 'text-[var(--pd-status-stopped)]',
  unknown: 'text-[var(--pd-status-unknown)]',
};

/** Artifact Hub `packages/search` result shape. */
export interface ChartPackage {
  package_id: string;
  name: string;
  version: string;
  app_version: string;
  description: string;
  stars: number;
  /** Install reference: `repo/name` or `oci://…`. */
  ref: string;
  repository: { name: string; url: string; verified_publisher: boolean; official: boolean; organization_name: string };
}

export const CHARTS: ChartPackage[] = [
  {
    package_id: '7b1f8a3e-valkey',
    name: 'valkey',
    version: '3.0.31',
    app_version: '9.1.2',
    description: 'Valkey is an open source (BSD) high-performance key/value datastore, a Redis fork.',
    stars: 128,
    ref: 'bitnami/valkey',
    repository: { name: 'bitnami', url: 'https://charts.bitnami.com/bitnami', verified_publisher: true, official: false, organization_name: 'Bitnami' },
  },
  {
    package_id: '0c5c4f53-valkey-official',
    name: 'valkey',
    version: '0.7.4',
    app_version: '9.1.2',
    description: 'Official Valkey chart from the Valkey project.',
    stars: 41,
    ref: 'valkey/valkey',
    repository: { name: 'valkey', url: 'https://valkey.io/valkey-helm', verified_publisher: true, official: true, organization_name: 'Valkey' },
  },
  {
    package_id: 'b4e0a1f2-postgresql',
    name: 'postgresql',
    version: '16.7.27',
    app_version: '17.6.0',
    description: 'PostgreSQL (Postgres) is an open source object-relational database known for reliability and data integrity.',
    stars: 412,
    ref: 'bitnami/postgresql',
    repository: { name: 'bitnami', url: 'https://charts.bitnami.com/bitnami', verified_publisher: true, official: false, organization_name: 'Bitnami' },
  },
  {
    package_id: '3d2c7e88-ingress-nginx',
    name: 'ingress-nginx',
    version: '4.13.3',
    app_version: '1.13.3',
    description: 'Ingress controller for Kubernetes using NGINX as a reverse proxy and load balancer.',
    stars: 735,
    ref: 'ingress-nginx/ingress-nginx',
    repository: { name: 'ingress-nginx', url: 'https://kubernetes.github.io/ingress-nginx', verified_publisher: true, official: true, organization_name: 'Kubernetes' },
  },
  {
    package_id: '9a6f1b0c-cert-manager',
    name: 'cert-manager',
    version: 'v1.19.1',
    app_version: 'v1.19.1',
    description: 'A Helm chart for cert-manager: X.509 certificate management for Kubernetes.',
    stars: 612,
    ref: 'jetstack/cert-manager',
    repository: { name: 'cert-manager', url: 'https://charts.jetstack.io', verified_publisher: true, official: true, organization_name: 'cert-manager' },
  },
  {
    package_id: 'e1d0c9b8-kube-prometheus-stack',
    name: 'kube-prometheus-stack',
    version: '78.2.1',
    app_version: 'v0.86.0',
    description: 'Prometheus, Alertmanager, Grafana and exporters to monitor a Kubernetes cluster end to end.',
    stars: 598,
    ref: 'prometheus-community/kube-prometheus-stack',
    repository: { name: 'prometheus-community', url: 'https://prometheus-community.github.io/helm-charts', verified_publisher: true, official: false, organization_name: 'Prometheus' },
  },
  {
    package_id: '5f4e3d2c-keycloak',
    name: 'keycloak',
    version: '25.2.0',
    app_version: '26.4.0',
    description: 'Keycloak is an open source identity and access management solution for modern applications.',
    stars: 307,
    ref: 'bitnami/keycloak',
    repository: { name: 'bitnami', url: 'https://charts.bitnami.com/bitnami', verified_publisher: true, official: false, organization_name: 'Bitnami' },
  },
  {
    package_id: 'acme-orders-oci',
    name: 'orders',
    version: '0.4.0',
    app_version: '2.3',
    description: 'ACME orders service (API + worker), published as an OCI chart.',
    stars: 0,
    ref: 'oci://quay.io/acme/charts/orders',
    repository: { name: 'quay.io/acme/charts', url: 'oci://quay.io/acme/charts', verified_publisher: false, official: false, organization_name: 'ACME' },
  },
];

export const DEFAULT_VALUES: Record<string, string> = {
  valkey: 'architecture: standalone\nauth:\n  enabled: true\nprimary:\n  persistence:\n    size: 1Gi\n',
  postgresql: 'auth:\n  username: orders\n  database: orders\nprimary:\n  persistence:\n    size: 2Gi\n',
  'ingress-nginx': 'controller:\n  service:\n    type: NodePort\n',
  'cert-manager': 'crds:\n  enabled: true\n',
  'kube-prometheus-stack': 'grafana:\n  adminPassword: change-me\nprometheus:\n  prometheusSpec:\n    retention: 2d\n',
  keycloak: 'auth:\n  adminUser: admin\nproduction: false\n',
  orders: 'image:\n  tag: "2.3"\nreplicaCount: 1\n',
};
