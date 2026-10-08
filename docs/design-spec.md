# Design spec (tokens and anatomy)

Binding rules for every screen. Source: mockup plan §5, PD renderer markup and
`@podman-desktop/ui-svelte` 1.29.1.

## Tokens

- `src/lib/theme/themes.css` is generated from PD's `color-registry.ts` with
  `scripts/generate-stylesheet.ts` (same generator as `storybook/.storybook/themes.css`,
  re-run on 2026-10-08 so it includes the Sep-2026 `button-icon-*`,
  `button-detailed-*` and `button-spinner` tokens). Variables are scoped with
  `@scope (.light|.dark|.hc-light|.hc-dark)`; the theme class is set on `<html>`.
- The status bar wraps itself in a `.dark` scope (`data-pd-force-theme="dark"`).
- No raw hex in components. Mockup-only and proposed tokens live in
  `src/lib/theme/proposed-tokens.css`:

| Token | Dark | Light | Use |
|---|---|---|---|
| `--pd-nav-group-header` | `#a1a1aa` | `#5c5c5c` | Primary/secondary nav group labels (proposed) |
| `--pd-nav-hint-bg` / `--pd-nav-hint-text` | `#36363d` / `#d4d4d8` | `#e4e4e4` / `#222222` | Hint chips (WSL, context, OCM) (proposed) |
| `--pd-contribution-badge-bg` | `#27272a` | `#ffffff` | Extension badge backdrop (proposed) |
| `--pdn-mockup-bg` / `--pdn-mockup-text` | lime / near-black | same | Mockup pill (not product) |
| `--pdn-inspect-outline` | lime | dark lime | Inspect overlay (not product) |

## Type

Tailwind `--text-*` replaced by PD's scale (no line-height companions, like PD):
xs 10 · sm 11 · **base 12** (body) · lg 14 · xl 16 · 2xl 18 · 3xl 20 · 4xl 24 · 5xl 30 · 6xl 36.
System font stack. Page titles `text-xl font-bold`; card titles `text-lg font-semibold`;
group labels 10px semibold uppercase with letter-spacing.

## Anatomy

| Element | Spec | PD source |
|---|---|---|
| Title bar | 38px, 3-column grid, centered search | `lib/ui/TitleBar.svelte` |
| Primary nav | 50–240px (default 200), rows `min-h-9 py-2 px-2.5`, `border-l-[4px]` selection, 24px page icons / 20px provider icons, status dot 10px bottom-right | `AppNavigation.svelte`, `lib/ui/NavItem.svelte` |
| Secondary nav | `w-leftsidebar` 170px, rows from `SettingsNavItem` + counter | `SubmenuNavigation.svelte`, `PreferencesNavigation.svelte` |
| Pages | NavPage: header `px-5 pt-4`, search `w-72`, tabs `mx-5` with divider | ui-svelte `NavPage` |
| Tables | ui-svelte `Table`: 48px rows, `rounded-lg` cards, groups as bordered cards | ui-svelte `Table` |
| Details | ui-svelte `DetailsPage` (breadcrumb, icon, title, actions, `Tab`s) | ui-svelte |
| Buttons | 6px radius, `px-4 py-[5px]`; Cancel = `type="link"` | ui-svelte `Button` |
| Modals | 12px radius, `max-w-[32rem]` | ui-svelte `Modal`, `lib/dialogs/Dialog.svelte` |
| Status bar | 24px, always dark, items `px-1` | `lib/statusbar/*` |
| Provider cards | Settings › Resources: left 170–200px with icon + "Create new …", 240px connection columns | `PreferencesResourcesRendering.svelte` |
| Extension cards | 200px left column (icon, status, badge, toggle) + right description | `InstalledExtensionCard*.svelte` |
| Task manager | fixed bottom-right modal surface, NavPage "Tasks" | `task-manager/TaskManager.svelte` |
| Toasts | 320px modal-bg cards, bottom-right above the status bar | `toast/ToastCustomUi.svelte` |

## New patterns (not in PD today)

- **Nav group header** (label + collapse + "+"), **hint chip**, **More (n)** overflow popover,
  **pin/hide** row menu.
- **Secondary-nav "Extensions" divider** with extension icon on contributed rows.
- **Tab divider** + "More (n) ▾" tab menu.
- **Security tab**: summary card (severity pills, zero counts dimmed) + one card per checker.
- **Add-ons tab** on Kubernetes connections.
- **Connection overview**: resource tiles (count + label), details table, Runs on / Hosts links.
- **Status popover**: connections grouped by kind with inline Start/Stop.
- **Inspect overlay** (mockup only).
