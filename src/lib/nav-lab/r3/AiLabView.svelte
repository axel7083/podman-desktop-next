<script lang="ts">
/**
 * AI Lab model and playground tabs (AI chain):
 * - model: Summary with the model card and the AI chain timeline (downloaded →
 *   served with vLLM → packaged as ModelCar → pushed to Quay → deployed on
 *   OpenShift AI → used in a playground); header: secondary "Package as
 *   ModelCar", primary "Serve with Red Hat AI Inference", ⋯ for the rest;
 * - playground: provider picker (AI Lab, AI Inference Server, OpenShift AI
 *   endpoints) and a chat.
 */
import { faEllipsisVertical, faPaperPlane, faPlay } from '@fortawesome/free-solid-svg-icons';

import { type LabTarget, RESOURCES } from '../data.ts';
import ActBtn from './ActBtn.svelte';
import { AI_CONN, aiState, aiTarget, isvcName, MODELS, modelcarRef, playgroundProviders, RHOAI, RHOAI_NS } from './ai.ts';
import Btn from './Btn.svelte';
import { pushedRef } from './chain.ts';
import Card from './Card.svelte';
import { ext } from './exts.ts';
import { flows, openModal } from './flows.svelte.ts';
import Head from './Head.svelte';
import KV from './KV.svelte';
import { live, type MenuItem, openMenu } from './live.svelte.ts';
import CodeView from './CodeView.svelte';
import ResourcesCard from './ResourcesCard.svelte';
import Timeline, { type TimelineStep } from './Timeline.svelte';
import type { FoundNode } from './trees.ts';

interface Props {
  f: FoundNode;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { f, onopen }: Props = $props();

const n = $derived(f.node);
const isModel = $derived(f.path.at(-1) === 'Models');
const model = $derived(n.label);
const info = $derived(MODELS[model]);
let view = $state('summary');

const served = $derived(aiState(model, 'served'));
const car = $derived(aiState(model, 'modelcar'));
const rhoai = $derived(aiState(model, 'rhoai'));
const carImage = $derived.by(() => {
  void live.added;
  return RESOURCES.find(r => r.connId === AI_CONN && r.sectionId === 'images' && r.name === modelcarRef(model));
});
const pushed = $derived(pushedRef(modelcarRef(model)));

function openCarImage(): void {
  if (carImage) onopen({ kind: 'resource', connId: AI_CONN, sectionId: 'images', resId: carImage.id }, {});
}

function usePlayground(): void {
  flows.state['ai:provider'] = rhoai === 'Loaded' ? `rhoai:${model}` : served === 'running' ? `vllm:${model}` : 'ai-lab';
  onopen(aiTarget('Playgrounds', 'RAG over orders docs'), {});
}

function menu(): MenuItem[] {
  return [
    { label: 'Serve with Red Hat AI Inference (vLLM)', icon: 'icons/redhat.ai-inference-server.png', disabled: served === 'running' || served === 'starting', run: (): void => openModal('serve-vllm', { model }) },
    { label: 'Package as ModelCar', icon: 'icons/redhat.modelcar.png', disabled: car === 'building', run: (): void => openModal('modelcar', { model }) },
    { label: 'Push ModelCar to Quay', icon: 'icons/redhat.quay.png', disabled: !carImage, run: (): void => openModal('push-quay', { resId: carImage?.id ?? '' }) },
    { label: 'Deploy to OpenShift AI', icon: 'icons/redhat.openshift-ai.png', disabled: car !== 'built', run: (): void => openModal('deploy-rhoai', { model }) },
    { label: 'Use in playground', icon: 'icons/redhat.ai-lab.png', run: usePlayground, sep: true },
  ];
}

const steps = $derived.by((): TimelineStep[] => [
  { id: 'downloaded', label: 'Downloaded', state: 'done', detail: `${info?.hf} · ${info?.size}`, href: `https://huggingface.co/${info?.hf}`, icon: 'icons/redhat.ai-lab.png' },
  served === 'running'
    ? { id: 'served', label: 'Served (vLLM)', state: 'done', detail: 'http://localhost:8000/v1', icon: 'icons/redhat.ai-inference-server.png', onopen: (): void => onopen(aiTarget('Services', `${model.split('-instruct')[0]} vLLM`), {}) }
    : { id: 'served', label: 'Served (vLLM)', state: served ? 'active' : 'todo', detail: 'starting…', icon: 'icons/redhat.ai-inference-server.png', action: { label: 'Serve', run: (): void => openModal('serve-vllm', { model }) } },
  car === 'built'
    ? { id: 'modelcar', label: 'ModelCar', state: 'done', detail: modelcarRef(model), icon: 'icons/redhat.modelcar.png', onopen: openCarImage }
    : { id: 'modelcar', label: 'ModelCar', state: car ? 'active' : 'todo', detail: 'building…', icon: 'icons/redhat.modelcar.png', action: { label: 'Package', run: (): void => openModal('modelcar', { model }) } },
  pushed
    ? { id: 'pushed', label: 'Pushed', state: 'done', detail: pushed, icon: 'icons/redhat.quay.png', href: `https://${pushed.split(':')[0]}?tab=tags` }
    : { id: 'pushed', label: 'Pushed', state: 'todo', icon: 'icons/redhat.quay.png', action: carImage ? { label: 'Push to Quay', run: (): void => openModal('push-quay', { resId: carImage.id }) } : undefined },
  rhoai
    ? { id: 'rhoai', label: 'OpenShift AI', state: rhoai === 'Loaded' ? 'done' : 'active', detail: `${RHOAI_NS}/${isvcName(model)} · ${rhoai}`, icon: 'icons/redhat.openshift-ai.png', onopen: (): void => onopen({ kind: 'resource', connId: RHOAI, sectionId: 'inference', resId: `${RHOAI}/inference/${isvcName(model)}` }, {}) }
    : { id: 'rhoai', label: 'OpenShift AI', state: 'todo', icon: 'icons/redhat.openshift-ai.png', action: car === 'built' ? { label: 'Deploy', run: (): void => openModal('deploy-rhoai', { model }) } : undefined },
  { id: 'playground', label: 'Playground', state: flows.state['ai:provider']?.endsWith(model) ? 'done' : 'todo', detail: flows.state['ai:provider'], action: { label: 'Use in playground', run: usePlayground } },
]);

/* Playground */
const providers = $derived(playgroundProviders());
const provider = $derived(providers.find(p => p.id === flows.state['ai:provider']) ?? providers[0]);
let prompt = $state('');
let chat = $state<[string, string][]>([['user', 'Summarize the refund policy for orders over $500.'], ['assistant', 'Orders over $500 can be refunded within 30 days; a manager approval is required above $2,000 (orders-docs/refunds.md).']]);

function send(): void {
  if (!prompt.trim()) return;
  chat = [...chat, ['user', prompt], ['assistant', `(${provider.label}) Based on the orders docs: ${prompt.length > 40 ? 'here is a short answer grounded in the retrieved passages.' : 'the answer is in orders-docs/faq.md, section 2.'}`]];
  prompt = '';
}
</script>

{#snippet modelActions()}
  <Btn icon="icons/redhat.modelcar.png" testid="ai-modelcar" disabled={car === 'building'} onclick={(): void => openModal('modelcar', { model })}>Package as ModelCar</Btn>
  <Btn kind="primary" icon={faPlay} testid="ai-serve" disabled={!!served} onclick={(): void => openModal('serve-vllm', { model })}>{served === 'running' ? 'Served with vLLM' : 'Serve with Red Hat AI Inference'}</Btn>
  <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, menu())} />
{/snippet}

