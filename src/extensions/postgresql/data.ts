/** Databases/tables of local PostgreSQL services (pg_stat_user_tables-like rows). */
import { world } from '#lib/world.svelte.ts';

export const PG_EXT = 'podman-desktop.postgresql';
export const PG_CONN = 'acme-postgres';

export interface PgTable {
  schema: string;
  name: string;
  rows: number;
  sizeMB: number;
}

export interface PgDatabase {
  name: string;
  owner: string;
  encoding: string;
  tables: PgTable[];
}

export function sampleDatabases(): PgDatabase[] {
  return [
    {
      name: 'orders',
      owner: 'app',
      encoding: 'UTF8',
      tables: [
        { schema: 'public', name: 'orders', rows: 9731, sizeMB: 4.2 },
        { schema: 'public', name: 'order_lines', rows: 28410, sizeMB: 7.9 },
        { schema: 'public', name: 'customers', rows: 3391, sizeMB: 1.1 },
        { schema: 'public', name: 'flyway_schema_history', rows: 14, sizeMB: 0.1 },
      ],
    },
    { name: 'inventory', owner: 'app', encoding: 'UTF8', tables: [{ schema: 'public', name: 'stock_levels', rows: 1284, sizeMB: 0.6 }] },
  ];
}

const EMPTY: PgDatabase[] = [];

export function databases(connId: string): PgDatabase[] {
  return (world.ext[PG_EXT]?.[connId] as PgDatabase[] | undefined) ?? EMPTY;
}

export function ensureDatabases(connId: string, data: PgDatabase[]): void {
  world.ext[PG_EXT] ??= {};
  world.ext[PG_EXT][connId] ??= data;
}
