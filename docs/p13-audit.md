# P13 audit against the design rules

Audit of every P13 surface against [`p13-design-rules.md`](p13-design-rules.md) (rule numbers in brackets).
Method: code read + headless Playwright (computed styles / bounding boxes, no screenshots).
Format: surface → violation → fix. All items below are fixed in the same commit.

## Tabs and panel

- [x] Editor tab strip → 36px strip, 35px tabs, 2px accent bar at the top [A1] → shared `ui/Tab.svelte`, 32px, accent bar at the bottom.
- [x] Bottom-panel tabs → 28px, own `.ptab` style, kind icon + 11px provider icon + extra kind glyph, no title [A1, A2] → same `Tab` component (32px, 12px, 16px kind icon + 8px provider badge); panel header = "Sessions" title + tabs + toolbar.
- [x] Panel "+N" overflow → different control from the editor one [A4] → same "+N ▾" button.
- [x] Dashboard home tab → 11px house glyph, own markup, icon differs from the Dashboard header [A3, B6] → `Tab closable=false` with `DashboardIcon`.
- [x] Tabs → no context menu [F26] → Close / Close others / Close tabs to the right (editor), Close / Split right / Open source (panel).
- [x] Tab icons → 15px FontAwesome rendered 11–15px, 10px badge [B5] → `TabIcon` 16px box + 8px badge (measured 16×16 for every tab and tree icon).
- [x] Pane source chip → one button for resource + connection; clicking the provider part only re-focused the resource (looked like "nothing happens") [F25] → two chips: resource (opens / focuses its tab) and connection (opens the connection Overview).
- [x] Pane toolbar → 28px, 11px text, 22×20 buttons at 75% opacity [E22, E23] → 32px, 12px, 24px buttons, full-strength muted text.
- [x] Panel toolbar buttons → 22×20 [D13] → 24px.

## Tree, title bar, switcher

- [x] Tree Overview icon 13px vs 15px for the others [B5] → `LabIcon` 16px for every row; status dots centred in a 16px box.
- [x] Tree dim text / counts at 50% opacity, 11px via `text-sm` + opacity [C8] → muted token, 11px.
- [x] "EXTENSIONS" group header 10px [E23] → 11px.
- [x] Connection switcher subtitle in purple (`--pd-content-sub-header`) [C9] → muted token.
- [x] Connection switcher filter → its own input markup [E16] → `FilterInput`.
- [x] Title-bar icons 15px [B5] → 16px.
- [x] Context-menu icons `xs` / 14px mixed [B5] → 14px `LabIcon`.

## Headers and buttons

- [x] `Head` → 18px icon, 15px title, 10px status / chip [B5, E23] → 16px icon, 16px title, 11px pill, 12px chip with 14px provider icon.
- [x] `ActBtn` → `xs` glyph (≈9px) [B5] → 14px glyph, 28px box, `data-btn="ghost"`.
- [x] Labelled buttons → ui-svelte `Button` (≈30px, shadow) mixed with ghost icons [D13] → `r3/Btn.svelte` (28px, primary / secondary).
- [x] bootc header → icon-only "Pull image" next to primary "Build" [D12] → labelled secondary "Pull image" + primary "Build".
- [x] bootc Examples cards → six primary "Pull image" buttons [D11, D13] → secondary.
- [x] bootc Overview → duplicate primary "Build disk image" in the welcome card + header "Build" [D11] → counters + About card, header keeps the single primary.
- [x] Images list → icon-only Prune / Load / Import / Pull page actions [D12] → `⋯` (Prune, Load, Import) + secondary "Pull image" + primary "Build".
- [x] Containers / Pods / Volumes / Networks lists → icon-only Prune page action [D12] → in `⋯`.
- [x] Quadlets list → icon-only Refresh [D12] → secondary "Refresh".
- [x] Scan tab → icon-only Rescan [D12] → secondary "Rescan".
- [x] Dashboard → icon-only "Customize" pencil; "Get started" primary ×6 [D11, D12] → secondary "Customize"; guides secondary.
- [x] Extension cards → icon-only primary download per card, PD link buttons in purple [D12, C9] → secondary "Install" / "Open", muted "Refresh the catalog" (accent on hover).
- [x] Promotion empty state / modal / Kube play → ui-svelte buttons, link-styled Cancel [D13] → `Btn` (one primary each).
- [x] Image details → 7 icon buttons (Run, Delete, Push, Edit, Save, Scan, ⋯) [D11 max 5] → Run, Push, Scan, Delete, ⋯ (Edit / Save / History in ⋯).
- [x] Quadlet / details quick-action order differs per view [D11] → Start/Stop, Restart, Logs, Terminal, TTY, Edit, Delete, ⋯ everywhere.

## Details

