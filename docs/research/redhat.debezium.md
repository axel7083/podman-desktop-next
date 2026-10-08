# Debezium

## 1. Identity
- **Display name:** Red Hat build of Debezium
- **Extension id:** `redhat.debezium` (proposed)
- **Icon:** https://raw.githubusercontent.com/debezium/debezium.github.io/develop/assets/images/color_debezium_64px.png (verified 200 image/png; wordmark SVG https://raw.githubusercontent.com/debezium/debezium.github.io/develop/assets/images/color_black_debezium_type_600px.svg)
- **Description:** Stream row-level changes from local databases to Kafka: run Kafka Connect with Debezium, create and monitor connectors.

## 2. Real objects / fields / enums
- **Versions:** upstream Debezium 3.7.0.Final (latest Final tag); Red Hat build of Debezium 3.4.3 (2026-04-15; runs on Streams for Apache Kafka).
- **Images:** `quay.io/debezium/connect:3.7` (Kafka Connect + all connectors, port 8083; env `BOOTSTRAP_SERVERS`, `GROUP_ID`, `CONFIG_STORAGE_TOPIC`, `OFFSET_STORAGE_TOPIC`, `STATUS_STORAGE_TOPIC`), `quay.io/debezium/server:3.7` (standalone, no Kafka Connect; config `debezium.source.*`, `debezium.sink.type=kafka|http|redis|pubsub|kinesis|nats-jetstream|pulsar`), `quay.io/debezium/postgres:18` (Postgres preconfigured for logical decoding; tag unverified). Product: Streams `KafkaConnect` CR with Debezium plugin artifacts (Strimzi `spec.build.plugins`).
- **Postgres prerequisites:** `wal_level=logical` (start with `-c wal_level=logical`), `max_replication_slots`, `max_wal_senders`; user with `REPLICATION` + `SELECT`; publication `dbz_publication` (auto-created per `publication.autocreate.mode` = `all_tables|disabled|filtered|no_tables`).
- **Connector config (PostgresConnector):** `connector.class=io.debezium.connector.postgresql.PostgresConnector`, `database.hostname`, `database.port`, `database.user`, `database.password`, `database.dbname`, `topic.prefix`, `plugin.name=pgoutput` (only `pgoutput` and `decoderbufs`), `slot.name` (default `debezium`), `publication.name`, `table.include.list` (e.g. `public.orders`), `schema.include.list`, `snapshot.mode` enum `initial` (default) | `always` | `initial_only` | `no_data` | `when_needed` | `configuration_based` | `custom` | `recovery` (`never` deprecated alias), `key.converter`/`value.converter` (`io.apicurio.registry.utils.converter.AvroConverter` with `*.apicurio.registry.url`), `tasks.max=1`.
- **Topic naming:** `<topic.prefix>.<schema>.<table>` -> `orders.cdc.public.orders` with `topic.prefix=orders.cdc`; heartbeat `__debezium-heartbeat.<prefix>`; envelope `before`, `after`, `source`, `op` (`c`, `u`, `d`, `r`, `t`), `ts_ms`.
- **Kafka Connect REST (8083):** `GET /connectors`, `POST /connectors`, `GET|PUT /connectors/{name}/config`, `GET /connectors/{name}/status`, `PUT /connectors/{name}/pause|resume|stop`, `POST /connectors/{name}/restart?includeTasks=true`, `DELETE /connectors/{name}`, `GET /connector-plugins`, `GET /connectors/{name}/offsets`. Status `state`: `RUNNING`, `PAUSED`, `STOPPED`, `FAILED`, `UNASSIGNED`, `RESTARTING`.
- **Pairing with `podman-desktop.postgresql`** (`ext-postgresql` v0.6.0-next): it discovers postgres containers from `docker.io/library/postgres:*` and `docker.io/pgvector/pgvector:*` images (credentials via env), creates new ones with db/user/password/port + init scripts, and can attach a pgAdmin (`docker.io/dpage/pgadmin4`, label `pgadmin.port`). It has no WAL/replication options, so Debezium would add "Enable CDC" (recreate with `wal_level=logical`).

## 3. Placement in the mockup
- **connections (service, P8):** `kafka-connect` service connection `acme-connect` (`http://localhost:8083`), linked to a `redhat.streams-kafka` connection.
- **connectionFactories (P12):** "Kafka Connect (Debezium)" form: Kafka connection, image tag, converters (JSON | Avro via Apicurio).
- **navSections (P2):** Connectors, Plugins, Offsets.
- **tabs (P14):** PostgreSQL container detail tab "Change data capture" (wal_level check, slots, publications, connectors using it).
- **menus:** Postgres container kebab "Capture changes with Debezium"; connector row: Pause/Resume/Restart/Stop/Delete; toolbar "New connector".
- **columns:** connector State badge, tasks count; **statusItems:** "1 connector FAILED".
- **tasks (P15):** "Enable logical replication" (restart Postgres), "Create connector".

