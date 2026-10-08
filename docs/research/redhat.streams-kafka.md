# Streams for Apache Kafka

## 1. Identity
- **Display name:** Red Hat Streams for Apache Kafka
- **Extension id:** `redhat.streams-kafka` (proposed)
- **Icon:** https://raw.githubusercontent.com/cncf/artwork/main/projects/strimzi/icon/color/strimzi-icon-color.svg (verified 200 image/svg+xml); alt Kafka mark https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/apachekafka.svg (verified)
- **Description:** Run a single-node KRaft Kafka locally, browse topics, consumer groups and lag, and manage Strimzi resources on clusters.

## 2. Real objects / fields / enums
- **Versions:** Streams for Apache Kafka **3.2** (LTS) = Apache Kafka **4.2.0**, Strimzi 0.51.0, HTTP Bridge 0.33.1, Cruise Control 2.5.146, Console 0.12, Proxy 0.20.0. Requires Apicurio Registry 3.x. Upstream Strimzi 1.2.0, StreamsHub Console 0.14.1.
- **Images:** product `registry.redhat.io/amq-streams/kafka-42-rhel9:3.2.0` (naming follows `kafka-39-rhel9:2.9.0` pattern; unverified), console `registry.redhat.io/amq-streams/console-api-rhel9` / `console-ui-rhel9` (unverified); upstream `docker.io/apache/kafka:4.2.0`, `docker.io/apache/kafka-native:4.2.0`, `quay.io/streamshub/console-api:0.14.1`, `quay.io/streamshub/console-ui:0.14.1`.
- **KRaft single node env (apache/kafka):** `KAFKA_NODE_ID=1`, `KAFKA_PROCESS_ROLES=broker,controller`, `KAFKA_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093`, `KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092`, `KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093`, `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1`, `CLUSTER_ID`. Ports 9092 (client), 9093 (controller).
- **Topic fields** (Admin API / `kafka-topics.sh --describe`): `name`, `topicId`, `partitionCount`, `replicationFactor`, `configs` (`cleanup.policy` delete|compact|"compact,delete", `retention.ms`, `min.insync.replicas`), per partition `leader`, `replicas`, `isr`.
- **Consumer groups** (`kafka-consumer-groups.sh --describe`): `GROUP`, `TOPIC`, `PARTITION`, `CURRENT-OFFSET`, `LOG-END-OFFSET`, `LAG`, `CONSUMER-ID`, `HOST`, `CLIENT-ID`; group state enum `Stable`, `PreparingRebalance`, `CompletingRebalance`, `Empty`, `Dead`, `Assigning`, `Reconciling` (KIP-848 consumer protocol default in Kafka 4.x).
- **Console API:** `GET /api/kafkas`, `/api/kafkas/{id}/topics`, `/api/kafkas/{id}/consumerGroups`, `/api/kafkas/{id}/topics/{tid}/records` (UI on 3000, API on 8080; unverified ports).
- **Strimzi CRDs** (`kafka.strimzi.io/v1` served since Strimzi 0.49 and the only version in Strimzi 1.x; `v1beta2` older; unverified exact cut-over): `Kafka` (status `conditions[type=Ready]`, `listeners[].bootstrapServers`, `kafkaVersion`, `clusterId`), `KafkaNodePool` (`spec.roles: [controller, broker]`, `replicas`, `storage.type` ephemeral|persistent-claim|jbod), `KafkaTopic` (label `strimzi.io/cluster`, `spec.partitions`, `replicas`, `config`), `KafkaUser` (`authentication.type` tls|scram-sha-512|tls-external, `authorization.type: simple`), plus `KafkaConnect`, `KafkaConnector`, `KafkaRebalance`, `KafkaBridge`, `KafkaMirrorMaker2`.

## 3. Placement in the mockup
- **connections (service, P8):** `ServiceProviderConnection` kind `kafka` named `acme-kafka` (bootstrap `localhost:9092`), status from container state; also auto-detected Quarkus dev-service Kafka.
- **connectionFactories (P12/P18):** "Create Kafka" form: flavor (Streams 3.2 product image | apache/kafka | kafka-native), port, CLUSTER_ID, "Also start Console", pre-create topics.
- **navSections (P2) under the Kafka connection:** Topics, Consumer groups, Brokers, Console (when `console.enabled`).
- **tabs (P14):** container detail "Kafka" tab (listeners, topic count); Kubernetes connection detail tab "Kafka clusters" (Strimzi `Kafka` CRs via P4 list/watch, `when: crd.kafka.strimzi.io present`).
- **addons (P13):** "Streams for Apache Kafka operator" add-on for kind/OpenShift Local clusters.
- **menus:** topic row: Produce message, View records, Delete; group row: Reset offsets (to-earliest/to-latest/to-datetime).
- **columns:** consumer-group "Lag" with sparkline; **dashboardCards (P17):** "Total lag across groups".
- **registries/accounts (P16):** registry.redhat.io pull via Red Hat SSO.

