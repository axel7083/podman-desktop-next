<script lang="ts">
/** Tab for an extension tree-provider node (MCP server, Helm release, Quadlet unit…). */
import { faEllipsisVertical, faPlay, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { type LabTarget, STATUS_DOT } from '../data.ts';
import ActBtn from './ActBtn.svelte';
import BootcView from './BootcView.svelte';
import CodeView from './CodeView.svelte';
import { ext } from './exts.ts';
import Head from './Head.svelte';
import { isUp, live, openMenu } from './live.svelte.ts';
import QuadletList from './QuadletList.svelte';
import QuadletView from './QuadletView.svelte';
import { findNode, type TreeNode } from './trees.ts';

interface Props {
  nodeId: string;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { nodeId, onopen }: Props = $props();

let view = $state('summary');

const f = $derived(findNode(nodeId));
const st = $derived(f?.node.status ? (live.status[nodeId] ?? f.node.status) : undefined);
const e = $derived(ext(f?.provider.extId));

function open(n: TreeNode): void {
  onopen({ kind: 'node', connId: f?.connId, nodeId: n.id }, {});
}

function toggle(): void {
  live.status[nodeId] = st && isUp(st) ? 'stopped' : 'running';
}
</script>

{#snippet actions()}
  <ActBtn icon={st && isUp(st) ? faStop : faPlay} label={st && isUp(st) ? 'Stop' : 'Start'} disabled={!st} onclick={toggle} />
  <ActBtn icon={faTrash} label="Delete" danger disabled={f?.node === f?.root} onclick={(): void => undefined} />
  <ActBtn
    icon={faEllipsisVertical}
    label="More actions"
    onclick={(ev): void =>
      openMenu(ev, [
        { label: st && isUp(st) ? 'Stop' : 'Start', icon: st && isUp(st) ? faStop : faPlay, disabled: !st, run: toggle },
        { label: `Open ${e?.name ?? 'extension'}`, icon: e?.icon, run: () => onopen({ kind: 'tool', toolId: f?.provider.extId }, {}), sep: true },
      ])} />
{/snippet}

{#if f && f.provider.id === 'quadlets'}
  {#if f.node === f.root}<QuadletList {f} {onopen} />{:else}<QuadletView {f} {onopen} />{/if}
{:else if f && f.provider.id === 'bootc'}
  <BootcView {f} {onopen} />
{:else if f}
  <div class="flex flex-col h-full min-h-0">
    <Head
      icon={f.node.icon ?? f.provider.icon}
      title={f.node.label}
      status={st}
      connId={f.connId}
      onconn={(): void => onopen({ kind: 'connection', connId: f.connId }, {})}
      sub={f.path.length > 1 ? f.path.slice(1).join(' › ') : undefined}
      provenance={e?.name}
      views={[['summary', 'Summary'], ['inspect', 'Inspect']]}
      {view}
      onview={(v): void => {
        view = v;
      }}
      {actions} />
    {#if view === 'inspect'}
      <CodeView lang="json" testid="inspect" lines={JSON.stringify({ id: f.node.id, name: f.node.label, status: st, detail: f.node.detail, provider: f.provider.id, children: f.node.children?.map(x => x.label) }, null, 2).split('\n')} />
    {:else}
      <div class="flex-1 min-h-0 overflow-auto px-2 py-2 text-[13px] leading-6">
        <dl class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-6 px-3 pt-2">
          <div class="flex gap-2 leading-5"><dt class="w-24 shrink-0 text-[var(--pd-table-body-text)]">Name</dt><dd class="truncate">{f.node.label}</dd></div>
          <div class="flex gap-2 leading-5"><dt class="w-24 shrink-0 text-[var(--pd-table-body-text)]">Detail</dt><dd class="truncate">{f.node.detail ?? '—'}</dd></div>
          <div class="flex gap-2 leading-5"><dt class="w-24 shrink-0 text-[var(--pd-table-body-text)]">Path</dt><dd class="truncate">{[...f.path, f.node.label].join(' › ')}</dd></div>
          <div class="flex gap-2 leading-5"><dt class="w-24 shrink-0 text-[var(--pd-table-body-text)]">Provided by</dt><dd class="flex items-center gap-1 truncate"><AppIcon icon={e?.icon} size="12px" />{e?.name}</dd></div>
        </dl>
        {#if f.node.children?.length}
          <div class="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">{f.node.children.length} items</div>
          {#each f.node.children as ch (ch.id)}
            <button type="button" class="w-full flex items-center gap-2 h-6 px-3 text-left hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => open(ch)}>
              {#if ch.status}<span class="w-1.5 h-1.5 rounded-full shrink-0 {STATUS_DOT[live.status[ch.id] ?? ch.status]}"></span>{:else}<span class="w-4 flex justify-center text-[11px] opacity-70"><AppIcon icon={ch.icon} size="xs" /></span>{/if}
              <span class="truncate">{ch.label}</span><span class="text-xs text-[var(--pd-table-body-text)]">{ch.detail ?? ''}</span>
            </button>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
{/if}
