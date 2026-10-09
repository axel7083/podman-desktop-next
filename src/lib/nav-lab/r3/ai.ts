/**
 * P13 AI chain (AI Lab + Red Hat AI Inference Server + ModelCar + Quay +
 * OpenShift AI): serve a local AI Lab model with vLLM on the GPU, package it
 * as a ModelCar OCI image, push it, deploy it as a KServe InferenceService on
 * rhoai-dev (Pending → Loaded), then pick that endpoint in an AI Lab
 * playground. State lives in `flows.state['ai:*']`.
 */
import type { LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { installExt } from './exts.ts';
import { addChain, addResource, flows, runTask, sha } from './flows.svelte.ts';
import { addImage } from './hummingbird.ts';
import { live } from './live.svelte.ts';
import { TREE_PROVIDERS, treeRoot } from './trees.ts';

export const AI_CONN = 'podman-machine-default';
export const RHOAI = 'rhoai-dev';
export const RHOAI_NS = 'fraud-detection';
export const VLLM_IMAGE = 'registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1';
export const GPU = { name: 'NVIDIA GeForce RTX 4090', vram: '24 GB', driver: '580.76.05', cdi: 'nvidia.com/gpu=all' };

/** Size and Hugging Face source of the AI Lab models. */
export const MODELS: Record<string, { size: string; hf: string; license: string; params: string }> = {
  'granite-3.3-8b-instruct': { size: '4.9 GB', hf: 'ibm-granite/granite-3.3-8b-instruct', license: 'Apache-2.0', params: '8B' },
  'mistral-7b-instruct-v0.3': { size: '4.1 GB', hf: 'mistralai/Mistral-7B-Instruct-v0.3', license: 'Apache-2.0', params: '7B' },
  'whisper-small': { size: '466 MB', hf: 'openai/whisper-small', license: 'MIT', params: '244M' },
};

const key = (model: string, step: string): string => `ai:${step}:${model}`;
export const aiState = (model: string, step: 'served' | 'modelcar' | 'rhoai'): string | undefined => flows.state[key(model, step)];

/** `quay.io/acme/modelcar-<model>:1.0` */
export const modelcarRef = (model: string): string => `quay.io/acme/modelcar-${model}:1.0`;
export const isvcName = (model: string): string => model.replace(/\./g, '-').replace(/-instruct.*$/, '');

/** Tree node id of an AI Lab node under Models / Services / Playgrounds. */
export function aiNode(group: string, label?: string): string {
  const p = TREE_PROVIDERS.find(x => x.id === 'ai-lab');
  const root = p ? treeRoot(p, AI_CONN) : undefined;
  const g = root?.children?.find(x => x.label === group);
  return (label ? g?.children?.find(x => x.label === label)?.id : g?.id) ?? '';
}

export const aiTarget = (group: string, label?: string): LabTarget => ({ kind: 'node', connId: AI_CONN, nodeId: aiNode(group, label) });

export function serveVllm(model: string, o: { maxLen: string; quant: string }): void {
  installExt('ai-inference');
  const k = key(model, 'served');
  flows.state[k] = 'starting';
  lab.panel = true;
  const served = model.split('-instruct')[0];
  runTask({
    title: `vLLM ${served}`,
    connId: AI_CONN,
    icon: 'icons/redhat.ai-inference-server.png',
    label: 'Red Hat AI Inference Server',
    target: aiTarget('Models', model),
    cmd: `podman run -d --name rhaiis-${served} --device ${GPU.cdi} --security-opt=label=disable --shm-size=4g -p 8000:8000 -v ~/.local/share/ai-lab/models/${model}:/models:Z ${VLLM_IMAGE} --model /models --served-model-name ${served} --max-model-len ${o.maxLen}${o.quant === 'fp8' ? ' --quantization fp8' : ''} --gpu-memory-utilization 0.90`,
    lines: [
      `Trying to pull ${VLLM_IMAGE}... (registry.redhat.io, Red Hat account)`,
      'INFO vLLM API server version 0.18.0',
      `INFO Detected ${GPU.name} (${GPU.vram}), CUDA 12.8, driver ${GPU.driver}`,
      `INFO Loading weights from /models (${MODELS[model]?.size ?? '4 GB'})${o.quant === 'fp8' ? ' · FP8 dynamic quantization' : ''}`,
      'INFO KV cache usage 0.0% · max num seqs 256',
      'INFO Route: /v1/models, /v1/chat/completions, /v1/completions, /metrics',
      'INFO Uvicorn running on http://0.0.0.0:8000',
      `✔ ${served} served at http://localhost:8000/v1 (OpenAI-compatible)`,
    ],
    done: () => {
      flows.state[k] = 'running';
      addResource({ id: `${AI_CONN}/containers/rhaiis-${served}`, name: `rhaiis-${served}`, connId: AI_CONN, sectionId: 'containers', status: 'running', sub: VLLM_IMAGE, age: '1 minute' });
      flows.tree++;
    },
  });
}

export function packageModelCar(model: string): void {
  installExt('modelcar');
  const k = key(model, 'modelcar');
  const ref = modelcarRef(model);
  flows.state[k] = 'building';
  lab.panel = true;
  runTask({
    title: `ModelCar ${model.split('-instruct')[0]}`,
    connId: AI_CONN,
    icon: 'icons/redhat.modelcar.png',
    label: 'podman build (ModelCar)',
    target: aiTarget('Models', model),
    cmd: `podman build -t ${ref} -f Containerfile.modelcar ~/.local/share/ai-lab/models/${model}`,
    lines: ['STEP 1/4: FROM registry.access.redhat.com/ubi9/ubi-micro:9.6', 'STEP 2/4: COPY --chown=1001:0 models /models', 'STEP 3/4: LABEL org.opencontainers.image.title="' + model + '" com.redhat.modelcar=true', 'STEP 4/4: USER 1001', `COMMIT ${ref}`, `--> ${sha(ref)}`, `✔ ModelCar ${ref} built (${MODELS[model]?.size ?? '4 GB'} under /models)`],
    done: () => {
      flows.state[k] = 'built';
      addImage(AI_CONN, ref, Math.round(parseFloat(MODELS[model]?.size ?? '4') * 1024) + 12);
      addChain(ref, { step: 'built', title: 'Packaged as ModelCar', detail: `${model} · ubi9-micro`, at: 'just now', target: aiTarget('Models', model) });
    },
  });
}

/** KServe InferenceService on OpenShift AI with `storageUri: oci://…` (Pending → Loaded). */
export function deployRhoai(model: string, o: { ns: string; runtime: string; gpus: string }): void {
  installExt('rhoai');
  const ref = flows.chain[modelcarRef(model)]?.find(e => e.step === 'pushed')?.detail ?? modelcarRef(model);
  const name = isvcName(model);
  const k = key(model, 'rhoai');
  const resId = `${RHOAI}/inference/${name}`;
  const target: LabTarget = { kind: 'resource', connId: RHOAI, sectionId: 'inference', resId };
  live.status[`conn:${RHOAI}`] = 'running';
  flows.state[k] = 'Pending';
  lab.panel = true;
  runTask({
    title: `Deploy ${name}`,
    connId: RHOAI,
    icon: 'icons/redhat.openshift-ai.png',
    label: 'oc apply (KServe)',
    target,
    cmd: `oc apply -n ${o.ns} -f inferenceservice-${name}.yaml`,
    lines: [
      `inferenceservice.serving.kserve.io/${name} created`,
      `  runtime: ${o.runtime} · storageUri: oci://${ref} · nvidia.com/gpu: ${o.gpus}`,
      `$ oc get isvc ${name} -n ${o.ns} -w`,
      `${name}   False   Pending    PredictorNotReady (pulling modelcar)`,
      `${name}   False   Loading    ModelLoading`,
      `${name}   True    Loaded     https://${name}-${o.ns}.apps.rhoai-dev.acme.com`,
      `✔ ${name} is Loaded on OpenShift AI (${o.ns})`,
    ],
    done: () => {
      flows.state[k] = 'Loaded';
      live.status[resId] = 'running';
      addResource({ id: resId, name, connId: RHOAI, sectionId: 'inference', status: 'running', sub: `vLLM · ${o.gpus} GPU · oci://${ref} · Loaded`, age: '1 minute', ns: o.ns });
      addChain(modelcarRef(model), { step: 'deployed', title: 'Deployed to OpenShift AI', detail: `${o.ns}/${name} · Loaded`, at: 'just now', target });
    },
  });
  // The InferenceService shows up right away as Pending (KServe reconciles).
  addResource({ id: resId, name, connId: RHOAI, sectionId: 'inference', status: 'starting', sub: `vLLM · ${o.gpus} GPU · oci://${ref} · Pending`, age: 'just now', ns: o.ns });
}

/** Playground providers: local AI Lab, local vLLM, OpenShift AI endpoints that exist. */
export function playgroundProviders(): { id: string; label: string; sub: string; icon: string }[] {
  const out = [{ id: 'ai-lab', label: 'AI Lab · granite inference', sub: 'llama.cpp · localhost:35000', icon: 'icons/redhat.ai-lab.png' }];
  for (const m of Object.keys(MODELS)) {
    if (aiState(m, 'served') === 'running') out.push({ id: `vllm:${m}`, label: `AI Inference Server · ${m.split('-instruct')[0]}`, sub: 'vLLM · http://localhost:8000/v1', icon: 'icons/redhat.ai-inference-server.png' });
    if (aiState(m, 'rhoai') === 'Loaded') out.push({ id: `rhoai:${m}`, label: `OpenShift AI · ${isvcName(m)}`, sub: `${RHOAI} · https://${isvcName(m)}-${RHOAI_NS}.apps.rhoai-dev.acme.com/v1`, icon: 'icons/redhat.openshift-ai.png' });
  }
  return out;
}
