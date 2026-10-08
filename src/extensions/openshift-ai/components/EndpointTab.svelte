<script lang="ts">
/** InferenceService › Endpoint tab: conditions, URL, curl and "Try in playground" (port-forward task). */
import { faMessage, faPlug } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import type { ResourceContext } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import type { KubeObject } from '#lib/world.svelte.ts';

import Card from '../../ai-lab/components/ui/Card.svelte';
import Chip from '../../ai-lab/components/ui/Chip.svelte';
import CodeBlock from '../../ai-lab/components/ui/CodeBlock.svelte';
import { createPlayground, toolHref } from '../../ai-lab/shared.ts';
import { portForward } from '../shared.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();
const o = $derived(ctx.resource as KubeObject);
const conditions = $derived((o.status?.conditions as { type: string; status: string; reason?: string }[]) ?? []);
const ready = $derived(o.status?.state === 'running');
const url = $derived(String(o.status?.url ?? ''));
const served = $derived(o.metadata.name);
let busy = $state(false);

function tryIt(): void {
  busy = true;
  portForward(served, served, f => {
    busy = false;
    const id = createPlayground(`${served} (rhoai-dev)`, `rhoai:${f.name}`, f.model);
    navigate(toolHref('playground', { id }));
  });
}
</script>

<div class="flex flex-col gap-4 p-5 overflow-auto h-full">
  <Card title="Status">
    <div class="flex gap-2 flex-wrap">
      {#each conditions as c (c.type)}<Chip label="{c.type}={c.status}{c.reason ? ` (${c.reason})` : ''}" tone={c.status === 'True' ? 'success' : 'warning'} />{/each}
    </div>
  </Card>
  <Card title="Inference endpoint">
    <div class="flex items-center gap-3">
      <span class="grow font-mono text-[var(--pd-content-card-header-text)]" aria-label="Inference URL">{ready ? `${url}/v1` : 'Not ready yet'}</span>
      <Button icon={faMessage} onclick={tryIt} disabled={!ready} inProgress={busy}>Try in playground</Button>
      <Button type="secondary" icon={faPlug} disabled={!ready} onclick={tryIt}>Use as inference provider</Button>
    </div>
  </Card>
  {#if ready}
    <CodeBlock label="curl" code={`curl ${url}/v1/chat/completions \\\n  -H "Authorization: Bearer $(oc whoami -t)" \\\n  -H 'Content-Type: application/json' \\\n  -d '{"model":"${served}","messages":[{"role":"user","content":"Hello"}]}'`} />
  {/if}
</div>
