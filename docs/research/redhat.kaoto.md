# Kaoto + Camel JBang (Red Hat build of Apache Camel)

## 1. Identity
- **Display name:** Kaoto & Camel
- **Extension id:** `redhat.kaoto` (proposed; no existing PD extension. VS Code ext is `redhat.vscode-kaoto`)
- **Icon:** https://raw.githubusercontent.com/KaotoIO/kaoto/main/packages/ui/src/assets/logo-kaoto.svg (verified 200 `image/svg+xml`)
- **Description:** Design Camel integration routes visually with Kaoto, run them locally with Camel JBang against your Podman services, and export to Quarkus or Spring Boot.

## 2. Real objects & fields
- **Versions:** Kaoto **2.13.0** (2026-10-02); upstream Apache Camel **4.22.1**; Red Hat build of Apache Camel **4.14** LTS (4.14.2.redhat-00021, May 2026; Quarkus and Spring Boot flavours).
- **Kaoto container image:** `quay.io/kaotoio/kaoto-app:2.13.0` (also `:stable`, `:main`), serves the web designer on port **8080** (port unverified). Kaoto also ships as VS Code extension `redhat.vscode-kaoto`.
- **Camel JBang CLI** (`jbang app install camel@apache/camel`, or `camel` with `--camel-version=4.14.0.redhat-...`):
  - `camel init orders-to-kafka.camel.yaml` (template route), `camel run orders-to-kafka.camel.yaml --dev` (live reload), `camel run * --console`
  - `camel ps` (PID, NAME, READY, STATUS, AGE, TOTAL, FAIL, INFLIGHT), `camel get route` (PID, NAME, ID, FROM, STATUS, AGE, TOTAL, FAIL, MEAN, MIN, MAX), `camel stop <name>`, `camel log <name>`, `camel trace`
  - `camel export --runtime=quarkus|spring-boot|camel-main --gav=com.acme:acme-integrations:1.0.0 --directory=export/`
  - `camel kubernetes run orders-to-kafka.camel.yaml --cluster-type=openshift|kind|minikube` (builds image via Jib, applies manifests), `camel kubernetes delete`
  - `camel infra run kafka|postgres|keycloak` (dev services in containers, Camel 4.10+; unverified exact service list)
- **Route YAML DSL** (`*.camel.yaml`):
  ```yaml
  - route:
      id: orders-to-kafka
      from:
        uri: rest:post:/orders
        steps:
          - unmarshal: { json: {} }
          - setHeader: { name: kafka.KEY, simple: "${body[orderId]}" }
          - to: { uri: kafka:acme.orders.created?brokers={{kafka.brokers}} }
  ```
- **Kamelets catalog** (`apache/camel-kamelets`, ~250): types `source | sink | action`; e.g. `kafka-source`, `kafka-sink`, `postgresql-sink`, `http-sink`, `timer-source`, `log-action`. Used as `kamelet:postgresql-sink?serverName=...`.
- **Kaoto file types:** Camel Route (`.camel.yaml`), Kamelet (`.kamelet.yaml`), Pipe (`.pipe.yaml`, `kind: Pipe` with `source/steps/sink`), plus XML DSL.

## 3. Placement
- **tools (P3):** "Kaoto" designer page (webview of `kaoto-app` container or embedded) opening routes from `~/dev/acme-integrations`.
- **cliTools:** `camel` (JBang) and `jbang` installer/updater with version pinning to Red Hat build.
- **project/workspace (P15):** folder `~/dev/acme-integrations` detected stack "Apache Camel (YAML DSL)" from `*.camel.yaml`; linked to service connections Kafka/Postgres (P8) for `{{kafka.brokers}}` property injection.
- **tasks (P15):** `camel run` (long-running, logs, cancel = `camel stop`), `camel export`, `camel kubernetes run`.
- **navSections (P2):** under the workspace: Routes (from `camel get route`), Kamelets catalog.
- **menus:** route row "Open in Kaoto", "Run", "Export to Quarkus", "Deploy to cluster"; Kafka service connection "Create route from this topic". **dashboardCards (P17):** "Running integrations".

