<script lang="ts">
/** AI Lab dashboard: welcome text, local hardware and what is running. */
import { faMicrochip } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import { navigate } from '#lib/nav.ts';

import { CATALOG } from '../../data.ts';
import { ai, fitsGpu, GPU, toolHref } from '../../shared.ts';
import Card from '../ui/Card.svelte';
import Chip from '../ui/Chip.svelte';

const st = $derived(ai());
const running = $derived(st.services.filter(s => s.status === 'running').length);
const recommended = $derived(CATALOG.filter(m => m.source === 'redhatai' && fitsGpu(m) && m.task === 'text-generation').slice(0, 4));

function go(p: string, extra: Record<string, string> = {}): void {
  navigate(toolHref(p, extra));
}
</script>

<div class="flex flex-col h-full overflow-auto px-5 pt-4 pb-6 gap-4">
  <div>
    <h1 class="text-2xl font-bold text-[var(--pd-content-header)]">Welcome to Podman AI Lab</h1>
    <p class="mt-2 max-w-3xl text-sm text-[var(--pd-content-text)]">
      AI Lab is an open source extension for Podman Desktop to work with LLMs (Large Language Models) on a local environment. Featuring essential AI tools: a curated recipe catalog,
      a model catalog including Red Hat validated and quantized models, model services with an OpenAI-compatible API and playgrounds to experiment with models.
    </p>
  </div>
  <div class="grid grid-cols-4 gap-4">
    <Card title="Local GPU">
      <div class="flex items-center gap-2 text-[var(--pd-content-card-header-text)]"><Icon icon={faMicrochip} /> {GPU.model}</div>
      <div class="mt-1 text-xs">{GPU.vramGB} GB VRAM · driver {GPU.driver}</div>
      <div class="mt-2 flex gap-1"><Chip label="CUDA ready" tone="success" /><Chip label="CDI nvidia.com/gpu=all" /></div>
    </Card>
    <Card title="Model services">
      <div class="text-2xl font-semibold text-[var(--pd-content-card-header-text)]">{running}<span class="text-sm font-normal"> / {st.services.length} running</span></div>
      <div class="mt-2"><Button type="link" padding="p-0" onclick={go.bind(undefined, 'services', {})}>Open services</Button></div>
    </Card>
    <Card title="Running apps">
      <div class="text-2xl font-semibold text-[var(--pd-content-card-header-text)]">{st.apps.length}</div>
      <div class="mt-2"><Button type="link" padding="p-0" onclick={go.bind(undefined, 'running', {})}>Open running apps</Button></div>
    </Card>
    <Card title="Playgrounds">
      <div class="text-2xl font-semibold text-[var(--pd-content-card-header-text)]">{st.playgrounds.length}</div>
      <div class="mt-2"><Button type="link" padding="p-0" onclick={go.bind(undefined, 'playgrounds', {})}>Open playgrounds</Button></div>
    </Card>
  </div>
  <Card title="Recommended for your GPU ({GPU.vramGB} GB)">
    <ul class="divide-y divide-[var(--pd-content-divider)]">
      {#each recommended as m (m.id)}
        <li class="flex items-center gap-2 py-2">
          <span class="grow text-[var(--pd-content-card-header-text)]">{m.name}</span>
          {#if m.quantization}<Chip label={m.quantization} tone="secondary" />{/if}
          {#if m.validated}<Chip label="Validated" tone="primary" />{/if}
          <Chip label="~{m.estVramGB} GB" tone="success" />
          <Button type="secondary" onclick={go.bind(undefined, 'create-service', { model: m.id, backend: 'vllm' })}>Serve with vLLM</Button>
        </li>
      {/each}
    </ul>
  </Card>
</div>
