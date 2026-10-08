/**
 * AI Lab state + actions, shared by the AI extensions of the `ai` scenario
 * (vLLM backend, ModelCar, OpenShift AI, MaaS, Kaiden). Inference providers
 * are the P9 `InferenceProviderConnection` stand-in: AI Lab services, every
 * connection with the `inference` capability and OpenShift AI port-forwards.
 */
import { faBrain } from '@fortawesome/free-solid-svg-icons';

import { mkContainer } from '#lib/ext/helpers.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { IconRef } from '#lib/ext/types.ts';
import { addDynamicConnection, hexId, later, runTask, toast, uid, world } from '#lib/world.svelte.ts';

import { CANNED, CATALOG, DEFAULT_ANSWER, INFERENCE_IMAGES, RECIPES, SYSTEM_PROMPT } from './data.ts';

export const AI_LAB = 'redhat.ai-lab';
export const RHAII = 'redhat.ai-inference-server';
export const MAAS = 'redhat.maas';
export const RHOAI = 'redhat.openshift-ai';
export const ENGINE = 'podman-machine-default';
export const TOOL_PATH = '/tools/ai-lab';

export const aiIcon = faBrain;

export type Backend = 'llama-cpp' | 'openvino' | 'whisper-cpp' | 'vllm' | 'none';

export interface Recipe {
  id: string;
  name: string;
  description: string;
  categories: string[];
  languages: string[];
  frameworks: string[];
  backend: Backend;
  recommended: string[];
}

export interface CatalogModel {
  id: string;
  name: string;
  source: 'ai-lab' | 'redhatai' | 'validated' | 'rhoai';
  registry: string;
  license: string;
  backend: Backend;
  /** Bytes. */
  size?: number;
  quantization?: string;
  task: string;
  estVramGB?: number;
  downloads?: number;
  validated?: boolean;
  modelcar?: string;
  blackwellOnly?: boolean;
  baseModel?: string;
  provider?: string;
  maturity?: string;
  file?: string;
}

export interface InferenceService {
  id: string;
  name: string;
  containerId: string;
  modelId: string;
  port: number;
  backend: Backend;
  status: 'running' | 'stopped' | 'starting';
  gpu: boolean;
  image: string;
  created: number;
}

export interface RecipeApp {
  id: string;
  recipeId: string;
  modelId: string;
  name: string;
  podId: string;
  appPort: number;
  modelPort: number;
  health: 'healthy' | 'starting' | 'none';
  created: number;
}

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'error';
  content: string;
  streaming?: boolean;
  provider?: string;
  tokens?: number;
  ms?: number;
}

export interface Playground {
  id: string;
  name: string;
  providerId: string;
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
  updated: number;
}

export interface AiLabState {
  downloaded: string[];
  downloading: Record<string, number>;
  services: InferenceService[];
  apps: RecipeApp[];
  playgrounds: Playground[];
}

export interface InferenceProvider {
  id: string;
  label: string;
  kind: 'local' | 'self-hosted' | 'cloud';
  endpoint: string;
  models: string[];
  icon: IconRef;
  quota?: { used: number; limit: number; window: string; subscription: string };
}

/** Local workstation GPU (fixture: Fedora 44 + RTX 4090, CDI spec generated). */
export const GPU = {
  vendor: 'NVIDIA',
  model: 'NVIDIA GeForce RTX 4090',
  vramGB: 24,
  driver: '580.95.05',
  cdi: ['nvidia.com/gpu=0', 'nvidia.com/gpu=all'],
};

/* ------------------------------------------------------------------ */
/* Read helpers (never mutate inside derived contexts)                 */
/* ------------------------------------------------------------------ */

const EMPTY: AiLabState = { downloaded: [], downloading: {}, services: [], apps: [], playgrounds: [] };

export function ai(): AiLabState {
  return (world.ext[AI_LAB] as unknown as AiLabState | undefined) ?? EMPTY;
}

export function model(id: string): CatalogModel | undefined {
  return CATALOG.find(m => m.id === id);
}

export function modelLabel(id: string): string {
  return model(id)?.name ?? id;
}

export function recipe(id: string): Recipe | undefined {
  return RECIPES.find(r => r.id === id);
}

export function fitsGpu(m: CatalogModel): boolean {
  return !m.blackwellOnly && (m.estVramGB ?? 0) <= GPU.vramGB;
}

export function toolHref(p: string, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams({ p, ...extra });
  return `${TOOL_PATH}?${q.toString()}`;
}

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

