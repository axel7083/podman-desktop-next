/**
 * OpenShift AI (RHOAI 3.5) fixture for the `rhoai-dev` cluster and the
 * actions other AI extensions call: deploy an InferenceService from an
 * `oci://` ModelCar, register a model, port-forward to the playground,
 * apply an MCPServer CR.
 */
import { addKube, hexId, kube, type KubeObject, later, runTask, toast, world } from '#lib/world.svelte.ts';

import { RHOAI } from '../ai-lab/shared.ts';

export const RHOAI_CONN = 'rhoai-dev';
export const APPS_DOMAIN = 'apps.rhoai-dev.acme.example';

export interface Forward {
  name: string;
  port: number;
  model: string;
}

export function isvc(name: string, namespace: string, storageUri: string, state: 'ready' | 'loading' | 'failed', extra: { runtime?: string; gpu?: number; reason?: string; age?: { d?: number; h?: number; m?: number } } = {}): KubeObject {
  const ready = state === 'ready';
  const url = `https://${name}-${namespace}.${APPS_DOMAIN}`;
  return kube(
    'serving.kserve.io/v1beta1',
    'InferenceService',
    name,
    namespace,
    {
      predictor: {
        model: {
          modelFormat: { name: 'vLLM' },
          runtime: extra.runtime ?? 'vllm-cuda-runtime',
          storageUri,
          resources: { requests: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': String(extra.gpu ?? 1) }, limits: { cpu: '8', memory: '24Gi', 'nvidia.com/gpu': String(extra.gpu ?? 1) } },
        },
      },
    },
    {
      state: ready ? 'running' : state === 'loading' ? 'starting' : 'degraded',
      url: ready ? url : undefined,
      conditions: [
        { type: 'PredictorReady', status: ready ? 'True' : 'False', reason: extra.reason },
        { type: 'Ready', status: ready ? 'True' : 'False', reason: extra.reason },
      ],
      modelStatus: { states: { activeModelState: ready ? 'Loaded' : state === 'loading' ? 'Pending' : 'FailedToLoad' } },
    },
    extra.age ?? { h: 20 },
    { 'opendatahub.io/dashboard': 'true' },
  );
}

export function isvcYaml(name: string, namespace: string, storageUri: string, runtime = 'vllm-cuda-runtime', gpus = 1): string {
  return `apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: ${name}
  namespace: ${namespace}
  annotations:
    openshift.io/display-name: ${name}
    serving.kserve.io/deploymentMode: RawDeployment
  labels:
    opendatahub.io/dashboard: "true"
spec:
  predictor:
    model:
      modelFormat: { name: vLLM }
      runtime: ${runtime}
      storageUri: ${storageUri}
      args: ["--max-model-len=16384"]
      resources:
        requests: { cpu: "4", memory: 16Gi, nvidia.com/gpu: "${gpus}" }
        limits:   { cpu: "8", memory: 24Gi, nvidia.com/gpu: "${gpus}" }`;
}

export function seedRhoai(): void {
  const node = (name: string, roles: string, gpu = false): KubeObject =>
    kube('v1', 'Node', name, undefined, {}, { ready: true, roles, kubeletVersion: 'v1.33.4', osImage: 'Red Hat Enterprise Linux CoreOS 9.6', ...(gpu ? { allocatable: { 'nvidia.com/gpu': '4' } } : {}) }, { d: 40 });
  const ns = (name: string, display: string, ds = true): KubeObject =>
    kube('v1', 'Namespace', name, undefined, {}, { phase: 'Active' }, { d: 30 }, ds ? { 'opendatahub.io/dashboard': 'true', 'openshift.io/display-name': display } : {});
  const objects: KubeObject[] = [
    node('master-0.rhoai-dev', 'control-plane,master'),
    node('worker-0.rhoai-dev', 'worker'),
    node('gpu-worker-0.rhoai-dev', 'worker,gpu', true),
    node('gpu-worker-1.rhoai-dev', 'worker,gpu', true),
    ns('sam-ai', 'Sam AI sandbox'),
    ns('acme-support', 'Acme support assistant'),
    ns('redhat-ods-applications', '', false),
    kube('datasciencecluster.opendatahub.io/v2', 'DataScienceCluster', 'default-dsc', undefined, {
      components: Object.fromEntries(
        ['dashboard', 'workbenches', 'aipipelines', 'kserve', 'modelregistry', 'llamastackoperator', 'trustyai', 'kueue', 'ray', 'trainer', 'aigateway', 'mcplifecycleoperator', 'feastoperator', 'mlflowoperator'].map(c => [
          c,
          { managementState: ['feastoperator', 'mlflowoperator'].includes(c) ? 'Removed' : 'Managed' },
        ]),
      ),
    }, { state: 'running', phase: 'Ready', release: { name: 'OpenShift AI Self-Managed', version: '3.5.0' } }, { d: 40 }),
    kube('kubeflow.org/v1', 'Notebook', 'acme-rag-notebook', 'sam-ai', { image: 's2i-generic-data-science-notebook:2025.2', size: 'Medium', gpu: 0 }, { state: 'stopped' }, { d: 6 }, { 'opendatahub.io/dashboard': 'true' }),
    kube('kubeflow.org/v1', 'Notebook', 'embeddings-eval', 'sam-ai', { image: 'pytorch-cuda:2025.2', size: 'Large', gpu: 1 }, { state: 'running', url: `https://embeddings-eval-sam-ai.${APPS_DOMAIN}` }, { d: 2 }, { 'opendatahub.io/dashboard': 'true' }),
    isvc('granite-8b', 'sam-ai', 'oci://quay.io/sam/modelcar-granite-3.3-8b-instruct:1.0', 'ready', { age: { d: 1 } }),
    isvc('qwen3-8b-fp8', 'sam-ai', 'oci://quay.io/redhat-ai-services/modelcar-catalog:qwen3-8b', 'loading', { age: { m: 9 } }),
    isvc('granite-embedding-r2', 'acme-support', 'oci://registry.redhat.io/rhai/modelcar-granite-embedding-english-r2', 'failed', { reason: 'ImagePullBackOff', age: { h: 3 } }),
    kube('serving.kserve.io/v1alpha1', 'ServingRuntime', 'vllm-cuda-runtime', 'sam-ai', { template: 'vllm-cuda-runtime-template', image: 'registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1', supportedModelFormats: [{ name: 'vLLM', autoSelect: true }] }, { state: 'running' }, { d: 20 }),
    kube('modelregistry.opendatahub.io/v1alpha1', 'RegisteredModel', 'acme-support-granite', 'rhoai-model-registries', { owner: 'sam', versions: [{ name: 'v3', author: 'sam', uri: 'oci://quay.io/sam/modelcar-granite-3.3-8b-instruct:1.0', modelFormatName: 'vLLM' }] }, { state: 'live' }, { d: 12 }),
    kube('apps/v1', 'Deployment', 'granite-8b-predictor', 'sam-ai', { replicas: 1, image: 'registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1' }, { readyReplicas: 1 }, { d: 1 }),
    kube('apps/v1', 'Deployment', 'qwen3-8b-fp8-predictor', 'sam-ai', { replicas: 1, image: 'registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1' }, { readyReplicas: 0 }, { m: 9 }),
    kube('v1', 'Pod', `granite-8b-predictor-6c9f7d8b5-${hexId(5)}`, 'sam-ai', { nodeName: 'gpu-worker-0.rhoai-dev' }, { phase: 'Running', ready: '1/1', restarts: 0 }, { d: 1 }),
    kube('v1', 'Pod', `qwen3-8b-fp8-predictor-7b4c9d6f8-${hexId(5)}`, 'sam-ai', { nodeName: 'gpu-worker-1.rhoai-dev' }, { phase: 'Pending', ready: '0/1', restarts: 0 }, { m: 9 }),
    kube('v1', 'Service', 'granite-8b-predictor', 'sam-ai', { type: 'ClusterIP', clusterIP: '172.30.41.12', ports: '8080/TCP' }, {}, { d: 1 }),
  ];
  addKube(RHOAI_CONN, objects);
  // qwen finishes loading a bit later in the session
  later(45_000, () => setIsvcState('qwen3-8b-fp8', 'sam-ai', 'ready'));
}

function find(name: string, namespace: string): KubeObject | undefined {
  return (world.kube[RHOAI_CONN] ?? []).find(o => o.kind === 'InferenceService' && o.metadata.name === name && o.metadata.namespace === namespace);
}

export function setIsvcState(name: string, namespace: string, state: 'ready' | 'loading'): void {
  const o = find(name, namespace);
  if (!o) return;
  const next = isvc(name, namespace, String((o.spec?.predictor as { model: { storageUri: string } }).model.storageUri), state);
  // replace the object so every list re-renders the row
  world.kube[RHOAI_CONN] = (world.kube[RHOAI_CONN] ?? []).map(x => (x === o ? { ...o, status: next.status } : x));
}

export interface DeployOptions {
  name: string;
  namespace: string;
  storageUri: string;
  runtime?: string;
  gpus?: number;
}

export function deployInferenceService(o: DeployOptions): string {
  addKube(RHOAI_CONN, [isvc(o.name, o.namespace, o.storageUri, 'loading', { runtime: o.runtime, gpu: o.gpus, age: { m: 0 } })]);
  return runTask({
    name: `Deploying InferenceService ${o.name}`,
    ext: RHOAI,
    steps: [
      { label: `kubectl apply -n ${o.namespace} InferenceService/${o.name}`, ms: 700, log: [`inferenceservice.serving.kserve.io/${o.name} created`] },
      { label: `Pulling ModelCar ${o.storageUri.replace('oci://', '')} on gpu-worker-0`, ms: 2600 },
      { label: 'Waiting for PredictorReady', ms: 2000, log: ['Starting vLLM API server on http://0.0.0.0:8080'] },
      { label: 'Ready=True', ms: 400 },
    ],
    action: { label: 'Open model serving', href: `/c/${RHOAI_CONN}/rhoai-serving` },
    onDone: () => setIsvcState(o.name, o.namespace, 'ready'),
  });
}

export function registerModel(name: string, version: string, uri: string): void {
  const existing = (world.kube[RHOAI_CONN] ?? []).find(o => o.kind === 'RegisteredModel' && o.metadata.name === name);
  runTask({
    name: `Registering ${name} ${version}`,
    ext: RHOAI,
    steps: [
      { label: 'POST /api/model_registry/v1alpha3/registered_models', ms: 500 },
      { label: 'POST /model_versions, /model_artifacts', ms: 600, log: [`ModelArtifact uri=${uri}`] },
    ],
    action: { label: 'Open model registry', href: `/c/${RHOAI_CONN}/rhoai-registry` },
    onDone: () => {
      const v = { name: version, author: 'sam', uri, modelFormatName: 'vLLM' };
      if (existing) (existing.spec as { versions: unknown[] }).versions.push(v);
      else addKube(RHOAI_CONN, [kube('modelregistry.opendatahub.io/v1alpha1', 'RegisteredModel', name, 'rhoai-model-registries', { owner: 'sam', versions: [v] }, { state: 'live' }, { m: 0 })]);
    },
  });
}

export function forwards(): Forward[] {
  world.ext[RHOAI] ??= {};
  const store = world.ext[RHOAI];
  store.forwards ??= [];
  return store.forwards as Forward[];
}

export function portForward(name: string, model: string, onReady: (f: Forward) => void): void {
  const port = 18080 + forwards().length;
  runTask({
    name: `Port-forward ${name} to localhost:${port}`,
    ext: RHOAI,
    steps: [
      { label: `kubectl port-forward -n sam-ai svc/${name}-predictor ${port}:8080`, ms: 900, log: [`Forwarding from 127.0.0.1:${port} -> 8080`] },
      { label: 'GET /v1/models → 200', ms: 400 },
    ],
    onDone: () => {
      const f = { name, port, model };
      forwards().push(f);
      onReady(f);
    },
  });
}

export function applyMcpServer(name: string, image: string): void {
  runTask({
    name: `Applying MCPServer ${name}`,
    ext: RHOAI,
    steps: [
      { label: `kubectl apply -n sam-ai MCPServer/${name}`, ms: 600, log: [`mcpserver.mcp.x-k8s.io/${name} created`] },
      { label: 'Waiting for Ready=True', ms: 1800 },
    ],
    action: { label: 'Open MCP servers', href: `/c/${RHOAI_CONN}/rhoai-mcp` },
    onDone: () => {
      addKube(RHOAI_CONN, [kube('mcp.x-k8s.io/v1beta1', 'MCPServer', name, 'sam-ai', { source: { type: 'ContainerImage', containerImage: { ref: image } }, config: { port: 8080 } }, { state: 'running', url: `https://${name}-sam-ai.${APPS_DOMAIN}/mcp` }, { m: 0 })]);
      toast({ type: 'success', title: `MCPServer ${name} is Ready on rhoai-dev` });
    },
  });
}
