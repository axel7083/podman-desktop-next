/**
 * redhat.streams-kafka (proposed) – Streams for Apache Kafka 3.2 (Kafka 4.2,
 * KRaft) as a local service connection (P8) with Topics / Consumer groups
 * sections (P2), an embedded StreamsHub Console tab (P14) and a factory in
 * the services catalog (P12).
 */
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import { isService, serviceConnection, serviceContainer, serviceFactory, type ServiceSpec } from '../_appdev/services.ts';
import ConsumerGroupsSection from './components/ConsumerGroupsSection.svelte';
import KafkaCard from './components/KafkaCard.svelte';
import KafkaConsole from './components/KafkaConsole.svelte';
import TopicsSection from './components/TopicsSection.svelte';
import { cluster, ensureCluster, KAFKA_CONN, KAFKA_EXT, sampleCluster } from './data.ts';

const SPEC: ServiceSpec = {
  kind: 'kafka',
  providerId: 'streams-kafka',
  providerName: 'Kafka',
  title: 'Streams for Apache Kafka',
  description: 'Single-node KRaft Kafka 4.2 with the StreamsHub Console. Browse topics, records and consumer-group lag.',
  defaultName: 'kafka-dev',
  images: [
    { value: 'registry.redhat.io/amq-streams/kafka-42-rhel9:3.2.0', label: 'Streams for Apache Kafka 3.2 (registry.redhat.io)' },
    { value: 'docker.io/apache/kafka:4.2.0', label: 'Apache Kafka 4.2.0 (docker.io/apache/kafka)' },
    { value: 'docker.io/apache/kafka-native:4.2.0', label: 'Apache Kafka 4.2.0 native (docker.io/apache/kafka-native)' },
  ],
  port: 9092,
  endpoint: port => `localhost:${port}`,
  version: '4.2.0',
  capabilities: ['kafka'],
  extraFields: [
    { id: 'topics', label: 'Topics to create', type: 'text', default: 'orders.created,payments', description: 'Comma-separated, 3 partitions each.' },
    { id: 'console', label: 'Also start the StreamsHub Console (port 3000)', type: 'checkbox', default: true },
  ],
  pullMB: 410,
  readyLog: ['[KafkaRaftServer nodeId=1] Kafka Server started', 'Created topic orders.created.', 'Created topic payments.'],
  details: v => ({ 'Cluster ID': 'Xk2PZ0aQRi6bJ1pWm3tQvA', Console: v.console ? 'http://localhost:3000' : 'disabled' }),
  sidecars: [{ suffix: 'console', image: 'quay.io/streamshub/console-ui:0.14.1', port: 3000 }],
  onCreated: (world, conn, v): void => {
    const c = sampleCluster('Xk2PZ0aQRi6bJ1pWm3tQvA');
    const names = String(v.topics ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    c.topics = [
      ...names.map((name, i) => ({ name, topicId: `T${i}x${conn.id}`.padEnd(22, 'A'), partitionCount: 3, replicationFactor: 1, configs: { 'cleanup.policy': 'delete' }, messages: 0, records: [] })),
      c.topics.find(t => t.internal)!,
    ];
    c.groups = [];
    world.ext[KAFKA_EXT] ??= {};
    world.ext[KAFKA_EXT][conn.id] = c;
  },
};

const extension: MockExtension = {
  id: KAFKA_EXT,
  displayName: 'Streams for Apache Kafka',
  publisher: 'redhat',
  category: 'Application development',
  description: 'Run a single-node KRaft Kafka locally, browse topics, records, consumer groups and lag (StreamsHub Console).',
  version: '0.4.0',
  icon: 'icons/redhat.streams-kafka.svg',
  dependsOn: ['podman-desktop.services'],
  tags: ['appdev'],
  pApis: ['P2', 'P8', 'P12', 'P14', 'P17'],
  contributes: {
    connections: [
      serviceConnection(SPEC, KAFKA_CONN, 9092, 'started', {
        Image: 'registry.redhat.io/amq-streams/kafka-42-rhel9:3.2.0',
        Mode: 'KRaft (broker, controller)',
        'Cluster ID': 'q1Sh-9_ISia_zwGINzRvyQ',
        Console: 'http://localhost:3000',
      }),
    ],
    connectionFactories: [{ ...serviceFactory(SPEC), label: 'Create Kafka cluster' }],
    navSections: [
      {
        id: 'topics',
        label: 'Topics',
        when: conn => isService(conn, 'kafka'),
        component: TopicsSection,
        counter: (_w, conn) => cluster(conn.id).topics.filter(t => !t.internal).length,
        order: 1,
      },
      {
        id: 'consumer-groups',
        label: 'Groups',
        when: conn => isService(conn, 'kafka'),
        component: ConsumerGroupsSection,
        counter: (_w, conn) => cluster(conn.id).groups.length,
        order: 2,
      },
    ],
    tabs: [{ id: 'console', label: 'Console', target: 'connection', when: ctx => isService(ctx.conn, 'kafka'), component: KafkaConsole }],
    dashboardCards: [{ id: 'kafka-lag', title: 'Kafka consumer lag', component: KafkaCard }],
    commands: [
      {
        id: 'kafka.groups',
        title: 'Show consumer-group lag',
        category: 'Kafka',
        icon: faRotateLeft,
        run: (): void => navigate(`/c/${KAFKA_CONN}/consumer-groups`),
      },
    ],
  },
  seed(world): void {
    world.containers.push(
      serviceContainer(KAFKA_CONN, 'kafka', {
        name: KAFKA_CONN,
        image: 'registry.redhat.io/amq-streams/kafka-42-rhel9:3.2.0',
        ports: [9092, 9093],
        env: ['KAFKA_NODE_ID=1', 'KAFKA_PROCESS_ROLES=broker,controller', 'KAFKA_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093', 'KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092', 'CLUSTER_ID=q1Sh-9_ISia_zwGINzRvyQ'],
        upM: 185,
        group: true,
        logs: ['[KafkaRaftServer nodeId=1] Kafka Server started (kafka.server.KafkaRaftServer)', '[GroupCoordinator id=1] Stabilized group inventory-projector generation 4'],
      }),
      serviceContainer(KAFKA_CONN, 'kafka', { name: `${KAFKA_CONN}-console`, image: 'quay.io/streamshub/console-ui:0.14.1', ports: [3000], upM: 184, group: true }),
    );
    ensureCluster(KAFKA_CONN);
  },
};

export default extension;
