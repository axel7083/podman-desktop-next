<script lang="ts">
/** `#/nav-lab` index: round 1 and round 2, one card per proposal (idea, precedent, strengths, risks, 3-actions path, thumbnails). */
import { assetUrl, href } from '#lib/nav.ts';

import { lab, PROPOSALS, type ProposalId } from './lab.svelte.ts';

interface Card {
  idea: string;
  precedent: string;
  strengths: string[];
  risks: string[];
  /** Path to "pod checkout-1b58 on cluster ocp-dev". */
  actions: string;
  note?: string;
}

const CARDS: Record<ProposalId, Card> = {
  p1: {
    idea: 'JetBrains / VS Code: a rail of activities (Dashboard, Explorer, Workflows, Tools…). The Explorer is a tree connection → resource type (+ contributed sections) → resources, with filter and status dots. Everything opens as editor tabs; single click = italic preview tab.',
    precedent: 'VS Code activity bar + explorer, JetBrains Services tool window.',
    strengths: ['One tree scales to any number of connections and contributed sections', 'Preview tabs keep the strip small; provider badge on every tab', 'Most "IDE" of the five; familiar to developers'],
    risks: ['Feedback: introduces new concepts (Workflows, Tools)', 'No Containers/Images entry point; list pages become second-class', 'Tree at depth 3 gets long; needs filter + collapse'],
    actions: 'Explorer → expand ocp-dev › Pods (2 clicks) → checkout-1b58 (3).',
  },
  p2: {
    idea: 'Provider rail (connections grouped Engines / Kubernetes / VMs & services / Tools, More (n) overflow) + v1 secondary nav for the selected connection. The current list is a non-closable home tab; details and tools open as tabs next to it.',
    precedent: 'Slack workspace rail, Docker Desktop + v1 PD secondary nav.',
    strengths: ['Closest to the v2 mockup and #18065: continuity', 'Provider always visible in the rail and the home tab', 'Lists stay first-class, details become tabs'],
    risks: ['Feedback: too many nav bars (rail + secondary nav + tabs)', 'Rail mixes connections and tools; 18 connections overflow', 'At 1280 two nav columns take ~31% of the width'],
    actions: 'Rail ocp-dev (1) → Pods in secondary nav (2) → checkout-1b58 (3).',
  },
  p5: {
    idea: 'Lens: a thin hotbar of connection avatars (colour + initials + provider icon + status dot), an activity column with grouped sections for the selected connection, a Catalog home, tabs and a bottom dock (terminal, logs, Edit YAML).',
    precedent: 'Lens / OpenLens hotbar + dock.',
    strengths: ['Very compact; colour avatars are recognisable', 'Catalog is a good overview of everything', 'Dock with YAML editing is a strong Kubernetes workflow'],
    risks: ['Feedback: Lens moved away from it', 'Initials are cryptic for 18 connections', 'Feels like a Kubernetes IDE, less like PD'],
    actions: 'Hotbar OD avatar (1) → Pods (2) → checkout-1b58 (3).',
    note: 'Research: Lens removed the hotbar in 2024 (Navigator tree + tabs), users complained that cluster navigation became unclear, and Lens 2025.4 brought the hotbar back, but only for the paid Pro/Enterprise tiers, together with cluster colours and contextual tab filtering.',
  },
  p6: {
    idea: "Title bar `[● All engines ▾]` scope chip: a searchable multi-select (pinned, recent, groups, presets, \"only\"). The left nav is today's PD kinds nav filtered by the scope: counts follow the scope, Kubernetes and extension sections (Compose, Quadlets, Pipelines…) appear only when a scoped connection provides them. Lists show a Connection column when more than one connection is in scope. ★ on Extensions pins pages into the nav.",
    precedent: 'JetBrains project/branch widgets in the main toolbar, AWS console Region selector, Headlamp ClusterChooser.',
    strengths: ['One nav bar + a chip: no connection rail', "Keeps PD's kinds nav and concepts exactly", 'Scope is visible at all times in the title bar', 'Multi-select covers both "one cluster" and "all engines"'],
    risks: ['Scope is global and modal: a list can look "empty" because of a forgotten scope', 'Title bar real estate (macOS traffic lights, Windows controls)', 'Tabs from other connections stay visible (needs colour H)'],
    actions: 'Scope chip (1) → hover ocp-dev, click its "Pods" shortcut (2) → checkout-1b58 (3).',
  },
  p7: {
    idea: "The content header is a breadcrumb `[icon] connection ▾ › Kind ▾ › resource ▾`; every segment is a searchable dropdown (the connection one with connection › Kind shortcuts, \"All connections\" = aggregated). Left = today's kinds nav for the breadcrumb connection, collapsible to icons. The breadcrumb follows the active tab.",
    precedent: 'JetBrains navigation bar, Azure portal breadcrumb, Finder path bar.',
    strengths: ['Provider is part of the page title: always clear', 'Replaces the list title (no extra bar)', 'Each segment is a "switch sibling" shortcut', 'No new concepts'],
    risks: ['Context lives per page: two places (breadcrumb + nav) say "where am I"', 'Breadcrumb dropdowns are less discoverable than a nav', 'Long connection names squeeze the header at 1280'],
    actions: 'Connection segment ▾ (1) → ocp-dev › Pods shortcut (2) → checkout-1b58 (3), or resource ▾ and type.',
  },
  p8: {
    idea: 'Every kind page is aggregated: all local connections plus opted-in remote clusters, with a facet chip bar (connection + count) and a Connection column. Remote clusters are opt-in (cost, latency, credentials). The Dashboard is a health card grid; a card applies its facet, a count jumps straight to that kind.',
    precedent: 'Aptakube multi-cluster lists, Headlamp multi-cluster view, Azure "All resources", PD 1.x (Containers already aggregates engines).',
    strengths: ["Exactly today's PD nav, nothing new to learn", 'Answers "what runs where" without switching', 'Facets with counts scale better than a rail', 'Only one nav bar'],
    risks: ['Many facets at 20 connections need the "+N" picker', 'Remote aggregation cost and partial failures', 'Provider is shown per row, not in the chrome'],
    actions: 'Pods (1) → ocp-dev facet chip (2) → checkout-1b58 (3); or Dashboard ocp-dev "Pods" count (1) → row (2).',
  },
  p9: {
    idea: "Dashboard is the home tab (launcher). A card opens a connection tab with in-page kind sub-tabs; resources opened from it join that connection's coloured tab group (Chrome-style, collapsible, folded count). The dock follows the active group. A slim icon kinds nav opens cross-connection lists.",
    precedent: 'Portainer / Compass home → enter environment, Chrome tab groups, Lens 2025 contextual tab filtering.',
    strengths: ['Tabs carry the context: groups make 16+ tabs readable', 'Dock scoped to the active group', 'Very compact (icon nav only)'],
    risks: ['Connection tab with sub-tabs is a new page type', 'Group chips cost width; needs folding at 1280', 'Two ways to list (connection tab vs kind nav)'],
    actions: 'Dashboard ocp-dev "Pods" count (1) → checkout-1b58 (2). Or card (1) → Pods sub-tab (2) → row (3).',
  },
  p10: {
    idea: 'The leftmost status-bar item is the active context `[● kind-dev · ns default ▴]` and the status bar is tinted with its colour; it opens the connection picker upwards (with connection › Kind shortcuts). Title bar, kinds nav and tabs stay as today; the dock sits above the status bar.',
    precedent: 'VS Code remote indicator, TablePlus connection colour in the status bar, kubectx in shell prompts.',
    strengths: ['Zero extra nav bars: reuses the status bar', 'Colour of the whole bar is a strong "you are on prod" signal', 'Familiar to VS Code users'],
    risks: ['Bottom-left is the least discovered spot for newcomers', 'Single context only (no multi-select)', 'Status bar is "dark" chrome: picker theming, small hit target'],
    actions: 'Status context (1) → ocp-dev › Pods shortcut (2) → checkout-1b58 (3).',
  },
  p12: {
    idea: 'The first item of today\'s PD left nav is a connection switcher (icon tile + name + "Podman · running" + chevrons). Its dropdown is a plain list as wide as the nav: connections under Engines / Kubernetes / Other (icon, name, status dot, check on the current one), a filter only above 8 connections, then "Add connection" and "Manage connections". Everything below it is scoped to the selected connection. Collapsed nav: just the icon tile.',
    precedent: 'shadcn/ui sidebar team switcher, docs version switchers, Slack/Linear/Vercel workspace switcher, Postman workspace switcher.',
    strengths: ['One nav bar; context lives where the user already looks', 'With a single connection it is just a label (no useless chrome)', 'Familiar SaaS pattern; kinds nav unchanged below it'],
    risks: ['One connection at a time (cross-connection views live on the Dashboard)', 'Context hidden when the nav is collapsed (icon only)', 'Long dropdown at 20 connections needs search'],
    actions: 'Click switcher (1) → pick ocp-dev (2) → Pods → checkout-1b58 (3).',
  },
  p13: {
    idea: 'P1 without the rail. Kept from P1: editor tabs with italic preview tabs and provider badges, Summary | Inspect | Split details, bottom panel, the tree feel. Dropped: the activity rail and the Explorer / Workflows / Tools concepts. One left panel: the P12 switcher on top, a filter, then the selected connection as a tree (Overview, Containers ▸ items, Pods, Images…, contributed sections) and an Extensions sub-header with the pages relevant to it (AI Lab, MTA…). Dashboard is the home icon in the title bar; notifications, Extensions, Accounts and Settings are title-bar icons.',
    precedent: 'P1 (VS Code / JetBrains tree + tabs) with the P12 switcher (shadcn sidebar, Slack/Linear workspace switcher); title-bar icons as in VS Code, Docker Desktop, Lens 2025.',
    strengths: ['One left panel, no rail: nothing new to learn', 'Tree jumps straight to a resource from the nav', 'With one connection the switcher is just a label', 'Global pages where every desktop app puts them'],
    risks: ['One connection at a time in the tree', 'Deep trees get long (filter needed)', 'Title-bar icons are small targets and compete with OS window controls'],
    actions: 'Switcher (1) → ocp-dev (2) → expand Pods, click checkout-1b58 (3).',
  },
  p14: {
    idea: 'P5\'s secondary nav without the hotbar. Kept from P5: the per-connection column (Overview, Workloads / Images & storage / Network / Config / Cluster groups, contributed sections), tabs and the bottom dock with Edit YAML. Replaced: the hotbar by the P12 switcher at the top of that column (icon tile + name + "Podman · running" + chevrons). Extension pages for the connection under an Extensions group. Dashboard home icon and global icons in the title bar.',
    precedent: 'P5 (Lens dock + grouped sections) with the P12 switcher; Rancher Desktop / OpenShift console perspective switcher at the top of the nav.',
    strengths: ['Only one nav column (220px)', 'Grouped sections stay readable for big clusters', 'Same switcher and title bar as P13: easy to compare'],
    risks: ['Lists only (no tree): one more click than P13 to reach a resource', 'Group headers add height for small engines', 'One connection at a time'],
    actions: 'Switcher (1) → ocp-dev (2) → Pods (3) → checkout-1b58.',
  },
};

