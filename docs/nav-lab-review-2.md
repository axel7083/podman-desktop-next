# Nav-lab review, round 2: eleven proposals and overlay H

## Method

I read the round-2 brief (`nav-lab-research-2.md`) and the round-1 review first. Then I went through the 36 round-2 shots in `loop/runs/nav-lab/p6..p11/` (a-default, b-open, c-many-panel, d-1280, e-light, f-colour). For round 1, I re-checked the a-default and e-1280 shots of P1–P4 and all of P5 c–f. The other round-1 shots I assessed only through the round-1 review, because their image loads failed during this session. I also skimmed `proposals/P8.svelte`, `r2/ctx.ts` and `r2/nav.ts`, and grepped how each proposal builds its left nav, to check behaviour the screenshots can't show: the connection picker's "Go to" shortcuts, opt-in remote clusters, extension sections per scope, and the omnibox prefixes.

The user's feedback sets the bar: fewer nav bars (P2), no hotbar (P5), and no new top-level concepts (P1). Scores run from 1 (poor) to 5 (strong) and are unweighted. "Nav bars" counts persistent navigation strips, rails or columns; fewer scores higher.

## Scores

| Criterion                     | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 | P11 |
| ----------------------------- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Number of nav bars            | 3 | 2 | 1 | 4 | 2 | 4 | 3 | 5 | 3 | 4 | 5 |
| Scales to 20 connections      | 2 | 4 | 4 | 2 | 3 | 5 | 4 | 3 | 4 | 4 | 4 |
| Scales to 30 extension pages  | 3 | 2 | 2 | 4 | 1 | 4 | 3 | 2 | 2 | 3 | 4 |
| Scales to many open tabs      | 4 | 4 | 2 | 4 | 4 | 3 | 3 | 3 | 4 | 3 | 3 |
| Provider/context always clear | 3 | 4 | 5 | 3 | 5 | 4 | 4 | 4 | 5 | 3 | 2 |
| Continuity, no new concepts   | 1 | 4 | 3 | 3 | 2 | 4 | 4 | 5 | 2 | 4 | 2 |
| Discoverability for newcomers | 2 | 4 | 3 | 4 | 2 | 4 | 3 | 5 | 3 | 2 | 1 |
| Visual quality                | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 4 | 3 | 3 | 4 |
| Compactness at 1280           | 3 | 2 | 1 | 4 | 3 | 4 | 3 | 4 | 2 | 5 | 4 |
| **Total (/45)**               | **25** | **29** | **24** | **31** | **26** | **36** | **30** | **35** | **28** | **31** | **29** |

The ranking is P6 (36), P8 (35), then P4 and P10 tied (31). P6 and P8 are close, and they solve different halves of the problem: P6 is the global scope control, P8 is the list model. That's why the recommendation combines them.

## Round 2, per proposal

### P6: Scope chip in the title bar (36)
- **What works:** one nav column, plus a chip (`All engines 6 ▾`) at the top left where JetBrains and AWS users look for context. The picker (b-open) is the best connection selector in the lab. It has a filter field, quick sets (`All running / All engines / All`), Pinned, Recent, group headers with `toggle group`, checkboxes for multi-select, a `PROD` badge on ocp-prod, and per-row `Go to: Pods · Volumes · Kubernetes` shortcuts. The pod journey takes three actions: chip, then `ocp-dev › Pods` from Go to, then the row.
- Extension pages scale: `★ PINNED` with AI Lab and MTA sits in the left nav, and the full set is on Extensions. Contributed sections (Compose, Quadlets, Bootable images, Subscription) appear only when a scoped connection provides them.
- The Connection column appears when more than one connection is in scope (a-default), and it disappears for a single scope (f-colour).
- **What breaks:** the left nav reshapes with scope. In f-colour, Containers, Images and Networks vanish for ocp-prod, which costs muscle memory. Tabs are not scoped: `+8` tabs from every connection stay mixed, which is the exact Lens 2024 complaint. In a-default the chip says "All engines 6" while the header says "53 across 5 connections" (apple-container is stopped). That's correct, but it reads as an inconsistency.
- **Mockup gaps:** the picker opens over the tab strip and left nav, and "PI" from `PINNED` peeks out behind it (b-open). In f-colour the dock still shows the podman-machine-default `orders-api` terminal inside a red PROD frame.

