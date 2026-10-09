# Review: everything, iteration 3 (run 2026-10-08T19-35-46)

Reviewer: fresh subagent, no authoring context. Inputs: 16 dark + 16 light step PNGs,
references/ (dashboard, navigation-menu, containers-multi, extensions-catalog,
settings-resources), docs/ia.md (Scaling rules 1–16), docs/design-spec.md.

Overall the shell holds up well with ~72 extensions and 34 connections. The primary
nav caps, sticky group headers, dashboard caps, secondary-nav sub-headers, Security
summary, Extensions chips/filters and palette grouping all follow the scaling rules,
and dark and light look the same. What's left is mostly edge cases: the collapsed
rail, a narrow window, and some inconsistent tab and header styling.

## Scores
Fidelity 4 · Scaling 4 · Clarity 4 · Realism 4 · States 4 · Copy 4 · Polish 3

## Defects (most severe first)

1. [Polish/Scaling] 15-containers-1280.png (dark + light): at 1280x800 the containers
   table runs past the right edge. The ACTIONS header, the per-row stop/delete/kebab
   buttons and the right border of every group card are clipped, so no row action can
   be reached without horizontal scrolling. The empty MODEL column (no visible row has
   a value) takes ~180px that the actions need.
   → Fix: make the table fit the content width. Give NAME/IMAGE flexible `minmax()`
   widths with ellipsis, keep ACTIONS fixed-width and always visible (sticky right if
   needed), and below ~1400px drop or collapse low-priority columns (MODEL, UPTIME)
   before actions are touched. Show MODEL only when a row in the current filter has a
   value (rule 8), not when any container of the connection has one.

2. [Scaling] 03-nav-collapsed.png (dark + light): in the 50px rail, right under the
   Dashboard divider, the Engines group shows only its "⋯ 4" overflow row. Its four
   visible engine icons have scrolled out above. This is the orphaned "More" row
   that Scaling rule 1 forbids ("an orphaned 'More (n)' / '⋯ n' row never sits under
   Dashboard"). The expanded nav (02) handles the same scroll correctly by hiding the
   whole Engines group.
   → Fix: apply the same reveal logic in rail mode. When the selected row (Services
   catalog) is revealed, snap the scroll so the top edge lands on a group divider,
   either showing the Engines group in full or skipping it entirely, never cutting it.

3. [Fidelity/Scaling] 04/15 containers, 09/10 extensions, 11/12 palette (dark + light):
   unselected NavPage tabs ("Running", "Stopped", "Catalog (1)", "Go to", "Commands",
   "Resources") use the purple accent. Unselected DetailsPage and connection tabs
   ("Subscription", "Capabilities", "History", "Policy", "Add-ons", "Cluster") use
   neutral grey. PD (references/containers-multi-light.png,
   extensions-catalog.png) shows unselected tabs in neutral text. The same component
   is styled two ways, and accent on inactive tabs weakens the selected tab.
   → Fix: use `--pd-tab-text` for unselected and `--pd-tab-text-highlight` plus the
   underline for selected in every tab strip (NavPage, palette, DetailsPage).

4. [Scaling] 11-palette.png, 12-palette-query.png (dark + light): the palette input
   (x≈525–1475 at 2000px) is about twice as wide as the title-bar search field it
   replaces (x≈765–1235). Scaling rule 11 says the input sits exactly over the
   title-bar field. Instead the field jumps and widens on open. In light the white
   panel also barely separates from the washed-out backdrop on its right and bottom
   edges.
   → Fix: anchor the input to the title-bar field's rect. Let only the results panel
   below widen, centred on the field. Give the light panel `--pd-modal-border` plus
   the standard dropdown shadow.

5. [Polish] All light screenshots (title bar, top-right): the minimise, maximise and
   close window controls are tinted with the purple accent. In dark they are neutral
   white, and PD/Windows chrome uses the neutral title-bar foreground.
   → Fix: use `--pd-titlebar-icon` (neutral) for the window controls in light. Keep
   accent off chrome.

6. [States] 06-toasts-task.png (dark + light), OpenShift clusters table: status
   doesn't read clearly at scale. ocp-dev has a green "running" STATUS icon while
   CONNECTION says "Connecting". rosa-sandbox-jd shows only a bare spinner with no
   label, so the user can't tell whether it is provisioning, upgrading or loading.
   ocp-prod's CONNECTION reads "Running", which describes a cluster, not a connection.
   → Fix: put a status word under each name the same way containers do ("READY",
   "INSTALLING", "UPGRADING"). Use "Connected" / "Connecting…" / "Not connected"
   in the CONNECTION column instead of "Running" / "—".

7. [Polish] 13-settings-resources.png (dark + light): the provider column's
   buttons "Create new Podman machine" and "Create new RHEL Podman machine" wrap to two
   lines in a ~300px column. The WSL card's button reads "New WSLC session", a third
   phrasing. PD (references/settings-resources.png) keeps a single-line "Create new ..."
   button.
   → Fix: one pattern for every provider. Use a single-line primary button "Create
   new …" with a split or dropdown for variants (Podman machine / RHEL Podman machine),
   and rename "New WSLC session" to "Create new WSLC session".

8. [Copy/Realism] 05-engine-overview.png and 07-ocp-dev-overview.png (dark + light),
   Details card: "Type" shows raw enum values ("podman engine", "kubernetes"), the only
   lowercase values in a sentence-case table. The header subtitle ("Podman 5.6.2 ·
   npipe:////./pipe/…", "OpenShift 4.22.3 · https://…") is all accent purple, so the
   version text looks like a link.
   → Fix: map the type to display labels ("Container engine", "Kubernetes cluster").
   In the subtitle, render only the endpoint as a link and the version in secondary
   text.

9. [Clarity] 01-dashboard.png (dark + light), Extensions section: the first card
   (Podman v5.6.2 + "Update to 5.7.0") fills half the row with ~70% empty space, next
   to a dense AAP jobs card. With everything enabled the core Podman update CTA should
   not use an extension-card slot that the user configures.
   → Fix: move the Podman update into the Podman engine tile in System overview (as an
   "Update to 5.7.0" link, matching PD's provider card), or make the Podman card a
   compact one-line card so the 4-card cap holds four real extension cards.

10. [Copy] 02-nav-overflow-selected.png (dark + light), Services catalog › Add a
    service: one card is titled with a verb ("Add MaaS endpoint") while its siblings
    are product nouns ("Apicurio Registry", "PostgreSQL", "Red Hat AMQ Broker").
    → Fix: title it "Models-as-a-Service endpoint" (by Red Hat) and keep the action on
    the button.

11. [Copy] 16-welcome.png (dark + light): the page has two competing titles: the
    top-left "Get started with Podman Desktop next" and the centred "Welcome to Podman
    Desktop v2.0.0-next (interactive mockup)". In light, "Skip" is a lavender bordered
    button that competes with the primary.
    → Fix: keep one heading (the centred one) and drop the top-left title. Render Skip
    as a `type="link"` button, following the PD Cancel/Skip convention.

12. [Clarity] 14-status-popover.png (dark + light): the stop/start controls are bare
    white squares and triangles, brighter than the row text and with no visible label,
    so they read as checkboxes. Scaling rule 11 calls for a "labelled icon button".
    → Fix: use the ui-svelte icon button at secondary-text colour with a tooltip and
    aria-label ("Stop podman-machine-default"), and show a hover background so it reads
    as a button.
