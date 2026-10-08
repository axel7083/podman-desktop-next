# redhat.datagrid – Red Hat Data Grid (proposed)

**Real objects.** Infinispan REST v2: `GET /rest/v2/caches?action=detailed` (name, type, health, persistent,
bounded, indexed), `?action=stats` (current_number_of_entries, hits, misses, stores), cache config JSON
(`distributed-cache` / `replicated-cache` / `local-cache` / `invalidation-cache`, mode SYNC|ASYNC, owners,
encoding media-type, statistics). Actions: `POST /rest/v2/caches/{name}`, `?action=clear`,
`?action=stats-reset`, `DELETE /rest/v2/caches/{name}`. Health enum HEALTHY / HEALTHY_REBALANCING / DEGRADED / FAILED.

**Runtime.** Data Grid 8.6 = Infinispan 15.2.4.Final, image `registry.redhat.io/datagrid/datagrid-8-rhel9:1.6`
(community `quay.io/infinispan/server:15.2`), single port 11222 (Hot Rod + REST + console), `USER`/`PASS`.

**Placement.**
- P8 service connection `datagrid`, **stopped** by default (container EXITED) → sections show `ConnectionStoppedScreen` with "Start datagrid".
- P12 factory `datagrid` in the Services catalog. P2 section Caches: name, type, mode, owners, encoding, entries,
  hit ratio, health; "Create cache" inline form → task; row Clear (confirm "Clear cache?"), Reset stats, Delete (confirm "Delete cache?").

**Journeys.** (1) Start datagrid from the stopped screen → caches appear. (2) Create cache `shipping-quotes`
(distributed, SYNC, 1 owner, protostream). (3) Clear `inventory-items`, Reset stats.

**Known gap.** Starting the connection does not restart the EXITED backing container (shell-owned lifecycle).

**Sources.** infinispan.org REST + configuring guides, Data Grid 8.6 docs; dossier `docs/research/redhat.datagrid.md`.
