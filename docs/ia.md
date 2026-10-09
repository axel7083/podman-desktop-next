# Information architecture and scaling rules

Source: mockup plan §4. Each rule is tested with the *Everything* scenario.

```
┌ TitleBar  ◀ ▶   [ Search or run a command…  Ctrl K ]                 [Mockup ▾] ─ □ ✕ ┐
├──────────────┬──────────────────┬──────────────────────────────────────────────────────┤
│ ⌂ Dashboard  │ podman-machine-… │  Containers > rhel-quarkus-app        [▶ ■ ⋮]         │
│ ENGINES      │ Overview         │  Summary  Logs  Inspect  Terminal │ Dev UI  JFR       │
│ ● podman-…   │ Containers  12   │                                                      │
│ ● rhel-9 WSL │ Pods         2   │                                                      │
│ KUBERNETES   │ Images      31   │                                                      │
│ ● kind-dev   │ Volumes          │                                                      │
│ ● ocp-prod ☁ │ ── Extensions ── │                                                      │
│ VMS/SERVICES │ Quadlets       ⓠ │                                                      │
│ TOOLS        │ Skupper site   ⓢ │                                                      │
│ ✦ AI Lab     │                  │                                                      │
│ ⋯ More (4)   │                  │                                                      │
│ Extensions   │                  │                                                      │
│ Accounts  ⚙  │                  │                                                      │
├──────────────┴──────────────────┴──────────────────────────────────────────────────────┤
│ ● All systems running ▾   ⎈ kind-dev                               ☰ 1  🔔   v2.0.0-next │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Routes

| Route | Page |
|---|---|
| `/` | Dashboard: System Overview (every connection) + configurable extension cards |
| `/c/<conn>` | Connection overview: Summary (resource tiles, details), Add-ons (Kubernetes), extension tabs (`?tab=`) |
| `/c/<conn>/<resource>` | Core list (`containers`, `pods`, `images`, `volumes`, `networks`, `secrets`, `nodes`, `deployments`, `k8s-pods`, `services`, `configmaps`, `pvcs`) or a contributed nav section |
| `/c/<conn>/<resource>/<id>/<tab>` | Details; Kubernetes objects use resource `kube` and id `Kind~namespace~name` |
| `/tools/<id>` | Contributed tool page |
| `/extensions` | Installed (toggles, dependencies, contributes, P#) and Catalog |
| `/settings/<section>` | Resources, CLI Tools, Registries, Proxy, Docker Compatibility, Preferences + contributed sections |
| `/settings/create/<factory>` | Connection factory wizard |
| `/accounts` | Authentication providers |

## Rules

1. **Primary nav**
   - Connections grouped by kind: Engines (`engine`), Kubernetes (`kubernetes`),
     VMs & services (`vm`, `service`); then Tools; then Extensions; Accounts and
     Settings pinned at the bottom. Group headers are small semibold sentence
     case (no uppercase transform, so "VMs" survives); the same labels are used
     on the dashboard and in the status popover.
   - Group headers collapse (count shown when collapsed) and offer "+" (create).
   - Each group shows pinned items + a capped number of slots (see "Scaling
     rules" 2–4); the rest and hidden items go to "⋯ More (n)" (popover). The
     selected item always takes a slot.
   - Row: real provider icon, status dot (running / starting / stopped / error),
     name, hint chip (`WSL`, `context`, `OCM`). Stopped and extension-disabled rows are dimmed.
   - Row menu (hover): Pin to top / Move to More. Resizable 50–240px; below 70px
     only icons + tooltips, each group header becomes a 1px divider and each
     "⋯" row carries a count badge with the tooltip "More engines (4)".
   - Order: Podman first (default engine), then provider, then name. Status never reorders.
2. **Secondary nav** (170px): connection header (icon, name, status · provider),
   Overview, core resources with counters, "Extensions" divider, contributed
   sections whose `when(conn)` matches, with the extension icon.
3. **Tabs**: core tabs, a vertical divider, extension tabs; with more than 3
   extension tabs the 3rd onwards go into "More (n) ▾".
4. **Cross-cutting features show up where the user already is**: checkers → image
   Security tab (one section per checker + merged severity summary), auth →
   Accounts, CLIs → Settings › CLI Tools, registries → Settings › Registries,
   cluster add-ons → connection › Add-ons.
5. **Dashboard**: System Overview lists every connection; extension cards live in an
   "Extensions" section the user configures with ListOrganizer. The status-bar
   popover aggregates every connection with start/stop (#19219).
6. **Command palette** (Ctrl/⌘K): pages, connections, connection resources,
   contributed sections, tools, factories, contributed commands, containers,
   images and Kubernetes objects; tabs All / Go to / Commands / Resources.
7. **Graceful degradation**: a connection whose extension is disabled stays in the
   nav (dimmed) with an "Enable <extension>" EmptyScreen; an image with no checker
   shows "Enable a checker"; unknown sections/tabs show an EmptyScreen explaining why.
8. **Provenance**: contributed elements carry their extension icon where it adds
   meaning; "Inspect integrations" outlines every contribution with
   `<extension> · <point> · P#`.

