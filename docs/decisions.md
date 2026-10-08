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

## Wave: openshift

| # | Decision | Why |
|---|---|---|
| O1 | **Shell:** `ConnectionDef.remote` + `statusLabel()/startVerb()` ("Not connected" / "Connect") and `world.startHandlers` (extension replaces the generic start, e.g. `oc login --web` task). Files: types.ts, nav.ts, world.svelte.ts, ConnectionSummary, ConnectionStoppedScreen, Dashboard, StatusBar, SecondaryNav, PrimaryNav, CommandPalette. | OCM clusters and the Sandbox are remote: "Stopped/Start" was wrong copy and there was no hook for a real connect flow. |
| O2 | **Shell:** contributed `kube-resource` menus rendered in `KubeResourceList` rows (row/kebab) and on the generic kube details header (details/kebab) via `kubeActions()` in actions.ts. | P4 menus were declared but never rendered for CRDs (Rerun, Sync, Start VM, Ask Lightspeed). |
| O3 | **Shell:** `AddonDef.warning` (shown + confirm before install), `disabledReason`, `onInstalled/onUninstalled`; endpoints are links. CLI Tools says "Install vX" for missing tools; Registries dedupes by server preferring the entry with credentials. | minc console "auth disabled, local use only" warning; add-ons must seed cluster objects; Quay's quay.io robot replaced the suggested quay.io row instead of duplicating it. |
| O4 | Only *ready* OCM clusters become connections (ocp-prod connected, ocp-dev not); hibernating/installing ones live in TOOLS › OpenShift clusters. | Keeps the Kubernetes group at 6 (4 + More) instead of 8. |
| O5 | Extension sections appear only when the cluster **serves the CRD** (`CustomResourceDefinition` objects in `world.kube[conn]`, seeded by the cluster owner on connect) – not by connection type. | P2 `when` on capabilities discovered at connect time; ocp-dev sections pop in after `oc login`. |
| O6 | Feature extensions seed their CRs into clusters they don't own (e.g. PipelineRuns into ocp-dev at seed); they stay invisible until the CRD appears. | Lets each extension own its data while the cluster owner owns discovery. |
| O7 | Cross-extension imports allowed only from a dependency's / companion's `data.ts` (OCM → cli-pack, Quay → ACS gate, Lightspeed → OCM logs). | Stand-in for the P5 pre-push hook and CLI helper APIs; never shell → extension. |
| O8 | OpenShift CLI pack: featured tools in Settings › CLI Tools, the full pack + skew banner in a Settings section rather than a TOOLS item. | Avoids a nav item for a settings-like concern. |
| O9 | Skupper objects of the Podman site are stored as KubeObjects on the Podman connection, so one `KubeResourceList` serves both sides. | Skupper system mode uses the same CR schema. |
| O10 | Quay "Rebuild on latest UBI 9" keeps the image id (new digest) so the Security tab rescans in place. | Avoids a dead details URL mid-journey. |
| O11 | Developer Sandbox sign-up / phone verification and OpenShift Local preset switch are not mocked (connection exists at launch). | Time; supporting journeys only. |
| O12 | The Red Hat account is generic (jdoe persona, org 18833012); RHEL wave extends it (e.g. Subscription tab). | Shared extension. |
| O13 | Intermediate states driven by timers (VM Provisioning → Running, tasks) do not survive a reload (D13); the journey navigates in-app for those steps. | Static mockup. |
