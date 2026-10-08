<script lang="ts">
/** Service details (AI Lab InferenceServerDetails.svelte): Models, Server, Client code. */
import { faBookOpen, faBuildingColumns, faMessage, faMicrochip, faPlug, faRocket, faScaleBalanced, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage, Dropdown, EmptyScreen, StatusIcon } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import { withConfirmation } from '#lib/confirm.svelte.ts';
import { navigate } from '#lib/nav.ts';

import { INFERENCE_IMAGES } from '../../data.ts';
import { ai, createPlayground, deleteService, GPU, model, setServiceRunning, toolHref } from '../../shared.ts';
import Card from '../ui/Card.svelte';
import CodeBlock from '../ui/CodeBlock.svelte';

interface Props {
  id: string;
}

let { id }: Props = $props();

const svc = $derived(ai().services.find(s => s.id === id));
const m = $derived(svc ? model(svc.modelId) : undefined);
const served = $derived(svc?.backend === 'vllm' ? (m?.name.split('/').pop()?.replace(/-instruct.*/, '') ?? 'model') : (m?.name ?? ''));
let lang = $state('curl');

const snippet = $derived.by(() => {
  if (!svc) return '';
  const url = `http://localhost:${svc.port}/v1/chat/completions`;
  const body = `{\n  "model": "${served}",\n  "messages": [\n    { "role": "system", "content": "You are a helpful assistant." },\n    { "role": "user", "content": "What is the capital of France?" }\n  ]\n}`;
  if (lang === 'python')
    return `from openai import OpenAI\n\nclient = OpenAI(base_url="http://localhost:${svc.port}/v1", api_key="sk-no-key-required")\nresponse = client.chat.completions.create(\n    model="${served}",\n    messages=[{"role": "user", "content": "What is the capital of France?"}],\n)\nprint(response.choices[0].message.content)`;
  if (lang === 'quarkus')
    return `# application.properties\nquarkus.langchain4j.openai.base-url=http://localhost:${svc.port}/v1\nquarkus.langchain4j.openai.chat-model.model-name=${served}\nquarkus.langchain4j.openai.api-key=sk-no-key-required`;
  return `curl --location '${url}' \\\n--header 'Content-Type: application/json' \\\n--data '${body}'`;
});

function close(): void {
  navigate(toolHref('services'));
}

function stop(): void {
  if (svc) setServiceRunning(svc.id, svc.status === 'stopped');
}

function remove(): void {
  if (!svc) return;
  const s = svc;
  withConfirmation(
    () => {
      deleteService(s.id);
      close();
    },
    `delete service ${s.name}`,
    'Delete service?',
  );
}

function playground(): void {
  if (!svc) return;
  const provider = svc.backend === 'vllm' ? `conn:vllm-${svc.port}` : `ailab:${svc.id}`;
  const pg = createPlayground(`${served} playground`, provider, svc.backend === 'vllm' ? served : svc.modelId);
  navigate(toolHref('playground', { id: pg }));
}
</script>

{#if svc}
  <DetailsPage title="Service details" subtitle={svc.containerId} breadcrumbLeftPart="Model Services" breadcrumbRightPart="Service details" onclose={close} onbreadcrumbClick={close}>
    {#snippet iconSnippet()}<StatusIcon icon={faRocket} size={24} status={svc?.status === 'running' ? 'RUNNING' : 'EXITED'} />{/snippet}
    {#snippet actionsSnippet()}
      <div class="flex gap-2">
        <Button icon={faMessage} onclick={playground} disabled={svc?.status !== 'running'}>Open in playground</Button>
        <Button type="secondary" icon={faStop} onclick={stop} aria-label={svc?.status === 'stopped' ? 'Start service' : 'Stop service'} title={svc?.status === 'stopped' ? 'Start service' : 'Stop service'} />
        <Button type="secondary" icon={faTrash} onclick={remove} aria-label="Delete service" title="Delete service" />
      </div>
    {/snippet}
    {#snippet contentSnippet()}
      <div class="flex flex-col gap-4 p-4 overflow-auto h-full">
        <Card title="Models">
          <div class="flex items-center gap-2 rounded-md bg-[var(--pd-content-card-inset-bg)] px-3 py-2">
            <span class="grow text-[var(--pd-content-card-header-text)]">{m?.name}</span>
            <span class="flex items-center gap-1 rounded-md bg-[var(--pd-content-card-bg)] px-2 py-1 text-xs"><Icon icon={faScaleBalanced} /> {m?.license}</span>
            <span class="flex items-center gap-1 rounded-md bg-[var(--pd-content-card-bg)] px-2 py-1 text-xs"><Icon icon={faBuildingColumns} /> {m?.registry}</span>
          </div>
        </Card>
        <Card title="Server">
          <div class="flex flex-wrap gap-3">
            <span class="flex items-center gap-2 rounded-md bg-[var(--pd-content-card-inset-bg)] px-3 py-2 underline">http://localhost:{svc.port}/docs <Icon icon={faBookOpen} /></span>
            <span class="flex items-center gap-2 rounded-md bg-[var(--pd-content-card-inset-bg)] px-3 py-2 font-mono" aria-label="OpenAI endpoint">http://localhost:{svc.port}/v1 <Icon icon={faPlug} /></span>
            <span class="flex items-center gap-2 rounded-md bg-[var(--pd-content-card-inset-bg)] px-3 py-2">{svc.gpu ? `GPU Inference · ${GPU.model}` : 'CPU Inference'} <Icon icon={faMicrochip} /></span>
            <span class="flex items-center gap-2 rounded-md bg-[var(--pd-content-card-inset-bg)] px-3 py-2">{INFERENCE_IMAGES[svc.backend]?.label}</span>
          </div>
          {#if svc.backend === 'vllm'}
            <div class="mt-3 grid grid-cols-4 gap-3 text-xs">
              <div class="rounded-md bg-[var(--pd-content-card-inset-bg)] p-2"><div class="opacity-70">Generation</div><div class="text-base text-[var(--pd-content-card-header-text)]">85 tok/s</div></div>
              <div class="rounded-md bg-[var(--pd-content-card-inset-bg)] p-2"><div class="opacity-70">KV cache usage</div><div class="text-base text-[var(--pd-content-card-header-text)]">12 %</div></div>
              <div class="rounded-md bg-[var(--pd-content-card-inset-bg)] p-2"><div class="opacity-70">Time to first token p50</div><div class="text-base text-[var(--pd-content-card-header-text)]">81 ms</div></div>
              <div class="rounded-md bg-[var(--pd-content-card-inset-bg)] p-2"><div class="opacity-70">GPU memory</div><div class="text-base text-[var(--pd-content-card-header-text)]">21.3 / 24 GB</div></div>
            </div>
          {/if}
        </Card>
        <div class="flex items-center">
          <h2 class="grow text-base text-[var(--pd-content-header)]">Client code</h2>
          <Dropdown ariaLabel="Snippet language" bind:value={lang} options={[{ value: 'curl', label: 'cURL' }, { value: 'python', label: 'Python (openai)' }, { value: 'quarkus', label: 'Java (Quarkus LangChain4j)' }]} />
        </div>
        <CodeBlock code={snippet} label="Client code" />
      </div>
    {/snippet}
  </DetailsPage>
{:else}
  <EmptyScreen icon={faRocket} title="Service not found" message="This model service no longer exists." />
{/if}
