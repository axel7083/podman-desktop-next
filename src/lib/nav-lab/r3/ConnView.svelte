<script lang="ts">
/**
 * Connection summary tab (P13): compact header with start/stop, key-value
 * grid, resource counts, and promotion cards for related extensions
 * ("Install" in Vanilla flips the extension on; "Open" when installed).
 */
import { faEllipsisVertical, faPlay, faRotateRight, faStop, faTerminal } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';

import type { LabConnection, LabTarget } from '../data.ts';
import ActBtn from './ActBtn.svelte';
import { installExt, isInstalled, type LabExtension, promotionsFor, sectionVisible } from './exts.ts';
import Head from './Head.svelte';
import { connActions, connStatus, isUp, openConnTerminal, openMenu, toggleConn } from './live.svelte.ts';
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
  <div class="flex gap-2 min-w-0 leading-5"><dt class="w-24 shrink-0 text-[var(--pd-content-sub-header)]">{k}</dt><dd class="truncate">{v}</dd></div>
{/snippet}

{#snippet actions()}
  <ActBtn icon={up ? faStop : faPlay} label={up ? 'Stop' : 'Start'} onclick={(): void => toggleConn(c)} />
  <ActBtn icon={faRotateRight} label="Restart" disabled={!up} onclick={(): void => toggleConn(c)} />
  <ActBtn icon={faTerminal} label="Open terminal" disabled={!up} onclick={(): void => openConnTerminal(c)} />
  <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, connActions(c, onopen))} />
{/snippet}

<div class="flex flex-col h-full min-h-0">
  <Head icon={c.icon} title={c.name} status={st} sub="{c.product} · {c.detail}" {actions} />
  <div class="flex-1 min-h-0 overflow-auto pb-4 text-sm">
    <dl class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-6 px-3 pt-2">
      {@render kv('Type', c.product)}
      {@render kv('Group', c.group)}
      {@render kv('Details', c.detail)}
      {@render kv('Status', st)}
      {@render kv('Endpoint', c.group === 'Kubernetes' ? `https://api.${c.id}:6443` : `unix:///run/user/1000/podman/${c.id}.sock`)}
      {@render kv('Resources', `${sections.reduce((a, s) => a + s.count, 0)} in ${sections.length} kinds`)}
    </dl>
    <div class="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">Resources</div>
    <div class="flex flex-wrap gap-1.5 px-3">
      {#each sections as sec (sec.id)}
        <button type="button" class="flex items-center gap-1.5 h-7 px-2 rounded-md bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => onopen({ kind: 'list', connId: c.id, sectionId: sec.id }, {})}>
          <AppIcon icon={sec.ext?.icon ?? sec.icon} size="13px" /><span>{sec.label}</span><span class="font-semibold">{sec.count}</span>
        </button>
      {/each}
      {#each trees as p (p.id)}
        {@const root = treeRoot(p, c.id)}
        <button type="button" class="flex items-center gap-1.5 h-7 px-2 rounded-md bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => onopen({ kind: 'node', connId: c.id, nodeId: root.id }, {})}>
          <AppIcon icon={p.icon} size="13px" /><span>{p.label}</span><span class="font-semibold">{root.children?.length}</span>
        </button>
      {/each}
    </div>
    {#if promos.length}
      <div class="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">Extend {c.product}</div>
      <div data-testid="promotions" class="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2 px-3">
        {#each promos as e (e.id)}
          {@const inst = isInstalled(e.id)}
          <div class="flex items-center gap-2.5 p-2 rounded-md bg-[var(--pd-content-card-bg)]">
            <AppIcon icon={e.icon} size="28px" />
            <div class="flex-1 min-w-0 leading-tight">
              <div class="font-semibold truncate text-[var(--pd-content-card-header-text)]">{e.name}</div>
              <div class="text-xs truncate text-[var(--pd-content-card-text)]">{e.description}</div>
            </div>
            {#if inst}
              <Button type="secondary" onclick={(): void => openExt(e)}>Open</Button>
            {:else}
              <Button onclick={(): void => installExt(e.id)}>Install</Button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
