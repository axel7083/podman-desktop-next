<script lang="ts">
/** Connection tab "MCP server" (P9): register the AAP MCP server (Technology Preview) for AI agents. */
import { faCheck, faPlug } from '@fortawesome/free-solid-svg-icons';
import { Button, Checkbox } from '@podman-desktop/ui-svelte';

import Badge from '#lib/components/Badge.svelte';
import SlideToggle from '#lib/components/SlideToggle.svelte';
import type { ResourceContext } from '#lib/ext/types.ts';
import { later, toast } from '#lib/world.svelte.ts';

import { MCP_URL, store } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const { mcp } = store();
let registering = $state(false);

const TOOLSETS: { id: string; tools: string[]; write?: string[] }[] = [
  { id: 'job_management', tools: ['controller.jobs_list', 'controller.jobs_read', 'controller.job_templates_list'], write: ['controller.job_templates_launch_create', 'controller.workflow_job_templates_launch_create'] },
  { id: 'inventory_management', tools: ['controller.inventories_list', 'controller.hosts_list'] },
];

const config = $derived(
  JSON.stringify(
    {
      mcpServers: {
        'aap-acme-prod': {
          url: MCP_URL,
          headers: { Authorization: 'Bearer ${AAP_TOKEN}' },
          toolsets: Object.entries(mcp.toolsets)
            .filter(([, on]) => on)
            .map(([id]) => id),
          readOnly: !mcp.writeEnabled,
        },
      },
    },
    undefined,
    2,
  ),
);

function toggleToolset(id: string, checked: boolean): void {
  mcp.toolsets[id] = checked;
}

function toggleWrite(checked: boolean): void {
  mcp.writeEnabled = checked;
}

function register(): void {
  registering = true;
  later(900, () => {
    registering = false;
    mcp.registered = true;
    toast({ type: 'success', title: 'AAP MCP server registered', body: `aap-acme-prod added to the MCP registry (P9) · ${mcp.writeEnabled ? 'read/write' : 'read-only'}` });
  });
}
</script>

<div class="p-5 grid grid-cols-1 xl:grid-cols-2 gap-4 text-[var(--pd-content-card-text)]" aria-label="MCP server for {ctx.conn.name}">
  <section class="bg-[var(--pd-content-card-bg)] rounded-lg p-4 flex flex-col gap-3" aria-label="AAP MCP server">
    <div class="flex items-center gap-2">
      <h2 class="text-base font-semibold text-[var(--pd-content-card-header-text)]">AAP MCP server</h2>
      <Badge label="Technology Preview" color="bg-[var(--pd-label-tertiary-bg)]" class="text-[var(--pd-label-tertiary-text)]" />
      <span class="grow"></span>
      {#if mcp.registered}
        <span class="flex items-center gap-1.5 text-sm text-[var(--pd-status-running)]"><span class="w-2 h-2 rounded-full bg-[var(--pd-status-running)]"></span>Registered</span>
      {/if}
    </div>
    <p class="text-sm">Expose acme-prod to your AI agents through the AAP MCP server (ansible/aap-mcp-server), generated from the AAP OpenAPI. Agents get the toolsets you pick, with your token's RBAC.</p>
    <div class="grid grid-cols-[110px_1fr] gap-y-1 text-sm">
      <span class="opacity-70">URL</span><code>{MCP_URL}</code>
      <span class="opacity-70">Services</span><span>controller, gateway, eda</span>
      <span class="opacity-70">Auth</span><span>Token of alice.dev (Accounts)</span>
    </div>
    <div class="flex flex-col gap-2">
      <span class="font-semibold text-[var(--pd-content-card-header-text)]">Toolsets</span>
      {#each TOOLSETS as t (t.id)}
        <div class="flex flex-col gap-0.5">
          <Checkbox checked={mcp.toolsets[t.id]} onclick={toggleToolset.bind(undefined, t.id)} title={t.id}><code>{t.id}</code></Checkbox>
          <span class="text-xs pl-6 opacity-80 font-mono">{[...t.tools, ...(mcp.writeEnabled ? (t.write ?? []) : [])].join(', ')}</span>
        </div>
      {/each}
    </div>
    <SlideToggle id="aap-mcp-write" checked={mcp.writeEnabled} onchange={toggleWrite} aria-label="Enable write tools" left>Write tools (launch job templates)</SlideToggle>
    <pre class="rounded-md p-3 text-xs font-mono bg-[var(--pd-content-card-inset-bg)] overflow-auto" aria-label="MCP client configuration">{config}</pre>
    <div class="flex justify-end">
      <Button icon={mcp.registered ? faCheck : faPlug} onclick={register} inProgress={registering} disabled={mcp.registered}>{mcp.registered ? 'Registered in MCP registry' : 'Register in MCP registry'}</Button>
    </div>
  </section>

  <section class="bg-[var(--pd-content-card-bg)] rounded-lg p-4 flex flex-col gap-3" aria-label="Agent transcript">
    <h2 class="text-base font-semibold text-[var(--pd-content-card-header-text)]">Agent transcript</h2>
    <div class="self-end max-w-[80%] rounded-lg px-3 py-2 bg-[var(--pd-content-card-selected-bg)] text-[var(--pd-content-card-header-text)]">which jobs failed today?</div>
    <div class="rounded-md border border-[var(--pd-content-table-border)] text-xs font-mono">
      <div class="px-3 py-1.5 bg-[var(--pd-content-card-inset-bg)] flex gap-2"><span class="opacity-70">tool call</span><b>controller.jobs_list</b><span class="opacity-70">aap-acme-prod</span></div>
      <pre class="px-3 py-2 overflow-auto">{`{ "status": "failed", "finished__gte": "2026-10-08T00:00:00Z" }\n→ { "count": 1, "results": [ { "id": 4821, "name": "Remediate orders", "launch_type": "webhook", "elapsed": 46.2 } ] }`}</pre>
    </div>
    <div class="rounded-md border border-[var(--pd-content-table-border)] text-xs font-mono">
      <div class="px-3 py-1.5 bg-[var(--pd-content-card-inset-bg)] flex gap-2"><span class="opacity-70">tool call</span><b>controller.jobs_list</b><span class="opacity-70">aap-acme-prod</span></div>
      <pre class="px-3 py-2 overflow-auto">{`{ "status": "error", "finished__gte": "2026-10-08T00:00:00Z" }\n→ { "count": 1, "results": [ { "id": 4809, "name": "Deploy orders (podman)", "launch_type": "manual" } ] }`}</pre>
    </div>
    <div class="max-w-[90%] rounded-lg px-3 py-2 bg-[var(--pd-content-card-inset-bg)] text-sm leading-6">
      Two jobs did not succeed today on acme-prod:
      <ul class="list-disc pl-5">
        <li><b>4821 Remediate orders</b> — failed after 46s, launched by the EDA webhook; <code>runner_on_failed</code> on db01.lab.acme at "Restart orders-db".</li>
        <li><b>4809 Deploy orders (podman)</b> — error: deploy-orders.yml was missing from project acme.ops at that revision.</li>
      </ul>
      The latest "Deploy orders (podman)" run (4822) is fine.
    </div>
  </section>
</div>
