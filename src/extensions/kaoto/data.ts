/**
 * Mock Kaoto workspace (`~/dev/acme-integrations`) and Camel JBang runtime
 * (`camel ps`, `camel get route`). Camel runs on the JVM: no containers.
 */
import {
  faArrowRightToBracket,
  faClock,
  faCode,
  faDatabase,
  faGlobe,
  faListUl,
  faPaperPlane,
  faScissors,
  faTag,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

import { extData, world } from '#lib/world.svelte.ts';

export const KAOTO_EXT = 'redhat.kaoto';
export const WORKSPACE = '~/dev/acme-integrations';
export const CAMEL_VERSION = '4.14.0.redhat-00006';

export interface FlowStep {
  id: string;
  /** EIP / component name shown as the node title (`rest`, `unmarshal`…). */
  name: string;
  /** Short description (URI, expression). */
  detail: string;
  /** Kaoto category shown above the title. */
  category: 'Consumer' | 'Processor' | 'Producer' | 'Kamelet source' | 'Kamelet action' | 'Kamelet sink';
  icon: IconDefinition;
  properties: [string, string][];
}

export interface CamelFile {
  file: string;
  kind: 'Route' | 'Pipe';
  /** Route id (or Pipe name). */
  id: string;
  description: string;
  modified: string;
  steps: FlowStep[];
  yaml: string;
}

export interface CamelRoute {
  id: string;
  from: string;
  status: 'Started' | 'Stopped';
  total: number;
  fail: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
}

export interface RunningIntegration {
  pid: number;
  name: string;
  file: string;
  ready: string;
  status: 'Running' | 'Starting' | 'Stopping';
  /** Epoch ms. */
  started: number;
  total: number;
  fail: number;
  inflight: number;
  routes: CamelRoute[];
}

export interface KaotoWorkspace {
  files: CamelFile[];
  running: RunningIntegration[];
  exported: string[];
}

const ORDERS_YAML = `- route:
    id: orders-to-kafka
    from:
      uri: rest:post:/orders
      parameters:
        consumes: application/json
      steps:
        - unmarshal:
            json:
              library: Jackson
        - setHeader:
            name: kafka.KEY
            simple: "\${body[orderId]}"
        - to:
            uri: kafka:orders.created
            parameters:
              brokers: "{{kafka.brokers}}"
`;

const INVENTORY_YAML = `- route:
    id: poll-inventory
    from:
      uri: timer:inventory
      parameters:
        period: 30000
      steps:
        - toD:
            uri: http://localhost:8080/api/inventory?changedSince=\${header.CamelTimerFiredTime}
        - unmarshal:
            json: {}
        - split:
            simple: "\${body}"
            steps:
              - to:
                  uri: kamelet:postgresql-sink
                  parameters:
                    serverName: localhost
                    databaseName: inventory
                    query: "INSERT INTO stock(sku, qty) VALUES (:#sku, :#qty)"
`;

const AUDIT_YAML = `apiVersion: camel.apache.org/v1
kind: Pipe
metadata:
  name: orders-audit
spec:
  source:
    ref:
      kind: Kamelet
      apiVersion: camel.apache.org/v1
      name: kafka-source
    properties:
      topic: orders.created
      bootstrapServers: localhost:9092
  steps:
    - ref:
        kind: Kamelet
        apiVersion: camel.apache.org/v1
        name: log-action
      properties:
        showHeaders: true
  sink:
    ref:
      kind: Kamelet
      apiVersion: camel.apache.org/v1
      name: postgresql-sink
    properties:
      serverName: localhost
      databaseName: audit
      query: "INSERT INTO order_audit(payload) VALUES (:#body)"
`;

export function sampleWorkspace(): KaotoWorkspace {
  return {
    files: [
      {
        file: 'orders-to-kafka.camel.yaml',
        kind: 'Route',
        id: 'orders-to-kafka',
        description: 'Accept orders over REST and publish them to Kafka, keyed by order id.',
        modified: '2026-10-08T07:52:00Z',
        yaml: ORDERS_YAML,
        steps: [
          { id: 'from', name: 'rest', detail: 'rest:post:/orders', category: 'Consumer', icon: faGlobe, properties: [['URI', 'rest:post:/orders'], ['Method', 'post'], ['Path', '/orders'], ['Consumes', 'application/json'], ['Component', 'camel-rest (platform-http)']] },
          { id: 'unmarshal', name: 'unmarshal', detail: 'json (Jackson)', category: 'Processor', icon: faCode, properties: [['Data format', 'json'], ['Library', 'Jackson'], ['Unmarshal type', 'java.util.Map']] },
          { id: 'setHeader', name: 'setHeader', detail: 'kafka.KEY = ${body[orderId]}', category: 'Processor', icon: faTag, properties: [['Name', 'kafka.KEY'], ['Expression language', 'simple'], ['Expression', '${body[orderId]}']] },
          { id: 'to', name: 'kafka', detail: 'kafka:orders.created', category: 'Producer', icon: faPaperPlane, properties: [['URI', 'kafka:orders.created'], ['Topic', 'orders.created'], ['Brokers', '{{kafka.brokers}} → localhost:9092 (acme-kafka)'], ['Component', 'camel-kafka']] },
        ],
      },
      {
        file: 'inventory-sync.camel.yaml',
        kind: 'Route',
        id: 'poll-inventory',
        description: 'Poll the legacy inventory service every 30 s and upsert stock levels into PostgreSQL.',
        modified: '2026-10-06T15:20:00Z',
        yaml: INVENTORY_YAML,
        steps: [
          { id: 'from', name: 'timer', detail: 'timer:inventory?period=30000', category: 'Consumer', icon: faClock, properties: [['URI', 'timer:inventory'], ['Period', '30000 ms'], ['Component', 'camel-timer']] },
          { id: 'toD', name: 'toD', detail: 'http://localhost:8080/api/inventory', category: 'Producer', icon: faGlobe, properties: [['URI', 'http://localhost:8080/api/inventory?changedSince=${header.CamelTimerFiredTime}'], ['Component', 'camel-http']] },
          { id: 'unmarshal', name: 'unmarshal', detail: 'json', category: 'Processor', icon: faCode, properties: [['Data format', 'json']] },
          { id: 'split', name: 'split', detail: '${body}', category: 'Processor', icon: faScissors, properties: [['Expression language', 'simple'], ['Expression', '${body}'], ['Parallel processing', 'false']] },
          { id: 'sink', name: 'postgresql-sink', detail: 'kamelet:postgresql-sink', category: 'Kamelet sink', icon: faDatabase, properties: [['Kamelet', 'postgresql-sink'], ['Server name', 'localhost'], ['Database', 'inventory'], ['Query', 'INSERT INTO stock(sku, qty) VALUES (:#sku, :#qty)']] },
        ],
      },
      {
        file: 'orders-audit.pipe.yaml',
        kind: 'Pipe',
        id: 'orders-audit',
        description: 'Kamelet Pipe: audit every created order from Kafka into PostgreSQL.',
        modified: '2026-10-01T10:05:00Z',
        yaml: AUDIT_YAML,
        steps: [
          { id: 'source', name: 'kafka-source', detail: 'topic orders.created', category: 'Kamelet source', icon: faArrowRightToBracket, properties: [['Kamelet', 'kafka-source'], ['Topic', 'orders.created'], ['Bootstrap servers', 'localhost:9092']] },
          { id: 'log', name: 'log-action', detail: 'showHeaders: true', category: 'Kamelet action', icon: faListUl, properties: [['Kamelet', 'log-action'], ['Show headers', 'true']] },
          { id: 'sink', name: 'postgresql-sink', detail: 'database audit', category: 'Kamelet sink', icon: faDatabase, properties: [['Kamelet', 'postgresql-sink'], ['Server name', 'localhost'], ['Database', 'audit'], ['Query', 'INSERT INTO order_audit(payload) VALUES (:#body)']] },
        ],
      },
    ],
    running: [
      {
        pid: 48390,
        name: 'inventory-sync',
        file: 'inventory-sync.camel.yaml',
        ready: '1/1',
        status: 'Running',
        started: Date.now() - 190_000,
        total: 58,
        fail: 2,
        inflight: 1,
        routes: [
          { id: 'poll-inventory', from: 'timer://inventory?period=30000', status: 'Started', total: 6, fail: 0, meanMs: 210, minMs: 180, maxMs: 402 },
          { id: 'inventory-to-postgres', from: 'kamelet://source', status: 'Started', total: 52, fail: 2, meanMs: 18, minMs: 9, maxMs: 95 },
        ],
      },
    ],
    exported: [],
  };
}

const EMPTY: KaotoWorkspace = { files: [], running: [], exported: [] };

/** Read-only accessor (safe in `$derived`). */
export function workspace(): KaotoWorkspace {
  return (world.ext[KAOTO_EXT]?.workspace as KaotoWorkspace | undefined) ?? EMPTY;
}

/** Create the data (writes: seed / handlers only). */
export function ensureWorkspace(): KaotoWorkspace {
  return extData<KaotoWorkspace>(KAOTO_EXT, 'workspace', sampleWorkspace());
}

/** Camel JBang age format: `12m4s`. */
export function camelAge(started: number, now: number): string {
  const s = Math.max(0, Math.floor((now - started) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m${s % 60}s`;
  return `${Math.floor(m / 60)}h${m % 60}m`;
}
