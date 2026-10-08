/** Registration service `GET /api/v1/signup`, ResourceQuota and workloads of the Developer Sandbox namespace. */
import { hexId, kube, type KubeObject } from '#lib/world.svelte.ts';

export const SANDBOX_ID = 'redhat.redhat-sandbox';

export const SIGNUP = {
  username: 'jdoe-acme',
  compliantUsername: 'jdoe-acme',
  givenName: 'Jane',
  familyName: 'Doe',
  company: 'Acme Bank',
  clusterName: 'sandbox-m2.ll9k.p1',
  apiEndpoint: 'https://api.sandbox-m2.ll9k.p1.openshiftapps.com:6443',
  consoleURL: 'https://console-openshift-console.apps.sandbox-m2.ll9k.p1.openshiftapps.com/',
  defaultUserNamespace: 'jdoe-acme-dev',
  rhodsMemberURL: 'https://rhods-dashboard-redhat-ods-applications.apps.sandbox-m2.ll9k.p1.openshiftapps.com',
  cheDashboardURL: 'https://devspaces.apps.sandbox-m2.ll9k.p1.openshiftapps.com',
  startDate: '2026-09-22T09:03:11Z',
  endDate: '2026-10-22T09:03:11Z',
  status: { ready: true, reason: 'Provisioned', verificationRequired: false },
};

export const CONTEXT = { name: 'dev-sandbox-context', namespace: 'jdoe-acme-dev', user: 'pipeline-sa' };

export const QUOTA = [
  { resource: 'limits.cpu', label: 'CPU limits', used: 1.5, hard: 3, unit: 'cores' },
  { resource: 'limits.memory', label: 'Memory limits', used: 6, hard: 14, unit: 'GiB' },
  { resource: 'requests.storage', label: 'Storage', used: 5, hard: 40, unit: 'GiB' },
  { resource: 'count/pods', label: 'Pods', used: 7, hard: 50, unit: '' },
];

/** Days left at the fixture date (2026-10-08). */
export function daysLeft(now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(SIGNUP.endDate).getTime() - now) / 86_400_000));
}

export function sandboxObjects(): KubeObject[] {
  const ns = SIGNUP.defaultUserNamespace;
  const node = 'ip-10-0-147-22.ec2.internal';
  return [
    kube('apps/v1', 'Deployment', 'payments-api', ns, { replicas: 1, image: 'quay.io/jdoe/payments-api:1.4.0' }, { readyReplicas: 1 }, { d: 6 }, { app: 'payments-api' }),
    kube('apps/v1', 'Deployment', 'postgresql', ns, { replicas: 1, image: 'registry.redhat.io/rhel9/postgresql-16:1-48' }, { readyReplicas: 1 }, { d: 6 }, { app: 'postgresql' }),
    kube('v1', 'Pod', `payments-api-5f7d8c9b6-${hexId(5)}`, ns, { nodeName: node }, { phase: 'Running', ready: '1/1', restarts: 0 }, { d: 1 }),
    kube('v1', 'Pod', `postgresql-1-${hexId(5)}`, ns, { nodeName: node }, { phase: 'Running', ready: '1/1', restarts: 0 }, { d: 6 }),
    kube('v1', 'Service', 'payments-api', ns, { type: 'ClusterIP', clusterIP: '172.30.200.14', ports: '8080/TCP' }, {}, { d: 6 }),
    kube('v1', 'Service', 'postgresql', ns, { type: 'ClusterIP', clusterIP: '172.30.200.31', ports: '5432/TCP' }, {}, { d: 6 }),
    kube('v1', 'Secret', 'postgresql', ns, { type: 'Opaque' }, {}, { d: 6 }),
    kube('v1', 'PersistentVolumeClaim', 'postgresql', ns, { storage: '1Gi', storageClassName: 'gp3-csi' }, { phase: 'Bound' }, { d: 6 }),
  ];
}
