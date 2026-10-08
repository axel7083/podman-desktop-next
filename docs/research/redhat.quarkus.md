# Quarkus Dev Services (Red Hat build of Quarkus)

## 1. Identity
- **Display name:** Quarkus (Red Hat build of Quarkus)
- **Extension id:** `redhat.quarkus` (proposed; no Podman Desktop extension exists today)
- **Icon:** https://raw.githubusercontent.com/quarkusio/quarkus/main/docs/src/main/resources/theme/images/quarkus-logo.svg (verified 200 image/svg+xml; fallback mono https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/quarkus.svg)
- **Description:** Detect Quarkus projects, see the Dev Services containers they spawn, and run `quarkus dev`/build/image tasks.

## 2. Real objects / fields / enums
- **Versions:** upstream Quarkus 3.40.1 (2026-09-30); Red Hat build of Quarkus **3.33.x** (LTS stream, 3.33.3 released 2026-08-13). Previous RH LTS 3.27. Project generator for product builds: https://code.quarkus.redhat.com (BOM `com.redhat.quarkus.platform:quarkus-bom:3.33.3.redhat-00001`, suffix unverified).
- **Container labels set on Dev Services containers** (`io.quarkus.devservices.common.Labels`, `ConfigureUtil`):
  - `io.quarkus.devservice=<service-name>` (dev mode only; e.g. `kafka`, `keycloak`, `mongo`)
  - per-service shared label `quarkus-dev-service-<x>=<service-name>`: real constants `quarkus-dev-service-kafka`, `quarkus-dev-service-keycloak`, etc. (value = `quarkus.<ext>.devservices.service-name`, default e.g. `kafka`). Used to locate and share a running container across apps (`shared=true`).
  - `io.quarkus.devservice.launch-mode=DEVELOPMENT|TEST`
  - `io.quarkus.devservice.process-uuid=<uuid>` (omitted when Testcontainers reuse is on)
  - `datasource=default|<name>` on DB containers
  - plus all Testcontainers labels (`org.testcontainers=true`, `org.testcontainers.sessionId`, `org.testcontainers.lang=java`, `org.testcontainers.version=2.0.5`) since Dev Services run on Testcontainers 2.0.5.
  - shared network: `org.testcontainers.containers.Network.SHARED` created with label `quarkus.devservices.network=shared`.
  - Compose Dev Services: `com.docker.compose.project`, `io.quarkus.devservices.compose.*` (`.ignore`, `.wait_for.logs`, `.exposed_ports`).
- **Config:** `quarkus.devservices.enabled`, `quarkus.devservices.launch-on-shared-network`, `quarkus.datasource.devservices.image-name|port|reuse`, `quarkus.kafka.devservices.provider` enum `upstream-kafka-native` (default) | `upstream-kafka` | `strimzi` | `redpanda` | `kafka-native` (deprecated), `quarkus.kafka.devservices.shared` (default true), `quarkus.kafka.devservices.service-name` (default `kafka`), `quarkus.keycloak.devservices.realm-path`, `quarkus.apicurio-registry.devservices.image-name`.
- **Default images** (quarkus `build-parent/pom.xml`, main): `docker.io/library/postgres:18`, `quay.io/keycloak/keycloak:26.7.4` (admin/admin, port 8080), `docker.io/apache/kafka-native:4.2.0`, `docker.io/apache/kafka:4.2.0`, `quay.io/strimzi-test-container/test-container:0.115.0-kafka-4.2.0`, `docker.io/redpandadata/redpanda:v26.1.12`, `quay.io/apicurio/apicurio-registry:3.3.1`, `docker.io/library/redis:8`, `docker.io/grafana/otel-lgtm:0.31.0`. RH build 3.33 may pin older tags (unverified).
- **Dev mode:** app on `http://localhost:8080`, Dev UI at `/q/dev-ui` (Dev Services page `/q/dev-ui/dev-services`), health `/q/health`, OpenAPI `/q/openapi`, Swagger UI `/q/swagger-ui`, debug port 5005, continuous testing (`r` key).
- **CLI (`quarkus`):** `quarkus create app com.acme:acme-orders --extensions=rest,jdbc-postgresql,messaging-kafka,oidc`, `quarkus dev`, `quarkus build [--native]`, `quarkus ext add|list|remove <ext>`, `quarkus image build [docker|podman|jib|buildpack]`, `quarkus image push`, `quarkus deploy [kubernetes|openshift|knative|kind|minikube]`, `quarkus test`, `quarkus info`, `quarkus update`.

