/**
 * Kafka Connect REST shapes (`GET /connectors/{name}/status`, `/config`) for
 * Debezium 3.x connectors, plus per-database CDC prerequisites (wal_level).
 */
import type { Container } from '#lib/world.svelte.ts';
import { world } from '#lib/world.svelte.ts';

export const DBZ_EXT = 'redhat.debezium';
export type ConnectorState = 'RUNNING' | 'PAUSED' | 'STOPPED' | 'FAILED' | 'UNASSIGNED' | 'RESTARTING';

export interface Connector {
  name: string;
  kafka: string;
  /** Source database container name. */
  database: string;
  state: ConnectorState;
  tasks: { id: number; state: ConnectorState; trace?: string }[];
  config: Record<string, string>;
  topics: string[];
  snapshotRows?: number;
}

interface Store {
  connectors: Connector[];
  /** container id → wal_level */
  wal: Record<string, 'replica' | 'logical'>;
}

const EMPTY: Store = { connectors: [], wal: {} };

export function store(): Store {
  return (world.ext[DBZ_EXT]?.store as Store | undefined) ?? EMPTY;
}

export function ensureStore(): Store {
  world.ext[DBZ_EXT] ??= {};
  world.ext[DBZ_EXT].store ??= { connectors: [], wal: {} } satisfies Store;
  return world.ext[DBZ_EXT].store as Store;
}

export function walLevel(c: Container): 'replica' | 'logical' {
  return store().wal[c.id] ?? (c.command?.includes('wal_level=logical') ? 'logical' : 'replica');
}

export function isPostgres(c: { image: string }): boolean {
  const repo = c.image.split('@')[0].replace(/:[^/]*$/, '');
  return /\/(postgres|postgresql-\d+|pgvector)$/.test(repo);
}

export function connectorConfig(o: { name: string; host: string; db: string; prefix: string; tables: string[]; snapshot: string; avro: boolean; registry?: string }): Record<string, string> {
  return {
    'connector.class': 'io.debezium.connector.postgresql.PostgresConnector',
    'database.hostname': o.host,
    'database.port': '5432',
    'database.user': 'debezium',
    'database.password': '${file:/opt/secrets/pg.properties:password}',
    'database.dbname': o.db,
    'topic.prefix': o.prefix,
    'plugin.name': 'pgoutput',
    'slot.name': `${o.name.replaceAll('-', '_')}_slot`,
    'publication.name': 'dbz_publication',
    'table.include.list': o.tables.join(','),
    'snapshot.mode': o.snapshot,
    'tasks.max': '1',
    ...(o.avro
      ? {
          'value.converter': 'io.apicurio.registry.utils.converter.AvroConverter',
          'value.converter.apicurio.registry.url': o.registry ?? 'http://acme-registry:8080/apis/registry/v3',
          'value.converter.apicurio.registry.auto-register': 'true',
        }
      : { 'value.converter': 'org.apache.kafka.connect.json.JsonConverter' }),
  };
}

export function seedConnectors(): Connector[] {
  return [
    {
      name: 'inventory-cdc',
      kafka: 'acme-kafka',
      database: 'pg-dev',
      state: 'RUNNING',
      tasks: [{ id: 0, state: 'FAILED', trace: 'io.debezium.DebeziumException: Failed to start replication stream at LSN{0/1A3F2B8}\nCaused by: org.postgresql.util.PSQLException: ERROR: replication slot "debezium" is active for PID 412' }],
      config: connectorConfig({ name: 'debezium', host: 'pg-dev', db: 'inventory', prefix: 'inventory.cdc', tables: ['public.stock_levels'], snapshot: 'initial', avro: false }),
      topics: ['inventory.cdc.public.stock_levels'],
    },
    {
      name: 'payments-cdc',
      kafka: 'acme-kafka',
      database: 'pg-dev',
      state: 'PAUSED',
      tasks: [{ id: 0, state: 'PAUSED' }],
      config: connectorConfig({ name: 'payments-cdc', host: 'pg-dev', db: 'payments', prefix: 'payments.cdc', tables: ['public.payments'], snapshot: 'no_data', avro: false }),
      topics: ['payments.cdc.public.payments'],
    },
  ];
}
