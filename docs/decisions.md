# Decisions log

Autonomous choices made while building the mockup. Revisit at checkpoints.

## Wave 0

| # | Decision | Why |
|---|---|---|
| D1 | SvelteKit 3.0.1 config lives in `vite.config.ts` (`sveltekit({ adapter, paths })`); `#lib/*` subpath imports instead of `$lib`; `$app/env`, `resolve()`/`asset()` without leading slash. TypeScript pinned to 6.0 (Kit 3 peer). | Kit 3 breaking changes. |
| D2 | `themes.css` regenerated from PD's color registry (not copied from the stale storybook file). | It lacked the Sep-2026 `button-icon-*` / `button-detailed-*` / `button-spinner` tokens. |
| D3 | Theme class on `<html>`, applied before first paint from `?theme=` / localStorage. Status bar = `.dark` wrapper (`display: contents`). | `@scope (.dark)` + inheritance gives a forced-dark island. |
| D4 | Tailwind `--text-*: initial` then PD sizes; `--color-*: initial` then PD palette. | Match PD's JS config (no line-height companions, palette replaces defaults). |
| D5 | Containers list drops PD's *Environment* column. | The list is scoped to one connection in the provider-first IA; the column would repeat the same value. |
| D6 | Compose grouping is a contributed `grouper` (podman-desktop.compose); Kind adds a second grouper (`io.x-k8s.kind.cluster`). | Proves P10 with built-ins. |
| D7 | Kubernetes core resources: Nodes, Deployments, Pods, Services, ConfigMaps & Secrets, PVCs; details route `/c/<conn>/kube/<Kind~ns~name>/<tab>` for any kind (incl. CRDs). | One generic kube details page serves every extension (P4). |
| D8 | Image "Security" is a **core** tab fed by `imageCheckers`, with an empty state when none is enabled. | Plan rule 4 + rule 7. |
| D9 | "Installed" = scenario preset ∪ enabled; "Catalog" = every other known extension. Install = enable (+ dependencies). | Mirrors PD's Extensions page semantics without a real install. |
| D10 | Connection order: Podman first, then provider, then name; status never reorders the nav. | Stable muscle memory. |
| D11 | Group cap = 4 visible (+ pinned), rest in "More (n)" popover; selected item always visible. | Plan rule 1 (pinned / regular / more tiers). |
| D12 | Connection overview is `/c/<conn>` with `?tab=` for tabs (the path segment after the connection is the resource). | Avoids route clash with `/c/<conn>/<resource>`. |
| D13 | World persisted per scenario key in localStorage (`pdn.world.<key>`), enabled set per key (`pdn.enabled.<key>`). In-progress tasks become *canceled* on reload. | Timers cannot resume. |
| D14 | `_template` extension is type-checked but only loaded with `?template=on`; the `template` journey uses it as the smoke test of every contribution point. | Template stays honest. |
| D15 | Monaco/xterm replaced by a read-only `<pre>` and a scripted fake terminal. | Static mockup, no heavy deps. |
| D16 | `?welcome=off` suppresses the first-visit picker (journeys, shared links). | Deterministic screenshots. |
| D17 | Factory wizard is a full FormPage at `/settings/create/<factory>` with inline progress; the task continues in the background if the user leaves. | PD's connection creation pattern. |

## Wave: appdev

