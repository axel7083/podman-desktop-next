/**
 * Apicurio Registry 3 REST API shapes (`/apis/registry/v3`): ArtifactMetaData,
 * VersionMetaData, rules. Content is kept for the latest versions only.
 */
import { world } from '#lib/world.svelte.ts';

export const APICURIO_EXT = 'redhat.apicurio-registry';
export const APICURIO_CONN = 'acme-registry';

export type ArtifactType = 'AVRO' | 'PROTOBUF' | 'JSON' | 'OPENAPI' | 'ASYNCAPI' | 'GRAPHQL' | 'KCONNECT' | 'WSDL' | 'XSD' | 'XML';
export type VersionState = 'ENABLED' | 'DISABLED' | 'DEPRECATED' | 'DRAFT';

export interface VersionMeta {
  version: string;
  globalId: number;
  contentId: number;
  state: VersionState;
  createdOn: string;
  /** Short change summary shown in the versions list. */
  note?: string;
}

export interface Artifact {
  groupId: string;
  artifactId: string;
  artifactType: ArtifactType;
  name: string;
  description?: string;
  owner?: string;
  createdOn: string;
  modifiedOn: string;
  labels?: Record<string, string>;
  versions: VersionMeta[];
  content: string;
}

export interface Rule {
  ruleType: 'VALIDITY' | 'COMPATIBILITY' | 'INTEGRITY';
  config: string;
  scope: 'global' | 'group' | 'artifact';
  target?: string;
}

export interface RegistryData {
  artifacts: Artifact[];
  rules: Rule[];
}

const ORDER_CREATED_AVRO = `{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.acme.orders.events",
  "fields": [
    { "name": "orderId", "type": "string" },
    { "name": "customerId", "type": "string" },
    { "name": "status", "type": { "type": "enum", "name": "OrderStatus", "symbols": ["CREATED", "PAID", "SHIPPED", "CANCELLED"] } },
    { "name": "totalCents", "type": "long" },
    { "name": "currency", "type": "string", "default": "EUR" },
    { "name": "couponCode", "type": ["null", "string"], "default": null }
  ]
}`;

const PAYMENT_AVRO = `{
  "type": "record",
  "name": "PaymentEvent",
  "namespace": "com.acme.payments.events",
  "fields": [
    { "name": "paymentId", "type": "string" },
    { "name": "orderId", "type": "string" },
    { "name": "status", "type": "string" },
    { "name": "amountCents", "type": "long" }
  ]
}`;

