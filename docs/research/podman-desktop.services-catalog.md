# Local services catalog — Valkey, Grafana otel-lgtm (O10)

## 1. Identity
- **Display name:** Services · **Extension id:** `podman-desktop.services` (proposed; generalizes `/home/astefani/github/podman-desktop/ext-postgresql/`) · **Icon:** https://github.com/valkey-io.png / https://github.com/grafana.png per entry
- **Description:** One-click local backing services that other extensions and your apps can discover.

## 2. Real objects & fields
- **Valkey 9.1.2** (2026-09-01): `docker.io/valkey/valkey:9.1`, port 6379, `valkey-cli ping` → `PONG` health, `--requirepass`, data `/data`. Connection string `redis://:pw@localhost:6379/0`.
- **Grafana otel-lgtm v0.35.0** (2026-10-02): `docker.io/grafana/otel-lgtm:0.35.0` — Grafana `:3000` (admin/admin), OTLP gRPC `:4317`, OTLP HTTP `:4318`; bundles Loki, Tempo, Prometheus/Mimir, Pyroscope.
- Service object (P8 `ServiceProviderConnection` proposal): `{id, kind:"valkey"|"otel-lgtm"|"postgresql", status, endpoints[{name, url}], credentials?, container, labels{io.podman-desktop.service=<kind>}}`; containers grouped by that label (P10).

## 3. Placement
- **connections (`service`)** in primary nav; **tools:** "Services catalog" gallery; **menus:** container "Send telemetry to otel-lgtm" (injects `OTEL_EXPORTER_OTLP_ENDPOINT`), service "Copy connection string". P#: **P8, P10**.

## 4. Journeys
1. Catalog → otel-lgtm → running → `orders-api` "Send telemetry" → Open Grafana → traces in Tempo.
2. Catalog → Valkey → copy URL → Quarkus Dev Services detects existing service (P8 registry).

## 5. Sample data
```json
[{"id":"valkey-1","kind":"valkey","image":"docker.io/valkey/valkey:9.1","status":"running","endpoints":[{"name":"redis","url":"redis://localhost:6379"}],"health":"PONG"},
 {"id":"otel-lgtm-1","kind":"otel-lgtm","image":"docker.io/grafana/otel-lgtm:0.35.0","status":"running","endpoints":[{"name":"grafana","url":"http://localhost:3000"},{"name":"otlp-grpc","url":"http://localhost:4317"},{"name":"otlp-http","url":"http://localhost:4318"}]},
 {"id":"postgresql-1","kind":"postgresql","image":"registry.redhat.io/rhel9/postgresql-16:9.8","status":"stopped","endpoints":[{"name":"jdbc","url":"jdbc:postgresql://localhost:5432/orders"}]}]
```
