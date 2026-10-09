<script lang="ts">
/**
 * Connection summary tab (P13): compact header with start/stop, key-value
 * grid, resource counts, and promotion cards for related extensions
 * ("Install" in Vanilla flips the extension on; "Open" when installed).
 */
import { faEllipsisVertical, faPlay, faRotateRight, faStop, faTerminal } from '@fortawesome/free-solid-svg-icons';
import AppIcon from '#lib/components/AppIcon.svelte';

import type { LabConnection, LabTarget } from '../data.ts';
import ActBtn from './ActBtn.svelte';
import ExtCards from './ExtCards.svelte';
import { ext, isInstalled, type LabExtension, promotionsFor, sectionVisible } from './exts.ts';
import Head from './Head.svelte';
import { connActions, connStatus, isUp, openConnTerminal, openMenu, toggleConn } from './live.svelte.ts';
import PromoEmpty from './PromoEmpty.svelte';
import { TREE_PROVIDERS, treeRoot } from './trees.ts';

interface Props {
  c: LabConnection;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { c, onopen }: Props = $props();

const st = $derived(connStatus(c));
const up = $derived(isUp(st));
const sections = $derived(c.sections.filter(sectionVisible));
const trees = $derived(TREE_PROVIDERS.filter(p => p.connIds.includes(c.id) && isInstalled(p.extId)));
const promos = $derived(promotionsFor(c));
/** First promoted extension not installed yet: shown as the PD empty-state promotion. */
const missing = $derived(promos.find(e => !isInstalled(e.id)));
const PROMO_TEXT: Record<string, [string, string, string]> = {
  quadlet: ['No Quadlets', 'Run containers, pods and Kubernetes YAML as systemd services that start at boot, restart on failure and auto-update.', 'docs.podman.io/quadlet'],
  bootc: ['No bootable images', 'Turn a container image into a bootable OS: build qcow2, raw, ISO or AMI disk images from a Containerfile.', 'containers.github.io/bootc'],
  'ai-lab': ['No AI models', 'Run open models locally, try recipes and chat with them in playgrounds, then serve them with an OpenAI-compatible API.', 'podman-desktop.io/docs/ai-lab'],
  'kube-dashboard': ['No Kubernetes dashboard', 'See workloads, events and metrics of this cluster at a glance.', 'podman-desktop.io/extensions'],
  helm: ['No Helm releases', 'Install charts and manage releases and revisions on this cluster.', 'helm.sh'],
};

function openExt(e: LabExtension): void {
  const sec = c.sections.find(s => s.ext?.id === e.id);
  const tree = TREE_PROVIDERS.find(p => p.extId === e.id && p.connIds.includes(c.id));
  if (tree) onopen({ kind: 'node', connId: c.id, nodeId: treeRoot(tree, c.id).id }, {});
  else if (sec) onopen({ kind: 'list', connId: c.id, sectionId: sec.id }, {});
  else if (e.id === 'openshift-local' || e.id === 'sandbox') onopen({ kind: 'connection', connId: e.id }, {});
  else onopen({ kind: 'tool', toolId: e.id }, {});
}
</script>

{#snippet kv(k: string, v: string)}
  <tr><td class="pt-1.5 pr-6 w-32 text-[var(--pd-content-sub-header)]">{k}</td><td class="pt-1.5 wrap-anywhere">{v}</td></tr>
{/snippet}

{#snippet actions()}
  <ActBtn icon={up ? faStop : faPlay} label={up ? 'Stop' : 'Start'} onclick={(): void => toggleConn(c)} />
  <ActBtn icon={faRotateRight} label="Restart" disabled={!up} onclick={(): void => toggleConn(c)} />
  <ActBtn icon={faTerminal} label="Open terminal" disabled={!up} onclick={(): void => openConnTerminal(c)} />
  <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, connActions(c, onopen))} />
{/snippet}

<div class="flex flex-col h-full min-h-0">
  <Head icon={c.icon} title={c.name} status={st} sub="{c.product} · {c.detail}" {actions} />
  <div data-testid="conn-view" class="flex-1 min-h-0 overflow-auto px-5 py-4 text-[13px] leading-5 flex flex-col gap-4">
    <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
      <section class="rounded-lg bg-[var(--pd-content-card-bg)] px-4 py-3">
        <div class="text-base font-semibold text-[var(--pd-table-body-text-sub-secondary)] pb-1">Details</div>
        <table class="w-full"><tbody>
          {@render kv('Type', c.product)}
          {@render kv('Details', c.detail)}
          {@render kv('Status', st)}
          {@render kv('Endpoint', c.group === 'Kubernetes' ? `https://api.${c.id}:6443` : `unix:///run/user/1000/podman/${c.id}.sock`)}
        </tbody></table>
      </section>
      <section class="rounded-lg bg-[var(--pd-content-card-bg)] px-4 py-3">
        <div class="text-base font-semibold text-[var(--pd-table-body-text-sub-secondary)] pb-2">Resources</div>
        <div class="flex flex-wrap gap-2">
          {#each sections as sec (sec.id)}
            <button type="button" class="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-[var(--pd-content-card-inset-bg)] hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => onopen({ kind: 'list', connId: c.id, sectionId: sec.id }, {})}>
              <AppIcon icon={sec.ext?.icon ?? sec.icon} size="14px" /><span>{sec.label}</span><span class="font-semibold">{sec.count}</span>
            </button>
          {/each}
          {#each trees as p (p.id)}
            {@const root = treeRoot(p, c.id)}
            <button type="button" class="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-[var(--pd-content-card-inset-bg)] hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => onopen({ kind: 'node', connId: c.id, nodeId: root.id }, {})}>
              <AppIcon icon={p.icon} size="14px" /><span>{p.label}</span><span class="font-semibold">{root.children?.length}</span>
            </button>
          {/each}
        </div>
      </section>
    </div>
    {#if missing}
      {@const txt = PROMO_TEXT[missing.id] ?? [`No ${missing.name}`, `${missing.description}.`, 'podman-desktop.io/extensions']}
      <div class="rounded-lg border border-[var(--pd-content-divider)]">
        <PromoEmpty icon={ext(missing.id)?.icon ?? ''} title={txt[0]} description={txt[1]} extId={missing.id} info={txt[2]} onbrowse={(): void => onopen({ kind: 'extensions' }, {})} onaction={(): void => openExt(missing)} actionLabel="Open" />
      </div>
    {/if}
    {#if promos.length}
      <ExtCards ids={promos.map(e => e.id)} title="Extend {c.product}" onopenext={openExt} />
    {/if}
  </div>
</div>
