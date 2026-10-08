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

## Wave: rhel

| # | Decision | Why |
|---|---|---|
| R1 | **feat(shell)** `FormField.visible`, `FactoryDef.validate` → `FactoryIssue{field, level, message, suggestion, fix}` rendered inline by `FactoryForm` (errors disable *Create*, `fix` = one-click patch), and `?<fieldId>=` URL prefill. Files: `src/lib/ext/types.ts`, `src/lib/pages/FactoryForm.svelte`, `_template`. | R4 needs the real "provider hyperv is not supported" branch as an inline error + suggestion, conditional fields (activation key, compose) and Image Builder → wizard hand-off. Generic for every factory. |
| R2 | **feat(shell)** `Finding.actions` (row buttons) and `CheckerDef.summary` (headline per checker); `vexStatus` widened with Red Hat `fix_state` values (`will_not_fix`, `fix_deferred`, `out_of_support_scope`). Files: `types.ts`, `src/lib/details/SecurityTab.svelte`. | One-click "Rebuild on hardened image", Pyxis grade headline, "27 → 6 actionable" VEX headline. |
