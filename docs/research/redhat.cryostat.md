# Cryostat (JDK Flight Recorder)

## 1. Identity
- **Display name:** Cryostat
- **Extension id:** `redhat.cryostat` (proposed; no existing PD extension)
- **Icon:** https://raw.githubusercontent.com/cryostatio/cryostat-web/main/src/app/assets/cryostat_icon_rgb_default.svg (verified 200 `image/svg+xml`)
- **Description:** Run a local Cryostat next to your JVM containers, auto-discover them over the Podman socket and capture/analyse JFR recordings.

## 2. Real objects & fields
- **Version:** upstream Cryostat **v4.2.0** (2026-05-27); Red Hat build of Cryostat **4.1.x** (4.1.1, RHSA-2026:3186, Feb 2026). Images: `quay.io/cryostat/cryostat:4.2.0` (upstream), `registry.redhat.io/cryostat/cryostat-rhel9:4.1` (product). Add-ons: `quay.io/cryostat/cryostat-grafana-dashboard`, `quay.io/cryostat/jfr-datasource`, `quay.io/cryostat/cryostat-reports` (tags unverified).
- **Run on Podman:** upstream `compose/cryostat.yml` mounts `${XDG_RUNTIME_DIR}/podman/podman.sock`, `security_opt: label:disable`, env `CRYOSTAT_DISCOVERY_PODMAN_ENABLED=true`, `CRYOSTAT_DISCOVERY_DOCKER_ENABLED`, `CRYOSTAT_DISCOVERY_JDP_ENABLED`; HTTP port **8181** (`/health/liveness`), auth proxy on **8080**; extra compose files `cryostat-grafana.yml`, `jfr-datasource.yml`, `db.yml`, `s3-seaweed.yml`.
- **Container discovery labels** (`ContainerDiscovery.java`): `io.cryostat.discovery=true`, `io.cryostat.jmxHost`, `io.cryostat.jmxPort` (e.g. `9091`), `io.cryostat.jmxUrl` (full `service:jmx:rmi:///jndi/rmi://host:9091/jmxrmi`). NOTE: there is no `io.cryostat.connectUrl` label; `connectUrl` is the Target field. Polled every `cryostat.discovery.containers.poll-period=10s`.
- **Cryostat Agent** (alternative to JMX): `-javaagent:/deployments/cryostat-agent.jar` with env `CRYOSTAT_AGENT_BASEURI=http://cryostat:8181`, `CRYOSTAT_AGENT_CALLBACK`, `CRYOSTAT_AGENT_APP_NAME`, `CRYOSTAT_AGENT_AUTHORIZATION` (env names from agent README, unverified exact set). Agent targets have `http://` connectUrls.
- **Target** (`Target.java`): `id`, `jvmId`, `connectUrl`, `alias`, `labels` `[{key,value}]`, `annotations {platform:{...}, cryostat:{REALM, HOST, PORT, JAVA_MAIN, PID, START_TIME}}`, `agent` bool; events `FOUND | MODIFIED | LOST`. REST `GET /api/v4/targets`.
- **Active recording** (`ActiveRecording.java`): `id`, `remoteId`, `name`, `state` = `jdk.jfr.RecordingState` **NEW | DELAYED | RUNNING | STOPPED | CLOSED**, `duration` (ms, 0 = continuous), `startTime`, `continuous`, `toDisk`, `maxSize`, `maxAge`, `archiveOnStop`, `metadata.labels`. REST `/api/v4/targets/{targetId}/recordings` (GET/POST; `PATCH /{remoteId}` body `STOP`/`SAVE`; DELETE).
- **Archived recordings:** `GET /api/v4/recordings` -> `{name, downloadUrl, reportUrl, metadata, size, archivedTime, jvmId}`; stored in S3 bucket `archivedrecordings`.
- **Event templates:** `Continuous` (JFR `default.jfc`), `Profiling` (`profile.jfc`), `ALL` (meta, every event), plus `CUSTOM` uploads; type `TARGET | CUSTOM | PRESET`; recording uses `events=template=Continuous,type=TARGET`. Path `/api/v4/event_templates` (unverified).
- **Automated rules** (`Rule.java`): `name`, `description`, `matchExpression` (CEL, e.g. `target.labels.exists(l, l.key == 'app' && l.value == 'acme-orders')`), `eventSpecifier`, `archivalPeriodSeconds`, `initialDelaySeconds`, `preservedArchives`, `maxAgeSeconds`, `maxSizeBytes`, `enabled`. REST `/api/v4/rules`.
- **Analysis:** automated report (rule scores 0-100, e.g. "GC Pressure", "Heap Content", "Hot Methods") via `reportUrl`; Grafana dashboard on port 3000 backed by jfr-datasource.

