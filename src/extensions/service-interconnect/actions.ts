/** Link the Podman site to the first connected cluster serving sites.skupper.io (AccessGrant → AccessToken → Link). */
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import { addKube, runTask, toast, world } from '#lib/world.svelte.ts';

import { grant, hasCrd, link, SKUPPER_ID } from './data.ts';

export function linkTarget(): ConnectionView | undefined {
  return registry.activeConnections.find(c => c.kind === 'kubernetes' && c.status === 'started' && hasCrd(c.id, 'sites.skupper.io'));
}

export function linkToCluster(local: ConnectionView): void {
  const target = linkTarget();
  if (!target) {
    toast({ type: 'warning', title: 'No cluster with Service Interconnect', body: 'Connect to ocp-dev first: its payments namespace runs a Skupper site.', action: { label: 'Open ocp-dev', href: '/c/ocp-dev' } });
    return;
  }
  runTask({
    name: `Link ${local.name} to ${target.name}`,
    ext: SKUPPER_ID,
    steps: [
      { label: `Creating AccessGrant grant-laptop-jdoe on ${target.name} (expires in 15m)`, ms: 900, log: ['$ skupper token issue --expiration-window 15m -n payments'] },
      { label: 'Redeeming AccessToken on laptop-podman', ms: 900, log: ['$ skupper system apply -f token.yaml', '$ skupper system reload'] },
      { label: 'Waiting for Link to be Ready', ms: 1400, log: ['Link link-ocp-dev is Ready (remote site ocp-dev-payments)'] },
    ],
    action: { label: 'Open service network', href: `/c/${local.id}/service-network` },
    onDone: () => {
      addKube(target.id, [grant('grant-laptop-jdoe', 'payments')]);
      addKube(local.id, [link('link-ocp-dev', 'default', 'ocp-dev-payments')]);
      for (const id of [local.id, target.id]) {
        for (const o of world.kube[id] ?? []) if (o.kind === 'Site') o.status = { ...o.status, sitesInNetwork: 3 };
      }
    },
  });
}

