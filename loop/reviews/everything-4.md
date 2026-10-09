# Review: everything, iteration 4 (run 2026-10-09T07-39-14)

Reviewer: fresh subagent, no authoring context. Inputs: 16 dark + 16 light step PNGs,
references/ (dashboard, navigation-menu, containers-multi, extensions-catalog,
settings-resources), docs/ia.md (Scaling rules 1–16), docs/design-spec.md.

Most of the iteration-3 defects are fixed. The collapsed rail no longer leaves an orphaned
"⋯" row under Dashboard, row actions stay reachable at 1280px, the Podman update is a
compact row, OpenShift clusters show a status word and connection wording, and the
connection header and Details card read correctly. The palette input now sits exactly
over the title-bar field. Light window controls are neutral and the welcome page has one
heading. Dark and light match. One spec rule is still not applied: unselected NavPage and
palette tabs still use the accent colour. The rest are small polish issues: an empty
column that takes width from data, a half-visible palette row, a split button that doesn't
read as one, and status-popover buttons that still look like checkboxes.

## Scores
Fidelity 4 · Scaling 4 · Clarity 4 · Realism 4 · States 4 · Copy 4 · Polish 4

## Previous defects (everything-3)
1. Containers table overflow at 1280: **partly fixed**. Actions are visible, but the empty MODEL column still takes space (see 2).
2. Orphaned "⋯ 4" in the rail: **fixed**. The rail starts on the Kubernetes group under the Dashboard divider.
3. Accent on unselected tabs: **not fixed**. DetailsPage and connection tabs are neutral. NavPage and palette tabs still use the accent (see 1).
4. Palette input wider than the title-bar field: **fixed**. The input matches the field (x≈765–1235) and the light panel has a border.
5. Accent-tinted window controls in light: **fixed**.
6. OpenShift cluster status/connection wording: **fixed**. READY / HIBERNATING / INSTALLING and Connected / Connecting… / Not connected.
7. Wrapping "Create new …" buttons, "New WSLC session": **fixed**. Both are single-line "Create new …" (the split affordance is new defect 5).
8. Raw Type enum, accent subtitle: **fixed**. "Container engine" / "Kubernetes cluster"; only the endpoint is a link.
9. Podman update taking a card slot: **fixed**. It is now a compact one-line row above the grid.
10. "Add MaaS endpoint" card title: **fixed**. Now "Models-as-a-Service endpoint".
11. Two welcome titles, bordered Skip: **fixed**.
12. Status-popover start/stop look like checkboxes: **partly fixed**. They are bordered now but still read as checkboxes (see 3).

## Defects (most severe first)

1. [Fidelity] 04-containers-grouped.png, 15-containers-1280.png, 09-extensions.png,
   10-extensions-filtered.png, 11-palette.png, 12-palette-query.png (dark + light): the
   unselected tabs "Running", "Stopped", "Catalog (1)"/"Catalog (0)", "Go to", "Commands"
   and "Resources" are still accent purple. Scaling rule 11 and the design-spec
   `--pd-button-tab-text` override require neutral unselected text. The DetailsPage tabs in
   05/07/08 already do this, so two tab styles are now visible across the app.
   references/containers-multi-light.png shows "Running" and "Stopped" in neutral grey.
   → Fix: the override is not reaching ui-svelte `Button type="tab"` (NavPage) or the
   palette tab strip. Set `--pd-button-tab-text: var(--pd-tab-text)` on the scope those
   components actually read, or pass the class. Verify that "Running" in 04 renders in
   the same grey as "Subscription" in 05.

2. [Scaling/Polish] 15-containers-1280.png (dark + light), containers table: the MODEL
   header (x≈1530–1800) sits over an empty column on every visible row and takes ~270px.
   Meanwhile IMAGE is cut to ~15 characters ("quay.io/debeziu…", "registry.redhat.i…",
   "apache/kafka-n…"). The Testcontainers grouper detail is cut to "./mvnw verify · +…",
   which rule 8 says should never truncate. 04-containers-grouped.png also shows the
   empty MODEL column at full width.
   → Fix: show a contributed column only when a row in the current view/filter has a
   value (not when any container of the connection does). Below ~1400px, give the freed
   width to IMAGE first. Keep the grouper detail on one line by letting it span IMAGE +
   UPTIME on group rows.

