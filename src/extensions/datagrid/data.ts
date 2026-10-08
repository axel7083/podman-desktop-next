/**
 * Mock Data Grid / Infinispan REST v2 data (`GET /rest/v2/caches?action=detailed`
 * merged with `?action=stats`).
 */
import { extData, world } from '#lib/world.svelte.ts';

export const DG_EXT = 'redhat.datagrid';
export const DG_CONN = 'datagrid';

export type CacheType = 'distributed-cache' | 'replicated-cache' | 'local-cache' | 'invalidation-cache';
export type CacheHealth = 'HEALTHY' | 'HEALTHY_REBALANCING' | 'DEGRADED' | 'FAILED';

export interface Cache {
  name: string;
  type: CacheType;
  mode?: 'SYNC' | 'ASYNC';
  owners?: number;
  encoding: string;
  statistics: boolean;
  health: CacheHealth;
  persistent: boolean;
  bounded: boolean;
  indexed: boolean;
  internal?: boolean;
  /** `current_number_of_entries` */
  entries: number;
  hits: number;
  misses: number;
  stores: number;
}

export interface DataGridServer {
  version: string;
  nodeName: string;
  caches: Cache[];
}

export function hitRatio(c: Cache): string {
  if (!c.statistics) return 'stats off';
  const total = c.hits + c.misses;
  return total ? `${Math.round((c.hits / total) * 100)} %` : '–';
}

export function sampleServer(): DataGridServer {
  return {
    version: "Infinispan 'Feelin Good' 15.2.4.Final",
    nodeName: 'datagrid-7f3c',
    caches: [
      { name: 'inventory-items', type: 'distributed-cache', mode: 'SYNC', owners: 1, encoding: 'application/x-protostream', statistics: true, health: 'HEALTHY', persistent: false, bounded: true, indexed: false, entries: 1284, hits: 8812, misses: 1301, stores: 1302 },
      { name: 'inventory-reservations', type: 'distributed-cache', mode: 'ASYNC', owners: 1, encoding: 'application/json', statistics: true, health: 'HEALTHY', persistent: false, bounded: false, indexed: false, entries: 37, hits: 512, misses: 178, stores: 412 },
      { name: 'acme-orders-sessions', type: 'replicated-cache', mode: 'SYNC', encoding: 'application/x-protostream', statistics: true, health: 'HEALTHY', persistent: false, bounded: true, indexed: false, entries: 214, hits: 3920, misses: 214, stores: 431 },
      { name: 'price-lookup', type: 'local-cache', encoding: 'text/plain', statistics: false, health: 'HEALTHY', persistent: false, bounded: true, indexed: false, entries: 5120, hits: 0, misses: 0, stores: 5120 },
      { name: '___protobuf_metadata', type: 'replicated-cache', mode: 'SYNC', encoding: 'application/x-protostream', statistics: false, health: 'HEALTHY', persistent: true, bounded: false, indexed: false, internal: true, entries: 3, hits: 0, misses: 0, stores: 3 },
    ],
  };
}

const EMPTY: DataGridServer = { version: '', nodeName: '', caches: [] };

/** Read-only accessor (safe in `$derived`). */
export function grid(connId: string): DataGridServer {
  return (world.ext[DG_EXT]?.[connId] as DataGridServer | undefined) ?? EMPTY;
}

/** Create the data (writes: seed / handlers only). */
export function ensureGrid(connId: string): DataGridServer {
  return extData<DataGridServer>(DG_EXT, connId, sampleServer());
}
