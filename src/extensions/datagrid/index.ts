/**
 * redhat.datagrid (proposed) – Red Hat Data Grid 8.6 (Infinispan 15.2) as a
 * local service connection (P8, stopped by default) with a Caches section
 * (P2) and a factory in the services catalog (P12).
 */
import { faDatabase } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import { isService, serviceConnection, serviceContainer, serviceFactory, type ServiceSpec } from '../_appdev/services.ts';
import CachesSection from './components/CachesSection.svelte';
import { DG_CONN, DG_EXT, ensureGrid, grid, sampleServer } from './data.ts';

const DG_IMAGE = 'registry.redhat.io/datagrid/datagrid-8-rhel9:1.6';

const SPEC: ServiceSpec = {
  kind: 'datagrid',
  providerId: 'datagrid',
  providerName: 'Red Hat Data Grid',
  title: 'Red Hat Data Grid',
  description: 'Distributed in-memory cache (Infinispan). Hot Rod, REST and the console on a single port.',
  defaultName: 'datagrid',
  images: [
    { value: DG_IMAGE, label: 'Red Hat Data Grid 8.6 (registry.redhat.io)' },
    { value: 'quay.io/infinispan/server:15.2', label: 'Infinispan 15.2 (quay.io/infinispan/server)' },
  ],
  port: 11222,
  endpoint: port => `hotrod://localhost:${port}`,
  version: '8.6',
  capabilities: ['hotrod', 'cache'],
  extraFields: [{ id: 'user', label: 'Admin user', type: 'text', default: 'admin', description: 'Created on first start (USER / PASS); the password is generated and kept in secret storage.' }],
  pullMB: 420,
  readyLog: ['ISPN080004: Connector SinglePort (default) listening on 0.0.0.0:11222', "ISPN080001: Infinispan Server 15.2.4.Final started in 4512ms"],
  details: v => ({ Server: 'Infinispan 15.2.4.Final', Console: `http://localhost:${String(v.port)}/console/`, 'Admin user': String(v.user) }),
  onCreated: (world, conn): void => {
    const s = sampleServer();
    s.caches = s.caches.filter(c => c.internal);
    world.ext[DG_EXT] ??= {};
    world.ext[DG_EXT][conn.id] = s;
  },
};

const extension: MockExtension = {
  id: DG_EXT,
  displayName: 'Red Hat Data Grid',
  publisher: 'redhat',
  category: 'Application development',
  description: 'Run a local Data Grid / Infinispan server, browse caches and their statistics, and wire it into apps that use a remote cache.',
  version: '0.2.0',
  icon: 'icons/redhat.datagrid.png',
  dependsOn: ['podman-desktop.services'],
  tags: ['appdev'],
  pApis: ['P2', 'P8', 'P12', 'P15'],
  contributes: {
    connections: [
      serviceConnection(SPEC, DG_CONN, 11222, 'stopped', {
        Image: DG_IMAGE,
        Server: 'Infinispan 15.2.4.Final',
        Console: 'http://localhost:11222/console/',
        'Used by': 'inventory-service (hotrod-client.properties)',
      }),
    ],
    connectionFactories: [serviceFactory(SPEC)],
    navSections: [
      {
        id: 'caches',
        label: 'Caches',
        when: conn => isService(conn, 'datagrid'),
        component: CachesSection,
        counter: (_w, conn) => (conn.status === 'started' ? grid(conn.id).caches.filter(c => !c.internal).length : undefined),
        order: 1,
      },
    ],
    commands: [{ id: 'datagrid.caches', title: 'Show Data Grid caches', category: 'Data Grid', icon: faDatabase, run: (): void => navigate(`/c/${DG_CONN}/caches`) }],
  },
  seed(world): void {
    world.containers.push(
      serviceContainer(DG_CONN, 'datagrid', {
        name: DG_CONN,
        image: DG_IMAGE,
        ports: [11222],
        state: 'EXITED',
        env: ['USER=admin', 'PASS=********', 'JAVA_OPTIONS=-Xmx512m'],
        logs: ["ISPN080001: Infinispan Server 15.2.4.Final started in 4512ms", 'ISPN080002: Infinispan Server stopping', 'ISPN080003: Infinispan Server stopped'],
      }),
    );
    ensureGrid(DG_CONN);
  },
};

export default extension;
