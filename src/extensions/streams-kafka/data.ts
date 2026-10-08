/**
 * Mock Kafka Admin API data (shapes from `kafka-topics.sh --describe`,
 * `kafka-consumer-groups.sh --describe` and the StreamsHub Console API).
 */
import { extData, world } from '#lib/world.svelte.ts';

export const KAFKA_EXT = 'redhat.streams-kafka';
export const KAFKA_CONN = 'acme-kafka';

export interface KafkaRecord {
  partition: number;
  offset: number;
  timestamp: string;
  key: string;
  value: string;
  headers?: Record<string, string>;
}

export interface Topic {
  name: string;
  topicId: string;
  partitionCount: number;
  replicationFactor: number;
  configs: Record<string, string>;
  messages: number;
  internal?: boolean;
  /** Who created it (shown as a hint): e.g. "Debezium acme-orders-cdc". */
  createdBy?: string;
  records?: KafkaRecord[];
}

export type GroupState = 'Stable' | 'PreparingRebalance' | 'CompletingRebalance' | 'Empty' | 'Dead' | 'Assigning' | 'Reconciling';

export interface GroupOffset {
  topic: string;
  partition: number;
  currentOffset: number;
  logEndOffset: number;
  consumerId?: string;
  host?: string;
}

export interface ConsumerGroup {
  groupId: string;
  state: GroupState;
  protocol: 'consumer' | 'classic';
  members: number;
  offsets: GroupOffset[];
}

export interface KafkaCluster {
  clusterId: string;
  kafkaVersion: string;
  topics: Topic[];
  groups: ConsumerGroup[];
}

export function lagOf(g: ConsumerGroup): number {
  return g.offsets.reduce((sum, o) => sum + (o.logEndOffset - o.currentOffset), 0);
}

const ORDER_VALUE = (id: number, total: number, status = 'CREATED'): string =>
  JSON.stringify({ orderId: `ord-20261008-${String(id).padStart(4, '0')}`, customerId: `c-${3300 + (id % 97)}`, status, totalCents: total, currency: 'EUR', couponCode: id % 3 === 0 ? 'AUTUMN10' : null });

function orderRecords(): KafkaRecord[] {
  return Array.from({ length: 8 }, (_, i) => ({
    partition: i % 3,
    offset: 6150 - i,
    timestamp: new Date(Date.now() - i * 41_000).toISOString(),
    key: `ord-20261008-${String(193 - i).padStart(4, '0')}`,
    value: ORDER_VALUE(193 - i, 4999 + i * 1250),
    headers: { 'apicurio.value.globalId': '27', 'apicurio.value.encoding': 'BINARY' },
  }));
}

export function sampleCluster(clusterId = 'q1Sh-9_ISia_zwGINzRvyQ'): KafkaCluster {
  return {
    clusterId,
    kafkaVersion: '4.2.0',
    topics: [
      {
        name: 'orders.created',
        topicId: 'm2Z0r8xvQ1ugP6h3lK9T0A',
        partitionCount: 3,
        replicationFactor: 1,
        configs: { 'cleanup.policy': 'delete', 'retention.ms': '604800000', 'min.insync.replicas': '1' },
        messages: 18452,
        records: orderRecords(),
      },
      {
        name: 'payments',
        topicId: '3HcVt5oYRxK8wLj2nB7aQe',
        partitionCount: 3,
        replicationFactor: 1,
        configs: { 'cleanup.policy': 'compact,delete', 'retention.ms': '259200000' },
        messages: 17630,
        records: Array.from({ length: 5 }, (_, i) => ({
          partition: i % 3,
          offset: 5879 - i,
          timestamp: new Date(Date.now() - i * 63_000).toISOString(),
          key: `pay-${88120 - i}`,
          value: JSON.stringify({ paymentId: `pay-${88120 - i}`, orderId: `ord-20261008-${String(190 - i).padStart(4, '0')}`, status: i === 1 ? 'DECLINED' : 'CAPTURED', amountCents: 4999 + i * 300 }),
        })),
      },
      {
        name: 'inventory.reservations',
        topicId: 'Qx1v9TcYRZ2kWm4nB0aPfe',
        partitionCount: 1,
        replicationFactor: 1,
        configs: { 'cleanup.policy': 'delete', 'retention.ms': '86400000' },
        messages: 2210,
      },
      { name: '__consumer_offsets', topicId: 'AAAAAAAAAAAAAAAAAAAAAQ', partitionCount: 50, replicationFactor: 1, configs: { 'cleanup.policy': 'compact' }, messages: 45210, internal: true },
    ],
    groups: [
      {
        groupId: 'inventory-projector',
        state: 'Stable',
        protocol: 'consumer',
        members: 1,
        offsets: [
          { topic: 'orders.created', partition: 0, currentOffset: 6150, logEndOffset: 6150, consumerId: 'inventory-projector-1-7f3c', host: '/10.89.0.12' },
          { topic: 'orders.created', partition: 1, currentOffset: 6101, logEndOffset: 6143, consumerId: 'inventory-projector-1-7f3c', host: '/10.89.0.12' },
          { topic: 'orders.created', partition: 2, currentOffset: 6159, logEndOffset: 6159, consumerId: 'inventory-projector-1-7f3c', host: '/10.89.0.12' },
        ],
      },
      {
        groupId: 'acme-orders-payments',
        state: 'Stable',
        protocol: 'consumer',
        members: 1,
        offsets: [
          { topic: 'payments', partition: 0, currentOffset: 5880, logEndOffset: 5880, consumerId: 'acme-orders-0-11ab', host: '/10.89.0.9' },
          { topic: 'payments', partition: 1, currentOffset: 5871, logEndOffset: 5871, consumerId: 'acme-orders-0-11ab', host: '/10.89.0.9' },
          { topic: 'payments', partition: 2, currentOffset: 5879, logEndOffset: 5879, consumerId: 'acme-orders-0-11ab', host: '/10.89.0.9' },
        ],
      },
      {
        groupId: 'inventory-service',
        state: 'Empty',
        protocol: 'classic',
        members: 0,
        offsets: [{ topic: 'inventory.reservations', partition: 0, currentOffset: 1898, logEndOffset: 2210 }],
      },
    ],
  };
}

const EMPTY: KafkaCluster = { clusterId: '', kafkaVersion: '4.2.0', topics: [], groups: [] };

/** Cluster data of a Kafka service connection (read-only: safe inside `$derived`). */
export function cluster(connId: string): KafkaCluster {
  return (world.ext[KAFKA_EXT]?.[connId] as KafkaCluster | undefined) ?? EMPTY;
}

/** Create the cluster data on seed (writes to the world). */
export function ensureCluster(connId: string): KafkaCluster {
  return extData<KafkaCluster>(KAFKA_EXT, connId, sampleCluster());
}

/** Used by other extensions (e.g. Debezium) through the extension dependency. */
export function addTopic(connId: string, topic: Topic): void {
  const c = ensureCluster(connId);
  if (!c.topics.some(t => t.name === topic.name)) c.topics.push(topic);
}

export function kafkaConnections(): string[] {
  return Object.keys(world.ext[KAFKA_EXT] ?? {});
}
