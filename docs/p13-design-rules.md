# P13 design rules

Enforceable rules for the P13 nav-lab proposal (`src/lib/nav-lab/proposals/P13.svelte`, `r3/*`, `ui/*`).
References: JetBrains New UI (editor tabs and tool-window tabs share one tab style), VS Code
(workbench tabs, panel, quick actions), Podman Desktop design tokens (`src/lib/theme/themes.css`,
type scale in `src/app.css`). Every rule names the component that implements it, so a
violation is a code smell you can grep for.

## A. Tabs

1. **One tab component** (`ui/Tab.svelte`) for editor tabs (`ui/TabStrip.svelte`) and
   bottom-panel tabs (`ui/BottomPanel.svelte`). Same values everywhere:
   - strip height **32px**, tab height 32px, label **12px**, max width 200px;
   - **16px** icon (`ui/TabIcon.svelte`), with an **8px** provider badge when the target belongs to a connection;
   - padding 0 6px 0 12px, gap 6px;
   - **active**: primary text + 2px accent bar at the bottom (JetBrains); inactive: secondary text; hover: hover background;
   - close ✕: 16px hit box, visible on the active tab and on hover, middle-click closes;
   - preview tab: italic label; double-click pins;
   - right-click opens the tab context menu (Close, Close others, Close tabs to the right).
2. **Panel header = tool-window title + the same tabs + toolbar** (JetBrains "Terminal  Local ×  Local (2) ×"):
   `Sessions` title (12px semibold), session tabs (kind icon: terminal / logs / YAML, provider
   badge, source name), then the toolbar (Split, New terminal, Maximize, Hide).
3. A non-closable leading tab (Dashboard) uses the same component with `closable=false`.
4. The overflow control is the same "+N ▾" button in both strips.

## B. Icons

5. **One scale**: 8px provider badge · **14px** inline secondary (chips, buttons, toolbars, key/value values,
   menu items) · **16px** primary (tabs, tree rows, table group rows, page headers) · 20px card icons ·
   32px logos in catalog / promotion cards · 48px empty-state hero. Nothing else.
   Implemented by `ui/LabIcon.svelte` (fixed box, FontAwesome glyphs scaled by font-size, images and
   SVG components by width/height).
6. **Same concept, same icon** everywhere (tree, tab, header, table group row, card):
   Dashboard = `DashboardIcon`; Overview (connection or extension) = `OVERVIEW_ICON` (circle-info);
   Containers = `ContainerIcon`; Pods = `PodIcon`; Images = `ImageIcon`; Volumes = `VolumeIcon`;
   Networks = `NetworkIcon`; extension roots = the extension logo; Settings = `SettingsIcon`;
   Extensions = puzzle piece; Accounts = user.
7. Table rows carry **no per-row icon**: status dot + name. Only group rows (Compose / Pod) show their kind icon.

## C. Color

8. Text has three levels: **primary** (`--pd-content-header`, `--pd-table-body-text-highlight`),
   **secondary/muted** (`--pd-table-body-text`), **disabled** (40% opacity). No other text colors.
9. **Accent** (`--pd-tab-highlight`, `--pd-button-primary-bg`, `--pd-link`) only for: active tab bar,
   selection, focus ring, pressed toggles, the primary button, links **on hover**.
   **No purple secondary text** (`--pd-content-sub-header`, `--pd-table-body-text-sub-secondary`,
   `--pd-content-breadcrumb` are banned in P13 surfaces).
10. **Status colors** (`--pd-status-*`, `STATUS_DOT`) only for status dots, status pills and severity;
    the one exception is the red of destructive actions (Delete) on hover and in menus.

## D. Buttons

11. Hierarchy per header (left → right): segmented control, filter, quick actions, secondary, **primary last**.
    - **Primary** (`r3/Btn.svelte kind="primary"`): filled, labelled, **max 1 per header**.
    - **Secondary** (`kind="secondary"`): outlined, labelled; every other page action (Pull image, Refresh, Rescan, Customize…).
    - **More** (`⋯`, `r3/ActBtn.svelte`): overflow menu for rare page actions (Prune, Load, Import…).
    - **Ghost icon-only** (`r3/ActBtn.svelte`): only **per-resource quick actions** (start, stop, restart,
      logs, terminal, TTY, delete) in details headers, table rows, tree rows and pane toolbars; always
      with tooltip + aria-label; max 5 then `⋯`.
12. Never an icon-only button for a main page action (e.g. bootc "Pull image" is a labelled secondary next to primary "Build").
13. Sizes: header buttons **28px** high (12px label, 14px icon); strip / pane toolbar buttons 24px; cards
    use the same `Btn` (per-card actions are secondary, never primary).

## E. Layout patterns

14. **Header** (`r3/Head.svelte`, every tab): 48px, padding 0 16px:
    `[16px icon] Title (16px semibold) · status pill · connection chip · muted sub ······ [segmented] [filter] [actions]`.
    Provenance (contributing extension) is the title-icon tooltip only.
