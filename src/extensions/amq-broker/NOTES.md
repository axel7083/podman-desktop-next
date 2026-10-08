# redhat.amq-broker – Red Hat AMQ Broker (proposed)

**Real objects.** ActiveMQ Artemis address model: address (name, routing types ANYCAST | MULTICAST) → queues
(messageCount, consumerCount, deliveringCount, messagesAdded, messagesAcknowledged, scheduledCount, durable, paused).
`artemis queue stat`, `artemis producer --destination queue://…`, `artemis queue purge`, `artemis address create`,
Jolokia `browse()` / `retryMessages()`. DLQ messages carry `_AMQ_ORIG_ADDRESS`, `_AMQ_ORIG_QUEUE`, `JMSXDeliveryCount`.

**Runtime.** AMQ Broker 7.13 (`registry.redhat.io/amq7/amq-broker-rhel9:7.13`, Artemis 2.40.x.redhat) or
`docker.io/apache/activemq-artemis:2.57.0`; ports 61616 (all protocols), 5672 AMQP, 8161 console.

**Placement.**
- P8 service connection `amq-broker`, **stopped** by default (container EXITED) → `ConnectionStoppedScreen`.
- P12 factory `amq` (Services catalog). P2 sections:
  - Queues: routing-type pill column, durable, messages, consumers, delivering; row Send test message, Browse messages
    (`?queue=` details with expandable messages and properties), Purge (confirm), Retry all (DLQ only, 4 messages).
  - Addresses: routing types, bound queues, messages; Create address (+ durable queue) and Delete address.
- P15 tasks for every action; palette "Browse dead-letter queue (DLQ)".

**Journeys.** (1) Start amq-broker. (2) Queues → DLQ → inspect `_AMQ_ORIG_ADDRESS=inventory.reservations` → Retry all.
(3) Addresses → Create address `inventory.backorders` ANYCAST.

**Sources.** activemq.apache.org Artemis address-model / management / docker docs, AMQ 7.13 release notes;
dossier `docs/research/redhat.amq-broker.md`.
