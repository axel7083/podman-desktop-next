# redhat.debezium (proposed)

**Product:** Debezium 3.7 (Red Hat build 3.4.3) on Kafka Connect
(`quay.io/debezium/connect:3.7`, REST :8083). PostgresConnector with
`plugin.name=pgoutput`, `slot.name`, `publication.name`, `table.include.list`,
`topic.prefix` → topics `<prefix>.<schema>.<table>`, `snapshot.mode`
initial|always|initial_only|no_data|when_needed; Avro via Apicurio
`AvroConverter`. Status `RUNNING|PAUSED|STOPPED|FAILED|UNASSIGNED|RESTARTING`.
Prerequisite `wal_level=logical`.

**Mock:** kebab "Capture changes with Debezium" on PostgreSQL containers (P14)
→ container tab "Change data capture": wal_level check → task "Enable logical
replication" (ALTER SYSTEM + restart) → connector form (name, Kafka connection,
prefix, snapshot.mode, tables, converter, JSON preview) → task "Create connector"
(start Connect if needed, POST /connectors, RUNNING, snapshot 9,731 rows) →
topic `orders.cdc.public.orders` appears in Kafka (+ schema in Apicurio).
Section "Connectors" under Kafka connections (P2) with pause/resume/restart and
the failed `inventory-cdc` trace (slot already active → restart with own slot).
Sources: docs/research/redhat.debezium.md.