## 3. Placement
- **connections (kind `service`, P8):** "Cryostat (local)" `http://localhost:8181`, status from `/health/liveness`; **connectionFactories (P12/P18):** "Deploy Cryostat on Podman" (compose stack: cryostat + db + s3 + grafana).
- **navSections (P2):** under the Cryostat connection: Targets, Recordings, Archives, Event Templates, Automated Rules (`when: connection.kind == service && provider == cryostat`).
- **tabs (P14):** container detail "JFR" tab for containers where `io.cryostat.discovery=true` or a matching target exists (acme-orders-dev).
- **menus:** container kebab "Start JFR recording", "Make discoverable by Cryostat" (adds labels + JMX env, recreates container); recording row "Stop / Archive / Download .jfr / View report".
- **columns:** containers list "JFR" badge (target discovered / recording RUNNING). **dashboardCards (P17):** "Active JFR recordings". **statusItems:** red dot while a recording is RUNNING.
- **tasks (P15):** deploy stack, recreate container with labels, archive + analyse.

## 4. Journeys
1. **Deploy Cryostat.** Dashboard card "Profile your Java apps" -> Deploy -> task "Deploying Cryostat 4.2.0 on podman-machine-default" (pull `quay.io/cryostat/cryostat:4.2.0` 30%, create volumes `templates/probes/credentials`, start `cryostat`, `cryostat-db`, `s3`, wait `/health/liveness` 200; ~40 s) -> new service connection "Cryostat (local)" Running; Targets list shows `cryostat` itself.
2. **Make acme-orders-dev discoverable.** Containers -> acme-orders-dev kebab -> "Make discoverable by Cryostat" -> task "Recreate acme-orders-dev with JMX" (add `JAVA_TOOL_OPTIONS=-Dcom.sun.management.jmxremote.port=9091 ...`, labels `io.cryostat.discovery=true`, `io.cryostat.jmxPort=9091`; restart; ~15 s) -> toast "Target FOUND: acme-orders-dev" -> JFR tab appears.
3. **Record a load test.** JFR tab -> Start recording "orders-load-test", template Profiling, duration 5 min -> state RUNNING with countdown -> STOPPED -> "Archive and analyse" task (upload 12.4 MB, generate report ~8 s) -> report shows "Hot Methods: 78 (warning) - OrderResource.create"; button "Open in Grafana".

