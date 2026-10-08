# Scenario: App developer (Java / middleware)

**Persona: Maya, a senior Java developer at Acme Retail.** She has two jobs this quarter:
1. Ship a new event-driven service, `acme-orders` (Red Hat build of Quarkus 3.33).
2. Migrate a legacy JBoss EAP 7.4 WAR, `inventory-service`, to EAP 8.1 (and possibly to Quarkus).

She doesn't care about "containers" as such. She wants her services running, visible and debuggable.

## Environment fixtures
- **Host and engine:** Fedora 44 laptop, 32 GB RAM. Podman 5.7 rootless, `podman-machine-default` (Linux native socket). Docker-compat socket on.
- **Projects (P15 workspace):**
  - `~/dev/acme-orders`: Quarkus (Maven), detected extensions `jdbc-postgresql, messaging-kafka, apicurio-registry-avro, oidc`.
  - `~/dev/inventory-service`: EAP 7.4 WAR (Java EE 8, RH-SSO 7.6 adapter, JMS, Infinispan).
  - `~/dev/acme-integrations`: Camel YAML routes.
- **Running containers:**
  - **Quarkus Dev Services**, each labelled `io.quarkus.devservice`:
    - `postgres:18` (`datasource=default`)
    - `apache/kafka-native:4.2.0`
    - `quay.io/keycloak/keycloak:26.x`, published on host port 8180
    - `apicurio-registry:3.3.1`
  - **Testcontainers session** from a `mvn verify`: Ryuk plus 2 containers labelled `org.testcontainers.sessionId=…`.
  - `acme-orders-dev`: JVM 21, discovered by Cryostat through the `io.cryostat.discovery=true` labels.
- **Service connections (P8):**
  - Streams for Apache Kafka (KRaft) + StreamsHub Console on port 3000
  - Apicurio Registry 3 on port 8080
  - Red Hat build of Keycloak 26.4 (realm `acme`)
  - AMQ Broker 7.13 (stopped)
  - Data Grid 8.6 (stopped)
  - RHDH Local 1.10.3
- **Kafka data:**
  - topics `orders.created`, `payments`, `orders.cdc.public.orders`
  - consumer group `inventory-projector` with a lag of 42
- **Tools pages:** MTA (8.1 / kantra), Kaoto 2.13, Cryostat 4.x, Dev Containers.
- **Image checkers:** MTA/EOL hints on `jboss-eap-7/eap74-openjdk11` images.

## The 5 most impressive journeys
1. **"Dev Services, finally visible."**
   - Containers list → the P10 grouper folds 4 containers into an **acme-orders · Quarkus Dev Services** group, with a Quarkus badge and an "Open Dev UI" (`http://localhost:8080/q/dev-ui`) action.
   - "Stop all" on the group → each container status animates to *exited*.
   - The Testcontainers session collapses next to it as a separate group, with its Ryuk reaper hidden behind a "+1 infra" chip.
2. **"Event flow in one place."**
   - Primary nav → the **Kafka (local)** service connection → secondary nav *Topics / Consumer groups / Schemas / Connectors*.
   - Click `orders.created` → partitions and messages. The Avro schema is resolved from Apicurio (`acme.orders/OrderCreated` v3, BACKWARD compatibility).
   - The `inventory-projector` group shows a lag of 42 with a "Reset offsets" action.
3. **"CDC from my database in two clicks."**
   - PostgreSQL container → kebab **Stream changes with Debezium** (P14 menu).
   - Wizard: tables `public.orders`, `snapshot.mode=initial`.
   - Task "Enable logical replication" (it restarts Postgres with `wal_level=logical`), then the task "Create connector `acme-orders-cdc`" → RUNNING.
   - The new topic `orders.cdc.public.orders` appears under Kafka.
4. **"Migrate the legacy app with AI help."**
   - Tools → MTA → *Analyze* `~/dev/inventory-service`, sources `eap7`, targets `eap8` + `quarkus`.
   - Task (hybrid mode; a `java-external-provider` container appears transiently) with streaming log, about 2 min.
   - Report: 14 mandatory / 9 optional / 5 potential issues, story points 63. Top rule `javaee-to-jakarta-namespaces-00001` (212 incidents).
   - "Generate fix with Konveyor AI" on a `keycloak-openid-00001` incident (it uses the local AI Lab model) → diff preview.
   - Then "Containerize with EAP 8.1": wildfly-glow detects layers `jaxrs-server, jpa, ejb-lite, messaging-activemq, elytron-oidc-client` → trimmed image built, about 180 MB smaller.
5. **"Profile the running service."**
   - `acme-orders-dev` container → **JFR** tab (Cryostat, P14) → Start recording with template *Profiling*, 60 s → state RUNNING → STOPPED.
   - Flame-graph and top-allocations summary. The recording is archived and the Grafana link opens.

**Supporting moments:**
- **Keycloak:** `realm acme`, *Clients* → `acme-orders` → copy the OIDC well-known URL into `application.properties`.
- **Dev Containers:** "Reopen in container" from `.devcontainer/devcontainer.json` (`java:21` + `quarkus-cli` features).
- **RHDH Local:** create a new service from the "Quarkus + Kafka" software template.
- **Kaoto:** open `orders-to-kafka.camel.yaml` → *Run with Camel JBang* → `camel ps` shows the route Started.

Dossiers: `redhat.quarkus, testcontainers, redhat.streams-kafka, redhat.apicurio-registry, redhat.debezium, redhat.keycloak, redhat.datagrid, redhat.amq-broker, redhat.jboss-eap, redhat.mta, redhat.cryostat, redhat.kaoto, devcontainers, redhat.rhdh-local`.