export function sampleRegistry(): RegistryData {
  return {
    artifacts: [
      {
        groupId: 'acme.orders',
        artifactId: 'OrderCreated',
        artifactType: 'AVRO',
        name: 'OrderCreated',
        owner: 'acme-orders',
        createdOn: '2026-09-02T08:12:40Z',
        modifiedOn: '2026-10-06T13:01:22Z',
        labels: { topic: 'orders.created' },
        versions: [
          { version: '1', globalId: 9, contentId: 7, state: 'DEPRECATED', createdOn: '2026-09-02T08:12:40Z', note: 'Initial schema' },
          { version: '2', globalId: 14, contentId: 12, state: 'DEPRECATED', createdOn: '2026-09-12T10:40:00Z', note: 'Added currency (default EUR), status as enum OrderStatus' },
          { version: '3', globalId: 21, contentId: 18, state: 'ENABLED', createdOn: '2026-10-06T13:01:22Z', note: 'Added optional couponCode' },
        ],
        content: ORDER_CREATED_AVRO,
      },
      {
        groupId: 'acme.payments',
        artifactId: 'PaymentEvent',
        artifactType: 'AVRO',
        name: 'PaymentEvent',
        createdOn: '2026-09-03T10:20:00Z',
        modifiedOn: '2026-09-30T09:12:00Z',
        labels: { topic: 'payments' },
        versions: [
          { version: '1', globalId: 10, contentId: 8, state: 'DEPRECATED', createdOn: '2026-09-03T10:20:00Z' },
          { version: '2', globalId: 19, contentId: 16, state: 'ENABLED', createdOn: '2026-09-30T09:12:00Z' },
        ],
        content: PAYMENT_AVRO,
      },
      {
        groupId: 'acme.orders',
        artifactId: 'acme-orders-api',
        artifactType: 'OPENAPI',
        name: 'Acme Orders API',
        createdOn: '2026-09-05T11:00:00Z',
        modifiedOn: '2026-10-07T17:30:00Z',
        versions: [
          { version: '1.4.0', globalId: 22, contentId: 19, state: 'ENABLED', createdOn: '2026-09-25T09:00:00Z' },
          { version: '1.5.0', globalId: 29, contentId: 26, state: 'DRAFT', createdOn: '2026-10-07T17:30:00Z' },
        ],
        content: 'openapi: 3.1.0\ninfo:\n  title: Acme Orders API\n  version: 1.5.0\npaths:\n  /orders:\n    post:\n      operationId: createOrder\n      responses:\n        "201": { description: Created }\n  /orders/{id}:\n    get:\n      operationId: getOrder\n',
      },
      {
        groupId: 'acme.orders',
        artifactId: 'orders-events',
        artifactType: 'ASYNCAPI',
        name: 'Orders events',
        createdOn: '2026-09-05T11:05:00Z',
        modifiedOn: '2026-09-05T11:05:00Z',
        versions: [{ version: '1.0.0', globalId: 23, contentId: 20, state: 'ENABLED', createdOn: '2026-09-05T11:05:00Z' }],
        content: 'asyncapi: 3.0.0\ninfo:\n  title: Orders events\n  version: 1.0.0\nchannels:\n  orders.created:\n    address: orders.created\n    messages:\n      OrderCreated:\n        $ref: "#/components/messages/OrderCreated"\n',
      },
    ],
    rules: [
      { ruleType: 'COMPATIBILITY', config: 'BACKWARD', scope: 'global' },
      { ruleType: 'VALIDITY', config: 'FULL', scope: 'artifact', target: 'acme.payments/PaymentEvent' },
      { ruleType: 'INTEGRITY', config: 'REFS_EXIST', scope: 'group', target: 'acme.orders' },
    ],
  };
}

const EMPTY: RegistryData = { artifacts: [], rules: [] };

export function registryData(connId: string): RegistryData {
  return (world.ext[APICURIO_EXT]?.[connId] as RegistryData | undefined) ?? EMPTY;
}

export function ensureRegistry(connId: string, data: RegistryData = sampleRegistry()): RegistryData {
  world.ext[APICURIO_EXT] ??= {};
  world.ext[APICURIO_EXT][connId] ??= data;
  return world.ext[APICURIO_EXT][connId] as RegistryData;
}

/**
 * Value schema of `<topic>` in any registry: TopicIdStrategy (`<topic>-value`,
 * e.g. Debezium) or a record-named artifact labelled `topic=<topic>`
 * (`acme.orders/OrderCreated`). Compatibility: artifact rule, else the global one.
 */
export function findTopicSchema(topic: string): { connId: string; artifact: Artifact; compatibility: string } | undefined {
  for (const [connId, raw] of Object.entries(world.ext[APICURIO_EXT] ?? {})) {
    const data = raw as RegistryData;
    const artifact = data.artifacts.find(a => a.artifactId === `${topic}-value` || a.labels?.topic === topic);
    if (artifact) {
      const rule =
        data.rules.find(r => r.ruleType === 'COMPATIBILITY' && r.scope === 'artifact' && r.target === `${artifact.groupId}/${artifact.artifactId}`) ??
        data.rules.find(r => r.ruleType === 'COMPATIBILITY' && r.scope === 'global');
      return { connId, artifact, compatibility: rule?.config ?? 'NONE' };
    }
  }
  return undefined;
}

/** Number of non-internal topics of a Kafka cluster whose value schema is registered. */
export function schemaCount(topics: string[]): number {
  return topics.filter(t => findTopicSchema(t)).length;
}

/** Register (or bump) an artifact, used by Debezium's Avro converter (auto-register). */
export function registerArtifact(connId: string, artifact: Artifact): void {
  const data = ensureRegistry(connId);
  if (!data.artifacts.some(a => a.artifactId === artifact.artifactId)) data.artifacts.push(artifact);
}

export function latest(a: Artifact): VersionMeta {
  return a.versions[a.versions.length - 1];
}