### P7: Breadcrumb header (30)
- **What works:** `podman-machine-default ▾ › Containers 30 ▾ › open… ▾` is self-explanatory, and the connection dropdown (b-open) reuses the P6 picker with an `All connections (aggregated, Connection column)` entry.
- **What breaks:** the breadcrumb is a second nav bar inside the content area, about 65px tall on every page, which is the P2 complaint in a new place. A control in the content header changes the global left-nav counts (Containers 30, Pods 3), so a local widget drives global state. The third segment shows an italic `open…` placeholder on every list page (a, c, d, e), which looks unfinished. The tab strip sits above the breadcrumb, so it isn't clear whether the breadcrumb belongs to the tab or to the window.
- Keep the idea for detail headers only (P9 and P1 already show `ocp-dev › Pods › checkout-1b58` there).

### P8: Aggregated by default + connection facets (35)
- **What works:** this is closest to how PD v1 already behaves: Containers, Images and so on aggregate across engines. It has a single nav column, and nothing is hidden behind a picker. The facet chips carry counts (`All 53 · podman-machine-default 30 · rhel-10 8 · …`), so a newcomer can see where things are at a glance. `2 remote clusters not aggregated` is an honest opt-in for cost and credentials. At 1280 the chips collapse to `+1 more` (d-1280). The pod journey takes three actions: Pods, then the `ocp-dev 28` chip, then the row.
- **What breaks:** there is no global context in the chrome. Scope lives per page in the chip bar and doesn't show on the Dashboard or on detail tabs. The Connection column repeats `podman-machine-default` on every visible row (a, c, e). With 13 Kubernetes and engine connections on Pods (f-colour), the chip row already needs `+1 more` at full width. At 20 connections it becomes a horizontal list of 6 and a dropdown.
- **Bug:** the left nav has no Compose / Quadlets / Bootable images. `navEntries(base, { expandKube })` is called without `contributed: true`, while P6, P7 and P10 pass it. As a result, P8 scores worst on extension sections, and that's an implementation gap, not a flaw in the concept.
- **Mockup gap:** b-open is pixel-identical to a-default. At full width all five chips fit, so the "+N more" picker never opens in the capture.

### P9: Dashboard launcher + scoped tab groups (28)
- **What works:** it's the only proposal that scopes tabs (`23 tabs· 15 folded`, b-open lists tabs grouped by connection), and the dock follows the active group (c-many-panel shows `OCP-DEV` with only that cluster's sessions). That's a direct answer to the Lens tab-mixing backlash. The Dashboard grid is the strongest home page in the lab and is shared with P11.
- **What breaks:** tabs become the primary nav, which is the pattern the brief warns fails without scoping, and here it adds a level: icon rail, tab groups, then in-page kind sub-tabs. Group chips use tab width: at 1280 (d-1280), only about 4 resource tabs fit. The left nav is collapsed to unlabelled icons by default, which hurts newcomers.
- **Bugs:**
  - Group colours are on even with H off (a-default), so the overlay isn't really toggleable.
  - `rhel-10` and `ocp-prod` are both red, and `podman-machine-default` and `rhoai-dev` are both purple (f-colour). The colours collide exactly where colour should mean "danger".
  - The ocp-prod dock is an empty black panel with no empty state (f-colour).
  - `23 tabs· 15 folded` has a misplaced space.

