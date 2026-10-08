# Red Hat Data Grid

## 1. Identity
- **Display name:** Red Hat Data Grid
- **Extension id:** `redhat.datagrid` (proposed; no existing Podman Desktop extension)
- **Icon:** https://raw.githubusercontent.com/infinispan/infinispan.github.io/master/assets/images/infinispan-logo.png (verified 200, image/png; upstream Infinispan logo)
- **Description:** Run a local Data Grid / Infinispan server, browse caches and their statistics, and wire it into apps that use a remote cache.

## 2. Real objects & fields
- **Versions:** Data Grid 8.6 is the current docs line (8.5 still supported). Upstream Infinispan latest release is **16.3.0** (GitHub releases); DG 8.5 = Infinispan 15.0.x, DG 8.6 = Infinispan 15.2.x (mapping unverified).
- **Images:** `registry.redhat.io/datagrid/datagrid-8-rhel9:1.6` (tag scheme unverified; operator image is `datagrid-8-rhel9-operator`), community `quay.io/infinispan/server:15.2` / `:16.3`.
- **Env:** `USER`, `PASS` (creates an admin identity on first start); `IDENTITIES_BATCH`, `JAVA_OPTIONS`, `SERVER_LIBS`. Without credentials the REST/console endpoints return 401.
- **Port:** single endpoint **11222** (Hot Rod + REST + console, protocol auto-detected). Console at `http://localhost:11222/console/`. Metrics at `/metrics` (Prometheus). Cluster JGroups 7800 (not needed locally).
- **REST v2:**
  - `GET /rest/v2/caches` -> `["orders-cache", "___protobuf_metadata", ...]`; `GET /rest/v2/caches?action=detailed` -> `[{name, type, simple_cache, transactional, persistent, bounded, secured, indexed, has_remote_backup, health, rebalancing_enabled}]`
  - `POST /rest/v2/caches/{name}` with JSON/XML/YAML config body; `DELETE /rest/v2/caches/{name}`
  - `GET /rest/v2/caches/{name}?action=config`, `?action=stats`, `?action=size`, `?action=clear`
  - `GET|PUT|DELETE /rest/v2/caches/{name}/{key}`; `GET /rest/v2/caches/{name}?action=keys&limit=50`
  - `GET /rest/v2/server` (version), `GET /rest/v2/cache-managers/default/health`, `GET /rest/v2/container/stats`
- **Cache config (JSON):** `{"distributed-cache": {"mode": "SYNC"|"ASYNC", "owners": 2, "statistics": true, "encoding": {"media-type": "application/x-protostream"|"application/json"|"text/plain"}, "expiration": {"lifespan": 600000, "max-idle": -1}, "memory": {"max-count": 10000, "when-full": "REMOVE"}, "locking": {"isolation": "REPEATABLE_READ"}}}`. Other top-level types: `replicated-cache`, `local-cache`, `invalidation-cache`.
- **Cache stats (`?action=stats`):** `time_since_start`, `time_since_reset`, `current_number_of_entries`, `current_number_of_entries_in_memory`, `total_number_of_entries`, `data_memory_used`, `off_heap_memory_used`, `stores`, `retrievals`, `hits`, `misses`, `remove_hits`, `remove_misses`, `evictions`, `average_read_time`, `average_write_time`, `average_remove_time`.
- **Health enum:** `HEALTHY`, `HEALTHY_REBALANCING`, `DEGRADED`, `FAILED`.
- **CLI:** `bin/cli.sh` -> `connect`, `create cache --file=orders.json orders-cache`, `ls caches`, `stats caches/orders-cache`, `put/get`.
- Legacy inventory-service uses Data Grid client (`infinispan-client-hotrod`, `hotrod-client.properties` with `infinispan.client.hotrod.server_list=localhost:11222`), or on EAP the `infinispan` subsystem remote-cache-container.

