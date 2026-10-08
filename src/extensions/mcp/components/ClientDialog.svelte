<script lang="ts">
/** "Add to client": per-client config diff (Claude Code .mcp.json, VS Code mcp.json, Cursor). */
import { Button } from '@podman-desktop/ui-svelte';

import Dialog from '#lib/components/Dialog.svelte';

import CodeBlock from '../../ai-lab/components/ui/CodeBlock.svelte';
import SubTabs from '../../ai-lab/components/ui/SubTabs.svelte';
import { CLIENTS, clientConfig, type InstalledServer } from '../data.ts';
import { addToClient } from '../shared.ts';

interface Props {
  server: InstalledServer;
  onclose: () => void;
}

let { server, onclose }: Props = $props();
let client = $state('claude-code');
const c = $derived(CLIENTS.find(x => x.id === client));

function select(id: string): void {
  client = id;
}

function apply(): void {
  addToClient(server.id, client);
  onclose();
}
</script>

<Dialog title="Add to client" {onclose}>
  {#snippet content()}
    <div class="flex flex-col gap-3 text-sm">
      <SubTabs tabs={CLIENTS.slice(0, 3).map(x => ({ id: x.id, label: x.label }))} current={client} onselect={select} label="Clients" />
      <p>Writes <span class="font-mono">{c?.file}</span>:</p>
      <CodeBlock wrap code={clientConfig(client, server)} label="Config diff" maxHeight="12rem" />
    </div>
  {/snippet}
  {#snippet buttons()}
    <Button type="link" onclick={onclose}>Cancel</Button>
    <Button onclick={apply}>Add to {c?.label}</Button>
  {/snippet}
</Dialog>
