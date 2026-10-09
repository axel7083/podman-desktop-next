/**
 * redhat.openshift-cluster-manager (proposed) – lists the organization's
 * OpenShift / ROSA / OSD clusters from OCM and turns the ready ones into
 * Kubernetes connections (P1). Remote connections show "Not connected" until
 * "Connect" runs `oc login --web` (P12 async remote factory, P16 scopes
 * api.ocm). Tool page with every cluster, Cluster tab, dashboard card.
 */
import { faArrowUpRightFromSquare, faCloud, faCopy } from '@fortawesome/free-solid-svg-icons';

import type { ConnectionDef, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { addKube, startHandlers, toast } from '#lib/world.svelte.ts';

import ClustersCard from './components/ClustersCard.svelte';
import ClusterTab from './components/ClusterTab.svelte';
import OcmTool from './components/OcmTool.svelte';
import { connect } from './connect.ts';
import { CLUSTERS, locationLabel, OCM_ID, type OcmCluster, prodObjects, productLabel } from './data.ts';

/** Clusters that become connections (ready ones); others are listed in the tool only. */
const CONNECTABLE = CLUSTERS.filter(c => c.state === 'ready');
for (const c of CONNECTABLE) startHandlers.set(c.name, connect);

function toConnection(c: OcmCluster): ConnectionDef {
  return {
    id: c.name,
    name: c.name,
    kind: 'kubernetes',
    providerId: 'openshift-cluster-manager',
    providerName: 'OpenShift',
    hint: c.product.id === 'rosa' ? 'ROSA' : 'OCM',
    hintTooltip: `${c.display_name ?? c.name} · ${productLabel(c)} from OpenShift Cluster Manager`,
    initialStatus: c.name === 'ocp-dev' ? 'stopped' : 'started',
    remote: true,
    endpoint: c.api.url,
    version: c.openshift_version,
    details: {
      'Display name': c.display_name ?? c.name,
      Product: productLabel(c),
      Location: locationLabel(c),
      'Compute nodes': String(c.nodes.compute),
      Console: c.console?.url ?? '',
    },
    capabilities: ['kube', 'openshift', 'remote', 'ocm'],
  };
}

function consoleUrl(id: string): string | undefined {
  return CLUSTERS.find(c => c.name === id)?.console?.url;
}

const isOcm = (conn: { ext: { id: string } }): boolean => conn.ext.id === OCM_ID;

const extension: MockExtension = {
  id: OCM_ID,
  displayName: 'OpenShift Cluster Manager',
  publisher: 'redhat',
  category: 'Kubernetes & OpenShift',
  description: "See your organization's OpenShift, ROSA and OSD clusters and connect to them with one sign-in.",
  version: '0.3.0',
  icon: 'icons/redhat.openshift-cluster-manager.svg',
  dependsOn: ['redhat.redhat-authentication', 'redhat.openshift-cli-pack'],
  tags: ['openshift'],
  pApis: ['P1', 'P12', 'P14', 'P16', 'P17'],
  contributes: {
    connections: CONNECTABLE.map(toConnection),
    tools: [
      {
        id: 'openshift-cluster-manager',
        label: 'OpenShift clusters',
        icon: 'icons/redhat.openshift-cluster-manager.svg',
        description: 'Every cluster of your Red Hat organization',
        component: OcmTool,
        badge: (): number => CLUSTERS.length,
      },
    ],
    tabs: [{ id: 'ocm-cluster', label: 'Cluster', target: 'connection', when: ctx => isOcm(ctx.conn), component: ClusterTab }],
    menus: [
      {
        id: 'ocm-open-console',
        label: 'Open console',
        icon: faArrowUpRightFromSquare,
        target: 'connection',
        placement: 'details',
        when: ctx => isOcm(ctx.conn),
        run: ctx => toast({ type: 'info', title: `Opening ${consoleUrl(ctx.conn.id)}` }),
      },
      {
        id: 'ocm-copy-login',
        label: 'Copy login command',
        icon: faCopy,
        target: 'connection',
        placement: 'details',
        when: ctx => isOcm(ctx.conn),
        run: ctx => toast({ type: 'success', title: 'Copied to clipboard', body: `oc login --web --server=${ctx.conn.endpoint}` }),
      },
    ],
    dashboardCards: [{ id: 'ocm-clusters', title: 'OpenShift clusters', component: ClustersCard }],
    commands: [
      { id: 'ocm.open', title: 'Open OpenShift clusters', category: 'OpenShift Cluster Manager', icon: faCloud, run: (): void => navigate('/tools/openshift-cluster-manager') },
      ...CONNECTABLE.map(c => ({ id: `ocm.connect.${c.name}`, title: `Connect to ${c.name} (oc login --web)`, category: 'OpenShift Cluster Manager', icon: faCloud, run: (): void => connect(c.name) })),
    ],
  },
  seed(): void {
    // ocp-prod is already logged in at launch; ocp-dev is discovered on connect
    addKube('ocp-prod', prodObjects());
  },
};

export default extension;
