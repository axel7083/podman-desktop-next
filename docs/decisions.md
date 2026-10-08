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

## Wave: ai

| # | Decision | Why |
|---|---|---|
| AI1 | AI Lab is a Tool (`/tools/ai-lab`) with its own sub-navigation copied from the real webview (`Navigation.svelte`: Dashboard · AI APPS · MODELS · SERVER INFORMATION · TUNING); sub-pages use `?p=<page>&id=` so tasks/toasts deep-link. Llama Stack is omitted; Tuning shows the "turned off" state (`ai-lab.experimentalTuning`). | Fidelity to AI Lab without a shell change (tools have no secondary nav). |
| AI2 | `redhat.ai-model-catalog` is not a separate extension: AI Lab's Catalog is the unified catalog (R54) with source tabs (AI Lab, RedHatAI, Red Hat validated, rhoai-dev) and a "Fits my GPU (24 GB)" filter; NVFP4 → "Needs Blackwell". | One catalog where the user already is; fewer tools in the nav. |
| AI3 | Red Hat AI Inference (vLLM) is a proposed AI Lab backend; starting one creates a dynamic `service` connection "vLLM @ localhost:<port>" owned by `redhat.ai-inference-server`. The seeded vLLM server is stopped with its real OOM error. | Inference servers are both AI Lab services and P8/P9 connections. |
| AI4 | P9 InferenceProviderConnection is modelled as the connection capability `inference` (+ details `Models`, `Inference type`) plus AI Lab services and OpenShift AI port-forwards; `providers()` in `ai-lab/shared.ts` aggregates them for playgrounds and Kaiden. | No new shell contribution type. |
| AI5 | AI extensions import helpers from `../ai-lab/shared.ts` (and ModelCar/MCP from `../openshift-ai/shared.ts`); every dependent declares `dependsOn: ['redhat.ai-lab']`. | Stand-in for a cross-extension API; shell untouched. No dependency on `redhat.redhat-authentication` to avoid coupling with the other wave. |
| AI6 | Container grouping: real label `ai-lab-recipe-id` (recipe pods) + proposed label `ai-lab.group=model-services` (all inference servers in one group); MCP containers via `io.modelcontextprotocol.gateway`; Kaiden via `ai.openkaiden.sandbox`. | Real inference label holds a JSON array; one group per server would be noise. |
| AI7 | `rhoai-dev` (OpenShift AI 3.5) is contributed by `redhat.openshift-ai` with capability `kube.crd:datascienceclusters`; sections are `when`-gated on it (P2). MCPServer section is contributed by the MCP extension on `kube.crd:mcpservers`. | No OpenShift cluster fixture on this branch. |
| AI8 | Kube objects whose status changes are replaced (new object) instead of mutated. | The ui-svelte Table does not re-render rows on deep mutation. |
| AI9 | MaaS quota: each RAG prompt counts ~28k tokens (retrieved manual chunks) so the 412k/500k hourly quota hits HTTP 429 after ~3 prompts; the toast offers "Switch to local AI Lab model". | Makes journey 4 demonstrable in seconds. |
| AI10 | `kubernetes-mcp-server` is not pre-installed (journey 5 installs it); podman-mcp-server (process) and GitHub (remote) are. | The install is the journey's highlight. |
| AI11 | Connection `details` must not reuse core row labels (`Type`, `Status`, `Provider`…): duplicate keys break ConnectionSummary's keyed each. | Found by the loop (each_key_duplicate). |
