/**
 * P13: the one source of resource labels. Derived and deterministic, so the
 * dataset stays as it is; the details pages and the Views queries read from
 * here and can never disagree.
 */
import type { LabResource } from '../../data.ts';
import { isSystemNs } from '../kube-data.ts';

export function hash(s: string): number {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** The stage a connection serves, as a team would label it. */
const ENVIRONMENT: Record<string, string> = {
  'podman-machine-default': 'dev',
  'podman-machine-dev': 'dev',
  'kind-dev': 'dev',
  'ocp-dev': 'dev',
  'rhoai-dev': 'dev',
  'ocp-prod': 'prod',
};

function environmentOf(r: LabResource): Record<string, string> {
  const env = ENVIRONMENT[r.connId];
  return env ? { environment: env } : {};
}

/** `orders-stack` / `frontend-pod` → `orders` / `frontend`. */
function projectStem(group: string): string {
  return group.replace(/-(stack|pod)$/, '');
}

/** `checkout-3` → `checkout`, undefined for names without a replica suffix. */
function replicaStem(name: string): string | undefined {
  return /^(.+)-\d+$/.exec(name)?.[1];
}

function containerLabels(r: LabResource): Record<string, string> {
  const h = hash(r.name);
  const partOf = r.group ? projectStem(r.group) : replicaStem(r.name);
  return {
    app: r.name,
    ...(partOf ? { 'part-of': partOf } : {}),
    ...environmentOf(r),
    ...(r.group ? { [r.group.endsWith('-pod') ? 'io.podman.pod.name' : 'io.podman.compose.project']: r.group } : {}),
    'org.opencontainers.image.source': `https://github.com/acme/${r.name}`,
    'org.opencontainers.image.version': `1.${h % 9}.0`,
    maintainer: 'platform@acme.com',
    'io.k8s.display-name': r.name,
  };
}

function imageLabels(r: LabResource): Record<string, string> {
  const repo = r.name.split(/:(?=[^:/]+$)/)[0];
  const leaf = repo.split('/').at(-1) ?? repo;
  const own = repo.includes('/acme/');
  return {
    ...(own ? { 'part-of': leaf.split('-')[0] } : {}),
    'org.opencontainers.image.source': `https://${repo}`,
    'org.opencontainers.image.title': leaf,
    ...(repo.includes('redhat') ? { vendor: 'Red Hat, Inc.' } : {}),
  };
}

function kubeLabels(r: LabResource): Record<string, string> {
  if (r.sectionId === 'namespaces') {
    const pairs = (r.cols?.labels ?? '').split(', ').filter(Boolean);
    return Object.fromEntries(pairs.map(p => p.split('=') as [string, string]));
  }
  // Cluster-scoped kinds (nodes, storage classes…) and port forwards carry none.
  if (!r.ns || r.sectionId === 'portforwards') return {};
  return {
    app: r.cols?.app ?? r.name,
    ...(r.ns !== 'default' && !isSystemNs(r.ns) ? { 'part-of': r.ns, ...environmentOf(r) } : {}),
  };
}

const cache = new Map<string, Record<string, string>>();

/** Labels never change for a given resource, and queries read them constantly. */
export function labelsOf(r: LabResource): Record<string, string> {
  let labels = cache.get(r.id);
  if (!labels) {
    labels = computeLabels(r);
    cache.set(r.id, labels);
  }
  return labels;
}

function computeLabels(r: LabResource): Record<string, string> {
  switch (r.sectionId) {
    case 'containers':
      return containerLabels(r);
    case 'images':
      return imageLabels(r);
    case 'compose':
      return { 'part-of': projectStem(r.name), 'io.podman.compose.project': r.name };
    case 'pods': {
      const stem = replicaStem(r.name);
      return { app: r.name, ...(stem ? { 'part-of': stem } : {}) };
    }
    case 'volumes':
    case 'networks':
      return {};
    default:
      if (r.ns || r.sectionId === 'namespaces') return kubeLabels(r);
      // Platform lists without a namespace (OpenShift AI, Pipelines, VMs…): the stem they already showed.
      return ['pipelines', 'gitops', 'inference', 'workbenches', 'dspipelines', 'vms', 'kpods', 'deployments', 'services'].includes(r.sectionId) ? { app: r.name.split('-')[0] } : {};
  }
}