## 3. Placement in the mockup
- **Project/workspace (P15):** folder `~/dev/acme-orders` detected as stack `quarkus` (pom.xml with `io.quarkus.platform`), linked containers = those labelled `io.quarkus.devservice` or with sessionId of the dev JVM.
- **groupers (P10):** "Quarkus Dev Services" group on Containers list, keyed on `io.quarkus.devservice` (sub-group by `quarkus-dev-service-*` shared name).
- **columns:** "Dev Service" (label value), "Launch mode" (DEVELOPMENT/TEST).
- **tabs (P14):** container detail tab "Quarkus" showing service name, injected config (`quarkus.datasource.jdbc.url`, `kafka.bootstrap.servers`), link to `/q/dev-ui/dev-services`.
- **tools (P3):** Tools > Quarkus: projects list, CLI version, "Create app" form (code.quarkus.redhat.com stream picker).
- **menus:** project kebab: Dev mode / Build / Build image / Deploy; container kebab: Open Dev UI.
- **cliTools:** `quarkus` CLI (install via JBang/SDKMAN), version + update.
- **tasks (P15):** `quarkus dev` (long-running, logs), `quarkus image build podman`.
- **dashboardCards (P17):** "Dev mode running: acme-orders (4 dev services)".

## 4. Journeys
1. **Start dev mode.** Maya opens Projects -> `acme-orders` -> clicks "Dev mode". Task "quarkus dev (acme-orders)" (~25 s): log lines `Dev Services for the default datasource (postgresql) started`, `Dev Services for Kafka started. Other Quarkus applications in dev mode will find the broker automatically`, `Dev Services for Keycloak started`, `Listening on: http://localhost:8080`, `Profile dev activated. Live Coding activated.` World: 4 containers appear under group "Quarkus Dev Services: acme-orders" (postgres, kafka-native, keycloak, apicurio-registry); task stays "Running" with Stop button; toast "Dev UI ready" with link.
2. **Inspect a dev service.** Containers -> group -> `kafka` container -> tab "Quarkus" -> sees `kafka.bootstrap.servers=OUTSIDE://localhost:32791`, label `quarkus-dev-service-kafka=kafka`, "Shared with: inventory-service". Click "Open in Kafka Console" (handoff to `redhat.streams-kafka`).
3. **Build and deploy image.** Project kebab -> "Build image" -> task "quarkus image build podman" (~90 s, steps: package, build image `acme/acme-orders:1.4.0-SNAPSHOT`) -> image appears in Images; then "Deploy" -> pick kube context `kind-dev` -> task "quarkus deploy kubernetes" -> Deployment `acme-orders` in namespace `acme-dev`.

