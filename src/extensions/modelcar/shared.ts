/**
 * ModelCar: package model weights as an OCI image (files under /models),
 * push it, and hand the `oci://` URI to OpenShift AI (KServe storageUri).
 */
import { hexId, runTask, shortImage, toast, world } from '#lib/world.svelte.ts';

import { ENGINE } from '../ai-lab/shared.ts';
import type { CatalogModel } from '../ai-lab/shared.ts';

export const MODELCAR = 'redhat.modelcar';
export const LABEL = 'com.redhat.modelcar';

export const BASES = [
  { value: 'registry.access.redhat.com/ubi9/ubi-micro:9.4', label: 'ubi9/ubi-micro:9.4 (Red Hat reference)' },
  { value: 'docker.io/library/busybox:1.37', label: 'busybox:1.37 (KServe upstream)' },
];

export function defaultTag(m: CatalogModel): string {
  const short = m.name.split('/').pop()?.replace('-quantized.', '-').toLowerCase() ?? 'model';
  return `quay.io/acme-ai/modelcar-${short}:1.0`;
}

export function containerfile(m: CatalogModel, base: string): string {
  return `FROM registry.access.redhat.com/ubi9/python-311:latest AS base
RUN pip install huggingface-hub
# downloads ${m.name} (safetensors, config, tokenizer) to /tmp/models
RUN python -c "from huggingface_hub import snapshot_download; \\
    snapshot_download(repo_id='${m.name}', local_dir='/tmp/models', \\
    allow_patterns=['*.safetensors', '*.json', '*.yaml'])"

FROM ${base}
COPY --from=base --chown=1001:0 /tmp/models /models
LABEL ${LABEL}="true" \\
      org.opencontainers.image.source="hf://${m.name}"
USER 1001`;
}

export const FILES = ['/models/config.json', '/models/generation_config.json', '/models/model-00001-of-00002.safetensors', '/models/model-00002-of-00002.safetensors', '/models/recipe.yaml', '/models/tokenizer.json', '/models/tokenizer_config.json'];

export function buildModelCar(m: CatalogModel, tag: string, base: string): void {
  const [name, version = 'latest'] = [tag.slice(0, tag.lastIndexOf(':')), tag.slice(tag.lastIndexOf(':') + 1)];
  const id = hexId(64);
  runTask({
    name: `Building ModelCar ${shortImage(tag)}`,
    ext: MODELCAR,
    steps: [
      { label: `Downloading ${m.name} from Hugging Face (5 files)`, ms: 2400, log: FILES.map(f => `  ${f.replace('/models/', '')}`) },
      { label: 'Writing Containerfile', ms: 300 },
      { label: `podman build -t ${tag}`, ms: 2600, log: ['STEP 1/7: FROM registry.access.redhat.com/ubi9/python-311:latest AS base', `STEP 5/7: FROM ${base}`, 'STEP 6/7: COPY --from=base --chown=1001:0 /tmp/models /models', `COMMIT ${tag}`] },
    ],
    action: { label: 'Open image', href: `/c/${ENGINE}/images/${id}/modelcar` },
    onDone: () => {
      world.images.push({
        id,
        name,
        tag: version,
        engineId: ENGINE,
        size: Math.round((m.size ?? 5e9) * 1.002),
        created: Date.now(),
        digest: `sha256:${hexId(64)}`,
        os: 'linux',
        arch: 'amd64',
        base: base.includes('ubi') ? 'ubi9' : 'busybox',
        labels: { [LABEL]: 'true', 'org.opencontainers.image.source': `hf://${m.name}`, 'org.opencontainers.image.title': m.name.split('/').pop() ?? m.name },
        layers: [
          { id: hexId(12), command: `COPY --from=base --chown=1001:0 /tmp/models /models`, size: Math.round(m.size ?? 5e9) },
          { id: hexId(12), command: `FROM ${base}`, size: 7_800_000 },
        ],
      });
    },
  });
}

export function pushModelCar(imageId: string): void {
  const img = world.images.find(i => i.id === imageId);
  if (!img) return;
  const ref = `${img.name}:${img.tag}`;
  runTask({
    name: `Pushing ${ref}`,
    ext: MODELCAR,
    steps: [
      { label: 'Authenticating to quay.io (Red Hat account)', ms: 400 },
      { label: `Copying blob ${img.digest?.slice(7, 19)} (${(img.size / 1e9).toFixed(1)} GB, zstd)`, ms: 2600 },
      { label: 'Writing manifest to image destination', ms: 400 },
    ],
    onDone: () => {
      img.labels = { ...img.labels, 'io.podman-desktop.pushed': `quay.io · ${new Date().toISOString().slice(0, 16)}Z` };
      toast({ type: 'success', title: `oci://${ref} is ready for OpenShift AI` });
    },
  });
}
