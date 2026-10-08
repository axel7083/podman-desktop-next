<script lang="ts">
/** Connection › MCP (P9): kubernetes-mcp-server bound to this connection's kubeconfig context. */
import { faCopy, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { Button, Checkbox } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { ResourceContext } from '#lib/ext/types.ts';
import { later, toast } from '#lib/world.svelte.ts';

import { mcpState, setMcp } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();
const id = $derived(ctx.conn.id);
const s = $derived(mcpState(id));
const port = $derived(8089 + Math.max(0, ['ocp-dev', 'ocp-prod', 'minc', 'openshift-local', 'dev-sandbox', 'kind-dev'].indexOf(id)));
const cmd = $derived(`npx kubernetes-mcp-server@0.0.58 --port ${port}${s.readOnly ? ' --read-only' : ''} --kubeconfig ~/.kube/config --context ${id} --toolsets ${s.toolsets.join(',')}`);
const config = $derived(JSON.stringify({ mcpServers: { [`kubernetes-${id}`]: { type: 'http', url: `http://localhost:${port}/mcp` } } }, undefined, 2));

function start(): void {
  setMcp(id, { status: 'starting', port });
  later(1500, () => {
    setMcp(id, { status: 'running' });
    toast({ type: 'success', title: `kubernetes-mcp-server running for ${ctx.conn.name}`, body: `http://localhost:${port}/mcp · ${s.readOnly ? 18 : 24} tools` });
  });
}

function stop(): void {
  setMcp(id, { status: 'stopped' });
}

function onReadOnly(v: boolean): void {
  setMcp(id, { readOnly: v });
}

function copy(): void {
  toast({ type: 'success', title: 'MCP client configuration copied', body: 'Paste it into Claude Code (.mcp.json), Goose or another MCP client.' });
}
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-4 text-[var(--pd-content-card-text)]">
  <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 flex items-center gap-4" aria-label="kubernetes-mcp-server">
    <AppIcon icon="icons/containers.kubernetes-mcp-server.png" size="36px" />
    <div class="grow">
      <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">kubernetes-mcp-server</h2>
      <div class="text-sm flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full {s.status === 'running' ? 'bg-[var(--pd-status-running)]' : s.status === 'starting' ? 'bg-[var(--pd-status-starting)]' : 'bg-[var(--pd-status-stopped)]'}"></span>
        {s.status === 'running' ? `Running on http://localhost:${port}/mcp · ${s.readOnly ? 18 : 24} tools` : s.status === 'starting' ? 'Starting…' : 'Stopped'}
      </div>
    </div>
    {#if s.status === 'running'}
      <Button type="secondary" icon={faStop} onclick={stop}>Stop</Button>
    {:else}
      <Button icon={faPlay} inProgress={s.status === 'starting'} disabled={ctx.conn.status !== 'started'} onclick={start}>Start</Button>
    {/if}
  </section>
  <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 space-y-2" aria-label="Options">
    <Checkbox checked={s.readOnly} onclick={onReadOnly} title="Read-only">Read-only (no create, update, delete or exec tools){s.status === 'running' ? ' · applies on next start' : ''}</Checkbox>
    <div class="text-sm">Toolsets: {s.toolsets.join(', ')} · context {id}</div>
    <pre class="text-sm font-mono whitespace-pre-wrap bg-[var(--pd-terminal-background)] text-[var(--pd-terminal-foreground)] rounded-md p-3">{cmd}</pre>
  </section>
  <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4" aria-label="Client configuration">
    <div class="flex items-center mb-2">
      <h2 class="grow text-lg font-semibold text-[var(--pd-content-card-header-text)]">Client configuration</h2>
      <Button type="secondary" icon={faCopy} onclick={copy}>Copy</Button>
    </div>
    <pre class="text-sm font-mono whitespace-pre-wrap bg-[var(--pd-terminal-background)] text-[var(--pd-terminal-foreground)] rounded-md p-3">{config}</pre>
  </section>
</div>
