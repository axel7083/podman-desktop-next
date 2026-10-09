# Nav lab — research round 2 (how others handle many contexts × kinds × tabs)

User feedback on round 1: P2 (connections rail + secondary nav) = too many nav bars; P5 (Lens hotbar) = Lens moved away; P1 (IDE explorer) = introduces new concepts (Workflows, Tools). Explore beyond "everything on the left".

## Key findings
- Lens 2024 removed the hotbar → Navigator tree + browser-like tabs + bottom Dock. Backlash: cluster navigation unclear, tabs from many clusters mixed. Lens 2025.2 added *contextual tab filtering* (drill into a cluster hides other tabs), 2025.4 brought the **hotbar back** (Pro/Enterprise) + context-aware dock + cluster colour. Lesson: context-scoped tabs + colour identity + one-click context switch matter.
- JetBrains: window-wide context lives in the **top toolbar as dropdowns** (Project, Branch, Run); explorable things in tool windows; Services tool window = one tree of Docker/K8s/DB connections; DataGrip colours tabs/toolbar per data source.
- VS Code: remote indicator bottom-left of status bar opens connection picker; Command Center omnibox in title bar.
- Docker Desktop: customizable left kinds nav; Quick Search in header; Docker Offload = header toggle that turns the whole UI purple (context by theming).
- Portainer / Headlamp / Compass: Home = connections grid/table → enter one; Headlamp ClusterChooser in top bar + multi-cluster aggregated lists (cluster column); Headlamp "Activities" for logs/terminals tied to a cluster.
- Aptakube: select several clusters at once; every list merged with a cluster column.
- OpenShift 4.19 merged perspectives (users switched up to 15×/session) + pinned favourites.
- AWS: unified top bar (service search, Region selector, favourites bar) + account colour on nav bar; hide unused regions/services.
- Slack 2023: functions rail + workspace switcher top-left; TablePlus: connection colour in status bar; Arc: spaces with colour.

## Patterns
(a) context switcher in title bar · (b) breadcrumb segments as dropdowns · (c) top horizontal section nav · (d) tabs as primary nav (fails without context scoping) · (e) home/launcher + tabs · (f) command-first omnibox · (g) colour-coded connection identity · (h) aggregated "all contexts" lists with connection column/facets · (i) workspaces (new concept — avoid).

## Proposals round 2 (no connection rail, no hotbar, no new top-level concepts; keep PD concepts: Dashboard, Containers, Pods, Images, Volumes, Networks, Kubernetes, Extensions, Settings, Accounts)
- **P6 Scope chip in title bar** (JetBrains/AWS): title bar `[● All engines ▾]` searchable multi-select (recents, pinned, groups); left = today's kinds nav filtered by scope, extension sections appear only when a scoped connection provides them; lists show connection column when >1 in scope; tabs with provider icon + colour; dock bottom; favourite-star pins tools into left nav.
- **P7 Breadcrumb header** (JetBrains nav bar/Azure): content header `[icon] connection ▾ › Kind ▾ › resource ▾`, each segment searchable dropdown; left kinds nav collapsible to icons; tabs titled by breadcrumb leaf, coloured by connection.
- **P8 Aggregated by default + connection facets** (Aptakube/Headlamp/Azure All resources): every kind page lists all running connections with Connection column + facet chip bar with counts; Dashboard = per-connection health card grid (click card = apply facet); remote clusters opt-in.
- **P9 Dashboard launcher + scoped tab groups** (Portainer/Compass/Lens contextual filtering): Dashboard grid of all connections; clicking opens a connection tab with in-page kind sub-tabs; resource tabs grouped after their connection tab like Chrome tab groups with colour labels, collapsible; dock follows active group; left kinds nav kept for cross-connection lists (collapsible).
- **P10 Status-bar context** (VS Code remote/TablePlus): leftmost status item = active context `[● kind-dev · ns default]` opening the picker; status bar tinted with connection colour; dock above status bar; top/left like today + tabs.
- **P11 Command-first minimal chrome** (k9s/Linear/Docker Quick Search): big title-bar omnibox with prefixes `@` connections, `>` commands, `#` extensions, results carry connection icon/colour; left reduced to Dashboard, Extensions, Settings + user favourites (kinds, extension pages, connection+kind pairs); tabs + dock.
- **Overlay H Colour as context** (Docker Offload/AWS/Arc/DataGrip): per-connection colour (prod red); when one connection in scope, thin tinted title bar/tab/dock border; tabs always icon + colour dot. Toggleable on top of any proposal.
- Suggested combination by research: P8 + (P6 or P7) + H + P11 elements.
