# Red Hat Developer Hub Local

## 1. Identity
- **Display name:** RHDH Local
- **Extension id:** `redhat.rhdh-local` (proposed). Existing prototype `kadel/podman-desktop-extension-rhdh-local`: root `package.json` name `rhdh-local-podman-desktop`, backend name `rhdh-local`, displayName "RHDH Local", publisher "Tomas Kral", OCI `quay.io/tkral/podman-desktop-extension-rhdh-local:dev`.
- **Icon:** https://raw.githubusercontent.com/kadel/podman-desktop-extension-rhdh-local/main/packages/backend/icon.png (verified 200 `image/png`; fallback Backstage https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/backstage.svg)
- **Description:** Run a local Red Hat Developer Hub (Backstage) with Podman Compose, manage dynamic plugins and catalog entities, and test software templates against your projects.

## 2. Real objects & fields
- **Version:** rhdh-local default image `quay.io/rhdh-community/rhdh:1.10.3` (override `RHDH_IMAGE`, e.g. `registry.redhat.io/rhdh/rhdh-hub-rhel9:1.10`); `CATALOG_INDEX_IMAGE=quay.io/rhdh/plugin-catalog-index:1.10.3`. So RHDH is at **1.10** in Oct 2026 (not 1.8/1.9).
- **compose.yaml services:** `rhdh` (container `rhdh`, user 1001, ports **7007:7007**, `127.0.0.1:9229` Node inspector, entrypoint `wait-for-plugins-and-start.sh`, depends on installer `service_completed_successfully`); `install-dynamic-plugins` (container `rhdh-plugins-installer`, runs `prepare-and-install-dynamic-plugins.sh`, one-shot); `rag-init` + `lightspeed-core` (`quay.io/lightspeed-core/lightspeed-stack:0.6.4`, Developer Lightspeed); optional `db` (`registry.redhat.io/rhel8/postgresql-16`). Volumes `dynamic-plugins-root`, `extensions-catalog`. Env files `default.env` + `.env` (`BASE_URL=http://localhost:7007`).
- **Config files:** `configs/app-config/app-config.local.yaml`, `configs/dynamic-plugins/dynamic-plugins.override.yaml`, `configs/catalog-entities/users.override.yaml`, `components.override.yaml`, `.env`. Change app-config/entities -> restart `rhdh`; change plugins -> run `install-dynamic-plugins` then restart.
- **dynamic-plugins.override.yaml:** `includes: [dynamic-plugins.default.yaml]`, `plugins: [{package, disabled, pluginConfig}]`; package forms: `./dynamic-plugins/dist/backstage-community-plugin-tech-radar`, `./local-plugins/todo`, OCI `oci://quay.io/<org>/<image>:<tag>!<plugin-name>` (e.g. `oci://docker.io/tomaskral/simple-chat:v0.0.1!internal-backstage-plugin-simple-chat`); `pluginConfig.dynamicPlugins.frontend.<scope>.{mountPoints, dynamicRoutes, appIcons, entityTabs}`.
- **Catalog entities** (`backstage.io/v1alpha1`): `Component` (spec.type service|website|library, lifecycle, owner, system, providesApis), `API` (type openapi|asyncapi|grpc, definition), `System`, `Group` (spec.type team, children), `User` (memberOf); annotations `backstage.io/techdocs-ref`, `github.com/project-slug`.
- **Software templates** (`scaffolder.backstage.io/v1beta3`, kind `Template`): `spec.owner`, `spec.type` (service), `spec.parameters[]` (JSON-schema form pages), `spec.steps[]` with `action: fetch:template | publish:github | catalog:register` (+ `fetch:plain`, `debug:log`), `spec.output.links`.
- **Backstage REST:** `GET /api/catalog/entities/by-query?filter=kind=component`, `POST /api/scaffolder/v2/tasks` -> task `status: open|processing|completed|failed|cancelled`.

## 3. Placement
- **connectionFactories (P12/P18):** "Create RHDH Local" (clone `redhat-developer/rhdh-local` to `~/.local/share/rhdh-local`, `podman compose up -d`).
- **connections (kind `service`, P8):** "Developer Hub (local)" `http://localhost:7007`, status from `rhdh` container health; linked compose group.
- **navSections (P2):** under the connection: Overview, Plugins (override file editor + installed list), Catalog, Templates, Config files, Logs (`when: provider == rhdh-local`).
- **groupers (P10):** containers grouped by `com.docker.compose.project=rhdh-local`.
- **menus:** connection "Install plugins", "Restart RHDH", "Update repository (git pull)", "Open in browser"; project (P15) "Register in local Developer Hub" (writes `catalog-info.yaml`, adds location).
- **tasks (P15):** compose up, install-dynamic-plugins run, scaffolder task runs. **statusItems:** tray-style quick actions. **dashboardCards (P17):** "Developer Hub: 12 components, 3 templates". **accounts/P16:** optional Red Hat SSO for `registry.redhat.io` product image.

