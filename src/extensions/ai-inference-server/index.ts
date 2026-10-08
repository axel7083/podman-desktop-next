/**
 * redhat.ai-inference-server (proposed) – Red Hat AI Inference (vLLM) as an
 * AI Lab backend: every vLLM server started from AI Lab becomes a `service`
 * connection (P8) with the `inference` capability (P9 provider), GPU status
 * item and GPU onboarding. The seeded server shows the out-of-memory state.
 */
import { faMicrochip, faRocket } from '@fortawesome/free-solid-svg-icons';

import { mkContainer } from '#lib/ext/helpers.ts';
import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import { ENGINE, GPU, RHAII, toolHref } from '../ai-lab/shared.ts';

const extension: MockExtension = {
  id: RHAII,
  displayName: 'Red Hat AI Inference',
  publisher: 'redhat',
  description: 'Serve LLMs locally with the enterprise vLLM images (registry.redhat.io/rhaii, vLLM 0.18) and an OpenAI-compatible API.',
  version: '3.4.1',
  icon: 'icons/redhat.ai-inference-server.png',
  dependsOn: ['redhat.ai-lab'],
  tags: ['ai'],
  pApis: ['P8', 'P9', 'P15', 'P17'],
  contributes: {
    connections: [
      {
        id: 'vllm-8001',
        name: 'vLLM @ localhost:8001',
        kind: 'service',
        providerId: 'rhaii',
        providerName: 'Red Hat AI Inference',
        initialStatus: 'stopped',
        endpoint: 'http://localhost:8001/v1',
        version: '3.4.1 (vLLM 0.18.0)',
        details: {
          Image: 'registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1',
          Model: 'RedHatAI/Qwen3-Coder-Next-FP8-dynamic',
          Accelerator: `${GPU.model} (CUDA)`,
          'Exit code': '1',
          Error: 'ValueError: model requires 48.2 GiB, only 22.1 GiB free',
          'Inference type': 'local',
          Models: 'qwen3-coder',
        },
        capabilities: ['inference', 'openai-compatible'],
      },
    ],
    statusItems: [{ id: 'gpu', align: 'right', icon: faMicrochip, text: (): string => 'RTX 4090 · 21.3/24 GB', tooltip: `${GPU.model}: GPU memory used by vLLM and llama.cpp`, command: 'rhaii.create' }],
    commands: [
      { id: 'rhaii.create', title: 'Create vLLM inference server', category: 'Red Hat AI Inference', icon: faRocket, run: (): void => navigate(toolHref('create-service', { backend: 'vllm', model: 'RedHatAI/granite-3.1-8b-instruct-quantized.w4a16' })) },
    ],
    settings: [
      {
        id: 'rhaii',
        title: 'Red Hat AI Inference',
        properties: [
          { id: 'rhaii.image', title: 'vLLM image', type: 'enum', default: 'vllm-cuda-rhel9:3.4.1', enum: ['vllm-cuda-rhel9:3.4.1', 'vllm-rocm-rhel9:3.4.1', 'vllm-cpu-rhel9:3.4.1'] },
          { id: 'rhaii.gpuMemoryUtilization', title: 'GPU memory utilization (--gpu-memory-utilization)', type: 'number', default: 0.9 },
          { id: 'rhaii.maxModelLen', title: 'Max model length (--max-model-len)', type: 'number', default: 16384 },
        ],
      },
    ],
    onboarding: [
      {
        id: 'rhaii-gpu',
        title: 'Set up GPU inference',
        steps: [
          { title: 'Detect GPU', description: `nvidia-smi found ${GPU.model}, ${GPU.vramGB} GB, driver ${GPU.driver}.` },
          { title: 'Generate CDI spec', description: 'sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml' },
          { title: 'Sign in to registry.redhat.io', description: 'Uses your Red Hat account pull secret.' },
        ],
      },
    ],
  },
  seed(world): void {
    world.containers.push(
      mkContainer(ENGINE, {
        name: 'rhaii-qwen3-coder',
        image: 'registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1',
        state: 'EXITED',
        ports: [[8001, 8000]],
        labels: { 'ai-lab.group': 'model-services', 'ai-lab-model-id': 'RedHatAI/Qwen3-Coder-Next-FP8-dynamic' },
        command: '--model RedHatAI/Qwen3-Coder-Next-FP8-dynamic --served-model-name qwen3-coder',
        logs: ['INFO 10-08 07:12:03 [api_server.py:1820] vLLM API server version 0.18.0', 'ERROR 10-08 07:12:41 [core.py:588] ValueError: model requires 48.2 GiB, only 22.1 GiB free'],
        ageH: 2,
      }),
    );
  },
};

export default extension;
