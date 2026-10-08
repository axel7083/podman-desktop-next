# Red Hat AMQ Broker

## 1. Identity
- **Display name:** Red Hat AMQ Broker
- **Extension id:** `redhat.amq-broker` (proposed; no existing Podman Desktop extension)
- **Icon:** https://raw.githubusercontent.com/apache/activemq-website/main/src/assets/img/activemq_logo_icon.svg (verified 200, image/svg+xml; Apache ActiveMQ feather icon). Wordmark alt: `.../activemq_logo_black.svg`.
- **Description:** Run a local AMQ Broker / ActiveMQ Artemis, inspect addresses and queues, and send/browse test messages for JMS apps.

## 2. Real objects & fields
- **Versions:** AMQ Broker **7.13** (LTS channel, UBI 9 images, Java 17/21). Upstream ActiveMQ Artemis tags reach **2.57.0**; AMQ 7.13 is based on Artemis 2.40.x (unverified).
- **Images:** `registry.redhat.io/amq7/amq-broker-rhel9:7.13` (tag unverified), community `quay.io/arkmq-org/activemq-artemis-broker:artemis.2.40.0` (unverified tag), `docker.io/apache/activemq-artemis:2.57.0`.
- **Env (apache image):** `ARTEMIS_USER` (default `artemis`), `ARTEMIS_PASSWORD` (default `artemis`), `ANONYMOUS_LOGIN` (`false`), `EXTRA_ARGS`. Red Hat image: `AMQ_USER`, `AMQ_PASSWORD`, `AMQ_ROLE`, `AMQ_NAME`.
- **Ports:** **61616** acceptor "artemis" (CORE, AMQP, STOMP, HORNETQ, MQTT, OPENWIRE), **5672** AMQP, **61613** STOMP, **1883** MQTT, **5445** HornetQ, **8161** web console (Hawtio, `/console`) + Jolokia (`/console/jolokia`).
- **Model:** *address* (name, routing types) -> *queues*. Routing types: `ANYCAST` (point-to-point, JMS Queue), `MULTICAST` (pub/sub, JMS Topic subscriptions). Queue attributes: `messageCount`, `consumerCount`, `deliveringCount`, `messagesAdded`, `messagesAcknowledged`, `messagesExpired`, `messagesKilled`, `scheduledCount`, `durable`, `temporary`, `paused`, `routingType`, `filter`, `maxConsumers`, `purgeOnNoConsumers`, `exclusive`, `lastValue`, `deadLetterAddress` (`DLQ`), `expiryAddress` (`ExpiryQueue`).
- **CLI:** `artemis queue stat --user artemis --password artemis --url tcp://localhost:61616` -> columns `NAME | ADDRESS | CONSUMER_COUNT | MESSAGE_COUNT | MESSAGES_ADDED | DELIVERING_COUNT | MESSAGES_ACKED | SCHEDULED_COUNT | ROUTING_TYPE`. Also `artemis address create --name orders --anycast`, `artemis queue create --name orders --address orders --anycast --durable`, `artemis producer --destination queue://orders --message-count 10`, `artemis consumer`, `artemis browser`, `artemis queue purge`.
- **Jolokia:** `GET /console/jolokia/read/org.apache.activemq.artemis:broker="0.0.0.0",component=addresses,address="orders",subcomponent=queues,routing-type="anycast",queue="orders"/MessageCount`; `exec .../broker="0.0.0.0"/listAddresses(java.lang.String)`; requires `Origin` header matching `jolokia-access.xml`.
- Legacy inventory-service: JMS 2.0 via EAP `messaging-activemq` subsystem `remote-connector` -> `pooled-connection-factory` `java:/jms/remote-mq`, queues `inventory.reservations`, topic `inventory.events`.

## 3. Placement (provider-first UI)
- **connections (P8, kind `service`):** "AMQ Broker" ServiceProviderConnection backed by container `amq-broker`; endpoints `tcp://localhost:61616`, `amqp://localhost:5672`, console URL.
- **connectionFactories (P12/P18):** Create broker: image (Red Hat/community), user/password, ports, preset addresses (from a YAML list).
- **navSections (P2)** under the connection: **Addresses**, **Queues**, **Connections/Consumers**.
- **columns:** queue name, address, routing type badge, durable, messages, consumers, delivering, added/acked.
- **groupers (P10):** group Queues by address.
- **menus:** queue row: Send test message, Browse messages, Purge, Pause/Resume, Move to DLQ; connection kebab: Open Hawtio console, Copy JMS URL, Run `artemis queue stat`.
- **tabs (P14):** on the `amq-broker` container: "Queues" tab; on `inventory-service` container: "Messaging" tab showing queues it consumes (consumer clientId match).
- **statusItems:** DLQ message count badge when > 0.
- **P15 tasks:** send/consume/purge run as tasks with log lines from the artemis CLI.

