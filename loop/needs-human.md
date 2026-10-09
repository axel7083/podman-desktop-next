# Needs a human (UX / product review)

Open items only. Fixed in the polish pass and removed from this list: toast stacking
(rule 13: max 2, a task's toast is replaced in place), Title Case NavPage titles
(rule 14), disabled Checkbox drawn empty (`components/Checkbox.svelte`),
"1 seconds" (`duration()`), FactoryForm step header, wrapping "Create new …" buttons,
mid-word endpoints and link-coloured names in Settings › Resources, connection
overview breadcrumb/close mix and VM nav with only "Overview" (rules 5–6), truncated
container group names (rule 8), purple dashboard chips and low-contrast inset tiles
in light, missing Red Hat SSO card / duplicated accounts (`redhat.redhat-authentication`
owns SSO, rule 16), WSLC hidden under "More" (PA10, rule 3: one running engine per
type keeps a slot).

## UX decisions

- **Tab colour override**: PD's registry makes `Button type="tab"` text purple
  (`--pd-button-tab-text`) while `Tab`/DetailsPage tabs are neutral. The mockup
  overrides the button tokens to neutral (`proposed-tokens.css`). Decide: change the
  token upstream, or keep PD's purple.
- **Window controls in light**: `--pd-titlebar-icon` is accent purple in PD's light
  theme; the mockup uses the neutral `--pd-global-nav-icon`. Confirm.
- **Podman update on the dashboard**: now a compact one-line card above the
  extension cards (`CardDef.compact`). Alternative: an "Update to 5.7.0" link in the
  Podman engine tile of System overview (needs a connection-level notice API).
- **Settings › Resources variants**: extra factories (RHEL Podman machine) sit in a
  split dropdown next to "Create new Podman machine". Less discoverable; validate.
- **Collapsed rail scroll**: to never leave an orphaned "⋯ n" row under Dashboard,
  the rail adds a temporary spacer at the end of the list (empty space below Tools).
- **Stable nav order (D10) vs status**: rows never reorder on status change; only the
  choice of capped slots uses status. Confirm the trade-off.
- **Connection home is a top-level page** (no breadcrumb, no close) while it reuses
  DetailsPage tabs. Confirm against PD's details pattern.
- **Proposed tokens** awaiting design sign-off: nav group header / hint chip,
  contribution badge, inset surface, code block, severity ramp
  (`docs/design-spec.md`).

## Unverified data

- Versions and names are plausible, not confirmed for the target date: Podman
  5.6.2 → 5.7.0, Docker 28.4.0, WSL Containers 3.0.1, OpenShift 4.22.3, product
  names ("Red Hat Lightspeed", "OGX", "Models-as-a-Service").
- OCM cluster states, MaaS quota, AAP job ids and MTA story points are fixtures
  shaped after each NOTES.md, not captured from real accounts.
- Icon sources are listed in `docs/assets.md`; redistribution licences not checked.

## Not simulated

- `onboarding` contributions are declared but not rendered.
- No real install/uninstall: "Install" = enable (D9); no download, restart or
  version pinning.
- Monaco and xterm are replaced by a read-only `<pre>` and a scripted terminal (D15).
- In-progress tasks are canceled on reload (D13).
- Long flows (Image Builder, AI Lab inference, Konflux pipelines, OCM connect) are
  timer-driven scripts.

## Known limitations

- Only dark and light are captured; hc-light / hc-dark are not reviewed.
- Screens are reviewed at 1440×900 (plus containers at 1280×800); smaller windows
  are untested.
- No keyboard-only or screen-reader pass beyond labels and landmarks.
- Minor polish left open by `loop/reviews/everything-4.md` (all axes 4): palette Tools
  row cut by the footer, detached split chevron in Settings › Resources, white "All"
  status pill on Extensions (dark), ocp-dev login progress shown in four places,
  Console/Endpoint not links and raw extension ids in Details, no sort carets on
  table headers, three stacked surfaces on the welcome page.
