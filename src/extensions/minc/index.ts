/**
 * minc-org.minc – MicroShift in a single Podman container (minc). Connection
 * running on podman-machine-default (P1), "Create MicroShift cluster" factory
 * (P12) and the OpenShift Console add-on (P13) with its auth-disabled warning.
 */
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';

import { mkContainer } from '#lib/ext/helpers.ts';
import type { ConnectionDef, MockExtension } from '#lib/ext/types.ts';
import { addKube, toast, world } from '#lib/world.svelte.ts';

import { CONSOLE_IMAGE, CONSOLE_URL, CONSOLE_WARNING, consoleObjects, MINC_ID, MINC_IMAGE, mincObjects } from './data.ts';

const isMinc = (conn: { capabilities?: string[] }): boolean => !!conn.capabilities?.includes('minc');
const consoleInstalled = (connId: string): boolean => world.addons[`${connId}:${MINC_ID}:openshift-console`] === 'installed';

function mincConnection(name: string, https: number): ConnectionDef {
  return {
    id: name,
    name,
    kind: 'kubernetes',
    providerId: 'minc',
    providerName: 'MicroShift',
    initialStatus: 'started',
    endpoint: 'https://127.0.0.1:6443',
    version: '4.19.0',
    details: { Kubernetes: 'v1.32.8', Container: 'microshift', Image: MINC_IMAGE, 'HTTP / HTTPS ports': `80 / ${https}`, Rootless: 'No', 'Runs on': 'podman-machine-default' },
    capabilities: ['kube', 'kube.local', 'minc', 'openshift', 'microshift', 'arch:amd64'],
    parentId: 'podman-machine-default',
  };
}

const extension: MockExtension = {
  id: MINC_ID,
  displayName: 'MicroShift (minc)',
  publisher: 'minc-org',
  description: 'MicroShift in a single Podman container; optional upstream OpenShift Console add-on.',
  version: '0.5.0',
  icon: 'icons/minc-org.minc.png',
  dependsOn: ['podman-desktop.podman'],
  tags: ['openshift'],
  pApis: ['P1', 'P4', 'P12', 'P13'],
  contributes: {
    connections: [mincConnection('minc', 443)],
    connectionFactories: [
      {
        id: 'minc',
        label: 'Create MicroShift cluster',
        providerId: 'minc',
        kind: 'kubernetes',
        description: 'MicroShift 4.19 (OKD) in a Podman container.',
        fields: [
          { id: 'name', label: 'Name', type: 'text', default: 'minc-2', required: true },
          { id: 'http', label: 'HTTP port', type: 'number', default: 9080 },
          { id: 'https', label: 'HTTPS port', type: 'number', default: 9443, description: 'Port 443 is used by the minc cluster.' },
          { id: 'console', label: 'Install OpenShift Console', type: 'checkbox', default: false, description: CONSOLE_WARNING },
        ],
        steps: v => [
          { label: 'Pulling minc image (1.1 GB)', ms: 2200, log: [`$ minc create --http-port ${String(v.http)} --https-port ${String(v.https)}`] },
          { label: 'Starting MicroShift', ms: 2000 },
          ...(v.console
            ? [
                { label: 'Applying console (16 objects)', ms: 1000 },
                { label: 'Waiting for console rollout', ms: 1500 },
              ]
            : []),
        ],
        createConnection: (v): ConnectionDef => mincConnection(String(v.name), Number(v.https)),
        onCreated: (w, conn, v): void => {
          addKube(conn.id, mincObjects());
          if (v.console) {
            addKube(conn.id, consoleObjects());
            w.addons[`${conn.id}:${MINC_ID}:openshift-console`] = 'installed';
          }
        },
      },
    ],
    addons: [
      {
        id: 'openshift-console',
        label: 'OpenShift Console',
        description: `Upstream OpenShift web console (${CONSOLE_IMAGE}, ~470 MB) with a reencrypt route on *.apps.127.0.0.1.nip.io.`,
        icon: 'icons/redhat.openshift-cluster-manager.svg',
        when: conn => isMinc(conn),
        warning: CONSOLE_WARNING,
        disabledReason: conn => (conn.capabilities?.includes('arch:arm64') ? 'Not available: origin-console is amd64-only.' : undefined),
        installSteps: [
          { label: `Pulling ${CONSOLE_IMAGE} (470 MB)`, ms: 2200 },
          { label: 'Applying 16 objects (namespace, service accounts, ConsoleConfig, deployment, service, route)', ms: 1200, log: ['$ kubectl apply -k deploy/base', 'namespace/openshift-console created', 'serviceaccount/console created', 'serviceaccount/console-user created', 'clusterrolebinding.rbac.authorization.k8s.io/console-user-cluster-admin created', 'configmap/console-config created', 'deployment.apps/console created', 'service/console created', 'route.route.openshift.io/console created'] },
          { label: 'Waiting for deployment/console rollout', ms: 2000, log: ['deployment "console" successfully rolled out'] },
          { label: 'Exposing route console-openshift-console.apps.127.0.0.1.nip.io', ms: 600 },
        ],
        endpoints: () => [{ label: 'Console', url: CONSOLE_URL }],
        onInstalled: conn => addKube(conn.id, consoleObjects()),
        onUninstalled: conn => {
          world.kube[conn.id] = (world.kube[conn.id] ?? []).filter(o => o.metadata.namespace !== 'openshift-console');
        },
      },
    ],
    menus: [
      {
        id: 'minc-open-console',
        label: 'Open OpenShift Console',
        icon: faArrowUpRightFromSquare,
        target: 'connection',
        placement: 'details',
        when: ctx => isMinc(ctx.conn) && consoleInstalled(ctx.conn.id),
        run: () => toast({ type: 'warning', title: `Opening ${CONSOLE_URL}`, body: 'Authentication is disabled on this console.' }),
      },
    ],
  },
  seed(w): void {
    addKube('minc', mincObjects());
    w.containers.push(
      mkContainer('podman-machine-default', {
        name: 'microshift',
        image: MINC_IMAGE,
        ports: [[6443, 6443], [80, 80], [443, 443]],
        labels: { 'io.minc.cluster': 'minc' },
        upM: 2880,
      }),
    );
  },
};

export default extension;