## 4. Journeys
1. **CDC from orders table.** Containers -> `acme-postgres` (from PostgreSQL extension) -> kebab "Capture changes with Debezium". Wizard checks `wal_level=replica` -> offers "Enable logical replication" -> task (~8 s: `ALTER SYSTEM SET wal_level = logical`, restart container, verify). Then pick table `public.orders`, topic prefix `orders.cdc`, Kafka `acme-kafka` -> task "Create connector acme-orders-cdc" (~12 s: start `quay.io/debezium/connect:3.7` if missing, `POST /connectors`, wait RUNNING, initial snapshot 9,731 rows). World: connector RUNNING, topic `orders.cdc.public.orders` appears in Kafka.
2. **Failed connector.** Status item "1 connector FAILED" -> `inventory-cdc` task 0 FAILED trace `replication slot "debezium" is active for PID 412` -> "Change slot.name" (inline edit to `inventory_slot`) -> Restart -> RUNNING.
3. **Pause for maintenance.** Connectors -> `acme-orders-cdc` -> Pause -> PAUSED (slot retains WAL; warning shows retained WAL 48 MB) -> Resume.

## 5. Sample data
```json
[
  {"name":"acme-orders-cdc","connector":{"state":"RUNNING","worker_id":"10.89.0.7:8083"},"tasks":[{"id":0,"state":"RUNNING","worker_id":"10.89.0.7:8083"}],"type":"source"},
  {"name":"inventory-cdc","connector":{"state":"RUNNING","worker_id":"10.89.0.7:8083"},"tasks":[{"id":0,"state":"FAILED","worker_id":"10.89.0.7:8083","trace":"io.debezium.DebeziumException: Failed to start replication stream ... ERROR: replication slot \"debezium\" is active for PID 412"}],"type":"source"},
  {"name":"payments-cdc","connector":{"state":"PAUSED","worker_id":"10.89.0.7:8083"},"tasks":[{"id":0,"state":"PAUSED","worker_id":"10.89.0.7:8083"}],"type":"source"},
  {"name":"acme-orders-cdc","config":{"connector.class":"io.debezium.connector.postgresql.PostgresConnector","database.hostname":"acme-postgres","database.port":"5432","database.user":"debezium","database.password":"${file:/opt/secrets/pg.properties:password}","database.dbname":"orders","topic.prefix":"orders.cdc","plugin.name":"pgoutput","slot.name":"acme_orders_slot","publication.name":"dbz_publication","table.include.list":"public.orders","snapshot.mode":"initial","tasks.max":"1","value.converter":"io.apicurio.registry.utils.converter.AvroConverter","value.converter.apicurio.registry.url":"http://acme-registry:8080/apis/registry/v3","value.converter.apicurio.registry.auto-register":"true"}},
  {"class":"io.debezium.connector.postgresql.PostgresConnector","type":"source","version":"3.7.0.Final"},
  {"class":"io.debezium.connector.mysql.MySqlConnector","type":"source","version":"3.7.0.Final"},
  {"class":"io.debezium.connector.mongodb.MongoDbConnector","type":"source","version":"3.7.0.Final"},
  {"replicationSlot":{"slot_name":"acme_orders_slot","plugin":"pgoutput","slot_type":"logical","database":"orders","active":true,"confirmed_flush_lsn":"0/1A3F2B8","retained_wal_bytes":1048576}},
  {"postgres":{"container":"acme-postgres","image":"docker.io/library/postgres:18","wal_level":"logical","max_replication_slots":10,"max_wal_senders":10,"publications":["dbz_publication"]}},
  {"topic":"orders.cdc.public.orders","sampleEvent":{"before":null,"after":{"id":10482,"customer_id":"c-3391","status":"CREATED","total_cents":12999,"created_at":"2026-10-08T09:15:44.120Z"},"source":{"connector":"postgresql","name":"orders.cdc","db":"orders","schema":"public","table":"orders","lsn":27525816,"snapshot":"false"},"op":"c","ts_ms":1791450944231}}
]
```

## Sources
- https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- https://debezium.io/documentation/reference/stable/operations/debezium-server.html
- https://kafka.apache.org/documentation/#connect_rest
- https://github.com/debezium/debezium/tags
- https://docs.redhat.com/en/documentation/red_hat_build_of_debezium/3.4.3/html-single/release_notes_for_red_hat_build_of_debezium_3.4.3/index
- https://quay.io/repository/debezium/connect
- /home/astefani/github/podman-desktop/ext-postgresql/packages/backend/src/managers/services.ts
