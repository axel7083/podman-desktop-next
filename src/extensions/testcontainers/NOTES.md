# podman-desktop.testcontainers (proposed)

**Product:** testcontainers-java 2.0.5, Ryuk `testcontainers/ryuk:0.14.0`.
Labels `org.testcontainers=true`, `org.testcontainers.sessionId` (one per JVM,
Ryuk reaps by it), `.lang`, `.version`, reuse `org.testcontainers.hash` (no
sessionId → kept). Config `~/.testcontainers.properties` (`docker.host`,
`testcontainers.reuse.enable`, `ryuk.container.privileged`), env `DOCKER_HOST`,
`TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE`.

**Mock:** grouper on the session id → "session e4b19f27 (Testcontainers)" with
`./mvnw verify · ~/dev/acme-orders · +1 infra (Ryuk)` (P10); group actions Kill
session / Copy env exports; Tools › Testcontainers (P3): environment checklist
with a "Fix" task, properties file, sessions (active / leaked / reusable),
"Run ./mvnw verify" simulation (containers appear, Ryuk removes them, toast),
"Clean leaked containers" (confirmation + task); status-bar counter (P17).
Quarkus Dev Services carry their own session id but are grouped by the Quarkus
grouper first (registry order).
Sources: docs/research/podman-desktop.testcontainers.md.
