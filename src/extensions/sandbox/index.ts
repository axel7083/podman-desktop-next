/**
 * redhat.redhat-sandbox – Developer Sandbox: a free 30-day namespace on a
 * shared OpenShift cluster, provisioned with the Red Hat account (P16). Remote
 * Kubernetes connection (P1) with an expiry hint, Sandbox tab (quota, links;
 * P14) and dashboard card (P17).
 */
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { addKube, toast } from '#lib/world.svelte.ts';

import SandboxCard from './components/SandboxCard.svelte';
import SandboxTab from './components/SandboxTab.svelte';
import { CONTEXT, daysLeft, SANDBOX_ID, sandboxObjects, SIGNUP } from './data.ts';

const isSandbox = (conn: { capabilities?: string[] }): boolean => !!conn.capabilities?.includes('sandbox');

const extension: MockExtension = {
  id: SANDBOX_ID,
  displayName: 'Developer Sandbox',
  publisher: 'redhat',
  description: 'Free 30-day shared OpenShift cluster on Red Hat infrastructure, provisioned with your Red Hat account.',
  version: '1.4.0',
  icon: 'icons/redhat.redhat-sandbox.png',
  dependsOn: ['redhat.redhat-authentication'],
  tags: ['openshift'],
  pApis: ['P1', 'P14', 'P16', 'P17'],
  contributes: {
    connections: [
      {
        id: 'dev-sandbox',
        name: 'Developer Sandbox',
        kind: 'kubernetes',
        providerId: 'redhat-sandbox',
        providerName: 'Developer Sandbox',
        hint: `${daysLeft()}d`,
        hintTooltip: `Expires in ${daysLeft()} days (${SIGNUP.endDate.slice(0, 10)})`,
        initialStatus: 'started',
        remote: true,
        endpoint: SIGNUP.apiEndpoint,
        version: '4.21.9',
        details: { Context: CONTEXT.name, Namespace: CONTEXT.namespace, Cluster: SIGNUP.clusterName, Expires: SIGNUP.endDate.slice(0, 10) },
        capabilities: ['kube', 'openshift', 'remote', 'sandbox'],
      },
    ],
    tabs: [{ id: 'sandbox', label: 'Sandbox', target: 'connection', when: ctx => isSandbox(ctx.conn), component: SandboxTab }],
    menus: [
      {
        id: 'sandbox-console',
        label: 'Open console',
        icon: faArrowUpRightFromSquare,
        target: 'connection',
        placement: 'details',
        when: ctx => isSandbox(ctx.conn),
        run: () => toast({ type: 'info', title: `Opening ${SIGNUP.consoleURL}` }),
      },
    ],
    dashboardCards: [{ id: 'sandbox', title: 'Developer Sandbox', component: SandboxCard }],
  },
  seed(): void {
    addKube('dev-sandbox', sandboxObjects());
  },
};

export default extension;
