/**
 * podman-desktop.services (proposed, O10) – the local services catalog.
 * Generalises ext-postgresql: one gallery lists every `service` factory
 * contributed by any extension (Kafka, Apicurio, Keycloak, Data Grid, AMQ,
 * PostgreSQL, RHDH Local…) and groups the backing containers by
 * `io.podman-desktop.service` (P8, P10, P12).
 */
import { faLayerGroup, faPlus } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import { SERVICE_GROUP_LABEL, serviceFactory } from '../_appdev/services.ts';
import ServicesCatalog from './components/ServicesCatalog.svelte';

const ID = 'podman-desktop.services';

const extension: MockExtension = {
  id: ID,
  displayName: 'Services',
  publisher: 'podman-desktop',
  description: 'One-click local backing services (databases, brokers, identity, observability) that your apps and other extensions can discover.',
  version: '0.3.0',
  icon: 'icons/podman-desktop.svg',
  tags: ['appdev'],
  pApis: ['P8', 'P10', 'P12'],
  contributes: {
    tools: [
      {
        id: 'services',
        label: 'Services catalog',
        icon: faLayerGroup,
        description: 'Add a local service',
        component: ServicesCatalog,
      },
    ],
    groupers: [
      {
        id: 'service',
        label: SERVICE_GROUP_LABEL,
        typeName: 'Service',
        icon: 'icons/podman-desktop.svg',
      },
    ],
    connectionFactories: [
      serviceFactory({
        kind: 'valkey',
        providerId: 'valkey',
        providerName: 'Valkey',
        title: 'Valkey',
        icon: 'icons/valkey.png',
        vendor: 'Linux Foundation',
        description: 'In-memory key/value store (Redis-compatible). Health check: valkey-cli ping → PONG.',
        defaultName: 'valkey',
        images: [{ value: 'docker.io/valkey/valkey:9.1', label: 'docker.io/valkey/valkey:9.1' }],
        port: 6379,
        endpoint: port => `redis://localhost:${port}/0`,
        version: '9.1.2',
        capabilities: ['redis'],
        pullMB: 41,
        readyLog: ['Ready to accept connections tcp', 'valkey-cli ping → PONG'],
      }),
      serviceFactory({
        kind: 'otel-lgtm',
        providerId: 'otel-lgtm',
        providerName: 'Grafana LGTM',
        title: 'Grafana otel-lgtm',
        icon: 'icons/grafana.png',
        vendor: 'Grafana Labs',
        description: 'OpenTelemetry backend in one container: Grafana, Loki, Tempo, Mimir and Pyroscope. OTLP on 4317/4318.',
        defaultName: 'otel-lgtm',
        images: [{ value: 'docker.io/grafana/otel-lgtm:0.35.0', label: 'docker.io/grafana/otel-lgtm:0.35.0' }],
        port: 3000,
        endpoint: port => `http://localhost:${port}`,
        version: '0.35.0',
        capabilities: ['otlp'],
        pullMB: 612,
        readyLog: ['The OpenTelemetry collector and the Grafana LGTM stack are up and running.'],
        details: () => ({ 'OTLP gRPC': 'http://localhost:4317', 'OTLP HTTP': 'http://localhost:4318' }),
      }),
    ],
    commands: [
      { id: 'services.add', title: 'Add service', category: 'Services', icon: faPlus, run: (): void => navigate('/tools/services') },
    ],
  },
};

export default extension;
