<script lang="ts">
/** Quadlets of a connection as a PD table: status, name, type, service, path, actions. */
import { faAlignLeft, faPlay, faPlusCircle, faRotateRight, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import type { LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import type { LabRow } from './cells/types.ts';
import Btn from './Btn.svelte';
import Head from './Head.svelte';
import { isUp, live, type MenuItem, showJournal } from './live.svelte.ts';
import RowsTable from './RowsTable.svelte';
import SegFilter from './SegFilter.svelte';
import type { FoundNode, TreeNode } from './trees.ts';

interface Props {
  f: FoundNode;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { f, onopen }: Props = $props();

let search = $state('');
let filter = $state('all');
const TABS: [string, string][] = [['all', 'All'], ['running', 'Running'], ['stopped', 'Stopped']];
const modern = $derived(lab.table !== 'classic');

function st(n: TreeNode): string {
  return live.status[n.id] ?? n.status ?? 'ready';
}

function toggle(n: TreeNode): void {
  live.status[n.id] = isUp(st(n)) && st(n) !== 'ready' ? 'stopped' : 'running';
}

function open(n: TreeNode, preview = true): void {
  onopen({ kind: 'node', connId: f.connId, nodeId: n.id }, { preview });
}

function menu(n: TreeNode): MenuItem[] {
  const svc = n.data?.service ?? '';
  return [
    { label: 'Open', run: (): void => open(n, false) },
    { label: 'Logs (journalctl)', icon: faAlignLeft, run: (): void => showJournal(n.label, svc, f.connId), sep: true },
    { label: 'Restart', icon: faRotateRight, run: (): void => void (live.status[n.id] = 'running') },
    { label: 'Delete', icon: faTrash, danger: true, run: (): void => lab.openCreate(`Remove ${n.label}`), sep: true },
  ];
}

const nodes = $derived((f.node.children ?? []).filter(n => !search || n.label.toLowerCase().includes(search.toLowerCase())).filter(n => (filter === 'running' ? st(n) === 'running' : filter === 'stopped' ? st(n) === 'stopped' : true)));

const rows = $derived(
  nodes.map((n): LabRow => {
    const s = st(n);
    return {
      name: n.id,
      status: s === 'running' ? 'RUNNING' : s === 'ready' ? 'CREATED' : 'EXITED',
      icon: 'icons/podman-desktop.quadlet.png',
      title: n.label,
      sub: [s.toUpperCase()],
      cols: { type: n.data?.type ?? '', service: n.data?.service ?? '', path: n.data?.path ?? '' },
      open: (): void => open(n),
      pin: (): void => open(n, false),
      buttons: [
        s === 'running' ? { title: 'Stop', icon: faStop, run: (): void => toggle(n) } : { title: 'Start', icon: faPlay, run: (): void => toggle(n), enabled: s !== 'ready' },
        { title: 'Logs (journalctl)', icon: faAlignLeft, run: (): void => showJournal(n.label, n.data?.service ?? '', f.connId, { target: { kind: 'node', connId: f.connId, nodeId: n.id }, icon: f.provider.icon }) },
      ],
      menu: () => menu(n),
    };
  }),
);
</script>

{#snippet actions()}
  <Btn icon={faRotateRight} onclick={(): void => undefined}>Refresh</Btn>
  <Btn kind="primary" icon={faPlusCircle} onclick={(): void => lab.openCreate('Generate a Quadlet')}>Generate Quadlet</Btn>
{/snippet}

{#snippet seg()}
  <SegFilter tabs={TABS} value={filter} onpick={(v): void => { filter = v; }} />
{/snippet}

<div data-testid="quadlet-list" class="flex flex-col h-full min-h-0">
  <Head icon={f.provider.icon} title="Quadlets" connId={f.connId} onconn={(): void => onopen({ kind: 'connection', connId: f.connId }, {})} provenance="Podman Quadlet" bind:search {actions} filters={modern ? seg : undefined} />
  {#if !modern}
  <div class="flex items-center gap-1 px-4 pt-2 shrink-0 border-b border-[var(--pd-content-divider)]">
    {#each TABS as [id, label] (id)}
      <Button type="tab" selected={filter === id} onclick={(): void => { filter = id; }}>{label}</Button>
    {/each}
  </div>
  {/if}
  <div class="flex flex-1 min-h-0 overflow-auto" class:px-2={!modern} class:pb-2={!modern}>
    <RowsTable kind="p13-quadlets" {rows} cols={[['Type', 'type', '90px'], ['Service name', 'service', 'minmax(8rem, 1fr)'], ['Path', 'path', 'minmax(10rem, 2fr)']]} />
  </div>
</div>
