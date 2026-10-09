/**
 * redhat.modelcar (proposed) – "Package as ModelCar" on catalog models
 * (from AI Lab), a "model" badge on ModelCar images (P14 column), a ModelCar
 * image tab (push, deploy to OpenShift AI, register) and image menus.
 */
import { faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { type ContainerImage, hexId } from '#lib/world.svelte.ts';

import { ENGINE } from '../ai-lab/shared.ts';
import ModelCarTab from './components/ModelCarTab.svelte';
import { LABEL, MODELCAR } from './shared.ts';

const isModelCar = (img: unknown): boolean => !!(img as ContainerImage).labels?.[LABEL];

const extension: MockExtension = {
  id: MODELCAR,
  displayName: 'ModelCar Builder',
  publisher: 'redhat',
  category: 'AI',
  description: 'Package model weights as OCI ModelCar images, push them and deploy them on KServe / OpenShift AI with storageUri: oci://.',
  version: '0.1.0',
  icon: 'icons/redhat.modelcar.png',
  dependsOn: ['redhat.ai-lab'],
  tags: ['ai'],
  pApis: ['P7', 'P14', 'P15'],
  contributes: {
    columns: [{ id: 'modelcar', title: 'Model', target: 'image', value: (img): string | undefined => (isModelCar(img) ? 'model' : undefined) }],
    tabs: [{ id: 'modelcar', label: 'ModelCar', target: 'image', when: (ctx): boolean => isModelCar(ctx.resource), component: ModelCarTab }],
    menus: [
      {
        id: 'modelcar-deploy',
        label: 'Deploy to OpenShift AI',
        icon: faCloudArrowUp,
        target: 'image',
        placement: 'kebab',
        when: (ctx): boolean => isModelCar(ctx.resource),
        run: (ctx): void => navigate(`/c/${ctx.conn.id}/images/${(ctx.resource as ContainerImage).id}/modelcar`),
      },
    ],
  },
  seed(world): void {
    world.images.push({
      id: hexId(64),
      name: 'quay.io/sam/modelcar-granite-3.3-8b-instruct',
      tag: '1.0',
      engineId: ENGINE,
      size: 16_400_000_000,
      created: Date.now() - 86400_000,
      digest: 'sha256:c41d08aa' + hexId(56),
      os: 'linux',
      arch: 'amd64',
      base: 'ubi9',
      labels: { [LABEL]: 'true', 'org.opencontainers.image.source': 'hf://ibm-granite/granite-3.3-8b-instruct', 'io.podman-desktop.pushed': 'quay.io · 2026-10-07T08:30Z' },
    });
  },
};

export default extension;
