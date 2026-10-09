<script lang="ts">
/** One Quadlet unit: Summary (service, systemctl status) and Source (INI). */
import { faAlignLeft, faEllipsisVertical, faPenToSquare, faPlay, faRotateRight, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import type { LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import ActBtn from './ActBtn.svelte';
import CodeView from './CodeView.svelte';
import Head from './Head.svelte';
import { live, openMenu, showJournal } from './live.svelte.ts';
import { quadletIni, systemctlStatus } from './quadlet.ts';
import type { FoundNode } from './trees.ts';

interface Props {
  f: FoundNode;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { f, onopen }: Props = $props();

// svelte-ignore state_referenced_locally
let view = $state(live.view[f.node.id] ?? 'summary');
const n = $derived(f.node);
const st = $derived(live.status[n.id] ?? n.status ?? 'ready');
const svc = $derived(n.data?.service ?? '');
const up = $derived(st === 'running');

function journal(): void {
  showJournal(n.label, svc, f.connId);
}
</script>

{#snippet actions()}
  <Button type="secondary" icon={faAlignLeft} onclick={journal}>Logs (journalctl)</Button>
  <ActBtn icon={up ? faStop : faPlay} label={up ? 'Stop' : 'Start'} disabled={st === 'ready'} onclick={(): void => void (live.status[n.id] = up ? 'stopped' : 'running')} />
  <ActBtn icon={faRotateRight} label="Restart" disabled={!up} onclick={(): void => void (live.status[n.id] = 'running')} />
  <ActBtn icon={faPenToSquare} label="Edit" onclick={(): void => { view = 'source'; }} />
  <ActBtn icon={faTrash} label="Delete" danger onclick={(): void => lab.openCreate(`Remove ${n.label}`)} />
  <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, [{ label: 'Logs (journalctl)', icon: faAlignLeft, run: journal }, { label: 'Show source', run: (): void => { view = 'source'; } }])} />
{/snippet}

{#snippet row(k: string, v: string)}
  <tr><td class="pt-1.5 pr-6 w-44 align-top text-[var(--pd-content-sub-header)]">{k}</td><td class="pt-1.5 wrap-anywhere">{v}</td></tr>
{/snippet}

<div data-testid="quadlet-view" class="flex flex-col h-full min-h-0">
  <Head
    icon={f.provider.icon}
    title={n.label}
    status={st}
    connId={f.connId}
    onconn={(): void => onopen({ kind: 'connection', connId: f.connId }, {})}
    sub={svc}
    views={[['summary', 'Summary'], ['source', 'Source'], ['status', 'systemctl status']]}
    {view}
    onview={(v): void => {
      view = v;
    }}
    {actions} />
  {#if view === 'source'}
    <div class="flex items-center gap-2 h-8 px-4 shrink-0 text-xs text-[var(--pd-content-sub-header)] border-b border-[var(--pd-content-divider)]">
      <span class="font-mono">{n.data?.path}</span><span class="opacity-60">· podman-systemd.unit(5)</span>
    </div>
    <CodeView lines={quadletIni(n.label)} lang="ini" numbered testid="quadlet-source" />
  {:else if view === 'status'}
    <CodeView lines={systemctlStatus(n.label, st)} testid="quadlet-status" />
  {:else}
    <div class="flex-1 min-h-0 overflow-auto px-5 py-4 text-[13px] leading-5">
      <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 max-w-4xl">
        <table class="w-full">
          <tbody>
            <tr><td colspan="2" class="text-base font-semibold text-[var(--pd-table-body-text-sub-secondary)] pb-1">Details</td></tr>
            {@render row('Unit file', n.label)}
            {@render row('Type', n.data?.type ?? '')}
            {@render row('Generated service', svc)}
            {@render row('Path', n.data?.path ?? '')}
            {@render row('Status', st)}
            {@render row('Enabled', 'yes (WantedBy=default.target)')}
          </tbody>
        </table>
      </div>
      <div class="pt-4 pb-1.5 text-base font-semibold text-[var(--pd-content-header)]">systemctl --user status {svc}</div>
      <pre class="m-0 p-3 rounded-lg font-mono text-xs leading-5 bg-[var(--pd-code-block-bg)] text-[var(--pd-code-block-text)] overflow-auto">{systemctlStatus(n.label, st).join('\n')}</pre>
    </div>
  {/if}
</div>