## 4. Journeys
1. **Create RHDH Local.** Resources -> Create "Developer Hub (local)" -> task "Starting RHDH Local 1.10.3" (git clone, pull `quay.io/rhdh-community/rhdh:1.10.3` 640 MB, run `rhdh-plugins-installer` (log `==> Installing package oci://...`, exit 0), start `rhdh`, wait `:7007` 200; ~3 min) -> service connection Running; compose group of 4 containers.
2. **Add an OCI dynamic plugin.** Plugins nav -> Add -> paste `oci://quay.io/acme/backstage-plugin-orders-dashboard:1.0.2!acme-plugin-orders-dashboard` -> Save writes override -> banner "Install plugins then restart" -> task "Install plugins" (installer re-runs, ~40 s) + "Restart rhdh" -> plugin listed enabled.
3. **Register acme-orders and scaffold.** Project acme-orders -> "Register in Developer Hub" -> task `catalog:register` -> Component `acme-orders` appears in Catalog nav (owner group:acme/orders-team). Templates nav -> "Quarkus Kafka service" -> fill name `shipping-service` -> scaffolder task steps fetch:template -> publish:github -> catalog:register (~20 s) -> new repo link + Component.

## 5. Sample data
```json
{
  "pluginsOverride": {"includes": ["dynamic-plugins.default.yaml"], "plugins": [
    {"package": "./dynamic-plugins/dist/backstage-community-plugin-tech-radar", "disabled": false},
    {"package": "oci://quay.io/acme/backstage-plugin-orders-dashboard:1.0.2!acme-plugin-orders-dashboard", "disabled": false,
     "pluginConfig": {"dynamicPlugins": {"frontend": {"acme.plugin-orders-dashboard": {"dynamicRoutes": [{"path": "/orders", "importName": "OrdersPage", "menuItem": {"text": "Orders"}}]}}}}},
    {"package": "./dynamic-plugins/dist/backstage-community-plugin-quay", "disabled": true}
  ]},
  "containers": [
    {"name": "rhdh", "image": "quay.io/rhdh-community/rhdh:1.10.3", "state": "running", "ports": ["0.0.0.0:7007->7007", "127.0.0.1:9229->9229"]},
    {"name": "rhdh-plugins-installer", "image": "quay.io/rhdh-community/rhdh:1.10.3", "state": "exited", "exitCode": 0},
    {"name": "lightspeed-core", "image": "quay.io/lightspeed-core/lightspeed-stack:0.6.4", "state": "running"},
    {"name": "rag-init", "image": "quay.io/redhat-ai-dev/rag-content:release-1.10-lls-0.5.0-8c231a3b", "state": "exited", "exitCode": 0}
  ],
  "entities": [
    {"apiVersion": "backstage.io/v1alpha1", "kind": "Component", "metadata": {"name": "acme-orders", "annotations": {"backstage.io/techdocs-ref": "dir:."}}, "spec": {"type": "service", "lifecycle": "production", "owner": "group:acme/orders-team", "system": "acme-commerce", "providesApis": ["orders-api"]}},
    {"apiVersion": "backstage.io/v1alpha1", "kind": "Component", "metadata": {"name": "inventory-service"}, "spec": {"type": "service", "lifecycle": "deprecated", "owner": "group:acme/warehouse-team", "system": "acme-commerce"}},
    {"apiVersion": "backstage.io/v1alpha1", "kind": "API", "metadata": {"name": "orders-api"}, "spec": {"type": "openapi", "lifecycle": "production", "owner": "group:acme/orders-team", "definition": {"$text": "./src/main/openapi/openapi.yaml"}}},
    {"apiVersion": "backstage.io/v1alpha1", "kind": "System", "metadata": {"name": "acme-commerce"}, "spec": {"owner": "group:acme/platform"}},
    {"apiVersion": "backstage.io/v1alpha1", "kind": "Group", "metadata": {"name": "orders-team", "namespace": "acme"}, "spec": {"type": "team", "children": []}},
    {"apiVersion": "backstage.io/v1alpha1", "kind": "User", "metadata": {"name": "maya"}, "spec": {"memberOf": ["acme/orders-team"]}}
  ],
  "template": {"apiVersion": "scaffolder.backstage.io/v1beta3", "kind": "Template", "metadata": {"name": "quarkus-kafka-service", "title": "Quarkus Kafka service"},
    "spec": {"owner": "group:acme/platform", "type": "service",
      "parameters": [{"title": "Service", "required": ["name"], "properties": {"name": {"type": "string"}, "owner": {"type": "string", "ui:field": "OwnerPicker"}}}],
      "steps": [
        {"id": "fetch", "action": "fetch:template", "input": {"url": "./skeleton", "values": {"name": "${{ parameters.name }}"}}},
        {"id": "publish", "action": "publish:github", "input": {"repoUrl": "github.com?owner=acme&repo=${{ parameters.name }}"}},
        {"id": "register", "action": "catalog:register", "input": {"repoContentsUrl": "${{ steps.publish.output.repoContentsUrl }}", "catalogInfoPath": "/catalog-info.yaml"}}]}},
  "scaffolderTask": {"id": "5b1e7c2a-91f0-4d3e-8a2b-0c6f4d2e9a11", "status": "completed", "createdAt": "2026-10-08T09:14:02Z", "spec": {"templateInfo": {"entityRef": "template:default/quarkus-kafka-service"}}}
}
```

## Sources
- https://github.com/kadel/podman-desktop-extension-rhdh-local (README, package.json, packages/backend/icon.png)
- https://github.com/redhat-developer/rhdh-local/blob/main/compose.yaml
- https://github.com/redhat-developer/rhdh-local/blob/main/default.env
- https://github.com/redhat-developer/rhdh-local/blob/main/configs/dynamic-plugins/dynamic-plugins.override.example.yaml
- https://backstage.io/docs/features/software-catalog/descriptor-format
- https://backstage.io/docs/features/software-templates/writing-templates
- https://docs.redhat.com/en/documentation/red_hat_developer_hub/