const SHOTS_R1 = [
  ['a-default', 'Default'],
  ['d-many-panel', 'Many tabs + panel'],
  ['e-1280', '1280px'],
  ['f-light', 'Light'],
];
const SHOTS_R2 = [
  ['a-default', 'Default'],
  ['b-open', 'Key interaction open'],
  ['c-many-panel', 'Many tabs + panel'],
  ['d-1280', '1280px'],
  ['e-light', 'Light'],
  ['f-colour', 'Colour overlay H'],
];
</script>

<div class="max-w-[1240px] mx-auto p-6 flex flex-col gap-4">
  <div>
    <h1 class="text-3xl font-bold text-[var(--pd-content-header)]">Nav lab: v2 navigation proposals</h1>
    <p class="text-[var(--pd-content-sub-header)] mt-1">Throwaway. Same fake dataset everywhere: 18 connections, 28 extension pages, ~400 resources, 16 pre-opened tabs, 4 terminals + 2 log streams. Use the lime bar to switch proposal, colour overlay H, theme, nav mode, tabs, panel (`) and screen width. Journey everywhere: <b>pod checkout-1b58 on cluster ocp-dev in ≤3 actions</b>. Docs: <code>docs/nav-lab-research-2.md</code>, reviews <code>docs/nav-lab-review.md</code> and <code>docs/nav-lab-review-2.md</code>.</p>
  </div>
  {#each [3, 2, 1] as round (round)}
    <h2 class="text-2xl font-bold mt-4 text-[var(--pd-content-header)]">
      {round === 3 ? 'Round 3: no rail, P1 / P5 iterated with the simple switcher' : round === 2 ? "Round 2: fewer nav bars, today's PD concepts, beyond the left edge" : 'Round 1'}
    </h2>
    {#if round === 3}
      <p class="-mt-2 text-[var(--pd-content-sub-header)]">Feedback: no primary rail, no invented concepts (Explorer, Workflows, Tools). Global destinations go where PD and desktop apps already put them: Dashboard as a home icon at the left of the title bar, notifications / Extensions / Accounts / Settings at the right. Extension pages appear in the nav under "Extensions" for the selected connection. Try <b>Connections: 1</b> in the lime bar.</p>
    {:else if round === 2}
      <p class="-mt-2 text-[var(--pd-content-sub-header)]">Answers the round-1 feedback (P2 "too many nav bars", P5 "Lens moved away", P1 "new concepts"). No connection rail, no hotbar, no Workflows/Tools: Dashboard, Containers, Pods, Images, Volumes, Networks, Kubernetes, Extensions, Accounts, Settings only. Toggle <b>Colour (H)</b> in the lime bar on any proposal (round 1 tabs too).</p>
    {/if}
    {#each PROPOSALS.filter(p => p.round === round) as p (p.id)}
      {@const card = CARDS[p.id]}
      {@const shots = round === 2 ? SHOTS_R2 : SHOTS_R1}
      <section class="rounded-xl bg-[var(--pd-content-card-bg)] p-5 flex flex-col gap-3" aria-label={p.name}>
        <div class="flex items-center gap-3">
          <h3 class="text-2xl font-bold text-[var(--pd-content-card-header-text)] flex-1">{p.name}</h3>
          <a class="px-4 py-[5px] rounded-md bg-[var(--pd-button-primary-bg)] text-[var(--pd-button-primary-text)]" href={href(`/nav-lab?p=${p.id}`)} onclick={(): void => lab.selectProposal(p.id)}>Open</a>
        </div>
        <p class="text-lg text-[var(--pd-content-card-text)]">{card.idea}</p>
        <p class="text-[var(--pd-content-card-text)]"><b>Who does this:</b> {card.precedent}</p>
        {#if card.note}<p class="text-[var(--pd-content-card-text)] rounded-md px-3 py-2 bg-[var(--pd-content-card-inset-bg)]"><b>Note:</b> {card.note}</p>{/if}
        <div class="grid grid-cols-2 gap-4">
          <div><div class="font-semibold mb-1 text-[var(--pd-status-running)]">Strengths</div><ul class="list-disc pl-5 flex flex-col gap-0.5">{#each card.strengths as s (s)}<li>{s}</li>{/each}</ul></div>
          <div><div class="font-semibold mb-1 text-[var(--pd-status-degraded)]">Risks</div><ul class="list-disc pl-5 flex flex-col gap-0.5">{#each card.risks as s (s)}<li>{s}</li>{/each}</ul></div>
        </div>
        <p class="text-[var(--pd-content-card-text)]"><b>3 actions</b> (pod checkout-1b58 on ocp-dev): {card.actions}</p>
        {#if round < 3}<div class="grid gap-2" class:grid-cols-4={round === 1} class:grid-cols-6={round === 2}>
          {#each shots as [id, label] (id)}
            <figure class="m-0">
              <img src={assetUrl(`nav-lab/${p.id}-${id}.png`)} alt="{p.name} {label}" class="w-full rounded-md border border-[var(--pd-content-card-border)]" loading="lazy" onerror={(e): void => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              <figcaption class="text-sm text-[var(--pd-content-sub-header)] mt-1">{label}</figcaption>
            </figure>
          {/each}
        </div>{/if}
      </section>
    {/each}
  {/each}
</div>
