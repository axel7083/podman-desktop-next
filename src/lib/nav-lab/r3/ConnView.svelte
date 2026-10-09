<script lang="ts">
/**
 * Connection Overview tab (P13): header (Overview icon, start / stop quick
 * actions), resource counters, key-value card, and promotion cards for related extensions
 * ("Install" in Vanilla flips the extension on; "Open" when installed).
 */
import { faEllipsisVertical, faPlay, faRotateRight, faStop, faTerminal } from '@fortawesome/free-solid-svg-icons';

import type { LabConnection, LabTarget } from '../data.ts';
import ActBtn from './ActBtn.svelte';
import Card from './Card.svelte';
import ExtCards from './ExtCards.svelte';
import { ext, isInstalled, type LabExtension, promotionsFor, sectionVisible } from './exts.ts';
import Head from './Head.svelte';
import KV from './KV.svelte';
import { connActions, connStatus, isUp, openConnTerminal, openMenu, toggleConn } from './live.svelte.ts';
import PromoEmpty from './PromoEmpty.svelte';
import Btn from './Btn.svelte';
import { flows, openModal } from './flows.svelte.ts';
import LabIcon from '../ui/LabIcon.svelte';
import StatGrid from './StatGrid.svelte';
import { OVERVIEW_ICON, TREE_PROVIDERS, treeRoot } from './trees.ts';

interface Props {
  c: LabConnection;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { c, onopen }: Props = $props();

const st = $derived(connStatus(c));
const up = $derived(isUp(st));
const trees = $derived(TREE_PROVIDERS.filter(p => p.connIds.includes(c.id) && isInstalled(p.extId)));
/** Same collections as the tree: sections replaced by an extension tree are listed once (as the tree). */
const sections = $derived(c.sections.filter(s => sectionVisible(s) && !trees.some(p => p.replaces.includes(s.id))));
const promos = $derived(promotionsFor(c));
/** First promoted extension not installed yet: shown as the PD empty-state promotion. */
const missing = $derived(promos.find(e => !isInstalled(e.id)));
const PROMO_TEXT: Record<string, [string, string, string]> = {
  quadlet: ['No Quadlets', 'Run containers, pods and Kubernetes YAML as systemd services that start at boot, restart on failure and auto-update.', 'docs.podman.io/quadlet'],
  bootc: ['No bootable images', 'Turn a container image into a bootable OS: build qcow2, raw, ISO or AMI disk images from a Containerfile.', 'containers.github.io/bootc'],
  'ai-lab': ['No AI models', 'Run open models locally, try recipes and chat with them in playgrounds, then serve them with an OpenAI-compatible API.', 'podman-desktop.io/docs/ai-lab'],
  'kube-dashboard': ['No Kubernetes dashboard', 'See workloads, events and metrics of this cluster at a glance.', 'podman-desktop.io/extensions'],
  'openshift-console': ['No OpenShift Console', 'Install the OpenShift web console on this local cluster to browse workloads, logs and events in your browser.', 'github.com/openshift/console'],
  hummingbird: ['No hardened images', 'Find a minimal, zero-CVE Red Hat Hardened Image for your local images and rebuild them on it.', 'hummingbird-project.io'],
  helm: ['No Helm releases', 'Install charts and manage releases and revisions on this cluster.', 'helm.sh'],
};

function openExt(e: LabExtension): void {
  const sec = c.sections.find(s => s.ext?.id === e.id);
  const tree = TREE_PROVIDERS.find(p => p.extId === e.id && p.connIds.includes(c.id));
  if (tree) onopen({ kind: 'node', connId: c.id, nodeId: treeRoot(tree, c.id).id }, {});
  else if (sec) onopen({ kind: 'list', connId: c.id, sectionId: sec.id }, {});
  else onopen({ kind: 'tool', toolId: e.id }, {});
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
    {#if missing}
      {@const txt = PROMO_TEXT[missing.id] ?? [`No ${missing.name}`, `${missing.description}.`, 'podman-desktop.io/extensions']}
      <div class="rounded-lg bg-[color-mix(in_srgb,var(--pd-content-card-bg)_40%,transparent)]">
        <PromoEmpty icon={ext(missing.id)?.icon ?? ''} title={txt[0]} description={txt[1]} extId={missing.id} info={txt[2]} onbrowse={(): void => onopen({ kind: 'extensions' }, {})} onaction={(): void => openExt(missing)} actionLabel="Open" />
      </div>
    {/if}
    {#if promos.some(e => e.id !== missing?.id)}
      <ExtCards ids={promos.filter(e => e.id !== missing?.id).map(e => e.id)} title="Extend {c.product}" onopenext={openExt} />
    {/if}
  </div>
</div>