### P10: Status-bar context (31)
- **What works:** it adds no chrome at all, which makes it the most compact at 1280 (d-1280). VS Code remote users will recognise it, and the picker is the same good one as P6.
- **What breaks:** bottom left is the least discoverable place in the window. A newcomer looking at a-default sees only `Pods 12`, and nothing at the top says why there are 12. The status bar is tinted green in a-default and e-light, so the tint is baked into P10 rather than coming from H. Green next to `11 running` reads as "healthy", not "kind-dev". The picker anchors from the bottom and covers half the left nav (b-open). The nav reshapes per context (only Pods / Volumes / Kubernetes for kind-dev).
- **Mockup gap:** in f-colour the dock keeps the podman terminal active under a red PROD frame.

### P11: Command-first minimal chrome (29)
- **What works:** the omnibox (b-open) is excellent. `checkout` returns pods across 7 clusters with the connection icon and a `PROD` badge on the right, plus `@`, `>` and `#` hints in the footer. For power users the pod journey is two actions: ⌘K, then `@ocp-dev checkout` and Enter. Favourites that mix kinds, connection+kind pairs (`ocp-dev › Pods`, `kind-dev › Kubernetes`) and extension pages are a good small idea.
- **What breaks:** it removes today's kinds nav. Volumes, Networks and Kubernetes have no entry point unless favourited or typed, which is a regression for current users and a wall for newcomers. Context is nearly invisible: f-colour shows only `in ocp-prod` in small text next to a star.
- **Bugs:** in f-colour no nav item is highlighted even though the Pods list is active. The `ocp-dev › Pods` favourite shows an orange dot while the scope is ocp-prod.
- **Dataset artefact:** `checkout-1b58` exists with the same name on 7 clusters, which makes the omnibox look busier than real data would.

## Round 1, updated against the feedback

- **P1 (25):** the user rejected Workflows and Tools as new concepts, and the tree still replaces tables. Keep only the `Summary | Inspect | Split` detail header and the bottom panel, which every round-2 proposal already reuses.
- **P2 (29):** "too many nav bars" is fair. At 1280 it has two full columns plus tabs (e-1280). Its best idea, a connection header with per-connection sections, survives as P6's scope-driven contributed sections.
- **P3 (24):** still last. The address row and group chips add a third and fourth bar. Its coloured tab underline lives on in H.
- **P4 (31):** with no rail it's still the most continuous round-1 layout, and P8 is essentially P4 done right: the `All connections 7` vs `57 across 6` count bug is fixed as `All 53`. But P4's Platform, Workflows and Tools groups are the same kind of new concepts the user rejected in P1.
- **P5 (26):** the hotbar is out of the base product. Lens dropped it in 2024 and brought it back in 2025.4 only for paid tiers, which says it's a power-user add-on rather than core nav. The grouped Kubernetes sections with extension icons (Pipelines, GitOps, Operators, Helm…) remain the best extension-contribution model. They appear in P6 and P7 when Kubernetes is expanded.

## Overlay H: colour as context

**Where it helps:**
- Prod safety: in f-colour, the red title bar and tab underline make "you are on ocp-prod" hard to miss in P6, P7, P8 and P11.
- Tab dots tell the clusters apart in mixed tab strips (orange `checkout-1b58` on ocp-dev).
- Facet chips with a coloured left edge (P8 f-colour) connect a list filter to the tab colour.

**Where it hurts or lies:**
- The tint covers the whole window but the content inside it doesn't all belong to the scoped connection. In f-colour, P6, P7, P8, P10 and P11 all show the podman-machine-default `orders-api` terminal active inside the red frame. A red PROD frame around a local shell is a false alarm, and a red frame around a local tab teaches users to ignore red. Either the tint should cover only the content and dock that belong to the connection, or the dock must follow the scope (as in P9).
- Colours collide. The palette gives ocp-prod red and acme-prod (AAP) dark red, which is fine for "both prod", but P9 shows rhel-10 red and podman-machine-default purple next to rhoai-dev purple. With 18 connections, unique hues run out. Colour should be opt-in per connection, and red should be reserved for anything labelled prod.
- Colour-blindness: red vs orange (ocp-prod vs ocp-dev) is the hardest pair for protanopes, and they're exactly the pair that matters. H must never be the only signal. Keep the `PROD` text badge, already present in pickers and breadcrumbs, and always show it in the scope chip and on tabs. Consider a pattern or icon as well.
- Local engines are neutral in `CTX_COLOR`, which is right: most users only have podman-machine-default and shouldn't see colour at all. P10's default green status bar ignores that rule.