## 4. Journeys
1. **Design a route.** Workspace acme-integrations -> New route -> task "camel init orders-to-kafka.camel.yaml" (~1 s) -> opens in Kaoto tool; Maya drags `rest` -> `unmarshal json` -> `kafka` sink from Kamelets/Components palette; save writes YAML.
2. **Run locally against Podman Kafka.** Route row -> Run -> task "camel run orders-to-kafka.camel.yaml --dev" (log: `Apache Camel 4.14.0.redhat-00006 (orders-to-kafka) started in 812ms`, `Started orders-to-kafka (rest://post:/orders)`; stays running) -> Routes nav shows `Started`, TOTAL counters increase after a curl; Stop cancels task.
3. **Export and deploy.** Route row -> Export to Quarkus -> task "camel export --runtime=quarkus" (generate pom, `src/main/resources/camel/`, ~6 s) -> project appears as Quarkus app; then "Deploy to cluster" -> task "camel kubernetes run --cluster-type=kind" (Jib build, push to local registry, apply Deployment/Service; ~70 s) -> pod `orders-to-kafka-7c9d` Running in namespace `acme-dev`.

## 5. Sample data
```json
{
  "camelPs": [
    {"pid": 48211, "name": "orders-to-kafka", "ready": "1/1", "status": "Running", "age": "12m4s", "total": 342, "fail": 0, "inflight": 0},
    {"pid": 48390, "name": "inventory-sync", "ready": "1/1", "status": "Running", "age": "3m10s", "total": 58, "fail": 2, "inflight": 1}
  ],
  "camelGetRoute": [
    {"pid": 48211, "name": "orders-to-kafka", "id": "orders-to-kafka", "from": "rest://post:/orders", "status": "Started", "age": "12m4s", "total": 342, "fail": 0, "meanMs": 4, "minMs": 1, "maxMs": 61},
    {"pid": 48390, "name": "inventory-sync", "id": "poll-inventory", "from": "timer://inventory?period=30000", "status": "Started", "age": "3m10s", "total": 6, "fail": 0, "meanMs": 210, "minMs": 180, "maxMs": 402},
    {"pid": 48390, "name": "inventory-sync", "id": "inventory-to-postgres", "from": "kamelet://source", "status": "Started", "age": "3m10s", "total": 52, "fail": 2, "meanMs": 18, "minMs": 9, "maxMs": 95}
  ],
  "files": [
    {"path": "~/dev/acme-integrations/orders-to-kafka.camel.yaml", "kind": "Route", "modified": "2026-10-08T07:52:00Z"},
    {"path": "~/dev/acme-integrations/inventory-sync.camel.yaml", "kind": "Route", "modified": "2026-10-06T15:20:00Z"},
    {"path": "~/dev/acme-integrations/orders-audit.pipe.yaml", "kind": "Pipe", "modified": "2026-10-01T10:05:00Z"}
  ],
  "kamelets": [
    {"name": "kafka-source", "type": "source", "provider": "Apache Software Foundation", "supportLevel": "Stable"},
    {"name": "kafka-sink", "type": "sink", "provider": "Apache Software Foundation", "supportLevel": "Stable"},
    {"name": "postgresql-sink", "type": "sink", "provider": "Apache Software Foundation", "supportLevel": "Stable"},
    {"name": "http-sink", "type": "sink", "provider": "Apache Software Foundation", "supportLevel": "Stable"},
    {"name": "log-action", "type": "action", "provider": "Apache Software Foundation", "supportLevel": "Stable"}
  ],
  "kaotoContainer": {"name": "kaoto", "image": "quay.io/kaotoio/kaoto-app:2.13.0", "digest": "sha256:209cc6a1a99b", "ports": ["8080:8080"]}
}
```

## Sources
- https://github.com/KaotoIO/kaoto/releases (2.13.0)
- https://quay.io/repository/kaotoio/kaoto-app?tab=tags
- https://camel.apache.org/manual/camel-jbang.html
- https://camel.apache.org/manual/camel-jbang-kubernetes.html
- https://camel.apache.org/components/next/others/yaml-dsl.html
- https://github.com/apache/camel-kamelets
- https://docs.redhat.com/en/documentation/red_hat_build_of_apache_camel/4.14
- https://access.redhat.com/articles/7021827 (release schedule)