15. **Segmented control** (`r3/SegFilter.svelte`): 28px; used for list filters (All / Running / Stopped),
    details views (Summary / Inspect / …) and severities. No PD `Button type="tab"` and no tab rows inside tabs.
16. **Filter input** (`r3/FilterInput.svelte`): the one search/filter field (28px, 14px icon, clear ✕,
    `/` and Ctrl+F focus it in lists). Tree filter, header filter, connection switcher use it.
17. **Tables**: every collection is a `r3/ModernTable.svelte` (via `RowsTable` for lists): resource lists,
    extension lists (MCP servers, Helm releases, AI Lab models / services / playgrounds, bootc images /
    disk images, Quadlets), scan results, compose services, image "used by", conditions, events, checks.
    Status dot + name + text columns + hover quick actions + `⋯`; read-only tables (`readonly`) drop
    the checkbox column. A generic key/value summary must never stand in for a list.
18. **Details** tabs default to **Summary**. Summary = key/value cards (label column 160px muted,
    value primary, 13px) followed by related collections as titled tables. Other views: Inspect / YAML,
    Kube, History, Check, contributed views. No view duplicates another (compose: services live in Summary).
19. **Cards**: `--pd-content-card-bg`, radius 8px, padding 16px, no border; card title 14px semibold primary.
20. **Empty states**: list without rows → `EmptyScreen`; filter without match → inline row
    "No X match … Clear filters"; missing extension → `r3/PromoEmpty.svelte` (48px hero, one primary install).
21. **Promotion**: an extension is promoted at most once per surface (`PromoEmpty` for the first missing one,
    `ExtCards` for the others, the dashboard banner); install is the only primary in a promotion; the purple
    brand gradient is reserved for the dashboard banner.
22. **Spacing**: 4px grid (4 / 8 / 12 / 16 / 20 / 24). Page padding 20px, card gap 16px, row gap 8px.
    Heights: tree row 24, tab 32, button / input / segmented 28, table row 34, header 48.
23. **Typography**: 11px captions (counts, group headers, badges) · **12px** UI chrome (tabs, tree, tables,
    buttons, inputs, toolbars) · **13px** reading text (key/value, descriptions) · **14px** card / section titles ·
    **16px** page titles. Larger only for dashboard numbers and empty-state titles.
24. **Radii**: 4px small controls inside strips, 6px buttons / inputs / segmented, 8px cards, full for pills and dots.
    **Borders**: 1px `--pd-content-divider` for separators only; dashed only for the "New provider" card.

## F. Interactions

25. **Every reference opens its tab**: a resource or connection chip / link / summary row / panel source
    chip opens or focuses the referenced tab (resource → its details; provider/connection chip → the
    connection Overview). Single click in tree / tables opens a preview tab, double click or Enter pins.
26. **Context menus**: every row with actions (tree, table, tab) has a right-click menu with the same
    actions as its `⋯` button.
27. **Keyboard**: Ctrl+F opens find in code / log views and focuses the filter in lists; `/` focuses the filter;
    Esc clears / closes; middle-click closes a tab.

## G. Islands (v3 default style)

Theme layer only: `src/lib/theme/islands.css` keyed on `html.style-islands` (Classic =
`style-classic` = the rules above unchanged). Components only carry hooks
(`data-island`, `data-resizer`, `data-frame*`); never style islands per component.
Research and values: [islands-theme.md](islands-theme.md).

28. **Three islands**: tree (`data-island="tree"`), editor = tab strip + content
    (`data-island="editor"`), bottom panel (`data-island="panel"`). Everything else
    (title bar, status bar, gaps) is the **window canvas** `--pdn-canvas`.
29. **Radius 10px, gap 6px** (`--island-radius`, `--island-gap`) between islands and
    from the window edges (the title bar is the top gap). 1px `--island-border`, no
    divider lines between regions.
30. **Surfaces**: dark canvas `#0f0f11` under `#222222` islands; light canvas `#e4e4e4`
    under `#f6f6f6` islands. "Different tool window background" (`twbg=on`) gives the
    tree and panel `--island-tool-bg` (dark `#27272a`, light `#ffffff`).
31. **Focus contrast** (JetBrains `Island.inactiveAlpha`): the island with focus
    (`:focus-within`, else the editor) gets `--island-border-active`, and its selected
    tab is an accent pill; selected tabs in other islands are neutral grey pills.
32. **Tabs**: rule 1 still holds (one `Tab`). In Islands the 2px bar becomes a
    26px rounded (6px) pill inside the 32px strip; the strip has no own background.
33. **Resizers live in the gaps** (tree ↔ editor, editor ↔ panel): the whole gap is the
    hit area, a 2px accent line shows on hover. Tree rows use rounded (6px) inset selection.
