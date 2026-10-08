# redhat.streams-kafka (proposed)

**Product:** Red Hat Streams for Apache Kafka 3.2 (Apache Kafka 4.2.0, KRaft),
StreamsHub Console 0.14.1. Image `registry.redhat.io/amq-streams/kafka-42-rhel9:3.2.0`
(upstream `apache/kafka`, `apache/kafka-native`). Ports 9092 (client), 9093 (controller), console 3000.

**Objects:** Topic (`name`, `topicId`, `partitionCount`, `replicationFactor`,
`configs` `cleanup.policy`/`retention.ms`), Consumer group (`groupId`, `state`
Stable|Empty|…, `protocol` consumer|classic, offsets `currentOffset`/`logEndOffset`
→ lag). Console API `/api/kafkas/{id}/topics|consumerGroups|records`.

**Mock:** service connection `acme-kafka` (P8) with sections Topics and Consumer
groups (P2); topic details (Messages decoded with the Apicurio schema,
Partitions, Consumer groups, Configuration, Schema tab via TopicIdStrategy);
"Reset offsets" (task, `kafka-consumer-groups.sh --reset-offsets`); connection
tab "Console" (P14, StreamsHub-style overview); factory "Create Streams for
Apache Kafka" in the services catalog (P12); dashboard card "Kafka consumer lag" (P17).
Other extensions add sections under Kafka connections: Apicurio "Schemas",
Debezium "Connectors" (P2 `when` on `service:kafka`).

**Journeys:** acme-kafka → Topics → orders.created → Schema; Consumer groups →
inventory-projector (lag 42) → Reset offsets → lag 0.
Sources: docs/research/redhat.streams-kafka.md.