{#if isModel}
  <div data-testid="ai-model" class="flex flex-col h-full min-h-0">
    <Head icon={n.icon} title={model} status={served === 'running' ? 'running' : undefined} connId={f.connId} onconn={(): void => onopen({ kind: 'connection', connId: f.connId }, {})} sub="AI Lab › Models" provenance="AI Lab" views={[['summary', 'Summary'], ['inspect', 'Inspect']]} {view} onview={(v): void => void (view = v)} actions={modelActions} />
    {#if view === 'inspect'}
      <CodeView lang="json" testid="inspect" lines={JSON.stringify({ name: model, ...info, file: `~/.local/share/ai-lab/models/${model}`, served, modelcar: car, rhoai }, null, 2).split('\n')} />
    {:else}
      <div data-testid="summary" class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
        <Card title="AI chain" testid="ai-chain"><Timeline steps={steps} testid="ai-timeline" /></Card>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
          <Card title="Model">
            <KV
              rows={[
                { k: 'Name', v: model },
                { k: 'Parameters', v: info?.params },
                { k: 'Size', v: info?.size },
                { k: 'Source', v: info?.hf, href: `https://huggingface.co/${info?.hf}` },
                { k: 'License', v: info?.license },
                { k: 'Path', v: `~/.local/share/ai-lab/models/${model}`, mono: true },
              ]} />
          </Card>
          <ResourcesCard id="ai-lab" />
        </div>
      </div>
    {/if}
  </div>
{:else}
  <div data-testid="ai-playground" class="flex flex-col h-full min-h-0">
    <Head icon={n.icon} title={n.label} connId={f.connId} onconn={(): void => onopen({ kind: 'connection', connId: f.connId }, {})} sub="AI Lab › Playgrounds" provenance="AI Lab" />
    <div class="flex items-center gap-2 px-5 py-3 shrink-0 border-b border-[var(--pd-content-divider)]">
      <span class="text-[12px] text-[var(--pd-table-body-text)]">Model provider</span>
      <select data-testid="playground-provider" aria-label="Model provider" class="h-7 px-2 rounded-md text-[12px] bg-[var(--pd-select-bg)] text-[var(--pd-content-header)] border border-[var(--pd-input-field-stroke)]" value={provider.id} onchange={(e): void => void (flows.state['ai:provider'] = e.currentTarget.value)}>
        {#each providers as p (p.id)}<option value={p.id}>{p.label} — {p.sub}</option>{/each}
      </select>
      {#if provider.id.startsWith('rhoai')}<span class="text-[12px] text-[var(--pd-table-body-text)]">via {ext('rhoai')?.name}</span>{/if}
    </div>
    <div class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-3">
      {#each chat as [role, text], i (i)}
        <div class="max-w-[70%] px-3 py-2 rounded-lg text-[13px] {role === 'user' ? 'self-end bg-[var(--pd-content-card-hover-bg)] text-[var(--pd-content-header)]' : 'self-start bg-[var(--pd-content-card-bg)] text-[var(--pd-content-header)]'}">{text}</div>
      {/each}
    </div>
    <form class="flex items-center gap-2 px-5 py-3 border-t border-[var(--pd-content-divider)]" onsubmit={(e): void => { e.preventDefault(); send(); }}>
      <input class="flex-1 h-7 px-2 rounded-md text-[12px] bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)]" aria-label="Prompt" placeholder="Ask {provider.label}…" bind:value={prompt} />
      <Btn kind="primary" icon={faPaperPlane}>Send</Btn>
    </form>
  </div>
{/if}
