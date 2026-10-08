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
   - Connections grouped by kind: ENGINES (`engine`), KUBERNETES (`kubernetes`),
     VMS & SERVICES (`vm`, `service`); then TOOLS; then Extensions; Accounts and
     Settings pinned at the bottom.
   - Group headers collapse (count shown when collapsed) and offer "+" (create).
   - Each group shows pinned items + the first **4**; the rest and hidden items go
     to "⋯ More (n)" (popover). The selected item is always visible.
   - Row: real provider icon, status dot (running / starting / stopped / error),
     name, hint chip (`WSL`, `context`, `OCM`). Stopped and extension-disabled rows are dimmed.
   - Row menu (hover): Pin to top / Move to More. Resizable 50–240px; below 70px
     only icons + tooltips, group headers become dividers.
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