## Scaling rules (polish pass, tested with `?scenario=everything`: ~75 extensions, 34 connections, 20 tools)

Rules the shell applies so the product stays usable when every integration is
enabled. Each names where it is implemented.

1. **Primary nav never pushes the footer away** (`PrimaryNav.svelte`). Dashboard
   is pinned on top; Extensions, Accounts and Settings are pinned at the bottom;
   everything in between scrolls and the selected row is scrolled into view after
   navigation. The scroll region starts strictly below the pinned Dashboard row
   (a 1px divider appears once scrolled), and its 28px bottom fade is a
   `mask-image` on the scroller only, so nothing ever renders behind a pinned row.
   Group headers (rail: group dividers) are sticky with an opaque background, so
   rows never show without their group; revealing the selected row brings its
   group start into view when it fits and scrolls past a group cut at the top
   edge, so an orphaned "More (n)" / "⋯ n" row never sits under Dashboard.
2. **Per-group caps** (`GROUP_CAP`): Engines 4, Kubernetes 4, VMs & services 3,
   Tools 4 (+ pinned items, which don't count). A group that overflows by one
   shows the item instead of "More (1)".
3. **Who gets a visible slot**: selected item › one running item per engine
   type / provider (so Podman, Docker and WSLC all stay reachable) › other
   running or connected items (tools: with a badge) › the rest; ties keep the
   stable order (D10). Visible rows are displayed in stable order, so status
   changes never reshuffle what is on screen. Selecting an overflow item swaps
   it into the last slot; the group never grows.
4. **"More (n)" popover** stays on screen (clamped above the status bar, scrolls),
   uses 28px rows, and groups Tools by the contributing extension's **category**
   (`MockExtension.category`) once there are more than 6.
5. **Secondary nav**: core resources, then one flat "Extensions" list for
   extensions that contribute a single section, then one sub-header (icon + name)
   per extension contributing 2+ sections (e.g. "Pipelines & GitOps"). Rows carry
   no extra badge (the row icon is the provenance). Nothing ellipsizes at 170px:
   the connection name, sub-headers and row labels ("ConfigMaps & Secrets") wrap
   to two lines (mid-word breaks only as a last resort) and rows have a title tooltip. Connections with nothing but
   an overview (most VMs and services) get no secondary nav at all.
6. **Connection home** = one page: identity header with lifecycle actions (no
   breadcrumb, no close: it is a top-level destination), Summary (resource tiles +
   details) and Add-ons, then contributed tabs after the divider, >3 → "More".
7. **Dashboard**: running engines first in a 2-column grid, capped at 6 with
   "Show all n engines"; other connections as neutral chips grouped by kind
   (Kubernetes / VMs & services), 10 per group + "+n more"; headings carry a
   count but no trailing colon; extension cards capped at 4 with "Show n more
   cards" and configured with the ListOrganizer (header pencil, or the
   "Customize" link on the Extensions card). Compact cards (`CardDef.compact`, e.g.
   the Podman update notice) render as one-line rows above the grid and never
   take a capped slot.
