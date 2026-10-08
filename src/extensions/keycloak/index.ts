/**
 * redhat.keycloak (proposed) – Red Hat build of Keycloak 26.4 as a local
 * service connection (P8) with Realms / Clients / Users sections (P2) and a
 * factory in the services catalog (P12). Clients copy their OIDC settings as
 * Quarkus config; users get a decoded test token.
 */
import { faKey } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import { isService, serviceConnection, serviceContainer, serviceFactory, type ServiceSpec } from '../_appdev/services.ts';
import ClientsSection from './components/ClientsSection.svelte';
import RealmsSection from './components/RealmsSection.svelte';
import UsersSection from './components/UsersSection.svelte';
import { ensureServer, findRealm, KC_CONN, KC_EXT, sampleServer, server } from './data.ts';

const RHBK_IMAGE = 'registry.redhat.io/rhbk/keycloak-rhel9:26.4';

const SPEC: ServiceSpec = {
  kind: 'keycloak',
  providerId: 'keycloak',
  providerName: 'Keycloak',
  title: 'Red Hat build of Keycloak',
  description: 'Identity and access management for your apps: realms, OIDC clients, users and roles. Runs start-dev with realm import.',
  defaultName: 'keycloak',
  images: [
    { value: RHBK_IMAGE, label: 'Red Hat build of Keycloak 26.4 (registry.redhat.io)' },
    { value: 'quay.io/keycloak/keycloak:26.8.0', label: 'Keycloak 26.8.0 (quay.io/keycloak)' },
  ],
  port: 8180,
  endpoint: port => `http://localhost:${port}`,
  version: '26.4.15',
  capabilities: ['oidc'],
  extraFields: [
    {
      id: 'realmFile',
      label: 'Realm file to import',
      type: 'file',
      default: '~/dev/acme-orders/src/main/docker/acme-realm.json',
      description: 'Mounted in /opt/keycloak/data/import and imported with start-dev --import-realm (existing realms are skipped).',
    },
  ],
  pullMB: 470,
  readyLog: ["Realm 'acme' imported", 'Keycloak 26.4.15.redhat-00001 on JVM (powered by Quarkus 3.27.2) started in 9.8s. Listening on: http://0.0.0.0:8080. Management interface listening on http://0.0.0.0:9000.', 'GET /health/ready → 200 UP'],
  details: v => ({ 'Admin console': `http://localhost:${String(v.port)}/admin/master/console/`, 'Realm import': String(v.realmFile || 'none') }),
  onCreated: (world, conn, v): void => {
    world.ext[KC_EXT] ??= {};
    world.ext[KC_EXT][conn.id] = sampleServer(Boolean(v.realmFile));
  },
};

const extension: MockExtension = {
  id: KC_EXT,
  displayName: 'Red Hat build of Keycloak',
  publisher: 'redhat',
  description: 'Run a local Keycloak for development, import realms, and manage clients, users and roles for your apps.',
  version: '0.3.0',
  icon: 'icons/redhat.keycloak.svg',
  dependsOn: ['podman-desktop.services'],
  tags: ['appdev'],
  pApis: ['P2', 'P8', 'P12', 'P15', 'P17'],
  contributes: {
    connections: [
      serviceConnection(SPEC, KC_CONN, 8180, 'started', {
        Image: RHBK_IMAGE,
        'Admin console': 'http://localhost:8180/admin/master/console/',
        Database: 'dev-file (H2)',
        Management: 'http://localhost:9000/health/ready',
      }),
    ],
    connectionFactories: [serviceFactory(SPEC)],
    navSections: [
      {
        id: 'realms',
        label: 'Realms',
        when: conn => isService(conn, 'keycloak'),
        component: RealmsSection,
        counter: (_w, conn) => server(conn.id).realms.length,
        order: 1,
      },
      {
        id: 'clients',
        label: 'Clients',
        when: conn => isService(conn, 'keycloak'),
        component: ClientsSection,
        counter: (_w, conn) => findRealm(conn.id, 'acme')?.clients.filter(c => !c.builtin).length,
        order: 2,
      },
      {
        id: 'users',
        label: 'Users',
        when: conn => isService(conn, 'keycloak'),
        component: UsersSection,
        counter: (_w, conn) => findRealm(conn.id, 'acme')?.users.length,
        order: 3,
      },
    ],
    commands: [
      {
        id: 'keycloak.token',
        title: 'Get access token for user',
        category: 'Keycloak',
        icon: faKey,
        run: (): void => navigate(`/c/${KC_CONN}/users?realm=acme`),
      },
    ],
  },
  seed(world): void {
    world.containers.push(
      serviceContainer(KC_CONN, 'keycloak', {
        name: KC_CONN,
        image: RHBK_IMAGE,
        ports: [[8180, 8080], 9000],
        command: 'start-dev --import-realm',
        env: ['KC_BOOTSTRAP_ADMIN_USERNAME=admin', 'KC_BOOTSTRAP_ADMIN_PASSWORD=admin', 'KC_HEALTH_ENABLED=true', 'KC_METRICS_ENABLED=true'],
        upM: 142,
        logs: [
          "INFO  [org.keycloak.exportimport.util.ImportUtils] (main) Realm 'acme' imported",
          'INFO  [io.quarkus] (main) Keycloak 26.4.15.redhat-00001 on JVM (powered by Quarkus 3.27.2) started in 9.812s. Listening on: http://0.0.0.0:8080. Management interface listening on http://0.0.0.0:9000.',
          'INFO  [io.quarkus] (main) Profile dev activated.',
          'WARN  [org.keycloak.quarkus.runtime.cli.Picocli] (main) Running the server in development mode. DO NOT use this configuration in production.',
        ],
      }),
    );
    ensureServer(KC_CONN);
  },
};

export default extension;
