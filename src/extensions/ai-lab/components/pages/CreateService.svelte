<script lang="ts">
/**
 * Creating Model service (AI Lab CreateService.svelte): model, inference
 * backend (llama.cpp, OpenVINO, proposed Red Hat AI Inference vLLM), GPU
 * detection, port; then the task steps inline and "Open service details".
 */
import { faCircleCheck, faCircleExclamation, faLocationArrow, faMicrochip, faPlus, faRocket } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown, ErrorMessage, FormPage, Input, Spinner } from '@podman-desktop/ui-svelte';
import Checkbox from '#lib/components/Checkbox.svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import { navigate } from '#lib/nav.ts';
import { world } from '#lib/world.svelte.ts';

import { CATALOG, INFERENCE_IMAGES } from '../../data.ts';
import { ai, type Backend, createService, fitsGpu, GPU, model as findModel, toolHref } from '../../shared.ts';
import Chip from '../ui/Chip.svelte';

interface Props {
  modelId: string;
  backend: string;
}

let { modelId, backend: initialBackend }: Props = $props();

const options = $derived(
  CATALOG.filter(m => (m.source === 'ai-lab' ? ai().downloaded.includes(m.id) && m.backend !== 'none' : m.source !== 'rhoai')).map(m => ({ value: m.id, label: m.name })),
);
// svelte-ignore state_referenced_locally
let selected = $state(modelId || 'hf.ibm-granite.granite-3.3-8b-instruct-GGUF');
const m = $derived(findModel(selected));
// svelte-ignore state_referenced_locally
let backend = $state<Backend>((initialBackend as Backend) || (findModel(modelId)?.backend ?? 'llama-cpp'));
let useGpu = $state(true);
// svelte-ignore state_referenced_locally
let port = $state(String(backend === 'vllm' ? 8000 : 35000 + Math.floor(Math.random() * 900)));
let taskId = $state<string>();
let serviceId = $state<string>();

const task = $derived(taskId ? world.tasks.find(t => t.id === taskId) : undefined);
const steps = $derived(task ? task.logs.filter(l => l.startsWith('▸ ')).map(l => l.slice(2)) : []);
const backendOptions = $derived(
  m?.source === 'ai-lab'
    ? [
        { value: 'llama-cpp', label: 'llama.cpp' },
        { value: 'openvino', label: 'OpenVINO' },
        { value: 'whisper-cpp', label: 'whisper.cpp' },
      ].filter(o => m.backend === o.value)
    : [{ value: 'vllm', label: 'Red Hat AI Inference (vLLM)' }],
);
const image = $derived((useGpu ? INFERENCE_IMAGES[backend]?.cuda : undefined) ?? INFERENCE_IMAGES[backend]?.cpu ?? '');
const tooBig = $derived(!!m && backend === 'vllm' && !fitsGpu(m));

function onModel(v: string): void {
  selected = v;
  const next = findModel(v);
  if (next) {
    backend = next.source === 'ai-lab' ? next.backend : 'vllm';
    port = String(backend === 'vllm' ? 8000 : port);
  }
}

function toggleGpu(checked: boolean): void {
  useGpu = checked;
}

function create(): void {
  const r = createService({ modelId: selected, backend, port: Number(port), gpu: useGpu });
  taskId = r.taskId;
  serviceId = r.serviceId;
}

function openDetails(): void {
  if (serviceId) navigate(toolHref('service', { id: serviceId }));
}

function close(): void {
  navigate(toolHref('services'));
}
</script>

<FormPage title="Creating Model service" breadcrumbLeftPart="Model services" breadcrumbRightPart="Creating Model service" onclose={close} onbreadcrumbClick={close} inProgress={task?.status === 'in-progress'}>
  {#snippet icon()}<Icon icon={faPlus} size="1.5x" />{/snippet}
  {#snippet content()}
    <div class="flex flex-col w-full px-5 py-4 gap-3 overflow-auto">
      {#if task}
        {#each steps as s, i (i)}
          {@const done = i < steps.length - 1 || task.status === 'success'}
          <div class="flex items-center gap-3 rounded-md bg-[var(--pd-content-card-bg)] px-4 py-3 text-sm text-[var(--pd-content-card-text)]">
            {#if done}
              <span class="text-[var(--pd-status-running)]"><Icon icon={faCircleCheck} size="1.2x" /></span>
            {:else if task.status === 'failure'}
              <span class="text-[var(--pd-state-error)]"><Icon icon={faCircleExclamation} size="1.2x" /></span>
            {:else}
              <Spinner size="1.2em" />
            {/if}
            <span class="break-all">{s}</span>
          </div>
        {/each}
      {/if}
      <div class="rounded-md bg-[var(--pd-content-card-bg)] p-6 flex flex-col gap-4">
        <label class="text-sm font-semibold text-[var(--pd-content-card-header-text)]">Model
          <Dropdown class="mt-1 font-normal" ariaLabel="Model" value={selected} onChange={onModel} options={options} disabled={!!task} />
        </label>
        {#if m}
          <div class="flex gap-1 flex-wrap -mt-2">
            <Chip label={m.license} /><Chip label={m.registry} />{#if m.quantization}<Chip label={m.quantization} tone="secondary" />{/if}{#if m.validated}<Chip label="Validated" tone="primary" />{/if}
            {#if m.estVramGB}<Chip label="~{m.estVramGB} GB VRAM" tone={tooBig ? 'error' : 'success'} />{/if}
          </div>
        {/if}
        <label class="text-sm font-semibold text-[var(--pd-content-card-header-text)]">Inference backend
          <Dropdown class="mt-1 font-normal" ariaLabel="Inference backend" bind:value={backend} options={backendOptions} disabled={!!task} />
        </label>
        <div class="rounded-md bg-[var(--pd-content-card-inset-surface)] p-3 text-sm flex items-center gap-3">
          <Icon icon={faMicrochip} size="1.4x" class="text-[var(--pd-content-card-icon)]" />
          <div class="grow">
            <div class="text-[var(--pd-content-card-header-text)]">GPU detected: {GPU.model}, {GPU.vramGB} GB</div>
            <div class="text-xs">nvidia-smi driver {GPU.driver} · CDI {GPU.cdi.join(', ')} · image <span class="font-mono">{image}</span></div>
          </div>
          <Checkbox checked={useGpu} onclick={toggleGpu} disabled={!!task || backend === 'openvino'} title="Use GPU">Use GPU</Checkbox>
        </div>
        {#if tooBig}
          <ErrorMessage error="{m?.name} needs ~{m?.estVramGB} GB of VRAM; the local GPU has {GPU.vramGB} GB. Pick a quantized variant (w4a16, INT4) or deploy it to OpenShift AI." />
        {/if}
        <label class="text-sm font-semibold text-[var(--pd-content-card-header-text)]">Container port
          <Input class="mt-1 font-normal" aria-label="Container port" bind:value={port} type="number" disabled={!!task} />
        </label>
        {#if task?.status === 'success'}
          <Button icon={faLocationArrow} onclick={openDetails}>Open service details</Button>
        {:else}
          <Button icon={faRocket} onclick={create} inProgress={task?.status === 'in-progress'} disabled={!!task || tooBig || !selected}>Create service</Button>
        {/if}
      </div>
    </div>
  {/snippet}
</FormPage>
