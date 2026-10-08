/**
 * "Connect" on an OCM cluster = `oc login --web` (OAuth browser flow, oc ≥ 4.19)
 * as a task; offers to update `oc` first when it lags the cluster by ≥ 2 minors.
 * Registered as the start handler of each OCM connection (ConnectionDef.remote).
 */
import { confirm } from '#lib/confirm.svelte.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import { addKube, runTask, setConnectionStatus, toast, world } from '#lib/world.svelte.ts';

import { installedVersion, installTool, minorsBehind, TOOLS } from '../openshift-cli-pack/data.ts';
import { CLUSTERS, contextName, devObjects, OCM_ID, prodObjects } from './data.ts';

const CLI_PACK = 'redhat.openshift-cli-pack';

function seedDiscovered(id: string): void {
  if ((world.kube[id] ?? []).some(o => o.kind === 'Node')) return;
  addKube(id, id === 'ocp-dev' ? devObjects() : prodObjects());
}

export function login(id: string): void {
  const cluster = CLUSTERS.find(c => c.name === id);
  if (!cluster) return;
  setConnectionStatus(id, 'starting');
  runTask({
    name: `oc login --web ${cluster.name}`,
    ext: OCM_ID,
    steps: [
      { label: `Opening browser: ${cluster.api.url.replace(':6443', '').replace('api.', 'oauth-openshift.apps.')}/oauth/authorize`, ms: 1400, log: [`$ oc login --web --server=${cluster.api.url}`] },
      { label: 'Waiting for sign-in with Red Hat SSO (jdoe@acme-bank.com)', ms: 1800 },
      { label: `Writing kubeconfig context ${contextName(cluster)}`, ms: 500, log: ['Logged into "' + cluster.api.url + '" as "jdoe" using the token provided.', 'You have access to 14 projects, the list has been suppressed.'] },
      { label: 'Discovering API resources', ms: 900, log: ['214 resource types, 61 CRDs (tekton.dev, argoproj.io, kubevirt.io, skupper.io, ols.openshift.io…)'] },
    ],
    action: { label: `Open ${cluster.name}`, href: `/c/${cluster.name}` },
    onDone: () => {
      seedDiscovered(id);
      setConnectionStatus(id, 'started');
    },
  });
}

/** Start handler: maybe update oc, then log in. */
export function connect(id: string): void {
  const cluster = CLUSTERS.find(c => c.name === id);
  if (!cluster) return;
  if (cluster.state !== 'ready') {
    toast({ type: 'warning', title: `${cluster.name} is ${cluster.state}`, body: 'Resume it in console.redhat.com before connecting.' });
    return;
  }
  const oc = registry.isEnabled(CLI_PACK) ? installedVersion('oc') : undefined;
  const latest = TOOLS.find(t => t.name === 'oc')?.latest ?? '';
  if (oc && minorsBehind(oc, cluster.openshift_version) >= 2) {
    confirm({
      title: 'Update oc before connecting?',
      message: `oc ${oc} is ${minorsBehind(oc, cluster.openshift_version)} minor versions behind ${cluster.name} (${cluster.openshift_version}). Update oc to ${latest}, then sign in with oc login --web.`,
      buttonLabel: 'Update and connect',
      variant: 'primary',
    })
      .then(ok => {
        if (ok) installTool('oc', () => login(id));
      })
      .catch(console.error);
    return;
  }
  login(id);
}
