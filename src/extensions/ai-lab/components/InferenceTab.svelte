<script lang="ts">
/** Container › Inference tab (P14) for AI Lab model service containers. */
import { Button } from '@podman-desktop/ui-svelte';

import type { ResourceContext } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import type { Container } from '#lib/world.svelte.ts';

import { ai, modelLabel, toolHref } from '../shared.ts';
import Card from './ui/Card.svelte';
import CodeBlock from './ui/CodeBlock.svelte';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();
const c = $derived(ctx.resource as Container);
const svc = $derived(ai().services.find(s => s.containerId === c.id));
const port = $derived(c.ports[0]?.host ?? 0);
const modelId = $derived(c.labels['ai-lab-model-id'] ?? '');

function open(): void {
  if (svc) navigate(toolHref('service', { id: svc.id }));
}
</script>

<div class="flex flex-col gap-4 p-5 overflow-auto h-full">
  <Card title="Model service">
    <div class="grid grid-cols-[10rem_1fr] gap-y-1">
      <span>Model</span><span class="text-[var(--pd-content-card-header-text)]">{modelLabel(modelId)}</span>
      <span>OpenAI endpoint</span><span class="font-mono text-[var(--pd-content-card-header-text)]">http://localhost:{port}/v1</span>
      <span>Label</span><span class="font-mono">ai-lab-inference-server={c.labels['ai-lab-inference-server'] ?? '-'}</span>
    </div>
    {#if svc}<div class="mt-3"><Button onclick={open}>Open in AI Lab</Button></div>{/if}
  </Card>
  <CodeBlock label="curl" code={`curl http://localhost:${port}/v1/chat/completions \\\n  -H 'Content-Type: application/json' \\\n  -d '{"messages":[{"role":"user","content":"Hello"}]}'`} />
</div>
