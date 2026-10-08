/**
 * redhat.amq-broker (proposed) – Red Hat AMQ Broker 7.13 (ActiveMQ Artemis)
 * as a local service connection (P8, stopped by default) with Queues and
 * Addresses sections (P2) and a factory in the services catalog (P12).
 */
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import { isService, serviceConnection, serviceContainer, serviceFactory, type ServiceSpec } from '../_appdev/services.ts';
import AddressesSection from './components/AddressesSection.svelte';
import QueuesSection from './components/QueuesSection.svelte';
import { AMQ_CONN, AMQ_EXT, broker, ensureBroker, sampleBroker } from './data.ts';

const AMQ_IMAGE = 'registry.redhat.io/amq7/amq-broker-rhel9:7.13';

const SPEC: ServiceSpec = {
  kind: 'amq',
  providerId: 'amq-broker',
  providerName: 'Red Hat AMQ Broker',
  title: 'Red Hat AMQ Broker',
  description: 'ActiveMQ Artemis message broker for JMS, AMQP, STOMP and MQTT clients, with the web console on port 8161.',
  defaultName: 'amq-broker',
  images: [
    { value: AMQ_IMAGE, label: 'Red Hat AMQ Broker 7.13 (registry.redhat.io)' },
    { value: 'docker.io/apache/activemq-artemis:2.57.0', label: 'ActiveMQ Artemis 2.57.0 (docker.io/apache)' },
  ],
  port: 61616,
  endpoint: port => `tcp://localhost:${port}`,
  version: '7.13',
  capabilities: ['jms', 'amqp'],
  extraFields: [
    { id: 'user', label: 'Admin user', type: 'text', default: 'admin' },
    { id: 'addresses', label: 'Addresses to create', type: 'text', default: 'inventory.reservations', description: 'Comma-separated ANYCAST addresses with a durable queue each.' },
  ],
  pullMB: 310,
  readyLog: ['AMQ221020: Started EPOLL Acceptor at 0.0.0.0:61616 for protocols [CORE,MQTT,AMQP,STOMP,HORNETQ,OPENWIRE]', 'AMQ221007: Server is now active', 'AMQ241001: HTTP Server started at http://0.0.0.0:8161'],
  details: () => ({ AMQP: 'amqp://localhost:5672', Console: 'http://localhost:8161/console' }),
  sidecars: [],
  onCreated: (world, conn, v): void => {
    const b = sampleBroker();
    const names = String(v.addresses ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    b.addresses = [...names.map(name => ({ name, routingTypes: ['ANYCAST' as const] })), ...b.addresses.filter(a => a.name === 'DLQ' || a.name === 'ExpiryQueue')];
    b.queues = [
      ...names.map(name => ({ name, address: name, routingType: 'ANYCAST' as const, durable: true, messageCount: 0, consumerCount: 0, deliveringCount: 0, messagesAdded: 0, messagesAcknowledged: 0, scheduledCount: 0, paused: false, messages: [] })),
      ...b.queues.filter(q => q.name === 'ExpiryQueue'),
      { ...b.queues.find(q => q.name === 'DLQ')!, messageCount: 0, messagesAdded: 0, messages: [] },
    ];
    world.ext[AMQ_EXT] ??= {};
    world.ext[AMQ_EXT][conn.id] = b;
  },
};

const extension: MockExtension = {
  id: AMQ_EXT,
  displayName: 'Red Hat AMQ Broker',
  publisher: 'redhat',
  description: 'Run a local AMQ Broker / ActiveMQ Artemis, inspect addresses and queues, and send or browse test messages for JMS apps.',
  version: '0.2.0',
  icon: 'icons/redhat.amq-broker.svg',
  dependsOn: ['podman-desktop.services'],
  tags: ['appdev'],
  pApis: ['P2', 'P8', 'P12', 'P15'],
  contributes: {
    connections: [
      serviceConnection(SPEC, AMQ_CONN, 61616, 'stopped', {
        Image: AMQ_IMAGE,
        AMQP: 'amqp://localhost:5672',
        Console: 'http://localhost:8161/console',
        Broker: 'ActiveMQ Artemis 2.40.0.redhat-00002',
      }),
    ],
    connectionFactories: [serviceFactory(SPEC)],
    navSections: [
      {
        id: 'queues',
        label: 'Queues',
        when: conn => isService(conn, 'amq'),
        component: QueuesSection,
        counter: (_w, conn) => (conn.status === 'started' ? broker(conn.id).queues.length : undefined),
        order: 1,
      },
      {
        id: 'addresses',
        label: 'Addresses',
        when: conn => isService(conn, 'amq'),
        component: AddressesSection,
        counter: (_w, conn) => (conn.status === 'started' ? broker(conn.id).addresses.length : undefined),
        order: 2,
      },
    ],
    commands: [{ id: 'amq.dlq', title: 'Browse dead-letter queue (DLQ)', category: 'AMQ Broker', icon: faEnvelope, run: (): void => navigate(`/c/${AMQ_CONN}/queues?queue=DLQ`) }],
  },
  seed(world): void {
    world.containers.push(
      serviceContainer(AMQ_CONN, 'amq', {
        name: AMQ_CONN,
        image: AMQ_IMAGE,
        ports: [61616, 5672, 8161],
        state: 'EXITED',
        env: ['AMQ_USER=admin', 'AMQ_PASSWORD=********', 'AMQ_ROLE=admin', 'AMQ_NAME=broker'],
        logs: ['AMQ221007: Server is now active', 'AMQ221002: Apache ActiveMQ Artemis Message Broker version 2.40.0.redhat-00002 [0.0.0.0] stopped, uptime 2 hours 14 minutes'],
      }),
    );
    ensureBroker(AMQ_CONN);
  },
};

export default extension;