| # | Decision | Why |
|---|---|---|
| A1 | **feat(shell)**: `GrouperDef.groupName` / `groupDetails` (types.ts, ContainerList.svelte, `_template`). Group actions still receive the raw label value. | Quarkus Dev Services and Testcontainers group by opaque UUID labels (`io.quarkus.devservice.process-uuid`, `org.testcontainers.sessionId`); the row must read "acme-orders (Dev Services)" / "session e4b19f27 (Testcontainers)". Generic P10 need, no product knowledge in the shell. |
| A2 | Shared appdev kit in `src/extensions/_appdev/` (no `index.ts`, so the registry glob skips it): `DataTable`, `Card`, `Pill`, `KeyValue`, `CopyField`, `TaskLog`, `services.ts`. | 17 extensions with lists, cards and inline tasks must look identical without touching the shell. |
| A3 | Services-catalog pattern: `serviceFactory(spec)` returns a plain `FactoryDef` of kind `service`; the "Services catalog" tool (podman-desktop.services) lists `registry.factories.filter(kind === 'service')`. Service connections carry `capabilities: ['service:<kind>']` for `when` clauses (`isService`). Backing containers are labelled `io.podman-desktop.service=<conn>` and grouped. | One generic catalog drives Kafka, Apicurio, Keycloak, Data Grid, AMQ, PostgreSQL, RHDH Local, Valkey, otel-lgtm (O10/P8/P12) with zero shell changes. |
| A4 | Extensions may import another extension's `data.ts` when they declare it in `dependsOn` (Debezium → Kafka `addTopic`, Apicurio `registerArtifact`; Kafka topic details → Apicurio `findTopicSchema`). | Mirrors an extension exporting an API to its dependents; keeps the cross-product flows (CDC topic appears in Kafka, schema resolved from the registry) real. |
| A5 | Extension data accessors used in `$derived`/templates are pure reads of `world.ext` with a constant fallback; writes go through `ensure*()` in seeds/handlers. | Svelte 5 forbids state mutation inside deriveds (`extData()` writes on first access). |
| A6 | Sub-pages of contributed sections use query params (`/c/acme-kafka/topics?topic=orders.created&tab=schema`, `?group=`, `?artifact=`) rendered with ui-svelte `DetailsPage` + `Tab`. | The route model stops at `/c/<conn>/<section>`; query params give deep links without new routes. |
| A7 | Debezium's wizard is the container tab "Change data capture" (the kebab menu deep-links to it) rather than a modal. | The prerequisites check, the task logs and the resulting connector stay visible where the database lives; the tab doubles as the CDC status page. |
| A8 | PostgreSQL (`podman-desktop.postgresql`) is re-expressed as a service (`acme-postgres`) tagged `appdev` only. | Debezium needs a database service; the community scenario keeps its plain `pg-dev` container. |
| A9 | Icons: wordmark logos from the dossiers were replaced by square marks of the same projects (Quarkus, WildFly/EAP, Infinispan/Data Grid); sources in docs/assets.md. | Wordmarks are illegible at 16–32 px. |
| A10 | **fix(shell)**: ContainerList `rows` depends on every container state. | The legacy-mode ui-svelte Table only re-renders when `data` changes; group "Stop all" left child rows RUNNING (also affected Compose groups). |
| A11 | Services made of several containers (Kafka + console + Connect, Apicurio + UI) carry `io.podman-desktop.service.group` and are grouped; single-container services stay plain rows. RHDH Local keeps compose labels only (built-in compose grouper). | Grouping every one-container service cluttered the list. |
| A12 | MTA report: one tab per target; eap8 = 14/9/5 issues, 63 story points, quarkus = 128 points. Points are set per rule (not effort × incidents). Accepting the Konveyor AI fix lowers points/incidents (63→62), not issue counts, until re-analysis. A previous run is seeded. | Keeps both scenario numbers true and the report stable. |
| A13 | JBoss EAP reads MTA state (`isKeycloakFixed()`): after the AI fix, the WildFly Glow warning mentions `oidc.json`. Cloud context uses `remote-activemq`; postgresql add-on → 11 layers. | Cross-tool continuity of journey 4. |
| A14 | Cryostat: a recording advances 10 s per (speed-scaled) second and is archived + analysed automatically when it stops; recordings keyed by container name; no Cryostat service connection (tool page + seeded compose stack). | Snappy, hands-off journey 5; robust to seed order. |
| A15 | Debug shell: debug containers labelled `io.podman-desktop.debug-target` and grouped as "debug <target>"; Dev Containers grouped by `devcontainer.local_folder` ("acme-orders (dev container)"); "Open folder in dev container" is a containers-toolbar menu + tool wizard (`?open=1`), not a connection factory (a dev container is not a connection). | Fits the contribution model without new shell points. |
| A16 | Keycloak `alice` token request fails on purpose (`invalid_grant`, required actions); Data Grid and AMQ start stopped (ConnectionStoppedScreen); starting the connection does not start the EXITED backing container (container lifecycle is shell-owned). | Error and stopped states in the scenario. |
| A17 | Kaoto seeds a running `inventory-sync` integration in `world.ext` (no containers: Camel JBang runs on the host JVM). | Non-empty "Running integrations" table. |