3. [Clarity] 14-status-popover.png (dark + light), right edge of every row: the stop
   control is a square bordered box with a filled square glyph inside, which looks like a
   checked checkbox. In dark the glyph is bright white (brighter than the row text). Rule
   11 asks for the secondary-text colour. Fourteen of these stacked in one column read as
   a checkbox list, not as actions.
   → Fix: render the glyph in `--pd-button-icon` / secondary text at ~10px with rounded
   corners (PD's stop icon). Use a circular or borderless hover-background icon button
   instead of a square bordered box, so the shape differs from a checkbox. Keep the
   tooltip "Stop <name>".

4. [Polish] 11-palette.png (dark + light), Tools group at the bottom of the results: the
   4th tool row is cut in half by the footer divider (a partial icon is visible at y≈800),
   just under "Dev Containers". The idle view is supposed to show 4 complete rows per
   group.
   → Fix: size the results panel to whole rows, or add the same 28px bottom fade the nav
   uses so a cut row reads as scrollable, not broken.

5. [Polish/Fidelity] 13-settings-resources.png (dark + light), Podman provider card: the
   variants chevron sits ~25px to the right of "Create new Podman machine" with no border
   or background, so it reads as a stray disclosure arrow rather than the split button
   that rule 12 describes.
   → Fix: use a real split button. Make the chevron a segment of the same purple
   button, separated by a 1px divider in `--pd-button-primary-hover-bg`, with the dropdown
   opening under the whole button.

6. [Fidelity/Clarity] 09-extensions.png, 10-extensions-filtered.png (dark), status filter
   next to the search: the selected "All" is a solid white pill with black text. That makes it
   the highest-contrast element on the page and a third selection style next to the
   purple-underlined tabs and the purple "All 72" category chip. In light it is a mild grey
   pill, so the two themes don't match.
   → Fix: render All/Enabled/Disabled as a segmented control using
   `--pd-button-secondary-*`, or with the same chip style as the category row (selected =
   accent fill). Use the same tokens in both themes.

7. [States] 06-toasts-task.png (dark + light), ocp-dev row: one login task is shown four
   times: a spinner plus "Connecting…" in CONNECTION, a purple progress ring around the
   connect action icon, the "oc login --web ocp-dev" progress toast, and the status-bar
   task counter. The ring on the action button is the extra one and makes the action
   look clickable while it is busy.
   → Fix: drop the ring and show the connect action disabled while connecting. Keep the
   column text, the toast and the counter.

8. [Copy] 06-toasts-task.png (dark + light), bottom toast: the task title is the raw
   command "oc login --web ocp-dev". The completed toast above it is a sentence ("Update
   oc 4.20.12 → 4.22.3 completed"). PD task names are human-readable.
   → Fix: title it "Log in to ocp-dev" and put the command in the task details in the task
   manager.

9. [Copy] 01-dashboard.png (dark + light), under the engine grid: "Show all 8 engines (2
   more)" says the count twice. Rule 7 specifies "Show all n engines".
   → Fix: "Show all 8 engines".

10. [Realism] 07-ocp-dev-overview.png (dark + light), Details card: "Endpoint" and "Console"
    are plain text, while the same endpoint in the header subtitle is a link and the
    console is the main thing a user wants to open. "Contributed by" shows the raw ID
    "(redhat.openshift-cluster-manager)" (05 does the same with "(podman-desktop.podman)").
    → Fix: render Console as an external link with the open-external icon. Drop the
    extension ID from "Contributed by", or move it to a tooltip / Inspect mode.

11. [Fidelity] 04/15 containers (dark + light), table header: STATUS, NAME, IMAGE and
    UPTIME have no sort affordance. PD (references/containers-multi-light.png) shows sort
    carets and a sorted NAME column, and with 69 containers sorting matters.
    → Fix: use ui-svelte `Table` column sorting with its caret icons, defaulting to NAME
    ascending within each group.

12. [Polish] 16-welcome.png (dark + light): the scenario grid sits in a nested panel
    (pure black in dark, grey in light) inside the page, above a full-width footer band
    in a different surface colour. That gives three stacked surfaces where PD onboarding
    uses one.
    → Fix: drop the panel background and place the cards directly on the page surface.
    Put the "Who are you?" line as a subtitle under the heading, and give the footer the
    page background with only a top border.

## Follow-up (author, after this review; run 2026-10-09T08-28-59)

All axes ≥ 4, so no further review round. Fixed anyway: defect 1 (the tab override
lost to themes.css `@scope`; now `html.light, html.dark`), 2 (contributed columns
drop below 1400px), 3 (round play/stop glyphs, no border), 8 ("Log in to ocp-dev"),
9 ("Show all 8 engines"). Defects 4–7 and 10–12 stay open as minor polish.
