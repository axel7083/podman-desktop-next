/**
 * Mock ActiveMQ Artemis management data (shapes from `artemis queue stat`,
 * `listAddresses` and `browse()` over Jolokia).
 */
import { extData, world } from '#lib/world.svelte.ts';

export const AMQ_EXT = 'redhat.amq-broker';
export const AMQ_CONN = 'amq-broker';

export type RoutingType = 'ANYCAST' | 'MULTICAST';

export interface AmqMessage {
  messageID: number;
  address: string;
  durable: boolean;
  timestamp: string;
  priority: number;
  properties: Record<string, string | number>;
  body: string;
}

export interface Queue {
  name: string;
  address: string;
  routingType: RoutingType;
  durable: boolean;
  messageCount: number;
  consumerCount: number;
  deliveringCount: number;
  messagesAdded: number;
  messagesAcknowledged: number;
  scheduledCount: number;
  paused: boolean;
  /** Messages returned by `browse()` (head of the queue). */
  messages: AmqMessage[];
}

export interface Address {
  name: string;
  routingTypes: RoutingType[];
}

export interface Broker {
  name: string;
  version: string;
  acceptors: string[];
  addresses: Address[];
  queues: Queue[];
}

function dlqMessages(): AmqMessage[] {
  const skus = ['ACME-4471', 'ACME-1029', 'ACME-4471', 'ACME-7730'];
  return skus.map((sku, i) => ({
    messageID: 30812 + i * 3,
    address: 'DLQ',
    durable: true,
    timestamp: `2026-10-07T14:0${3 + i}:5${i}Z`,
    priority: 4,
    properties: {
      _AMQ_ORIG_ADDRESS: 'inventory.reservations',
      _AMQ_ORIG_QUEUE: 'inventory.reservations',
      _AMQ_ORIG_MESSAGE_ID: 30770 + i * 3,
      JMSXDeliveryCount: 10,
      _AMQ_ORIG_ROUTING_TYPE: 0,
    },
    body: JSON.stringify({ sku, qty: i + 1, orderId: `ord-20261007-0${193 + i}` }),
  }));
}

function reservationMessages(): AmqMessage[] {
  return Array.from({ length: 3 }, (_, i) => ({
    messageID: 31020 + i,
    address: 'inventory.reservations',
    durable: true,
    timestamp: new Date(Date.now() - (i + 1) * 9000).toISOString(),
    priority: 4,
    properties: { JMSXDeliveryCount: 1, __AMQ_CID: 'inventory-service-3f2a' },
    body: JSON.stringify({ sku: `ACME-${4471 + i * 13}`, qty: 1, orderId: `ord-20261008-0${190 + i}` }),
  }));
}

export function sampleBroker(): Broker {
  return {
    name: '0.0.0.0',
    version: '2.40.0.redhat-00002',
    acceptors: ['artemis:61616', 'amqp:5672', 'stomp:61613', 'mqtt:1883'],
    addresses: [
      { name: 'inventory.reservations', routingTypes: ['ANYCAST'] },
      { name: 'inventory.events', routingTypes: ['MULTICAST'] },
      { name: 'acme.orders.created', routingTypes: ['MULTICAST'] },
      { name: 'DLQ', routingTypes: ['ANYCAST'] },
      { name: 'ExpiryQueue', routingTypes: ['ANYCAST'] },
    ],
    queues: [
      { name: 'inventory.reservations', address: 'inventory.reservations', routingType: 'ANYCAST', durable: true, messageCount: 12, consumerCount: 3, deliveringCount: 3, messagesAdded: 18422, messagesAcknowledged: 18406, scheduledCount: 0, paused: false, messages: reservationMessages() },
      { name: 'inventory-service.audit', address: 'inventory.events', routingType: 'MULTICAST', durable: true, messageCount: 0, consumerCount: 1, deliveringCount: 0, messagesAdded: 5120, messagesAcknowledged: 5120, scheduledCount: 0, paused: false, messages: [] },
      { name: 'acme-orders.inventory-sync', address: 'inventory.events', routingType: 'MULTICAST', durable: true, messageCount: 241, consumerCount: 0, deliveringCount: 0, messagesAdded: 241, messagesAcknowledged: 0, scheduledCount: 0, paused: false, messages: [] },
      { name: 'acme.orders.created', address: 'acme.orders.created', routingType: 'MULTICAST', durable: false, messageCount: 0, consumerCount: 1, deliveringCount: 0, messagesAdded: 77, messagesAcknowledged: 77, scheduledCount: 0, paused: false, messages: [] },
      { name: 'DLQ', address: 'DLQ', routingType: 'ANYCAST', durable: true, messageCount: 4, consumerCount: 0, deliveringCount: 0, messagesAdded: 4, messagesAcknowledged: 0, scheduledCount: 0, paused: false, messages: dlqMessages() },
      { name: 'ExpiryQueue', address: 'ExpiryQueue', routingType: 'ANYCAST', durable: true, messageCount: 0, consumerCount: 0, deliveringCount: 0, messagesAdded: 0, messagesAcknowledged: 0, scheduledCount: 0, paused: false, messages: [] },
    ],
  };
}

const EMPTY: Broker = { name: '', version: '', acceptors: [], addresses: [], queues: [] };

/** Read-only accessor (safe in `$derived`). */
export function broker(connId: string): Broker {
  return (world.ext[AMQ_EXT]?.[connId] as Broker | undefined) ?? EMPTY;
}

/** Create the data (writes: seed / handlers only). */
export function ensureBroker(connId: string): Broker {
  return extData<Broker>(AMQ_EXT, connId, sampleBroker());
}
