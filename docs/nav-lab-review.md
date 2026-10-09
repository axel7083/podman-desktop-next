# Nav-lab review: five navigation proposals

I reviewed all 30 shots in `loop/runs/nav-lab/p1..p5/` (a-default, b-icons, c-labels, d-many-panel, e-1280, f-light). The dataset has 18 connections and 28 tools. Scores are unweighted, from 1 (poor) to 5 (strong).

| Criterion                                   | P1 IDE/Explorer | P2 Hybrid | P3 Browser | P4 Kind-first | P5 Lens |
| ------------------------------------------- | :-------------: | :-------: | :--------: | :-----------: | :-----: |
| Scales to many connections                  |        3        |     4     |     4      |       2       |    4    |
| Scales to many tools                        |        3        |     2     |     2      |       4       |    1    |
| Scales to many open tabs                    |        4        |     4     |     2      |       4       |    4    |
| Provider visible at all times               |        3        |     4     |     5      |       3       |    5    |
| Discoverability / continuity for PD users   |        2        |     5     |     3      |       5       |    2    |
| IDE feel & visual quality                   |        4        |     3     |     3      |       3       |    4    |
| Compactness at 1280px                       |        3        |     2     |     1      |       4       |    3    |
| Fit with PD #18065 (tabs + splits)          |        5        |     4     |     3      |       4       |    4    |
| **Total (/40)**                             |     **27**      |  **28**   |   **23**   |    **29**     | **27**  |

## Per-proposal notes

### P1: IDE/Explorer
- The most "IDE" look. The `Summary | Inspect | Split` switch in the header (a-default) is the only proposal that shows #18065 splits directly instead of only promising them.
- The tree doesn't scale. In a-default, a single engine's 30 containers fill the whole Explorer, and the other 17 connections sit below the fold. The 18-connection dataset ends up looking like one connection. A tree also replaces the list tables, which removes columns, bulk select and row actions.
- You can only tell the provider from the small badge on each tab icon (d-many-panel: `auth-1`, `reports-3`, `checkout-1b58`). The tree ancestry scrolls away.
- Tab overflow `+9` (d-many-panel) and `+10` (e-1280) works. The bottom panel with `+1` overflow, maximise and close is clean, and P2–P5 reuse the same panel.
- Mockup gaps: c-labels is pixel-identical to a-default. I saw no italic preview tab in any shot, and the Tools activity is never shown open.

### P2: Hybrid (connections rail + v1 secondary nav + home tab)
- Current PD users would feel at home: the secondary nav (Overview / Containers / Pods / Images / Volumes / Networks, then an "Extensions" block with Compose / Quadlets / Bootable images) is v1, and the tables are unchanged.
- The rail scales with group headers (Engines / Kubernetes / VMs & services) and `More 7` (a-default). c-labels matches the navbar prototype (labels under ~84px icons, `More (15)`).
- In icons mode (b-icons) the four Red Hat connections (rhel-10, rhoai-dev, sandbox, rhel10-dev) and both OpenShift ones look the same. The connection model needs per-connection identity, and icons mode loses it.
- Tools are not visible anywhere. No Tools group appears in any shot, so 28 tools are presumably buried under `More`.
- At 1280 (e-1280), two full-width nav columns take about 31% of the width before any content.
- The non-closable home tab (`⌂ Containers`) is a good answer to the question "where is the list?".

### P3: Browser-style
- It shows the provider best: the connection group chip (`podman-machine-default`, orange `ocp-dev`), coloured tab underline, address row with icon breadcrumb, and page chip. But that is four signals for one fact, plus the rail selection. It's redundant.
- Tab scaling is the worst. Group chips use tab-strip width, and because lists open tabs too, the count grows on every click. e-1280 shows only 4 real tabs before `+14`. d-many-panel has `+13`.
- The address row costs ~50px of height on every screen, and back/forward duplicates what tabs already do.
- At 1280, two columns plus the address row make it the least compact layout.

### P4: Kind-first
- It's the closest to today's PD (rail = Containers/Pods/Images/...) and has the strongest tools story: a `Tools` section with `All tools (28)` (a-default) that collapses to `More 2` at 1280 (e-1280).
- Cross-connection lists with scope chips and a `Connection` column are a feature no other proposal has. But the column repeats `podman-machine-default` on every visible row, and the provider is shown only in the table, not in the chrome.
- It breaks down on many connections: the chips show 6 + `+1 more` for engines only. Kubernetes is a single rail item, so 8 clusters disappear behind one entry. There is also a data bug: the chip says `All connections 7` while the header says `57 across 6 connections`.
- With one nav column it is the most compact at 1280. b-icons has 17 unlabelled icons, and VMs, Services and Models are hard to tell apart.

### P5: Lens-style
- It shows the provider best after P3, with less redundancy: coloured avatars with initials, a status dot and a provider glyph, plus a connection header card with a `⋮` menu. The grouped Kubernetes nav (Workloads / Images & storage / Network / Config / Cluster / Extensions with Pipelines, GitOps, Operators, Helm…) is the richest and most credible extension-contribution model of the five.
- The bottom dock's `Edit deployment/checkout` tab (d-many-panel) is a good idea for a non-terminal panel.
- The 28 tools have no entry point. Only `Catalog` and AI Lab as an open tab are visible.
- Initials don't scale: `OD`, `OP` and `OL` are all red-orange, `AC` and `AI` are easy to confuse, and stopped `PD` is just dimmed. Users need hover to tell them apart.
- The hotbar is icon-only by default: a-default and b-icons are identical, and only c-labels shows names. That is a big change for v1 users.

## Recommendation

**Build v2 on P2's shell, with P4's aggregation and P5's secondary-nav model added.** P4 has the highest raw total, but it buys continuity by giving up the connection-centric model. It collapses Kubernetes into one item and can't show 18 connections or per-connection extension sections (Pipelines, Operators) in the chrome. P2 keeps the connection as the main object, so the provider is always visible. Its rail is already the navbar prototype (pinned/regular/More, labels under icons). Its home tab plus detail tabs map directly onto #18065 and its bottom panel onto #18062. Its two weak spots, tools and 1280 width, can be fixed with what the other proposals do well.

Drop P3, the browser model. Making every navigation open a tab conflicts with #18065's splits and gives the worst tab and 1280 results.

## What to borrow from the losers

- **P1:** the `Summary | Inspect | Split` header switch on detail tabs; provider badges on tab icons; the `+N` tab overflow chip and the bottom-panel layout (`+N`, maximise, close).
- **P4:** a first-class **Tools** rail group with `All tools (28)` and per-tier `More`; an optional **All connections** aggregated list (scope chips + Connection column) as one rail entry, not the default model. Hide the Connection column when a single scope is selected.
- **P5:** collapsible, grouped secondary nav for Kubernetes connections, with extension-contributed sections carrying the extension icon and count; a connection header card with a `⋮` menu; the Edit YAML tab type in the bottom dock; status dots on rail items.
- **P3:** connection-coloured accent on tabs, but only as a thin underline and without group chips, which waste tab width; back/forward as shortcuts (no address row).
- **P2 fixes:** in icons mode, add a per-connection identity mark (initials/colour as in P5) so identical vendor logos can be told apart; at ≤1280, collapse the secondary nav to icons or let it auto-hide when a detail tab is active.
