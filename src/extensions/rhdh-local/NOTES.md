# redhat.rhdh-local – RHDH Local (proposed)

**Real objects.** `redhat-developer/rhdh-local` compose project: services `rhdh` (7007, 9229),
`install-dynamic-plugins` (container `rhdh-plugins-installer`, one-shot), `lightspeed-core`, `rag-init`.
`configs/dynamic-plugins/dynamic-plugins.override.yaml` (`includes`, `plugins[].package|disabled`, OCI form
`oci://<registry>/<image>:<tag>!<plugin>`). Backstage entities `backstage.io/v1alpha1` (Component, API, System, Group,
User), templates `scaffolder.backstage.io/v1beta3` with steps `fetch:template → publish:github → catalog:register`.
REST: `/api/catalog/entities/by-query`, `POST /api/scaffolder/v2/tasks`.

**Placement.**
- P8 connection `developer-hub` (kind service, provider "Red Hat Developer Hub", `http://localhost:7007`, 1.10.3,
  capability `service:rhdh`). P12 custom factory `rhdh-local` "Create Developer Hub (local)" (git clone + compose up).
- P10: seeded containers carry `com.docker.compose.project=rhdh-local` + `com.docker.compose.service`, grouped by the compose grouper.
- P2 sections: Catalog (kind filter, `?entity=` details with links), Templates (cards → `?template=` scaffolder form → task →
  new Component in Catalog), Plugins (override file list, Add plugin, Enable/Disable, "Install plugins" task that re-runs
  the installer container and restarts `rhdh`).
- P17 dashboard card "Developer Hub" (components / templates / plugins).

**Journeys.** (1) Templates → Quarkus Kafka service → Create (shipping-service) → Open in catalog.
(2) Plugins → Add plugin (OCI) → Install plugins. (3) Catalog → filter Component → acme-orders.

**Sources.** github.com/redhat-developer/rhdh-local (compose.yaml, default.env, override example),
backstage.io descriptor-format + writing-templates; dossier `docs/research/redhat.rhdh-local.md`.
