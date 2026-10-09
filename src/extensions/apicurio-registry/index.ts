/**
 * redhat.apicurio-registry (proposed) – Apicurio Registry 3 as a local
 * service connection (P8): Artifacts and Rules sections (P2), plus a "Schemas"
 * section contributed under every Kafka service connection, resolving the
 * `<topic>-value` artifacts (TopicIdStrategy).
 */
import type { MockExtension } from '#lib/ext/types.ts';

import { isService, serviceConnection, serviceContainer, serviceFactory, type ServiceSpec } from '../_appdev/services.ts';
import ArtifactsSection from './components/ArtifactsSection.svelte';
import RulesSection from './components/RulesSection.svelte';
import SchemasSection from './components/SchemasSection.svelte';
import { cluster } from '../streams-kafka/data.ts';
import { APICURIO_CONN, APICURIO_EXT, ensureRegistry, registryData, sampleRegistry, schemaCount } from './data.ts';

const SPEC: ServiceSpec = {
  kind: 'apicurio',
  providerId: 'apicurio-registry',
  providerName: 'Apicurio Registry',
  title: 'Apicurio Registry',
  description: 'Schema and API registry (Avro, Protobuf, JSON Schema, OpenAPI, AsyncAPI) used by Kafka SerDes. Includes the registry UI.',
  defaultName: 'registry-dev',
  images: [
    { value: 'quay.io/apicurio/apicurio-registry:3.3.3', label: 'Apicurio Registry 3.3.3 (quay.io)' },
    { value: 'registry.redhat.io/apicurio/apicurio-registry-rhel9:3.1', label: 'Red Hat build of Apicurio Registry 3.1' },
  ],
  port: 8080,
  endpoint: port => `http://localhost:${port}/apis/registry/v3`,
  version: '3.3.3',
  capabilities: ['schema-registry'],
  extraFields: [
    {
      id: 'storage',
      label: 'Storage',
      type: 'select',
      default: 'mem',
      options: [
        { value: 'mem', label: 'In-memory (H2)' },
        { value: 'sql', label: 'PostgreSQL (acme-postgres)' },
        { value: 'kafkasql', label: 'KafkaSQL (acme-kafka)' },
      ],
    },
  ],
  pullMB: 386,
  readyLog: ['Apicurio Registry 3.3.3 started in 4.112s', 'GET /apis/registry/v3/system/info → 200'],
  details: v => ({ Storage: v.storage === 'sql' ? 'APICURIO_STORAGE_KIND=sql (postgresql)' : v.storage === 'kafkasql' ? 'APICURIO_STORAGE_KIND=kafkasql' : 'in-memory (H2)', UI: 'http://localhost:8888' }),
  sidecars: [{ suffix: 'ui', image: 'quay.io/apicurio/apicurio-registry-ui:3.3.3', port: 8888 }],
  onCreated: (_world, conn): void => {
    ensureRegistry(conn.id, { artifacts: [], rules: [{ ruleType: 'COMPATIBILITY', config: 'BACKWARD', scope: 'global' }] });
  },
};

const extension: MockExtension = {
  id: APICURIO_EXT,
  displayName: 'Apicurio Registry',
  publisher: 'redhat',
  category: 'Application development',
  description: 'Run a local schema/API registry; browse groups, artifacts, versions and rules used by Kafka SerDes.',
  version: '0.2.0',
  icon: 'icons/redhat.apicurio-registry.svg',
  dependsOn: ['podman-desktop.services'],
  tags: ['appdev'],
  pApis: ['P2', 'P8', 'P12'],
  contributes: {
    connections: [
      serviceConnection(SPEC, APICURIO_CONN, 8080, 'started', {
        Image: 'quay.io/apicurio/apicurio-registry:3.3.3',
        Storage: 'in-memory (H2)',
        UI: 'http://localhost:8888',
        'Confluent compat API': 'http://localhost:8080/apis/ccompat/v7',
      }),
    ],
    connectionFactories: [serviceFactory(SPEC)],
    navSections: [
      {
        id: 'artifacts',
        label: 'Artifacts',
        when: conn => isService(conn, 'apicurio'),
        component: ArtifactsSection,
        counter: (_w, conn) => registryData(conn.id).artifacts.length,
        order: 1,
      },
      { id: 'rules', label: 'Rules', when: conn => isService(conn, 'apicurio'), component: RulesSection, order: 2 },
      // cross-extension section: shown under Kafka connections
      {
        id: 'schemas',
        label: 'Schemas',
        when: conn => isService(conn, 'kafka'),
        component: SchemasSection,
        counter: (_w, conn) => schemaCount(cluster(conn.id).topics.filter(t => !t.internal).map(t => t.name)),
        order: 10,
      },
    ],
  },
  seed(world): void {
    world.containers.push(
      serviceContainer(APICURIO_CONN, 'apicurio', {
        name: APICURIO_CONN,
        image: 'quay.io/apicurio/apicurio-registry:3.3.3',
        ports: [8080],
        env: ['APICURIO_STORAGE_KIND=sql', 'APICURIO_STORAGE_SQL_KIND=h2'],
        upM: 183,
        group: true,
      }),
      serviceContainer(APICURIO_CONN, 'apicurio', {
        name: `${APICURIO_CONN}-ui`,
        image: 'quay.io/apicurio/apicurio-registry-ui:3.3.3',
        ports: [[8888, 8080]],
        env: ['REGISTRY_API_URL=http://localhost:8080/apis/registry/v3'],
        upM: 183,
        group: true,
      }),
    );
    ensureRegistry(APICURIO_CONN, sampleRegistry());
  },
};

export default extension;