## 5. Sample data
```json
[
  {"Id":"6f1c2a9d0b3e","Image":"docker.io/library/postgres:18","Names":["/quizzical_pasteur"],"State":"running","Ports":[{"PrivatePort":5432,"PublicPort":32788}],"Labels":{"io.quarkus.devservice":"postgresql","datasource":"default","io.quarkus.devservice.launch-mode":"DEVELOPMENT","io.quarkus.devservice.process-uuid":"5d2b1e0a-77c1-4f53-9a0e-2f6c1b8d4e11","org.testcontainers":"true","org.testcontainers.lang":"java","org.testcontainers.version":"2.0.5","org.testcontainers.sessionId":"a3f0c9e2-1b44-4c8e-b7a1-90d2e6f3c5aa"},"Created":"2026-10-08T09:02:11Z"},
  {"Id":"9b7e44c1d2f0","Image":"docker.io/apache/kafka-native:4.2.0","State":"running","Ports":[{"PrivatePort":9092,"PublicPort":32791}],"Labels":{"io.quarkus.devservice":"kafka","quarkus-dev-service-kafka":"kafka","io.quarkus.devservice.launch-mode":"DEVELOPMENT","org.testcontainers":"true","org.testcontainers.sessionId":"a3f0c9e2-1b44-4c8e-b7a1-90d2e6f3c5aa"},"Created":"2026-10-08T09:02:13Z"},
  {"Id":"c40d8e1f7a22","Image":"quay.io/keycloak/keycloak:26.7.4","State":"running","Ports":[{"PrivatePort":8080,"PublicPort":32795}],"Labels":{"io.quarkus.devservice":"keycloak","quarkus-dev-service-keycloak":"quarkus","io.quarkus.devservice.launch-mode":"DEVELOPMENT","org.testcontainers":"true"},"Created":"2026-10-08T09:02:19Z"},
  {"Id":"e81a5f3b9c07","Image":"quay.io/apicurio/apicurio-registry:3.3.1","State":"running","Ports":[{"PrivatePort":8080,"PublicPort":32797}],"Labels":{"io.quarkus.devservice":"apicurio-registry","quarkus-dev-service-apicurio-registry":"apicurio-registry","org.testcontainers":"true"},"Created":"2026-10-08T09:02:15Z"},
  {"Id":"12ab34cd56ef","Image":"testcontainers/ryuk:0.14.0","State":"running","Labels":{"org.testcontainers":"true","org.testcontainers.ryuk":"true","org.testcontainers.sessionId":"a3f0c9e2-1b44-4c8e-b7a1-90d2e6f3c5aa"},"Created":"2026-10-08T09:02:09Z"},
  {"network":{"Name":"testcontainers-shared-4f2a","Labels":{"quarkus.devservices.network":"shared","org.testcontainers":"true"}}},
  {"project":{"path":"~/dev/acme-orders","stack":"quarkus","quarkusPlatform":"3.33.3.redhat-00001","extensions":["rest-jackson","jdbc-postgresql","hibernate-orm-panache","messaging-kafka","apicurio-registry-avro","oidc","smallrye-health"],"devMode":{"pid":48211,"url":"http://localhost:8080","devUi":"http://localhost:8080/q/dev-ui","debugPort":5005}}},
  {"injectedConfig":{"quarkus.datasource.jdbc.url":"jdbc:postgresql://localhost:32788/quarkus?loggerLevel=OFF","quarkus.datasource.username":"quarkus","kafka.bootstrap.servers":"OUTSIDE://localhost:32791","quarkus.oidc.auth-server-url":"http://localhost:32795/realms/quarkus","mp.messaging.connector.smallrye-kafka.apicurio.registry.url":"http://localhost:32797/apis/registry/v3"}}
]
```

## Sources
- https://github.com/quarkusio/quarkus/blob/main/extensions/devservices/common/src/main/java/io/quarkus/devservices/common/Labels.java
- https://github.com/quarkusio/quarkus/blob/main/extensions/devservices/common/src/main/java/io/quarkus/devservices/common/ConfigureUtil.java
- https://github.com/quarkusio/quarkus/blob/main/extensions/kafka-client/deployment/src/main/java/io/quarkus/kafka/client/deployment/KafkaDevServicesBuildTimeConfig.java
- https://github.com/quarkusio/quarkus/blob/main/build-parent/pom.xml
- https://quarkus.io/guides/dev-services
- https://quarkus.io/guides/cli-tooling
- https://docs.redhat.com/en/documentation/red_hat_build_of_quarkus/3.33/html/learn_whats_new_in_3.33/index
- https://access.redhat.com/errata/RHSA-2026:51653
- https://code.quarkus.redhat.com