## 3. Placement (provider-first UI)
- **connections (P8, kind `service`):** "Data Grid (local)" ServiceProviderConnection backed by container `datagrid`, status from `/rest/v2/cache-managers/default/health`; endpoint `hotrod://localhost:11222`, console link.
- **connectionFactories (P12/P18):** Create Data Grid: image (Red Hat vs community), admin user/pass, port, preloaded caches (template: distributed/replicated/local).
- **navSections (P2)** under the connection, `when: connection.kind == service && connection.type == datagrid`: **Caches** (table), **Counters** (optional), **Server** (version, cluster members).
- **columns:** name, type, mode, owners, encoding, entries, hit ratio, health.
- **tabs (P14):** on the `datagrid` container detail: "Caches" tab (same table); on a cache detail: Config (YAML/JSON), Statistics (hits/misses sparkline), Entries (key browser).
- **menus:** connection kebab: Open console, Copy Hot Rod URL, Create cache, Export config; cache row: Clear, Reset stats, Delete.
- **dashboardCards (P17):** "Cache hit ratio" card across caches.
- **P15 project link:** `~/dev/inventory-service` detected `hotrod-client.properties` -> suggests linking the Data Grid service.

## 4. Journeys
1. **Spin up Data Grid for inventory-service.** Resources > Services > Create Data Grid -> pick `quay.io/infinispan/server:15.2`, user `admin` / generated pass -> task "Starting Data Grid" (pull image 420 MB, `podman run -p 11222:11222 -e USER -e PASS`, wait for `ISPN080001: Infinispan Server ... started`; ~25 s) -> new service connection "datagrid" Running.
2. **Create a cache.** Connection > Caches > Create -> form: name `inventory-items`, distributed, mode SYNC, owners 1, encoding `application/x-protostream`, statistics on -> task "Create cache" (`POST /rest/v2/caches/inventory-items`, 1 s) -> row appears, health HEALTHY, 0 entries.
3. **Watch cache stats while running the app.** Start inventory-service (EAP container) -> Caches table refreshes every 5 s: `inventory-items` entries 0 -> 1,284, hits 8,812, misses 1,301 (ratio 87 %) -> click row -> Statistics tab sparkline; "Reset stats" menu clears counters.

## 5. Sample data
```json
{
  "server": { "version": "Infinispan 'Feelin Good' 15.2.4.Final", "node_name": "datagrid-7f3c", "status": "RUNNING" },
  "caches": [
    { "name": "inventory-items", "type": "distributed-cache", "mode": "SYNC", "owners": 1, "encoding": "application/x-protostream", "statistics": true, "health": "HEALTHY", "persistent": false, "bounded": true, "indexed": false },
    { "name": "inventory-reservations", "type": "distributed-cache", "mode": "ASYNC", "owners": 1, "encoding": "application/json", "statistics": true, "health": "HEALTHY", "persistent": false, "bounded": false, "indexed": false },
    { "name": "acme-orders-sessions", "type": "replicated-cache", "mode": "SYNC", "owners": null, "encoding": "application/x-protostream", "statistics": true, "health": "HEALTHY", "persistent": false, "bounded": true, "indexed": false },
    { "name": "price-lookup", "type": "local-cache", "mode": null, "owners": null, "encoding": "text/plain", "statistics": false, "health": "HEALTHY", "persistent": false, "bounded": true, "indexed": false },
    { "name": "___protobuf_metadata", "type": "replicated-cache", "mode": "SYNC", "owners": null, "encoding": "application/x-protostream", "statistics": false, "health": "HEALTHY", "persistent": true, "bounded": false, "indexed": false }
  ],
  "stats": {
    "inventory-items": { "time_since_start": 5412, "current_number_of_entries": 1284, "total_number_of_entries": 1302, "data_memory_used": 0, "stores": 1302, "retrievals": 10113, "hits": 8812, "misses": 1301, "remove_hits": 18, "remove_misses": 0, "evictions": 0, "average_read_time": 0, "average_write_time": 1 },
    "inventory-reservations": { "time_since_start": 5412, "current_number_of_entries": 37, "total_number_of_entries": 412, "stores": 412, "retrievals": 690, "hits": 512, "misses": 178, "remove_hits": 375, "remove_misses": 2, "evictions": 0, "average_read_time": 0, "average_write_time": 2 }
  },
  "createdAt": "2026-10-07T09:14:22Z"
}
```

## Sources
- https://docs.redhat.com/en/documentation/red_hat_data_grid/8.6
- https://docs.redhat.com/en/documentation/red_hat_data_grid/8.6/html-single/data_grid_operator_8.6_release_notes/index
- https://infinispan.org/docs/stable/titles/rest/rest.html
- https://infinispan.org/docs/stable/titles/configuring/configuring.html
- https://quay.io/repository/infinispan/server
- https://catalog.redhat.com/software/containers/datagrid/datagrid-8-rhel9-operator/62a9732e98cdff6b03baf8a2
- https://github.com/infinispan/infinispan/releases (latest 16.3.0)
