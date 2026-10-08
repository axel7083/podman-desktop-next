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

## Wave: platform-automation-windows

| # | Decision | Why |
|---|---|---|
| PA1 | **feat(shell)**: `MockExtension.packOf?: string[]` (PD `extensionPack`). `dependenciesOf` includes pack members, so enabling a pack enables its members; unknown ids (extensions owned by other waves, e.g. `redhat.rhdh-local`, `redhat.redhat-authentication`) are skipped. Extensions page shows an "Extension pack" badge and an "Includes" chip row. Files: `src/lib/ext/types.ts`, `src/lib/ext/registry.svelte.ts`, `src/lib/pages/Extensions.svelte`, `_template/index.ts`. | RHADS pack needs pack semantics; registry must tolerate deps implemented on other branches. |
| PA2 | **feat(shell)**: generic `openDialog(component, props)` + `DialogHost` (`src/lib/dialog.svelte.ts`, `src/lib/shell/DialogHost.svelte`, layout). | Menus like "Export as Ansible…", "Sign & push", "Recreate on Podman" need a modal without leaving the page; ConfirmHost only does yes/no. |
