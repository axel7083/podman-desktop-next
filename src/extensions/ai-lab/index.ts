/**
 * redhat.ai-lab – Podman AI Lab as a Tool (P3) with its own sub-navigation
 * (Dashboard, Recipe Catalog, Running, Catalog, Services, Playgrounds, Local
 * Server, Tuning). The model catalog is unified (R54): ai.json + RedHatAI +
 * Red Hat validated ModelCars + rhoai-dev. Contributes container groupers
 * (P10), an Inference tab and a Model column (P14), a dashboard card (P17).
 */
import { faBrain, faMessage, faRocket } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import type { Container } from '#lib/world.svelte.ts';

import AiLabTool from './components/AiLabTool.svelte';
import InferenceTab from './components/InferenceTab.svelte';
import LocalAiCard from './components/LocalAiCard.svelte';
import { AI_LAB, ai, modelLabel, seedAiLab, toolHref } from './shared.ts';

const extension: MockExtension = {
  id: AI_LAB,
  displayName: 'Podman AI Lab',
  publisher: 'redhat',
  category: 'AI',
  description: 'Run open models locally (llama.cpp, OpenVINO, Red Hat AI Inference), try them in playgrounds and start AI recipes as pods.',
  version: '1.10.0',
  icon: 'icons/redhat.ai-lab.png',
  dependsOn: ['podman-desktop.podman'],
  tags: ['ai'],
  pApis: ['P3', 'P9', 'P10', 'P14', 'P15', 'P17'],
  contributes: {
    tools: [{ id: 'ai-lab', label: 'AI Lab', icon: 'icons/redhat.ai-lab.png', description: 'Recipes, models, services and playgrounds', component: AiLabTool, badge: (): number | undefined => ai().services.filter(s => s.status === 'running').length || undefined }],
    groupers: [
      { id: 'ai-lab-recipe', label: 'ai-lab-recipe-id', typeName: 'AI Lab app', chip: 'AI Lab app', icon: 'icons/redhat.ai-lab.png' },
      { id: 'ai-lab-services', label: 'ai-lab.group', typeName: 'AI Lab', chip: 'AI Lab', icon: 'icons/redhat.ai-lab.png' },
    ],
    columns: [{ id: 'ai-lab-model', title: 'Model', target: 'container', width: '1.4fr', value: (row): string | undefined => {
      const id = (row as Container).labels?.['ai-lab-model-id'];
      return id ? modelLabel(id).split('/').pop() : undefined;
    } }],
    tabs: [{ id: 'inference', label: 'Inference', target: 'container', when: (ctx): boolean => !!(ctx.resource as Container).labels?.['ai-lab-inference-server'], component: InferenceTab }],
    menus: [
      {
        id: 'ai-lab-open-playground',
        label: 'Open in AI Lab playground',
        icon: faMessage,
        target: 'container',
        placement: 'kebab',
        when: (ctx): boolean => !!(ctx.resource as Container).labels?.['ai-lab-inference-server'],
        run: (ctx): void => {
          const svc = ai().services.find(s => s.containerId === (ctx.resource as Container).id);
          navigate(toolHref('playgrounds', svc ? { new: svc.modelId, provider: `ailab:${svc.id}` } : {}));
        },
      },
    ],
    dashboardCards: [{ id: 'local-ai', title: 'Local AI', component: LocalAiCard }],
    commands: [
      { id: 'ai-lab.navigation.recipe.start', title: 'Start a recipe', category: 'AI Lab', icon: faBrain, run: (): void => navigate(toolHref('recipes')) },
      { id: 'ai-lab.navigation.inference.start', title: 'Start an inference server', category: 'AI Lab', icon: faRocket, run: (): void => navigate(toolHref('create-service')) },
      { id: 'ai-lab.catalog', title: 'Browse the model catalog', category: 'AI Lab', run: (): void => navigate(toolHref('catalog')) },
      { id: 'ai-lab.playgrounds', title: 'Open playgrounds', category: 'AI Lab', icon: faMessage, run: (): void => navigate(toolHref('playgrounds')) },
    ],
    settings: [
      {
        id: 'ai-lab',
        title: 'AI Lab',
        properties: [
          { id: 'ai-lab.models.path', title: 'Models path', type: 'string', default: '~/.local/share/containers/podman-desktop/extensions-storage/redhat.ai-lab/models' },
          { id: 'ai-lab.experimentalGPU', title: 'Experimental GPU support for inference servers', type: 'boolean', default: true },
          { id: 'ai-lab.apiPort', title: 'Port on which the API is listening', type: 'number', default: 10434 },
          { id: 'ai-lab.inferenceRuntime', title: 'Inference runtime', type: 'enum', default: 'all', enum: ['all', 'llama-cpp', 'whisper-cpp', 'openvino', 'vllm'] },
          { id: 'ai-lab.experimentalTuning', title: 'Experimental tuning (InstructLab)', type: 'boolean', default: false },
          { id: 'ai-lab.modelUploadDisabled', title: 'Disable model upload to the Podman machine', type: 'boolean', default: false },
        ],
      },
    ],
  },
  seed(): void {
    seedAiLab();
  },
};

export default extension;
