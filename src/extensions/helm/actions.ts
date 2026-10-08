/**
 * Helm actions as tasks (P15): install, rollback, uninstall. Each mutates the
 * revision history the way helm does (new revision, previous superseded).
 */
import { withConfirmation } from '#lib/confirm.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { runTask, toast } from '#lib/world.svelte.ts';

import { type ChartPackage, HELM_ID, type HelmRevision, helmTime, store } from './data.ts';
import { plural } from '#lib/util.ts';

function nextRevision(connId: string, name: string, namespace: string): number {
  return Math.max(0, ...store(connId).filter(r => r.name === name && r.namespace === namespace).map(r => r.revision)) + 1;
}

export function rollback(conn: ConnectionView, release: HelmRevision, to: HelmRevision): void {
  const target = nextRevision(conn.id, release.name, release.namespace);
  const entry: HelmRevision = {
    ...to,
    revision: target,
    status: 'pending-rollback',
    updated: helmTime(Date.now()),
    description: `Rollback to ${to.revision}`,
  };
  store(conn.id).push(entry);
  runTask({
    name: `Rollback ${release.name} to revision ${to.revision}`,
    ext: HELM_ID,
    steps: [
      { label: `helm rollback ${release.name} ${to.revision} -n ${release.namespace}`, ms: 900, log: [`Rolling back ${release.name} to revision ${to.revision}`] },
      { label: 'Waiting for resources to be ready', ms: 1600, log: ['deployment.apps/orders-api successfully rolled out'] },
    ],
    action: { label: 'Open release', href: `/c/${conn.id}/helm-releases?release=${encodeURIComponent(`${release.namespace}/${release.name}`)}` },
    onDone: () => {
      for (const r of store(conn.id)) {
        if (r.name === release.name && r.namespace === release.namespace && r.revision !== target && r.status !== 'superseded') r.status = 'superseded';
      }
      const e = store(conn.id).find(r => r.name === release.name && r.namespace === release.namespace && r.revision === target);
      if (e) e.status = 'deployed';
    },
  });
}

export function uninstall(conn: ConnectionView, release: HelmRevision): void {
  withConfirmation(
    () => {
      const revs = store(conn.id).filter(r => r.name === release.name && r.namespace === release.namespace);
      const latest = revs.reduce((a, b) => (b.revision > a.revision ? b : a));
      latest.status = 'uninstalling';
      runTask({
        name: `Uninstall ${release.name}`,
        ext: HELM_ID,
        steps: [{ label: `helm uninstall ${release.name} -n ${release.namespace}`, ms: 1400, log: [`release "${release.name}" uninstalled`] }],
        onDone: () => {
          latest.status = 'uninstalled';
          navigate(`/c/${conn.id}/helm-releases`);
        },
      });
    },
    `uninstall release ${release.name} from namespace ${release.namespace}`,
    'Uninstall release?',
    'Uninstall',
  );
}

export function install(conn: ConnectionView, chart: ChartPackage, name: string, namespace: string, values: string): void {
  const existing = store(conn.id).some(r => r.name === name && r.namespace === namespace && r.status !== 'uninstalled');
  if (existing) {
    toast({ type: 'error', title: 'Installation failed', body: `cannot re-use a name that is still in use: ${name} (${namespace})` });
    return;
  }
  const revision = nextRevision(conn.id, name, namespace);
  const entry: HelmRevision = {
    name,
    namespace,
    revision,
    status: 'pending-install',
    chart: `${chart.name}-${chart.version}`,
    app_version: chart.app_version,
    updated: helmTime(Date.now()),
    description: 'Initial install underway',
  };
  store(conn.id).push(entry);
  const source = chart.ref.startsWith('oci://') ? chart.ref : `${chart.ref}`;
  const lines = values.split('\n').filter(l => l.trim()).length;
  runTask({
    name: `Install ${name} on ${conn.name}`,
    ext: HELM_ID,
    steps: [
      {
        label: `Pulling ${chart.name}-${chart.version}`,
        ms: 1200,
        log: [`helm install ${name} ${source} --version ${chart.version} -n ${namespace} --create-namespace -f values.yaml`, `values.yaml: ${plural(lines, 'line')}`],
      },
      { label: `Creating resources in namespace ${namespace}`, ms: 1500, log: [`NAME: ${name}`, `NAMESPACE: ${namespace}`, 'STATUS: pending-install'] },
      { label: 'Waiting for pods to be ready', ms: 1800, log: ['STATUS: deployed', `REVISION: ${revision}`] },
    ],
    action: { label: 'Open release', href: `/c/${conn.id}/helm-releases?release=${encodeURIComponent(`${namespace}/${name}`)}` },
    onDone: () => {
      const e = store(conn.id).find(r => r.name === name && r.namespace === namespace && r.revision === revision);
      if (e) {
        e.status = 'deployed';
        e.description = 'Install complete';
        e.updated = helmTime(Date.now());
      }
    },
  });
}