8. **Container groups**: one row format for every grouper — title = group name
   (never truncated by a chip, no "(type)" suffix), line 2 = chip (extension icon
   + short label, `GrouperDef.chip`: "Quarkus Dev Services", "Compose", "Kind",
   "Pod") + container count; grouper details ("Quarkus 3.20", the
   Testcontainers command) sit in the otherwise empty Image column so line 2
   never truncates. Contributed columns appear only when a
   container of the connection has a value.
9. **Image Security tab**: summary first (merged severity counts + one row per
   checker with its counts or "Passed" and its headline; click jumps to the
   section). With more than 3 checkers, sections collapse unless they hold
   critical findings or a remediation action. Finding rows share one grid.
10. **Extensions page**: category chips with counts + status filter
    (All/Enabled/Disabled) + search; tab and chip counts follow the search
    (chips with 0 matches are dimmed, never removed) and the summary becomes
    "9 of 72 match “openshift”" while a query is active; results grouped by
    category; pack members nested under their pack; compact one-card-per-extension
    rows with contributions, "Requires …", "Required by n extensions" and an
    inline "Enabling also enables …" notice before the toggle. The right column
    shows the source only ("From catalog"; nothing for bundled, which has the
    badge); persona/scenario tags are a tooltip, P# chips appear only in Inspect mode.
11. **Command palette**: results grouped (Pages, Connections, Sections, Tools,
    Create, Commands, Containers and images, Kubernetes objects), 4 per group
    when idle ("+n more – type to filter"), 8 per group while typing; every
    contributed item shows its extension (icon + name) on the right. Provenance,
    meta, "+n more" and the footer count use secondary text; accent is reserved
    for the selected row. The palette grows out of the title-bar search field
    (its input takes the field's measured width and position; only the results
    panel below is wider) instead of stacking a second search box. Every tab
    strip (NavPage `Button type="tab"`, palette, DetailsPage) uses neutral
    unselected text and accent only on the selected underline.
    **Status-bar connections popover**: grouped by kind with collapsible headers
    and counts, 6 rows per group (running first) + "Show all n"; status is a dot
    plus neutral text, start/stop is a labelled icon button (bordered, secondary
    text colour, tooltip "Stop <name>"); hint chips keep
    their authored case.
    **Status bar** (`StatusBar.svelte`): a running task shows once, as its
    progress toast plus the task counter (spinner + count, no per-task progress
    item); the left aggregate stays stable ("26 of 34 running") with a spinner
    while something starts or connects. At most 3 contributed status items show
    inline; the rest collapse into a "⋯ n" button ("More status items") whose
    popover lists them with their extension.
12. **Settings nav** (220px): core sections first (never truncated),
    contributed sections after an "Extensions" divider, alphabetical, in their
    authored sentence case, each with its extension's icon and a title tooltip
    (label – extension) when it ellipsizes. Settings › Resources groups provider
    cards by kind (Engines / Kubernetes / VMs & services) under a name filter;
    connection details are label/value rows that ellipsize with a tooltip. Every
    provider card has one single-line primary "Create new …" button; extra
    factories (RHEL Podman machine) sit in its split dropdown.
13. **Toasts**: at most 2; a task's progress toast is replaced in place by its
    outcome (same `taskId`); success/info auto-dismiss after 5 s, warnings 8 s,
    errors persist; compact 300px cards above the status bar.
14. **Copy at scale**: page titles keep their authored sentence case (the
    ui-svelte `capitalize` on NavPage titles is neutralised, only the first letter
    is upper-cased); counts go through `plural()` and ages through
    `duration()/timeAgo()` (`src/lib/util.ts`): "1 member", "just now".
15. **User changes survive scenario re-opening**: the enabled set is
    `preset(selection) + user overrides` (`pdn.overrides.<key>`); opening the same
    selection again (URL or picker) keeps installs/toggles, "Reset extensions"
    drops the overrides.
16. **One owner per concept**: e.g. `redhat.redhat-authentication` owns SSO,
    activation keys, subscriptions and the registry service account;
    `redhat.rhel-registration` depends on it and only contributes per-system
    registration (tab, settings list, "RHEL systems" card).