function serviceContainer(svc: InferenceService, running: boolean): ReturnType<typeof mkContainer> {
  const m = model(svc.modelId);
  const c = mkContainer(ENGINE, {
    name: svc.name,
    image: svc.image,
    state: running ? 'RUNNING' : 'EXITED',
    ports: [[svc.port, svc.backend === 'vllm' ? 8000 : 8000]],
    labels: {
      'ai-lab-inference-server': JSON.stringify([svc.modelId]),
      'ai-lab-model-id': svc.modelId,
      'ai-lab.group': 'model-services',
      ...(svc.gpu ? { gpu: 'nvidia' } : {}),
    },
    command: svc.backend === 'vllm' ? `--model ${m?.name ?? svc.modelId} --max-model-len 16384 --tensor-parallel-size 1` : `llama-server --model /models/${m?.file ?? 'model.gguf'} --port 8000 --host 0.0.0.0`,
    logs:
      svc.backend === 'vllm'
        ? [
            'INFO 10-08 08:41:12 [api_server.py:1820] vLLM API server version 0.18.0',
            `INFO 10-08 08:41:14 [model.py:612] Resolved architecture: GraniteForCausalLM`,
            'Loading safetensors checkpoint shards: 100% Completed | 2/2 [00:03<00:00,  1.71s/it]',
            'INFO 10-08 08:41:31 [gpu_model_runner.py:2109] Model loading took 4.92 GiB and 4.18 seconds',
            'INFO 10-08 08:41:52 [gpu_model_runner.py:2631] Graph capturing finished in 18 secs, took 0.61 GiB',
            'INFO 10-08 08:41:53 [api_server.py:1880] Starting vLLM API server on http://0.0.0.0:8000',
            'INFO:     Application startup complete.',
            'INFO:     10.88.0.1:51322 - "GET /health HTTP/1.1" 200 OK',
          ]
        : [
            'ggml_cuda_init: found 1 CUDA devices:',
            `  Device 0: ${GPU.model}, compute capability 8.9, VMM: yes`,
            `llama_model_loader: loaded meta data with 35 key-value pairs from /models/${m?.file ?? 'model.gguf'}`,
            'llm_load_tensors: offloaded 41/41 layers to GPU',
            'main: server is listening on http://0.0.0.0:8000 - starting the main loop',
            'srv  update_slots: all slots are idle',
          ],
    upM: 140,
  });
  return c;
}

