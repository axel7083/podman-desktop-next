# AGENTS.md – podman-desktop-next

Interactive, static mockup of a **provider-first Podman Desktop** in which every
integration is a *mock extension*. The shell knows nothing about any product:
adding a product = adding a folder under `src/extensions/`.

Stack: SvelteKit 3 (`adapter-static`, SPA, `ssr = false`), Svelte 5 runes,
TypeScript strict, Tailwind 4, `@podman-desktop/ui-svelte` 1.29.1, PD's real
`--pd-*` tokens. No unit tests: quality comes from `pnpm check`, `pnpm build`
and the screenshot loop.

## Commands

```bash
pnpm install
pnpm dev                    # http://localhost:5173/?scenario=community
pnpm check                  # svelte-check, must stay at 0 errors
pnpm build                  # static site in build/ (BASE_PATH=/repo for Pages)
node loop/run-all.mjs       # all journeys, dark + light → loop/runs/<ts>/
node loop/run-all.mjs community template   # selected journeys
```

URL parameters: `?scenario=openshift+rhel` (or `everything`), `&theme=dark|light`,
`&chrome=off` (hide the lime Mockup pill), `&inspect=on`, `&welcome=off`,
`&template=on` (load `src/extensions/_template`).

Imports use the `#lib/*` subpath alias (SvelteKit 3 replaced `$lib`), with the
file extension: `import { world } from '#lib/world.svelte.ts'`.

## Layout

| Path | What |
|---|---|
| `src/lib/ext/types.ts` | Contribution model (`MockExtension`), JSDoc names the P# of each point |
| `src/lib/ext/registry.svelte.ts` | Glob of `src/extensions/*/index.ts`, enabled set per scenario, dependency handling, derived contributions, `when` filtering |
| `src/lib/world.svelte.ts` | Simulated world (`$state`): connections status, containers, pods, images, volumes, networks, secrets, kube objects per cluster, tasks, toasts, accounts, add-ons; actions; persistence per scenario |
| `src/lib/scenarios.ts` | Scenario presets + URL parsing |
| `src/lib/shell/` | TitleBar, PrimaryNav, SecondaryNav, SettingsNav, StatusBar, CommandPalette, TaskManager, Toasts, MockupPill, Welcome, ConfirmHost |
| `src/lib/components/` | Renderer-only PD pieces (Label, Badge, StatusDotIcon, SlideToggle, ListItemButtonIcon, Dialog…) + `Contribution` (inspect overlay), `AppIcon`, `Popover`, `LazyComponent` |
| `src/lib/resources/`, `src/lib/details/`, `src/lib/table/` | Core lists, details pages, generic table cells |
| `src/lib/pages/` | Dashboard, connection overview, Extensions, Settings, Accounts, factory wizard |
| `src/extensions/<id>/` | One folder per integration (`index.ts`, `components/`, `data.ts`, `NOTES.md`) |
| `src/extensions/_template/` | Every contribution kind, type-checked, not loaded unless `?template=on` |
| `static/icons/` | Real extension icons (`<extension-id>.png`), sources in `docs/assets.md` |
| `docs/` | `ia.md`, `design-spec.md`, `assets.md`, `decisions.md`, `integration-opportunities.md` |
| `loop/` | Playwright journeys, rubric, runs (git-ignored) |
| `references/` | PD reference screenshots from the website |

## Adding an extension

1. `cp -r src/extensions/_template src/extensions/<short-name>` (no leading `_`).
2. In `index.ts` set the real id (`publisher.name` from the extension's
   `package.json`), `displayName`, `description`, `icon`
   (`icons/<id>.png`, copy the real icon to `static/icons/` and add a row to
   `docs/assets.md`), `dependsOn` (e.g. `redhat.redhat-authentication`),
   `tags` (scenario ids that enable it) and `pApis`.
3. Keep only the contributions you need. Each one renders automatically:

| Contribution | Renders in | P# |
|---|---|---|
| `connections` | Primary nav group by `kind`, status bar popover, dashboard, Settings › Resources | P1 P8 P11 |
| `connectionFactories` | "Create new …" on the provider card, palette; wizard at `/settings/create/<id>` | P12 P18 |
| `navSections` | Secondary nav after the "Extensions" divider when `when(conn)`; page at `/c/<conn>/<id>` | P2 |
| `tools` | Primary nav TOOLS group; page at `/tools/<id>` | P3 |
| `tabs` | Details tabs (container, image, pod, volume, connection, kube-resource) after the divider; >3 → "More" | P14 |
| `menus` | `row` / `kebab` / `toolbar` / `details` actions | P4 P14 |
| `columns` | Extra list column (containers) or name badge (images) | P14 |
| `groupers` | Group container rows by a label | P10 |
| `imageCheckers` | Image › Security tab, one section per checker + merged summary | P5 P6 |
| `addons` | Kubernetes connection › Add-ons tab (install/uninstall as tasks) | P13 |
| `accounts` | Accounts page | P16 |
| `registries`, `cliTools` | Settings › Registries, Settings › CLI Tools | P17 |
| `dashboardCards` | Dashboard "Extensions" section (configurable) | P17 |
| `statusItems` | Status bar | P17 |
| `commands` | Command palette (Ctrl/⌘K) | P17 |
| `settings` | Settings nav section (properties or component) | – |
| `onboarding` | Declared; rendered in a later wave | – |
| `seed(world, scenario)` | Mock data, called once per world when first enabled | – |

