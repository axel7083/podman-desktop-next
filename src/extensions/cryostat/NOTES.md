# Cryostat (`redhat.cryostat`, proposed)

Cryostat 4.2 (upstream `quay.io/cryostat/cryostat:4.2.0`; Red Hat build 4.1.x) runs as a compose
stack next to the JVM containers and discovers them over the Podman socket.

## Real objects (shapes in `data.ts`)
- **Target** `GET /api/v4/targets`: `id, jvmId, alias, connectUrl, agent, labels[{key,value}], annotations.cryostat{REALM, HOST, PORT, JAVA_MAIN}`.
- **Container discovery labels**: `io.cryostat.discovery=true`, `io.cryostat.jmxPort`, `io.cryostat.jmxHost`, `io.cryostat.jmxUrl` (polled every 10 s).
- **Active recording** `/api/v4/targets/{id}/recordings`: `state` = `jdk.jfr.RecordingState` (NEW · DELAYED · RUNNING · STOPPED · CLOSED), `duration` (ms, 0 = continuous), `archiveOnStop`, `metadata.labels`.
- **Archives** `GET /api/v4/recordings`: `name, jvmId, size, archivedTime, downloadUrl, reportUrl` (S3 bucket `archivedrecordings`).
- **Event templates** Continuous / Profiling / ALL / CUSTOM; **rules** `matchExpression` (CEL), `eventSpecifier`, `archivalPeriodSeconds`, `preservedArchives`.
- **Automated report**: rule scores 0–100 (0–24 OK, 25–74 information, 75–100 warning); Grafana on :3000 through jfr-datasource.

## Placement (P#)
| Contribution | Where | P# |
|---|---|---|
| `tabs` `jfr` | Container details › JFR, when `io.cryostat.discovery=true` | P14 |
| `menus` kebab | "Start JFR recording" (discoverable) · "Make discoverable by Cryostat" (Java-looking image) | P14 |
| `tools` `cryostat` | Tools › Cryostat: Targets / Recordings / Archives / Event templates / Automated rules | P3 |
| `dashboardCards` | "Active JFR recordings" | P17 |
| `seed` | `cryostat`, `cryostat-db`, `cryostat-s3` labelled `com.docker.compose.project=cryostat` (compose grouper) | P8 (local service) |

## Journeys
1. `acme-orders-dev` › JFR › **Start recording** (orders-load-test, Profiling, 60 s) → RUNNING with countdown → STOPPED → task "Archive and analyse orders-load-test" → report: Hot Methods 78 warning (`OrderResource.create`), flame graph, top allocations → **Open in Grafana**.
2. A Java container without labels › kebab **Make discoverable by Cryostat** → task "Recreate <name> with JMX" → toast "Target FOUND: <name>" → JFR tab appears.
3. Tools › Cryostat › Targets → click `acme-orders-dev` → its JFR tab.

## Mock decisions
- Time compression: a recording advances 10 s per (speed-scaled) second, so a 60 s recording takes ~6 s at 1×. Timers are not persisted; the JFR tab, tool page and dashboard card resume them after a reload.
- "Archive and analyse when it stops" (default on) chains the archive task automatically; the button stays available for stopped recordings that were not archived.
- `acme-orders-dev` is seeded by `redhat.quarkus`; recordings are keyed by target alias, so seed order does not matter.
- No service connection is contributed yet (the dossier proposes "Cryostat (local)"): the tool page shows the server status from the seeded container instead.

## Sources
docs/research/redhat.cryostat.md (cryostat `Target.java`, `ActiveRecording.java`, `Rule.java`, `ContainerDiscovery.java`, `compose/cryostat.yml`, v4.2.0 release).