- [x] Compose details → default view "Containers", separate Containers view duplicating the services [E18, user] → default **Summary** (Project card + **Services** table); views Summary | compose.yaml.
- [x] Card titles in purple (`--pd-table-body-text-sub-secondary`) in resource, connection and Quadlet summaries [C9] → `r3/Card.svelte`, 14px primary.
- [x] Key/value rows → hand-written per view, 13px / 6px rhythm, label width 128–176px [E18] → `r3/KV.svelte` (160px muted label, primary value, references clickable).
- [x] Image "Used by", pod containers, deployment pods, conditions, events, image checks, layers → ad-hoc lists / HTML tables [E17] → `ModernTable` sections (`r3/Section.svelte`).
- [x] Container "Compose / pod" row, Engine row → plain text references [F25] → open the compose project / pod / connection.
- [x] Image short id in `--pd-table-body-text-sub-highlight` [C8] → muted token, mono.
- [x] Resource tab background `--pd-details-bg` differs from every other tab [E19] → content background.
- [x] Connection Overview → provider logo as header icon while the tree row / tab use the Overview icon [B6] → Overview icon + provider badge on the tab.
- [x] Connection Overview → resource chips (14px, inset) unlike the extension overviews [E] → `StatGrid` counters shared by connection, bootc and extension overviews.
- [x] Connection Overview → Quadlets counted twice (section + extension tree), duplicate Svelte key crash [E17] → sections replaced by a tree are listed once.
- [x] Connection Overview → the missing extension promoted twice (PromoEmpty + "Extend" cards) [E21] → promoted once.
- [x] Quadlet Summary → card inside a table row title, `systemctl` title 12px [E19] → `Card` + `KV` + `Section`.

## Extension pages and sub-trees

- [x] MCP servers → generic key/value summary ("Name MCP servers Detail 5 Path…") + "6 ITEMS" list with Overview as a row [E17, user] → `ModernTable`: status, name, transport, tools, clients, image / command, quick actions (start/stop, logs, delete), filter, All / Running / Stopped, primary "Add MCP server"; Overview is a tree node, never a row.
- [x] MCP server, Helm release, AI Lab model / service / playground, MCP tool → same generic summary [E18] → entity Summary (key/value + child collections as tables: Tools / Resources / Prompts, Revisions) | Inspect.
- [x] Helm releases (kind-dev, OpenShift) → generic summary [E17] → table: chart, revision, namespace, updated, primary "Install chart".
- [x] AI Lab root, Models, Services, Playgrounds → generic summary [E17] → Overview counters for the root; tables with Size / Port / Model and one primary each.
- [x] Extension "Overview" nodes (MCP, AI Lab) → summary of a node named "Overview" [E18] → counters + About card.
- [x] Extension tool pages (Image Builder, Dev containers, MTA, Helm…) → 36px logo, 16px bold title, purple subtitle, tab row inside a tab, skeleton cards [E14, E15, C9] → `r3/ToolView.svelte`: shared header, filter, one primary, `ModernTable`.
- [x] Accounts → fell back to a fake settings skeleton [E14] → `r3/AccountsView.svelte` (header, empty state, extension cards).
- [x] Table rows → per-row logos (bootc, Quadlets) while other lists had none [B7] → no per-row icon; group rows keep their kind icon.
- [x] Read-only tables (scan, checks, events) → disabled checkbox column [E17] → `readonly` drops the column.
- [x] Table text 13px, mono 11.5px, kind chip 10.5px [E23] → 12px, 12px, 11px.

## Global

- [x] Settings → `Button` secondary 30px, "Update available" purple link, 16px setting titles, 32px nav rows [D13, C9, E22] → `Btn` "Update to vX", 14px titles, 28px nav rows.
- [x] Off-scale type (`text-xs` 10px, 9–10.5px, 15px) on P13 surfaces [E23] → 11 / 12 / 13 / 14 / 16 only.
- [x] Ctrl+F only worked in code views [F27] → also focuses the list filter (`FilterInput kbd`).
- [x] Kube play tab → kube-context logo while pods use `PodIcon` [B6] → `PodIcon` in tab and header.

**57 findings, 57 fixed.**

Left as is (by design): the "Classic" table toggle keeps today's PD `Table` + `Button type="tab"`
(it is the PD 1.x baseline for comparison); the dashboard banner keeps PD's purple gradient (rule E21);
other proposals (P1–P12, P14) only inherit the shared components (tabs, modal, switcher) and were not audited.

Verification: `pnpm check` 0 errors; headless smoke opens every tree node of every connection plus each
details view (All extensions and Vanilla, ≈1 200 views), asserts no page / console error, ≤ 1 primary per
header, no icon-only page action, no purple text, equal editor / panel tab height (32px), font, padding,
and one icon size (16×16) across tree and tabs.