export function seedAiLab(): void {
  const services: InferenceService[] = [
    {
      id: 'svc-granite-33',
      name: 'granite-3.3-8b-instruct-server',
      containerId: '',
      modelId: 'hf.ibm-granite.granite-3.3-8b-instruct-GGUF',
      port: 35123,
      backend: 'llama-cpp',
      status: 'running',
      gpu: true,
      image: INFERENCE_IMAGES['llama-cpp'].cuda ?? '',
      created: Date.now() - 6 * 3600_000,
    },
    {
      id: 'svc-granite-40-micro',
      name: 'granite-4.0-micro-server',
      containerId: '',
      modelId: 'hf.ibm-granite.granite-4.0-micro-GGUF',
      port: 35001,
      backend: 'llama-cpp',
      status: 'stopped',
      gpu: false,
      image: INFERENCE_IMAGES['llama-cpp'].cpu,
      created: Date.now() - 3 * 86400_000,
    },
  ];
  for (const svc of services) {
    const c = serviceContainer(svc, svc.status === 'running');
    svc.containerId = c.id;
    world.containers.push(c);
  }

  // RAG recipe app: pod with model service, chromadb and the streamlit app
  const podId = hexId(64);
  const recipeLabels = { 'ai-lab-recipe-id': 'rag', 'ai-lab-model-id': 'hf.ibm-granite.granite-3.3-8b-instruct-GGUF', 'ai-lab-application-name': 'acme-support-assistant' };
  const members = [
    mkContainer(ENGINE, {
      name: 'rag-model-service',
      image: INFERENCE_IMAGES['llama-cpp'].cuda ?? '',
      ports: [[35002, 8001]],
      labels: { ...recipeLabels, 'ai-lab-model-ports': '35002' },
      podId,
      upM: 300,
    }),
    mkContainer(ENGINE, { name: 'rag-chromadb', image: 'docker.io/chromadb/chroma:0.6.3', ports: [[8000, 8000]], labels: recipeLabels, podId, upM: 300 }),
    mkContainer(ENGINE, {
      name: 'rag-inference-app',
      image: 'quay.io/ai-lab/rag:v1.8.0',
      ports: [[8501, 8501]],
      labels: { ...recipeLabels, 'ai-lab-application-ports': '8501' },
      podId,
      upM: 300,
      logs: ['You can now view your Streamlit app in your browser.', '  URL: http://0.0.0.0:8501', 'Loaded 412 chunks from manuals/acme-smarthub-3.pdf into collection "acme-manuals"'],
    }),
  ];
  world.containers.push(...members);
  world.pods.push({ id: podId, name: 'rag', engineId: ENGINE, status: 'RUNNING', created: Date.now() - 5 * 3600_000, containerIds: members.map(m => m.id), labels: recipeLabels });

  world.images.push(
    ...[
      { name: 'quay.io/ramalama/cuda-llama-server', tag: 'b9ced640', sizeMB: 3110 },
      { name: 'quay.io/ramalama/ramalama-llama-server', tag: '293f4c1a', sizeMB: 812 },
      { name: 'quay.io/ai-lab/rag', tag: 'v1.8.0', sizeMB: 1420 },
      { name: 'docker.io/chromadb/chroma', tag: '0.6.3', sizeMB: 498 },
    ].map(i => ({
      id: hexId(64),
      name: i.name,
      tag: i.tag,
      engineId: ENGINE,
      size: i.sizeMB * 1024 * 1024,
      created: Date.now() - 4 * 86400_000,
      digest: `sha256:${hexId(64)}`,
      os: 'linux',
      arch: 'amd64',
    })),
  );

  const state: AiLabState = {
    downloaded: ['hf.ibm-granite.granite-3.3-8b-instruct-GGUF', 'hf.ibm-granite.granite-4.0-micro-GGUF', 'hf.ggerganov.whisper.cpp'],
    downloading: {},
    services,
    apps: [
      {
        id: 'app-rag',
        recipeId: 'rag',
        modelId: 'hf.ibm-granite.granite-3.3-8b-instruct-GGUF',
        name: 'acme-support-assistant',
        podId,
        appPort: 8501,
        modelPort: 35002,
        health: 'healthy',
        created: Date.now() - 5 * 3600_000,
      },
    ],
    playgrounds: [
      {
        id: 'pg-manuals',
        name: 'manuals Q&A',
        providerId: 'ailab:svc-granite-33',
        model: 'hf.ibm-granite.granite-3.3-8b-instruct-GGUF',
        systemPrompt: SYSTEM_PROMPT,
        updated: Date.now() - 18 * 3600_000,
        messages: [
          { id: 'm1', role: 'user', content: 'How do I pair the SmartHub 3 with the mobile app?' },
          {
            id: 'm2',
            role: 'assistant',
            content: 'Open the Acme app, tap **Add device › SmartHub 3**, then hold the pairing button on the hub for 5 seconds until the LED blinks blue (manual §4.2). The app finds the hub automatically over Bluetooth.',
            tokens: 61,
            ms: 912,
            provider: 'AI Lab · granite-3.3-8b-instruct-server',
          },
        ],
      },
    ],
  };
  world.ext[AI_LAB] = { ...(world.ext[AI_LAB] ?? {}), ...(state as unknown as Record<string, unknown>) };
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

function mutable(): AiLabState {
  world.ext[AI_LAB] ??= { ...(EMPTY as unknown as Record<string, unknown>) };
  return world.ext[AI_LAB] as unknown as AiLabState;
}

export function downloadModel(id: string): void {
  const m = model(id);
  if (!m) return;
  const st = mutable();
  st.downloading[id] = 0;
  const file = m.file ?? `${m.name.split('/').pop()}.gguf`;
  runTask({
    name: `Downloading ${file}`,
    ext: AI_LAB,
    steps: [
      { label: `GET ${m.registry === 'Hugging Face' ? 'https://huggingface.co/' : ''}${m.name}`, ms: 600 },
      { label: `Downloading ${file}`, ms: 3200, log: ['Resuming from 0 B', 'Throughput 118 MB/s'] },
      { label: 'Verifying sha256', ms: 500 },
    ],
    onDone: () => {
      delete st.downloading[id];
      if (!st.downloaded.includes(id)) st.downloaded.push(id);
    },
  });
}

export function deleteModel(id: string): void {
  const st = mutable();
  st.downloaded = st.downloaded.filter(d => d !== id);
  toast({ type: 'success', title: `Model ${modelLabel(id)} deleted` });
}

export interface StartServiceOptions {
  modelId: string;
  backend: Backend;
  port: number;
  gpu: boolean;
  name?: string;
}

/** Create an inference server (task). Returns the task id and the future service id. */
export function createService(o: StartServiceOptions): { taskId: string; serviceId: string } {
  const m = model(o.modelId);
  const st = mutable();
  const serviceId = uid('svc');
  const isVllm = o.backend === 'vllm';
  const imgs = INFERENCE_IMAGES[o.backend] ?? INFERENCE_IMAGES['llama-cpp'];
  const image = o.gpu && imgs.cuda ? imgs.cuda : imgs.cpu;
  const short = (m?.name.split('/').pop() ?? 'model').replace(/-GGUF$/, '').replace(/^RedHatAI\//, '');
  const name = o.name ?? (isVllm ? `rhaii-${short.replace(/-instruct.*/, '')}` : `${short}-server`);
  const steps = isVllm
    ? [
        { label: `Pulling ${image.replace('registry.redhat.io/', '')}`, ms: 2600, log: ['Authenticated to registry.redhat.io (Red Hat account)', 'Copying blob 7f3a91c2… 9.8 GB'] },
        { label: `Downloading weights ${m?.name ?? o.modelId}`, ms: 2200, log: ['model-00001-of-00002.safetensors 100%', 'model-00002-of-00002.safetensors 100%', 'recipe.yaml, tokenizer.json, config.json'] },
        { label: 'Creating container (--device nvidia.com/gpu=all)', ms: 700 },
        { label: 'Loading weights', ms: 1800, log: ['Loading safetensors checkpoint shards: 100%', 'Graph capturing finished in 18 secs'] },
        { label: 'Waiting for GET /health → 200', ms: 900, log: ['Starting vLLM API server on http://0.0.0.0:8000', 'GET /health 200 OK'] },
      ]
    : [
        { label: 'Creating Inference server', ms: 500 },
        { label: `Copying model ${m?.name ?? o.modelId} to Podman Machine`, ms: 1400 },
        { label: `Pulling ${image}`, ms: 1600 },
        { label: 'Creating container', ms: 800, log: o.gpu ? [`GPU detected: ${GPU.model} (CUDA)`] : ['No GPU selected, CPU inference'] },
      ];
  const taskId = runTask({
    name: isVllm ? `Starting Red Hat AI Inference (${name})` : `Creating Model service ${name}`,
    ext: isVllm ? RHAII : AI_LAB,
    steps,
    action: { label: 'Open service details', href: toolHref('service', { id: serviceId }) },
    onDone: () => {
      const svc: InferenceService = { id: serviceId, name, containerId: '', modelId: o.modelId, port: o.port, backend: o.backend, status: 'running', gpu: o.gpu, image, created: Date.now() };
      const c = serviceContainer(svc, true);
      c.startedAt = Date.now();
      svc.containerId = c.id;
      world.containers.push(c);
      st.services.push(svc);
      if (isVllm && registry.isEnabled(RHAII)) {
        addDynamicConnection(
          RHAII,
          {
            id: `vllm-${o.port}`,
            name: `vLLM @ localhost:${o.port}`,
            kind: 'service',
            providerId: 'rhaii',
            providerName: 'Red Hat AI Inference',
            initialStatus: 'started',
            endpoint: `http://localhost:${o.port}/v1`,
            version: '3.4.1 (vLLM 0.18.0)',
            details: { Image: image, Model: m?.name ?? o.modelId, 'Served model name': short, Accelerator: o.gpu ? `${GPU.model} (CUDA)` : 'CPU', 'Inference type': 'local', Models: short },
            capabilities: ['inference', 'openai-compatible'],
          },
          'started',
        );
      }
    },
  });
  return { taskId, serviceId };
}

export function setServiceRunning(id: string, running: boolean): void {
  const svc = mutable().services.find(s => s.id === id);
  if (!svc) return;
  svc.status = 'starting';
  const c = world.containers.find(x => x.id === svc.containerId);
  if (c) c.state = running ? 'STARTING' : 'STOPPING';
  later(running ? 1500 : 900, () => {
    svc.status = running ? 'running' : 'stopped';
    if (c) {
      c.state = running ? 'RUNNING' : 'EXITED';
      c.startedAt = running ? Date.now() : undefined;
    }
  });
}

export function deleteService(id: string): void {
  const st = mutable();
  const svc = st.services.find(s => s.id === id);
  if (!svc) return;
  st.services = st.services.filter(s => s.id !== id);
  world.containers = world.containers.filter(c => c.id !== svc.containerId);
  toast({ type: 'success', title: `Model service ${svc.name} deleted` });
}

export function startRecipe(recipeId: string, modelId: string): string {
  const r = recipe(recipeId);
  const st = mutable();
  const appId = uid('app');
  return runTask({
    name: `Starting ${r?.name ?? recipeId}`,
    ext: AI_LAB,
    steps: [
      { label: 'Checkout repository containers/ai-lab-recipes@v1.8.0', ms: 900 },
      { label: `Loading ai-lab.yaml (${recipeId})`, ms: 300 },
      { label: `Building ${recipeId} image`, ms: 2200, log: ['STEP 1/7: FROM registry.access.redhat.com/ubi9/python-311:1-77', 'COMMIT quay.io/ai-lab/' + recipeId + ':latest'] },
      { label: `Starting model service (${modelLabel(modelId)})`, ms: 1200 },
      { label: `Creating pod ${recipeId}`, ms: 700 },
      { label: 'Waiting for health checks', ms: 900 },
    ],
    action: { label: 'Open running apps', href: toolHref('running') },
    onDone: () => {
      const podId = hexId(64);
      const labels = { 'ai-lab-recipe-id': recipeId, 'ai-lab-model-id': modelId };
      const port = 8501 + st.apps.length;
      const members = [
        mkContainer(ENGINE, { name: `${recipeId}-model-service`, image: INFERENCE_IMAGES['llama-cpp'].cpu, ports: [[35010 + st.apps.length, 8001]], labels, podId, upM: 0 }),
        mkContainer(ENGINE, { name: `${recipeId}-inference-app`, image: `quay.io/ai-lab/${recipeId}:latest`, ports: [[port, 8501]], labels, podId, upM: 0 }),
      ];
      world.containers.push(...members);
      world.pods.push({ id: podId, name: recipeId, engineId: ENGINE, status: 'RUNNING', created: Date.now(), containerIds: members.map(m => m.id), labels });
      st.apps.push({ id: appId, recipeId, modelId, name: r?.name ?? recipeId, podId, appPort: port, modelPort: 35010, health: 'healthy', created: Date.now() });
    },
  });
}

export function deleteApp(id: string): void {
  const st = mutable();
  const app = st.apps.find(a => a.id === id);
  if (!app) return;
  const pod = world.pods.find(p => p.id === app.podId);
  if (pod) {
    world.containers = world.containers.filter(c => !pod.containerIds.includes(c.id));
    world.pods = world.pods.filter(p => p.id !== pod.id);
  }
  st.apps = st.apps.filter(a => a.id !== id);
  toast({ type: 'success', title: `Application ${app.name} deleted` });
}

/* ------------------------------------------------------------------ */
/* Inference providers (P9 stand-in)                                   */
/* ------------------------------------------------------------------ */

interface MaasUsage {
  used: number;
  limit: number;
  window: string;
  subscription: string;
}

export function maasUsage(): MaasUsage | undefined {
  return (world.ext[MAAS] as { usage?: MaasUsage } | undefined)?.usage;
}

interface Forward {
  name: string;
  port: number;
  model: string;
}

export function providers(): InferenceProvider[] {
  const out: InferenceProvider[] = [];
  const rhaiiOn = registry.isEnabled(RHAII);
  for (const s of ai().services) {
    if (s.status !== 'running' || (s.backend === 'vllm' && rhaiiOn)) continue;
    out.push({ id: `ailab:${s.id}`, label: `AI Lab · ${s.name}`, kind: 'local', endpoint: `http://localhost:${s.port}/v1`, models: [s.modelId], icon: 'icons/redhat.ai-lab.png' });
  }
  for (const conn of registry.activeConnections) {
    if (!conn.capabilities?.includes('inference') || conn.status !== 'started') continue;
    const isMaas = conn.ext.id === MAAS;
    const usage = isMaas ? maasUsage() : undefined;
    out.push({
      id: `conn:${conn.id}`,
      label: conn.name,
      kind: (conn.details?.['Inference type'] as InferenceProvider['kind'] | undefined) ?? 'self-hosted',
      endpoint: conn.endpoint,
      models: (conn.details?.Models ?? '').split(',').map(x => x.trim()).filter(Boolean),
      icon: conn.icon ?? conn.ext.icon,
      quota: usage,
    });
  }
  const forwards = ((world.ext[RHOAI] as { forwards?: Forward[] } | undefined)?.forwards ?? []) as Forward[];
  for (const f of forwards) {
    out.push({ id: `rhoai:${f.name}`, label: `rhoai-dev · ${f.name} (port-forward)`, kind: 'self-hosted', endpoint: `http://localhost:${f.port}/v1`, models: [f.model], icon: 'icons/redhat.openshift-ai.png' });
  }
  return out;
}

export function providerModelLabel(p: InferenceProvider | undefined, id: string): string {
  if (p?.id.startsWith('ailab:')) return modelLabel(id);
  return id;
}

/* ------------------------------------------------------------------ */
/* Playgrounds                                                         */
/* ------------------------------------------------------------------ */

export function createPlayground(name: string, providerId: string, modelName: string): string {
  const id = uid('pg');
  mutable().playgrounds.unshift({ id, name, providerId, model: modelName, systemPrompt: SYSTEM_PROMPT, messages: [], updated: Date.now() });
  return id;
}

export function deletePlayground(id: string): void {
  const st = mutable();
  st.playgrounds = st.playgrounds.filter(p => p.id !== id);
}

const streams = new Map<string, ReturnType<typeof setInterval>>();

/** Send a user message; the answer streams word by word. MaaS consumes token quota (HTTP 429 at 100%). */
export function sendMessage(pgId: string, text: string): void {
  const pg = mutable().playgrounds.find(p => p.id === pgId);
  if (!pg || !text.trim()) return;
  const p = providers().find(x => x.id === pg.providerId);
  pg.messages.push({ id: uid('msg'), role: 'user', content: text });
  pg.updated = Date.now();

  if (!p) {
    pg.messages.push({ id: uid('msg'), role: 'error', content: 'The inference provider of this playground is not running. Pick another provider above.' });
    return;
  }
  const usage = p.quota ? maasUsage() : undefined;
  // RAG prompts carry ~31k tokens of retrieved manual chunks
  const promptTokens = 30_800 + Math.round(text.length / 4);
  if (usage && usage.used >= usage.limit) {
    pg.messages.push({
      id: uid('msg'),
      role: 'error',
      content: `429 Too Many Requests: token rate limit exceeded for subscription ${usage.subscription} (${usage.limit.toLocaleString('en-US')} tokens / ${usage.window}). Resets in 14 min.`,
    });
    quotaToast(pgId);
    return;
  }
  const answer = CANNED.find(c => c.match.test(text))?.answer ?? DEFAULT_ANSWER;
  const words = answer.split(' ');
  const msg: ChatMessage = { id: uid('msg'), role: 'assistant', content: '', streaming: true, provider: p.label };
  pg.messages.push(msg);
  const target = pg.messages[pg.messages.length - 1];
  let i = 0;
  const started = Date.now();
  const timer = setInterval(() => {
    i += 1;
    target.content = words.slice(0, i).join(' ');
    if (i >= words.length) {
      clearInterval(timer);
      streams.delete(target.id);
      target.streaming = false;
      target.tokens = Math.round(answer.length / 4);
      target.ms = Date.now() - started;
      if (usage) {
        usage.used = Math.min(usage.limit, usage.used + promptTokens + (target.tokens ?? 0));
        if (usage.used >= usage.limit) quotaToast(pgId);
        else if (usage.used / usage.limit >= 0.8) toast({ type: 'warning', title: `MaaS quota at ${Math.round((usage.used / usage.limit) * 100)}%`, body: `${usage.subscription}: ${usage.used.toLocaleString('en-US')} / ${usage.limit.toLocaleString('en-US')} tokens this ${usage.window}` });
      }
    }
  }, 35);
  streams.set(target.id, timer);
}

function quotaToast(pgId: string): void {
  toast(
    {
      type: 'error',
      title: 'Rate limit reached (HTTP 429) on granite-3-3-8b-instruct',
      body: 'Token quota of premium-ai-team is exhausted, resets in 14 min. Switch to the local AI Lab model?',
      action: { label: 'Switch to local AI Lab model', href: toolHref('playground', { id: pgId, switch: 'local' }) },
    },
    9000,
  );
}

/** Switch a playground to the first local provider (AI Lab service). */
export function switchToLocal(pgId: string): void {
  const pg = mutable().playgrounds.find(p => p.id === pgId);
  const local = providers().find(p => p.kind === 'local');
  if (!pg || !local) return;
  pg.providerId = local.id;
  pg.model = local.models[0] ?? pg.model;
  pg.messages.push({ id: uid('msg'), role: 'system', content: `Switched to ${local.label} (${local.endpoint}).` });
  toast({ type: 'success', title: `Playground switched to ${local.label}` });
}
