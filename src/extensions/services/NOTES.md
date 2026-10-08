# podman-desktop.services (proposed, O10)

**What:** one catalog for local backing services. Generalises `ext-postgresql`
(discovers/creates postgres containers) to every product that is "a container
you talk to over a port": Kafka, Apicurio, Keycloak, Data Grid, AMQ, PostgreSQL,
RHDH Local, Valkey, Grafana otel-lgtm.

**Pattern (`src/extensions/_appdev/services.ts`):** each product extension calls
`serviceFactory(spec)` → a regular `FactoryDef` of kind `service` (P12). The
"Services catalog" tool lists `registry.factories.filter(kind === 'service')`, so
it knows nothing about Kafka or Keycloak. The created connection is a P8
`ServiceProviderConnection` (`kind: 'service'`, `capabilities: ['service:<kind>']`,
used by `when` clauses), backed by a container labelled
`io.podman-desktop.service=<connection id>` + `io.podman-desktop.service.kind`.
The grouper folds those containers into "<id> (service)" rows (P10).

**Real objects:** Valkey 9.1.2 (`docker.io/valkey/valkey:9.1`, 6379, `valkey-cli ping`
→ PONG); Grafana otel-lgtm 0.35.0 (Grafana :3000, OTLP 4317/4318).

**Journeys:** Tools › Services catalog → "Create" on any card → FormPage wizard
→ task (pull, run, readiness) → new service connection in VMS & SERVICES.

**Placement:** tools (P3), groupers (P10), connectionFactories (P12), commands.
Sources: docs/research/podman-desktop.services-catalog.md, ext-postgresql.
