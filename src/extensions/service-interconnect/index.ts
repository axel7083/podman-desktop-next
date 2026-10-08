/**
 * redhat.service-interconnect (proposed) – Skupper v2: the Podman connection
 * becomes a Skupper site (system mode) linked to OpenShift clusters. "Service
 * network" section under Podman engines and under clusters serving
 * sites.skupper.io (P2), "Expose to cluster" on containers (P14) creating a
 * local Connector and a remote Listener (P4, P11).
 */
import { faLink, faNetworkWired } from '@fortawesome/free-solid-svg-icons';

import { mkContainer } from '#lib/ext/helpers.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView, MockExtension, ResourceContext } from '#lib/ext/types.ts';
import { confirm } from '#lib/confirm.svelte.ts';
import { addKube, type Container, kube, runTask, toast, world } from '#lib/world.svelte.ts';

import { linkTarget, linkToCluster } from './actions.ts';
import ServiceNetwork from './components/ServiceNetwork.svelte';
import { connector, hasCrd, linkedTo, listener, site, SKUPPER_ID, SKUPPER_KINDS } from './data.ts';

const PODMAN = 'podman-machine-default';

function routingKeyOf(c: Container): string {
  return c.name === 'postgres' ? 'payments-db' : c.name;
}

function expose(ctx: ResourceContext): void {
  const c = ctx.resource as Container;
  const remote = linkedTo(ctx.conn.id);
  const target = linkTarget();
  if (!remote || !target) {
    toast({ type: 'warning', title: `${ctx.conn.name} is not linked to a cluster`, body: 'Link the laptop site to ocp-dev from the Service network page first.', action: { label: 'Open service network', href: `/c/${ctx.conn.id}/service-network` } });
    return;
  }
  const key = routingKeyOf(c);
  const port = c.ports[0]?.container ?? 8080;
  confirm({
    title: 'Expose to cluster?',
    message: `Create Connector ${key} → ${c.name}:${port} on laptop-podman and Listener ${key}:${port} in namespace payments on ${target.name}. Workloads on ${target.name} reach the container at ${key}.payments.svc:${port}.`,
    buttonLabel: 'Expose',
    variant: 'primary',
  })
    .then(ok => {
      if (!ok) return;
      runTask({
        name: `Expose ${c.name} to ${target.name}`,
        ext: SKUPPER_ID,
        steps: [
          { label: `skupper connector create ${key} ${port} --host ${c.name}`, ms: 700 },
          { label: `Creating Listener ${key} on ${target.name}`, ms: 900, log: [`listener.skupper.io/${key} created`, `service/${key} created`] },
          { label: 'Waiting for hasMatchingConnector', ms: 1000 },
        ],
        action: { label: `Open ${target.name} service network`, href: `/c/${target.id}/service-network` },
        onDone: () => {
          addKube(ctx.conn.id, [connector(key, 'default', key, { host: c.name }, port, true)]);
          addKube(target.id, [
            listener(key, 'payments', key, key, port, true),
            kube('v1', 'Service', key, 'payments', { type: 'ClusterIP', clusterIP: '172.30.130.55', ports: `${port}/TCP` }, {}, { m: 0 }),
          ]);
        },
      });
    })
    .catch(console.error);
}

const isPodmanEngine = (conn: ConnectionView): boolean => conn.kind === 'engine' && conn.engineType === 'podman' && conn.id === PODMAN;

const extension: MockExtension = {
  id: SKUPPER_ID,
  displayName: 'Service Interconnect',
  publisher: 'redhat',
  description: 'Turn a Podman connection into a Skupper site and link local containers to services on your OpenShift clusters.',
  version: '0.1.0',
  icon: 'icons/redhat.service-interconnect.png',
  tags: ['openshift'],
  pApis: ['P2', 'P4', 'P11', 'P14'],
  contributes: {
    navSections: [
      {
        id: 'service-network',
        label: 'Service network',
        icon: 'icons/redhat.service-interconnect.png',
        when: conn => conn.status === 'started' && (isPodmanEngine(conn) || (conn.kind === 'kubernetes' && hasCrd(conn.id, 'sites.skupper.io'))),
        component: ServiceNetwork,
        counter: (w, conn) => (w.kube[conn.id] ?? []).filter(o => SKUPPER_KINDS.includes(o.kind) && o.kind !== 'AccessGrant').length,
        order: 40,
      },
    ],
    menus: [
      {
        id: 'skupper-expose',
        label: 'Expose to cluster',
        icon: faNetworkWired,
        target: 'container',
        placement: 'kebab',
        when: ctx => isPodmanEngine(ctx.conn) && (ctx.resource as Container).ports.length > 0 && !(ctx.resource as Container).name.endsWith('skupper-router'),
        run: expose,
      },
    ],
    commands: [
      {
        id: 'skupper.link',
        title: 'Link Podman site to cluster',
        category: 'Service Interconnect',
        icon: faLink,
        run: (): void => {
          const local = registry.getConnection(PODMAN);
          if (local) linkToCluster(local);
        },
      },
    ],
  },
  seed(w): void {
    w.containers.push(
      mkContainer(PODMAN, {
        name: 'postgres',
        image: 'registry.redhat.io/rhel9/postgresql-16:1-48',
        ports: [[5432, 5432]],
        env: ['POSTGRESQL_USER=ledger', 'POSTGRESQL_DATABASE=ledger'],
        upM: 140,
        logs: ['Starting server...', '2026-10-08 07:40:12.411 UTC [1] LOG:  database system is ready to accept connections'],
      }),
      mkContainer(PODMAN, { name: 'default-skupper-router', image: 'registry.redhat.io/service-interconnect/skupper-router-rhel9:3.3.0', labels: { 'application': 'skupper-router' }, upM: 140 }),
    );
    addKube(PODMAN, [site('laptop-podman', 'default', 'podman', 'none', 1)]);
    addKube('ocp-dev', [
      site('ocp-dev-payments', 'payments', 'kubernetes', 'route', 2),
      connector('ledger-api', 'payments', 'ledger-api', { selector: 'app=ledger-api' }, 8080, false),
    ]);
  },
};

export default extension;