4. Components receive `{ conn }` (nav sections), `{ ctx }` (tabs: `{ target, conn, resource }`)
   or nothing (tools, cards). Reuse `KubeResourceList` for CRD lists, ui-svelte
   `NavPage`/`Table`/`DetailsPage`/`FormPage`/`EmptyScreen` for everything else.
5. Long actions use `runTask({ name, ext, steps, onDone, action })`; never block.
6. Add a `NOTES.md` (≤ 1 page: real objects/fields, API/CLI, auth, 2–3 journeys,
   placement + P#, sources) and keep mock data in `data.ts` shaped like the real API.
7. `pnpm check && pnpm build && node loop/run-all.mjs` – add a journey in
   `loop/journeys/<scenario>.mjs` for new flows.

The shell must never import from `src/extensions/`. If an extension needs a new
kind of contribution, extend `types.ts` + registry + one render point, document
the P# and update the `_template`.

## Design guardrails (plan §5, details in docs/design-spec.md)

- Tokens: only real `--pd-*` variables (`src/lib/theme/themes.css`, regenerated from
  PD's color registry incl. `button-icon-*`). No raw hex in components. New needs →
  *proposed* token in `src/lib/theme/proposed-tokens.css` (both themes) + design-spec.
- Type scale is PD's (xs 10 · sm 11 · base 12 · lg 14 · xl 16 · 2xl 18 …), system fonts.
- Status bar is always dark. Title bar 38px; nav rows 36px with a 4px selection bar;
  secondary nav 170px; pages `px-5 pt-4`; table rows are 48px `rounded-lg` cards;
  buttons 6px radius `px-4 py-[5px]`; modals 12px radius.
- Use ui-svelte components; rebuild only renderer-only pieces by copying PD markup.
- Real extension icons; every icon's source in `docs/assets.md`.
- Copy: sentence-case buttons, dialog titles "Delete container?", body "Are you sure
  you want to delete container x?", Cancel is a link button. Current product names
  ("Red Hat Lightspeed", "OGX"). Realistic data, no lorem ipsum.
- Every list has empty / filtered-empty / stopped states; every long action is a task.
- Accessibility: landmarks and `aria-label`s, labelled icon buttons, visible focus.
- Svelte 5 runes only; no inline arrow functions in templates where a script
  function + `.bind` works (PD CODE-GUIDELINES).
- Wrap every contributed render point in `<Contribution ext kind api>` so the
  Inspect overlay can show it.

## Scaling rules (plan §4, docs/ia.md)

1. Primary nav: connections grouped by kind (Engines, Kubernetes, VMs & services),
   then Tools, then Extensions; Accounts + Settings pinned at the bottom. Groups
   collapse, are capped (4) with "More (n)" overflow; users pin/hide items.
2. Secondary nav: core resources, "Extensions" divider, `when`-matched sections with
   the extension icon.
3. Tabs: core, divider, extension tabs; >3 → "More".
4. Cross-cutting features show up where the user already is (checkers → image
   Security tab, auth → Accounts, CLIs → Settings › CLI Tools, registries → Settings › Registries).
5. Dashboard: system overview + configurable extension cards; status-bar popover lists every connection.
6. Command palette finds every command, connection, resource and page.
7. Disabled/missing extensions degrade gracefully (EmptyScreen with an action).

## Loop (plan §8)

Capture with `node loop/run-all.mjs` (1440×900 @2x, dark + light, `?chrome=off`,
fails on console errors). Evaluate with a fresh reviewer using `loop/rubric.md`,
`docs/ia.md` and `references/`; write `loop/runs/<wave>/<iter>/review.md`. Fix the
lowest axis first, re-run; stop at all axes ≥ 4 or 3 iterations; leftovers →
`loop/needs-human.md`. At the end of each wave run with `?scenario=everything`.

## Git

Semantic, signed commits (`git commit -S -s`), `main` branch, no remote until the
publish wave is confirmed. Never modify `docs/research/` (owned by research agents).