## 5. Sample data
```json
{
  "targets": [
    {"id": 3, "jvmId": "f1e2d3c4-acme-orders", "alias": "acme-orders-dev", "connectUrl": "service:jmx:rmi:///jndi/rmi://acme-orders-dev:9091/jmxrmi", "agent": false,
     "labels": [{"key": "io.cryostat.discovery", "value": "true"}, {"key": "app", "value": "acme-orders"}],
     "annotations": {"platform": {"PODMAN_CONTAINER": "acme-orders-dev"}, "cryostat": {"REALM": "Podman", "HOST": "acme-orders-dev", "PORT": "9091", "JAVA_MAIN": "io.quarkus.bootstrap.runner.QuarkusEntryPoint"}}},
    {"id": 4, "jvmId": "9a8b7c6d-inventory", "alias": "inventory-service", "connectUrl": "http://inventory-service:9977", "agent": true,
     "labels": [{"key": "app", "value": "inventory-service"}], "annotations": {"platform": {}, "cryostat": {"REALM": "CryostatAgent", "JAVA_MAIN": "jboss-modules.jar"}}},
    {"id": 1, "jvmId": "00aa11bb-cryostat", "alias": "cryostat", "connectUrl": "service:jmx:rmi:///jndi/rmi://localhost:0/jmxrmi", "agent": false, "labels": [], "annotations": {"platform": {}, "cryostat": {"REALM": "Custom Targets"}}}
  ],
  "recordings": [
    {"id": 21, "remoteId": 2, "name": "orders-load-test", "state": "RUNNING", "duration": 300000, "startTime": 1791453720000, "continuous": false, "toDisk": true, "maxSize": 0, "maxAge": 0, "metadata": {"labels": [{"key": "template.name", "value": "Profiling"}, {"key": "template.type", "value": "TARGET"}]}},
    {"id": 20, "remoteId": 1, "name": "auto_orders-continuous", "state": "RUNNING", "duration": 0, "startTime": 1791450000000, "continuous": true, "toDisk": true, "maxSize": 104857600, "maxAge": 3600000, "metadata": {"labels": [{"key": "rule", "value": "orders-continuous"}]}},
    {"id": 17, "remoteId": 3, "name": "startup-profile", "state": "STOPPED", "duration": 60000, "startTime": 1791446400000, "continuous": false, "toDisk": true, "maxSize": 0, "maxAge": 0, "metadata": {"labels": []}}
  ],
  "archives": [
    {"name": "acme-orders-dev_startup-profile_20261008T074600Z.jfr", "jvmId": "f1e2d3c4-acme-orders", "size": 13002752, "archivedTime": 1791446520000, "downloadUrl": "/api/v4/download/YWNtZS1vcmRlcnM...", "reportUrl": "/api/v4/reports/YWNtZS1vcmRlcnM..."}
  ],
  "eventTemplates": [
    {"name": "Continuous", "type": "TARGET", "provider": "Oracle", "description": "Low overhead configuration safe for continuous use in production environments, typically less than 1 % overhead."},
    {"name": "Profiling", "type": "TARGET", "provider": "Oracle", "description": "Low overhead configuration for profiling, typically around 2 % overhead."},
    {"name": "ALL", "type": "TARGET", "provider": "Cryostat", "description": "Enable all available events in the target JVM, with default option values."},
    {"name": "acme-gc-lock", "type": "CUSTOM", "provider": "Maya", "description": "GC + JavaMonitorEnter, 20 ms threshold"}
  ],
  "rules": [
    {"name": "orders-continuous", "description": "Always-on recording for acme-orders", "enabled": true, "matchExpression": "target.labels.exists(l, l.key == 'app' && l.value == 'acme-orders')", "eventSpecifier": "template=Continuous,type=TARGET", "archivalPeriodSeconds": 600, "initialDelaySeconds": 30, "preservedArchives": 6, "maxAgeSeconds": 3600, "maxSizeBytes": 104857600}
  ]
}
```

## Sources
- https://github.com/cryostatio/cryostat/releases (v4.2.0)
- https://github.com/cryostatio/cryostat/blob/main/compose/cryostat.yml
- https://github.com/cryostatio/cryostat/blob/main/src/main/java/io/cryostat/discovery/ContainerDiscovery.java
- https://github.com/cryostatio/cryostat/blob/main/src/main/java/io/cryostat/recordings/ActiveRecording.java
- https://github.com/cryostatio/cryostat/blob/main/src/main/java/io/cryostat/rules/Rule.java
- https://github.com/cryostatio/cryostat/blob/main/src/main/java/io/cryostat/targets/Target.java
- https://github.com/cryostatio/cryostat-agent
- https://access.redhat.com/errata/RHSA-2026:17789 , https://docs.redhat.com/en/documentation/red_hat_build_of_cryostat/4
