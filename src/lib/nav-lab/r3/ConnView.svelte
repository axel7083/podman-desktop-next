<script lang="ts">
/**
 * Connection Overview tab (P13): header (Overview icon, start / stop quick
 * actions), resource counters, key-value card, and one "Extend X" grid of equal cards for every
 * extension extending this provider
 * ("Install" in Vanilla flips the extension on; "Open" when installed).
 */
import { faEllipsisVertical, faPlay, faRotateRight, faStop, faTerminal } from '@fortawesome/free-solid-svg-icons';

import { type LabConnection, type LabTarget, TOOLS } from '../data.ts';
import ActBtn from './ActBtn.svelte';
import Card from './Card.svelte';
import ExtCards from './ExtCards.svelte';
import { isInstalled, type LabExtension, promotionsFor, sectionVisible } from './exts.ts';
import Head from './Head.svelte';
import KV from './KV.svelte';
import { connActions, connStatus, isUp, openConnTerminal, openMenu, toggleConn } from './live.svelte.ts';
import Btn from './Btn.svelte';
import { flows, openModal } from './flows.svelte.ts';
import LabIcon from '../ui/LabIcon.svelte';
import StatGrid from './StatGrid.svelte';
import { OVERVIEW_ICON, treeRoot, treesFor } from './trees.ts';

interface Props {
  c: LabConnection;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { c, onopen }: Props = $props();

const st = $derived(connStatus(c));
const up = $derived(isUp(st));
const trees = $derived(treesFor(c).filter(p => isInstalled(p.extId)));
/** Same collections as the tree: sections replaced by an extension tree are listed once (as the tree). */
const sections = $derived(c.sections.filter(s => sectionVisible(s) && !trees.some(p => p.replaces.includes(s.id))));
const promos = $derived(promotionsFor(c));

function openExt(e: LabExtension): void {
  const sec = c.sections.find(s => s.ext?.id === e.id);
  const tree = treesFor(c).find(p => p.extId === e.id);
  if (tree) onopen({ kind: 'node', connId: c.id, nodeId: treeRoot(tree, c.id).id }, {});
  else if (sec) onopen({ kind: 'list', connId: c.id, sectionId: sec.id }, {});
  else if (!TOOLS.some(t => t.id === e.id)) {
    // Extensions acting on engine resources (layers, scans, Kompose): open the collection they act on.
    const target = e.id === 'kompose' ? 'containers' : 'images';
    if (c.sections.some(x => x.id === target)) onopen({ kind: 'list', connId: c.id, sectionId: target }, {});
  } else onopen({ kind: 'tool', toolId: e.id }, {});
}
</script>

{#snippet actions()}
  <ActBtn icon={up ? faStop : faPlay} label={up ? 'Stop' : 'Start'} onclick={(): void => toggleConn(c)} />
  <ActBtn icon={faRotateRight} label="Restart" disabled={!up} onclick={(): void => toggleConn(c)} />
  <ActBtn icon={faTerminal} label="Open terminal" disabled={!up} onclick={(): void => openConnTerminal(c)} />
  <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, connActions(c, onopen))} />
{/snippet}

<div class="flex flex-col h-full min-h-0">
  <Head icon={OVERVIEW_ICON} title={c.name} status={st} sub="{c.product} · {c.detail}" provenance={c.product} {actions} />
  <div data-testid="conn-view" class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
    <StatGrid
      items={[
        ...sections.map(sec => ({ label: sec.label, count: sec.count, icon: sec.ext?.icon ?? sec.icon, onclick: (): void => onopen({ kind: 'list', connId: c.id, sectionId: sec.id }, {}) })),
        ...trees.map(p => ({ label: p.label, count: treeRoot(p, c.id).children?.filter(x => x.label !== 'Overview').length ?? 0, icon: p.icon, onclick: (): void => onopen({ kind: 'node', connId: c.id, nodeId: treeRoot(p, c.id).id }, {}) })),
      ]} />
    <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
      <Card title="Details">
        <KV
          rows={[
            { k: 'Type', v: c.product },
            { k: 'Details', v: c.detail },
            { k: 'Status', v: st },
            { k: 'Endpoint', v: c.group === 'Kubernetes' ? `https://api.${c.id}:6443` : `unix:///run/user/1000/podman/${c.id}.sock`, mono: true },
          ]} />
      </Card>
    </div>
    {#if c.product.includes('RHEL') && !flows.account}
      <div data-testid="rh-promo" class="flex items-center gap-3 p-3 rounded-lg bg-[var(--pd-content-card-bg)]">
        <LabIcon icon="icons/redhat.redhat-authentication.png" size={32} />
        <div class="flex-1 min-w-0">
          <div class="text-[14px] font-semibold text-[var(--pd-content-header)]">Register {c.name} with your Red Hat account</div>
          <div class="text-[13px] text-[var(--pd-table-body-text)]">Sign in to register this RHEL system with an activation key, enable RHEL repositories and pull from registry.redhat.io.</div>
        </div>
        <Btn icon="icons/redhat.redhat-authentication.png" onclick={(): void => openModal('rh-signin')}>{isInstalled('redhat-account') ? 'Sign in with Red Hat' : 'Install Red Hat Authentication'}</Btn>
      </div>
    {/if}
    {#if promos.length}
      <ExtCards ids={promos.map(e => e.id)} title="Extend {c.product}" onopenext={openExt} />
    {/if}
  </div>
</div>
