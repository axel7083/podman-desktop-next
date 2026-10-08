/**
 * redhat.openshift-local – OpenShift Local (CRC): a single-node OpenShift or
 * MicroShift cluster in a local VM. Connection (P1), "Create OpenShift Local
 * instance" factory with the pull secret from the Red Hat account (P12, P16),
 * "Console & users" tab (P14), Open console / Copy login command.
 */
import { faArrowUpRightFromSquare, faCopy, faServer } from '@fortawesome/free-solid-svg-icons';

import type { ConnectionDef, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { addKube, toast } from '#lib/world.svelte.ts';

import CrcTab from './components/CrcTab.svelte';
import { CLUSTER_CONFIG, CRC_ID, CRC_STATUS, crcObjects, USERS } from './data.ts';

const GiB = 1024 ** 3;
const isCrc = (conn: { capabilities?: string[] }): boolean => !!conn.capabilities?.includes('crc');

const extension: MockExtension = {
  id: CRC_ID,
  displayName: 'Red Hat OpenShift Local',
  publisher: 'redhat',
  description: 'Run a single-node OpenShift, MicroShift or OKD cluster in a local VM.',
  version: '2.5.0',
  icon: 'icons/redhat.openshift-local.png',
  dependsOn: ['redhat.redhat-authentication'],
  tags: ['openshift'],
  pApis: ['P1', 'P12', 'P14', 'P16'],
  contributes: {
    connections: [
      {
        id: 'openshift-local',
        name: 'openshift-local',
        kind: 'kubernetes',
        providerId: 'openshift-local',
        providerName: 'OpenShift Local',
        initialStatus: 'started',
        endpoint: CLUSTER_CONFIG.ClusterAPI,
        version: CRC_STATUS.openshiftVersion,
        details: {
          Preset: 'OpenShift',
          CPUs: String(CRC_STATUS.cpus),
          Memory: `${(CRC_STATUS.ramSize / GiB).toFixed(1)} GiB`,
          Disk: `${Math.round(CRC_STATUS.diskSize / GiB)} GiB`,
          Console: CLUSTER_CONFIG.WebConsoleURL,
          'OpenShift Local': `crc ${CRC_STATUS.crcVersion}`,
        },
        capabilities: ['kube', 'kube.local', 'openshift', 'crc'],
      },
    ],
    connectionFactories: [
      {
        id: 'openshift-local',
        label: 'Create OpenShift Local instance',
        providerId: 'openshift-local',
        kind: 'kubernetes',
        description: 'A single-node OpenShift or MicroShift cluster in a local virtual machine.',
        fields: [
          { id: 'name', label: 'Name', type: 'text', default: 'microshift-local', required: true },
          {
            id: 'preset',
            label: 'Preset',
            type: 'select',
            default: 'microshift',
            options: [
              { value: 'openshift', label: 'OpenShift (needs 10.5 GiB of memory)' },
              { value: 'microshift', label: 'MicroShift (needs 4 GiB of memory)' },
            ],
          },
          { id: 'cpus', label: 'CPU(s)', type: 'slider', default: 4, min: 2, max: 12, unit: 'cores' },
          { id: 'memory', label: 'Memory', type: 'slider', default: 4, min: 4, max: 24, unit: 'GiB' },
          { id: 'disk', label: 'Disk size', type: 'slider', default: 35, min: 31, max: 200, unit: 'GiB' },
          {
            id: 'pullSecret',
            label: 'Use the pull secret from my Red Hat account',
            type: 'checkbox',
            default: true,
            description: 'Fetched from OpenShift Cluster Manager with your Red Hat SSO session (jdoe@acme-bank.com).',
          },
          { id: 'start', label: 'Start the cluster now', type: 'checkbox', default: true },
        ],
        steps: v => [
          ...(v.pullSecret ? [{ label: 'Fetching pull secret (api.openshift.com/api/accounts_mgmt/v1/access_token)', ms: 700 }] : []),
          { label: `Using cached ${String(v.preset)} bundle 4.22.3`, ms: 900, log: [`crc config set preset ${String(v.preset)}`, 'crc setup'] },
          { label: 'Creating the OpenShift Local virtual machine', ms: 1800 },
          ...(v.start
            ? [
                { label: `Starting ${v.preset === 'openshift' ? 'OpenShift' : 'MicroShift'} 4.22.3`, ms: 2400, log: ['Waiting for kube-apiserver availability… [takes around 2min]'] },
                { label: 'Waiting until the cluster is ready', ms: 1500 },
              ]
            : []),
        ],
        createConnection: (v): ConnectionDef => ({
          id: String(v.name),
          name: String(v.name),
          kind: 'kubernetes',
          providerId: 'openshift-local',
          providerName: 'OpenShift Local',
          initialStatus: v.start ? 'started' : 'stopped',
          endpoint: v.preset === 'openshift' ? CLUSTER_CONFIG.ClusterAPI : 'https://api.crc.testing:6443',
          version: '4.22.3',
          details: { Preset: v.preset === 'openshift' ? 'OpenShift' : 'MicroShift', CPUs: String(v.cpus), Memory: `${String(v.memory)} GiB`, Disk: `${String(v.disk)} GiB` },
          capabilities: ['kube', 'kube.local', 'openshift', 'crc', String(v.preset)],
        }),
        onCreated: (_world, conn, v): void => addKube(conn.id, crcObjects(String(v.preset))),
      },
    ],
    tabs: [{ id: 'crc', label: 'Console & users', target: 'connection', when: ctx => isCrc(ctx.conn), component: CrcTab }],
    menus: [
      {
        id: 'crc-open-console',
        label: 'Open console',
        icon: faArrowUpRightFromSquare,
        target: 'connection',
        placement: 'details',
        when: ctx => isCrc(ctx.conn) && ctx.conn.status === 'started',
        run: () => toast({ type: 'info', title: `Opening ${CLUSTER_CONFIG.WebConsoleURL}`, body: 'Log in as developer / developer.' }),
      },
      {
        id: 'crc-copy-login',
        label: 'Copy login command',
        icon: faCopy,
        target: 'connection',
        placement: 'details',
        when: ctx => isCrc(ctx.conn),
        run: () => toast({ type: 'success', title: 'Copied to clipboard', body: `oc login -u ${USERS[1].name} ${CLUSTER_CONFIG.ClusterAPI}` }),
      },
    ],
    commands: [{ id: 'crc.create', title: 'Create OpenShift Local instance', category: 'OpenShift Local', icon: faServer, run: (): void => navigate('/settings/create/openshift-local') }],
  },
  seed(): void {
    addKube('openshift-local', crcObjects('openshift'));
  },
};

export default extension;