## 4. Journeys
1. **Start broker for inventory-service.** Services > Create AMQ Broker -> image `apache/activemq-artemis:2.57.0`, user `admin` -> task "Starting AMQ Broker" (pull 310 MB, create instance, log `AMQ221007: Server is now active`, ~12 s) -> service "amq-broker" Running with 61616/8161.
2. **Create address + queue.** Connection > Addresses > Create -> `inventory.reservations` ANYCAST, durable -> task "Create queue" (`artemis queue create ...`, 2 s) -> row appears: 0 messages, 0 consumers. Start inventory-service -> consumers becomes 3.
3. **Debug a stuck queue.** Dashboard status item "DLQ: 4" -> click -> Queues filtered to `DLQ` -> Browse -> 4 messages with `_AMQ_ORIG_ADDRESS=inventory.reservations` and `JMSXDeliveryCount=10` -> "Retry all" task (`retryMessages`, 1 s) -> DLQ 0, reservations messageCount 4 -> 0 once consumed.

## 5. Sample data
```json
{
  "broker": { "name": "0.0.0.0", "version": "2.57.0", "uptime": "2 hours 14 minutes", "acceptors": ["artemis:61616", "amqp:5672", "stomp:61613", "mqtt:1883"] },
  "addresses": [
    { "name": "inventory.reservations", "routingTypes": ["ANYCAST"], "queueCount": 1 },
    { "name": "inventory.events", "routingTypes": ["MULTICAST"], "queueCount": 2 },
    { "name": "acme.orders.created", "routingTypes": ["MULTICAST"], "queueCount": 1 },
    { "name": "DLQ", "routingTypes": ["ANYCAST"], "queueCount": 1 },
    { "name": "ExpiryQueue", "routingTypes": ["ANYCAST"], "queueCount": 1 }
  ],
  "queues": [
    { "name": "inventory.reservations", "address": "inventory.reservations", "routingType": "ANYCAST", "durable": true, "messageCount": 12, "consumerCount": 3, "deliveringCount": 3, "messagesAdded": 18422, "messagesAcknowledged": 18406, "scheduledCount": 0, "paused": false },
    { "name": "inventory-service.audit", "address": "inventory.events", "routingType": "MULTICAST", "durable": true, "messageCount": 0, "consumerCount": 1, "deliveringCount": 0, "messagesAdded": 5120, "messagesAcknowledged": 5120, "scheduledCount": 0, "paused": false },
    { "name": "acme-orders.inventory-sync", "address": "inventory.events", "routingType": "MULTICAST", "durable": true, "messageCount": 241, "consumerCount": 0, "deliveringCount": 0, "messagesAdded": 241, "messagesAcknowledged": 0, "scheduledCount": 0, "paused": false },
    { "name": "acme.orders.created", "address": "acme.orders.created", "routingType": "MULTICAST", "durable": false, "messageCount": 0, "consumerCount": 1, "deliveringCount": 0, "messagesAdded": 77, "messagesAcknowledged": 77, "scheduledCount": 0, "paused": false },
    { "name": "DLQ", "address": "DLQ", "routingType": "ANYCAST", "durable": true, "messageCount": 4, "consumerCount": 0, "deliveringCount": 0, "messagesAdded": 4, "messagesAcknowledged": 0, "scheduledCount": 0, "paused": false },
    { "name": "ExpiryQueue", "address": "ExpiryQueue", "routingType": "ANYCAST", "durable": true, "messageCount": 0, "consumerCount": 0, "deliveringCount": 0, "messagesAdded": 0, "messagesAcknowledged": 0, "scheduledCount": 0, "paused": false }
  ],
  "dlqMessage": { "messageID": 30812, "address": "DLQ", "durable": true, "timestamp": "2026-10-07T14:03:51Z", "properties": { "_AMQ_ORIG_ADDRESS": "inventory.reservations", "_AMQ_ORIG_QUEUE": "inventory.reservations", "JMSXDeliveryCount": 10 }, "body": "{\"sku\":\"ACME-4471\",\"qty\":2,\"orderId\":\"ord-20261007-0193\"}" }
}
```

## Sources
- https://docs.redhat.com/en/documentation/red_hat_amq_broker/7.13/html-single/release_notes_for_red_hat_amq_broker_7.13/index
- https://access.redhat.com/errata/RHBA-2026:3936
- https://activemq.apache.org/components/artemis/documentation/latest/address-model.html
- https://activemq.apache.org/components/artemis/documentation/latest/management.html
- https://activemq.apache.org/components/artemis/documentation/latest/docker.html
- https://hub.docker.com/r/apache/activemq-artemis
- https://github.com/arkmq-org/activemq-artemis-broker-image
- https://github.com/apache/activemq-artemis/tags (2.57.0)