## 4. Journeys
1. **Create local Kafka.** Resources -> Create -> Kafka -> flavor "Streams for Apache Kafka 3.2" -> topics `orders.created,payments` (3 partitions) -> Create. Task "Start Kafka acme-kafka" (~20 s: pull image 410 MB, start container, wait `Kafka Server started`, create 2 topics, start console-api/ui). World: service connection `acme-kafka` Running, nav Topics shows 2 topics + internal `__consumer_offsets`.
2. **Find consumer lag.** acme-kafka -> Consumer groups -> `acme-orders-payments` state Stable, lag 1,284 on `payments` p2 -> click -> per-partition table -> "Reset offsets to latest" (requires group Empty; dialog warns, offers "Stop consumer container") -> task "Reset offsets" (~2 s) -> lag 0.
3. **Strimzi on cluster.** Kubernetes connection `kind-dev` -> tab "Kafka clusters" -> `orders-cluster` (Ready, 4.2.0, node pools `dual-role` x1) -> KafkaTopics list; "Create KafkaTopic" applies YAML -> Ready condition after ~5 s.

## 5. Sample data
```json
[
  {"kind":"connection","name":"acme-kafka","type":"kafka","image":"registry.redhat.io/amq-streams/kafka-42-rhel9:3.2.0","bootstrap":"localhost:9092","clusterId":"q1Sh-9_ISia_zwGINzRvyQ","kafkaVersion":"4.2.0","status":"started","consoleUrl":"http://localhost:3000"},
  {"name":"orders.created","topicId":"m2Z0r8xvQ1ugP6h3lK9T0A","partitionCount":3,"replicationFactor":1,"configs":{"cleanup.policy":"delete","retention.ms":"604800000"},"messages":18452},
  {"name":"orders.cdc.public.orders","topicId":"Yb4n7QpWTa2cE1kF0sJ3dg","partitionCount":1,"replicationFactor":1,"configs":{"cleanup.policy":"delete"},"messages":9731},
  {"name":"payments","topicId":"3HcVt5oYRxK8wLj2nB7aQe","partitionCount":3,"replicationFactor":1,"configs":{"cleanup.policy":"compact,delete","retention.ms":"259200000"},"messages":17630},
  {"name":"__consumer_offsets","internal":true,"partitionCount":50,"replicationFactor":1},
  {"groupId":"acme-orders-payments","state":"Stable","protocol":"consumer","members":1,"offsets":[{"topic":"payments","partition":0,"currentOffset":5880,"logEndOffset":5880,"lag":0},{"topic":"payments","partition":1,"currentOffset":5871,"logEndOffset":5871,"lag":0},{"topic":"payments","partition":2,"currentOffset":4595,"logEndOffset":5879,"lag":1284}]},
  {"groupId":"inventory-service","state":"Empty","protocol":"classic","members":0,"totalLag":312},
  {"apiVersion":"kafka.strimzi.io/v1","kind":"Kafka","metadata":{"name":"orders-cluster","namespace":"acme-dev","annotations":{"strimzi.io/node-pools":"enabled","strimzi.io/kraft":"enabled"}},"status":{"conditions":[{"type":"Ready","status":"True","lastTransitionTime":"2026-10-06T14:22:10Z"}],"kafkaVersion":"4.2.0","listeners":[{"name":"plain","bootstrapServers":"orders-cluster-kafka-bootstrap.acme-dev.svc:9092"}],"clusterId":"Hx7a-2LpQvO0f3bWm9eR1g"}},
  {"apiVersion":"kafka.strimzi.io/v1","kind":"KafkaNodePool","metadata":{"name":"dual-role","namespace":"acme-dev","labels":{"strimzi.io/cluster":"orders-cluster"}},"spec":{"replicas":1,"roles":["controller","broker"],"storage":{"type":"persistent-claim","size":"10Gi"}},"status":{"nodeIds":[0],"replicas":1}},
  {"apiVersion":"kafka.strimzi.io/v1","kind":"KafkaTopic","metadata":{"name":"orders.created","namespace":"acme-dev","labels":{"strimzi.io/cluster":"orders-cluster"}},"spec":{"partitions":3,"replicas":1,"config":{"retention.ms":604800000}},"status":{"topicName":"orders.created","topicId":"m2Z0r8xvQ1ugP6h3lK9T0A","conditions":[{"type":"Ready","status":"True"}]}},
  {"apiVersion":"kafka.strimzi.io/v1","kind":"KafkaUser","metadata":{"name":"acme-orders","namespace":"acme-dev","labels":{"strimzi.io/cluster":"orders-cluster"}},"spec":{"authentication":{"type":"scram-sha-512"},"authorization":{"type":"simple","acls":[{"resource":{"type":"topic","name":"orders.","patternType":"prefix"},"operations":["Read","Write","Describe"]}]}},"status":{"secret":"acme-orders","username":"acme-orders"}}
]
```

## Sources
- https://docs.redhat.com/en/documentation/red_hat_streams_for_apache_kafka/3.2/html-single/release_notes_for_streams_for_apache_kafka_3.2_on_openshift/index
- https://hub.docker.com/r/apache/kafka
- https://github.com/strimzi/strimzi-kafka-operator/releases
- https://strimzi.io/docs/operators/latest/configuring
- https://github.com/streamshub/console
- https://kafka.apache.org/documentation/#basic_ops_consumer_group
