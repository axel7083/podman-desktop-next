<script lang="ts">
/**
 * P11 Command-first, minimal chrome (k9s, Linear, Docker Quick Search): a
 * big title-bar omnibox is the main way to move; the left nav keeps only
 * Dashboard, Extensions, Settings plus user favourites (kinds, extension
 * pages, connection › kind pairs). Tabs and the dock as elsewhere.
 */
import { faStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarO } from '@fortawesome/free-regular-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn as findConn, type LabTarget, PANEL_SESSIONS, tool } from '../data.ts';
import { HOME, lab, Workbench } from '../lab.svelte.ts';
import { ctxColor, defaultKind, type OmniResult, pdKind } from '../r2/ctx.ts';
import Dashboard from '../r2/Dashboard.svelte';
import ExtPages from '../r2/ExtPages.svelte';
import Frame from '../r2/Frame.svelte';
import KindsNav, { type NavEntry } from '../r2/KindsNav.svelte';
import { listToKind, navIdOf, navTarget, tintFor } from '../r2/nav.ts';
import Omnibox from '../r2/Omnibox.svelte';
import BottomPanel from '../ui/BottomPanel.svelte';
import Content from '../ui/Content.svelte';
import TabStrip from '../ui/TabStrip.svelte';

const wb = new Workbench();
/** Favourite ids: `k:<kind>`, `x:<tool>`, `p:<conn>|<kind>`. */
let favs = $state<string[]>(['k:containers', 'k:pods', 'p:ocp-dev|pods', 'p:kind-dev|kubernetes', 'k:images', 'x:ai-lab', 'x:mta']);
// svelte-ignore state_referenced_locally
let scope = $state<string[] | undefined>(lab.ctx ? [lab.ctx] : undefined);
wb.home = lab.ctx ? { kind: 'kind', kindId: defaultKind(findConn(lab.ctx)) } : { kind: 'dashboard' };
$effect.pre(() => {
  wb.resetFor(lab.tabs);
});

const favEntries = $derived(
  favs
    .map((id): NavEntry | undefined => {
      if (id.startsWith('k:')) {
        const k = pdKind(id.slice(2));
        return k && { id, label: k.label, icon: k.icon };
      }
      if (id.startsWith('x:')) {
        const t = tool(id.slice(2));
        return t && { id, label: t.name, icon: t.icon };
      }
      const [cid, kid] = id.slice(2).split('|');
      const k = pdKind(kid);
      return k && { id, label: `${findConn(cid)?.name} › ${k.label}`, icon: k.icon, connId: cid, color: lab.color ? ctxColor(cid) : undefined };
    })
    .filter((e): e is NavEntry => !!e),
);

/** Current home as a favourite id. */
const homeFav = $derived.by(() => {
  const h = wb.home;
  if (h?.kind !== 'kind' || !h.kindId || h.kindId === 'x') return undefined;
  return scope?.length === 1 ? `p:${scope[0]}|${h.kindId}` : `k:${h.kindId}`;
});
const selected = $derived(wb.active === HOME ? (homeFav ?? navIdOf(wb.home)) : navIdOf(wb.activeTarget));
const tint = $derived(tintFor(scope));

function goKind(kindId: string, connId?: string): void {
  scope = connId ? [connId] : undefined;
  wb.goHome({ kind: 'kind', kindId, sectionId: kindId === 'kubernetes' ? 'deployments' : undefined });
}

function onnav(id: string): void {
  if (id.startsWith('k:')) return goKind(id.slice(2));
  if (id.startsWith('p:')) {
    const [cid, kid] = id.slice(2).split('|');
    return goKind(kid, cid);
  }
  const t = navTarget(id);
  if (!t) return;
  if (t.kind === 'tool' || t.kind === 'settings' || t.kind === 'accounts') wb.open(t);
  else wb.goHome(t);
}

function onpick(r: OmniResult): void {
  switch (r.kind) {
    case 'connection':
      return goKind(defaultKind(findConn(r.connId)), r.connId);
    case 'pair':
      return goKind(r.kindId ?? 'containers', r.connId);
    case 'kind':
      return goKind(r.kindId ?? 'containers');
    case 'resource':
      if (r.resource) wb.open({ kind: 'resource', connId: r.resource.connId, sectionId: r.resource.sectionId, resId: r.resource.id });
      return;
    case 'extension':
      wb.open({ kind: 'tool', toolId: r.id });
      return;
    case 'command':
      if (r.id === 'toggle-panel') lab.panel = !lab.panel;
      else if (r.id === 'theme') {
        lab.theme = lab.theme === 'dark' ? 'light' : 'dark';
        lab.applyTheme();
      } else if (r.id === 'colour') lab.color = !lab.color;
      else if (r.id === 'settings') wb.open({ kind: 'settings' });
      else lab.openCreate(r.label.replace('…', ''));
  }
}

function open(t: LabTarget, opts: { preview?: boolean } = {}): void {
  if (t.kind === 'list' && t.connId) {
    scope = [t.connId];
    wb.goHome(listToKind(t.sectionId));
    return;
  }
  if (t.kind === 'connection' && t.connId) return goKind(defaultKind(findConn(t.connId)), t.connId);
  wb.open(t, opts);
}

function toggleFav(id: string): void {
  favs = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
}
</script>

{#snippet omni()}
  <Omnibox {onpick} initialOpen={lab.openKey} initialQuery={lab.openKey ? 'checkout' : ''} />
{/snippet}

{#snippet star()}
  {#if homeFav}
    {@const on = favs.includes(homeFav)}
    <button type="button" aria-pressed={on} title={on ? 'Remove from favourites' : 'Add to favourites (left nav)'} class="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--pd-content-card-hover-bg)]" class:text-[var(--pd-status-degraded)]={on} onclick={(): void => toggleFav(homeFav)}>
      <AppIcon icon={on ? faStar : faStarO} />
    </button>
    {#if scope?.length === 1}<span class="text-sm text-[var(--pd-content-sub-header)]">in {findConn(scope[0])?.name}</span>{/if}
  {/if}
{/snippet}

<Frame titleCenter={omni} {tint}>
  <KindsNav entries={[]} favourites={favEntries} favTitle="Favourites" {selected} collapsed={lab.rail === 'icons'} onselect={onnav} label="Favourites" />
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <TabStrip {wb} />
    <div class="flex-1 min-h-0 overflow-hidden">
      {#key wb.active === HOME ? JSON.stringify(wb.home) + (scope ?? []).join() : wb.active}
        {#if wb.active === HOME && wb.home?.kind === 'dashboard'}
          <Dashboard hint="Or press ⌘K and type: @ocp-dev checkout" onpick={(id, k): void => goKind(k ?? defaultKind(findConn(id)), id)} />
        {:else if wb.active === HOME && wb.home?.kind === 'extensions'}
          <ExtPages favs={favs.filter(f => f.startsWith('x:')).map(f => f.slice(2))} ontoggle={(id): void => toggleFav(`x:${id}`)} onopen={(id): void => wb.open({ kind: 'tool', toolId: id })} />
        {:else}
          <Content target={wb.activeTarget} onopen={open} scope={scope ?? []} titleExtra={star} />
        {/if}
      {/key}
    </div>
    <BottomPanel sessions={PANEL_SESSIONS} {tint} />
  </div>
</Frame>

