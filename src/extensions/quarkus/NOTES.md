# redhat.quarkus (proposed)

**Product:** Red Hat build of Quarkus 3.33.3 (upstream 3.40). Dev mode on
:8080, Dev UI `/q/dev-ui` (Dev Services page `/q/dev-ui/dev-services`), debug 5005.

**Labels on Dev Services containers** (`io.quarkus.devservices.common.Labels`):
`io.quarkus.devservice=<service>`, `quarkus-dev-service-<x>=<shared name>`,
`io.quarkus.devservice.launch-mode=DEVELOPMENT|TEST`,
`io.quarkus.devservice.process-uuid`, plus Testcontainers marker labels
(`org.testcontainers.sessionId`…). Default images postgres:18,
apache/kafka-native:4.2.0, keycloak:26.7.4, apicurio-registry:3.3.1.

**Mock:** grouper on the process UUID → "acme-orders (Dev Services)" (P10, with
`groupName`/`groupDetails`), group actions "Open Dev UI" / "Open project" next to
the built-in Stop all; container tab "Quarkus" (service, sharing, injected
config, hand-off to the Kafka console) (P14); Tools › Quarkus (P3, P15 project:
start/stop dev mode spawns/removes the Dev Services, Build image task); CLI tool
`quarkus` 3.33.3; dashboard card (P17). Seeds `acme-orders-dev` (JVM 21,
Cryostat discovery labels).
Sources: docs/research/redhat.quarkus.md.