**Verdict:** keep H, but narrow it. Colour is user-assigned and off by default, except that connections the user marks as production get red plus a `PROD` badge. Apply it only when a single connection is in scope, and only to elements that actually belong to that connection.

## Recommendation

**Build on P8 + P6 + a narrowed H, with P11's omnibox inside the existing search box, and P9's dock-follows-scope.** This doesn't introduce a new top-level concept, adds no extra nav bar, and brings back no hotbar.

1. **P8 as the list model.** Every kind page aggregates by default, as in PD v1. Facet chips with counts sit under the title, and the Connection column hides when a single facet is selected. Remote clusters are opt-in. This gives the highest continuity and discoverability, and the best answer to "too many nav bars" (one column).
2. **P6's scope chip as the single global state behind those facets.** Selecting `ocp-dev` in the chip and clicking the `ocp-dev 28` chip set the same thing. This fixes P8's missing chrome context, and on the Dashboard and detail tabs the chip still shows where you are. Keep the P6 picker in full (filter, pinned, recent, groups, `Go to` shortcuts, `PROD` badge). It's the best 20-connection answer in the lab.
3. **Left nav = today's kinds, stable.** Don't remove items when the scope changes. Instead, dim them and show a 0 count, so muscle memory survives. Add contributed sections per scope (P6) and fix P8's missing Compose / Quadlets. Pin extension pages with ★ into the left nav (P6/P11 favourites), with Extensions as the full list of all 28.
4. **P11's omnibox in the title-bar search**, with `@`, `>` and `#` prefixes and connection badges on results. It's an accelerator, not a replacement for the nav.
5. **From P9:** the dock filters to the scoped connection (with an empty state), and the Dashboard card grid is the home page, where clicking a card applies the scope. Lens-style contextual tab filtering can be an option on the tab overflow menu. Tab groups shouldn't be the primary nav.
6. **From P7:** the breadcrumb only in detail headers (`ocp-dev › Pods › checkout-1b58`), with the connection segment clickable. Not as a page-level scope control.
7. **H, narrowed:** as described above.

**Drop:**
- P10's status-bar context and default tint, because it's the least discoverable and its green clashes with status semantics.
- P11's removal of the kinds nav.
- P9's tab groups as primary navigation and its always-on colour chips.
- P7's breadcrumb on list pages.
- Everything rail-shaped from round 1 (P2's connections rail, P5's hotbar, P1's activity bar with Workflows and Tools, P3's address row).

## Mockup bugs and gaps seen

- P8 b-open is identical to a-default: the "+N more" facet picker is never shown open.
- P8's left nav omits contributed engine sections (Compose, Quadlets, Bootable images) because `contributed: true` isn't passed.
- In the f-colour shots of P6, P7, P8, P10 and P11, a podman-machine-default terminal is active inside the red ocp-prod frame.
- P9 f-colour: the ocp-prod dock is an empty black panel with no empty state.
- P9 colour collisions: rhel-10 and ocp-prod are both red, and podman-machine-default and rhoai-dev are both purple. Group colours also show with H off.
- P9: the tab label `23 tabs· 15 folded` has a misplaced space.
- P10: the status bar is tinted green in a-default and e-light even though H should be off there.
- P11 f-colour: no nav item is highlighted while the Pods list is active, and the `ocp-dev › Pods` favourite shows an orange dot under an ocp-prod scope.
- P7: the italic `open…` third breadcrumb segment shows on every list page, and the breadcrumb connection rewrites the left-nav counts.
- P6/P10: the left nav loses Containers, Images and Networks when a cluster is in scope.
- Dataset: identical pod names (`checkout-1b58`, `payments-1c5e`, …) on every cluster, which inflates omnibox results and makes the lists hard to tell apart in screenshots.
