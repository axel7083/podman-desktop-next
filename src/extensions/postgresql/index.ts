/**
 * podman-desktop.postgresql – the existing PostgreSQL extension (ext-postgresql
 * 0.6.0-next), re-expressed with the services-catalog pattern: a `service`
 * factory (P12), the `acme-postgres` service connection (P8) and a Databases
 * section (P2). Debezium builds on its containers.
 */
import type { MockExtension } from '#lib/ext/types.ts';

import { isService, serviceConnection, serviceContainer, serviceFactory, type ServiceSpec } from '../_appdev/services.ts';
import DatabasesSection from './components/DatabasesSection.svelte';
import { databases, ensureDatabases, PG_CONN, PG_EXT, sampleDatabases } from './data.ts';

const SPEC: ServiceSpec = {
  kind: 'postgresql',
  providerId: 'postgresql',
  providerName: 'PostgreSQL',
  title: 'PostgreSQL',
  description: 'PostgreSQL database with optional pgAdmin. Credentials are stored as container environment variables.',
  defaultName: 'postgres-dev',
  images: [
    { value: 'docker.io/library/postgres:18', label: 'PostgreSQL 18 (docker.io/library/postgres)' },
    { value: 'registry.redhat.io/rhel9/postgresql-16:9.8', label: 'PostgreSQL 16 on RHEL 9 (registry.redhat.io)' },
    { value: 'docker.io/pgvector/pgvector:pg18', label: 'PostgreSQL 18 + pgvector' },
  ],
  port: 5432,
  endpoint: port => `postgresql://localhost:${port}`,
  version: '18.0',
  capabilities: ['postgresql', 'jdbc'],
  extraFields: [
    { id: 'database', label: 'Database', type: 'text', default: 'app' },
    { id: 'user', label: 'User', type: 'text', default: 'app' },
    { id: 'pgadmin', label: 'Also start pgAdmin', type: 'checkbox', default: false },
  ],
  pullMB: 158,
  readyLog: ['database system is ready to accept connections'],
  details: v => ({ Database: String(v.database), User: String(v.user), JDBC: `jdbc:postgresql://localhost:${String(v.port)}/${String(v.database)}` }),
  onCreated: (_world, conn, v): void => ensureDatabases(conn.id, [{ name: String(v.database), owner: String(v.user), encoding: 'UTF8', tables: [] }]),
};

const extension: MockExtension = {
  id: PG_EXT,
  displayName: 'PostgreSQL',
  publisher: 'podman-desktop',
  description: 'Manage local PostgreSQL services for development.',
  version: '0.6.0-next',
  icon: 'icons/podman-desktop.postgresql.png',
  tags: ['appdev'],
  pApis: ['P2', 'P8', 'P12'],
  contributes: {
    connections: [
      serviceConnection(SPEC, PG_CONN, 5432, 'started', {
        Image: 'docker.io/library/postgres:18',
        Database: 'orders',
        User: 'app',
        JDBC: 'jdbc:postgresql://localhost:5432/orders',
      }),
    ],
    connectionFactories: [serviceFactory(SPEC)],
    navSections: [
      {
        id: 'databases',
        label: 'Databases',
        when: conn => isService(conn, 'postgresql'),
        component: DatabasesSection,
        counter: (_w, conn) => databases(conn.id).length,
      },
    ],
  },
  seed(world): void {
    world.containers.push(
      serviceContainer(PG_CONN, 'postgresql', {
        name: PG_CONN,
        image: 'docker.io/library/postgres:18',
        ports: [5432],
        env: ['POSTGRES_USER=app', 'POSTGRES_DB=orders', 'PGDATA=/var/lib/postgresql/data'],
        command: 'postgres',
        upM: 190,
        logs: ['LOG:  database system is ready to accept connections'],
      }),
    );
    ensureDatabases(PG_CONN, sampleDatabases());
  },
};

export default extension;
