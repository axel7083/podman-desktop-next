<script lang="ts">
/** Image › ModelCar tab (P14): model files, source, push, register, deploy. */
import { faCloudArrowUp, faPlay, faTag, faUpload } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import { registry } from '#lib/ext/registry.svelte.ts';
import type { ResourceContext } from '#lib/ext/types.ts';
import { type ContainerImage, humanSize, runTask } from '#lib/world.svelte.ts';

import Card from '../../ai-lab/components/ui/Card.svelte';
import Chip from '../../ai-lab/components/ui/Chip.svelte';
import { registerModel } from '../../openshift-ai/shared.ts';
import { FILES, MODELCAR, pushModelCar } from '../shared.ts';
import DeployDialog from './DeployDialog.svelte';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();
const img = $derived(ctx.resource as ContainerImage);
const ref = $derived(`${img.name}:${img.tag}`);
const pushed = $derived(img.labels?.['io.podman-desktop.pushed']);
const rhoai = $derived(registry.isEnabled('redhat.openshift-ai'));
let deploying = $state(false);

function push(): void {
  pushModelCar(img.id);
}

function deploy(): void {
  deploying = true;
}

function close(): void {
  deploying = false;
}

function register(): void {
  registerModel('acme-granite', 'v1.0', `oci://${ref}`);
}

function runLocally(): void {
  runTask({
    name: `Test ModelCar ${img.name.split('/').pop()} locally`,
    ext: MODELCAR,
    steps: [{ label: `podman run --mount type=image,source=${ref},destination=/models registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1 --model /models`, ms: 1800 }],
  });
}
</script>

<div class="flex flex-col gap-4 p-5 overflow-auto h-full">
  <Card title="ModelCar">
    {#snippet actions()}
      {#if pushed}<Chip label="Pushed · {pushed}" tone="success" />{:else}<Chip label="Local only" />{/if}
    {/snippet}
    <div class="grid grid-cols-[10rem_1fr] gap-y-1">
      <span>Source</span><span class="font-mono text-[var(--pd-content-card-header-text)]">{img.labels?.['org.opencontainers.image.source']}</span>
      <span>Storage URI</span><span class="font-mono text-[var(--pd-content-card-header-text)]" aria-label="Storage URI">oci://{ref}</span>
      <span>Size</span><span>{humanSize(img.size)}</span>
    </div>
    <div class="mt-3 flex flex-wrap gap-2">
      <Button icon={faUpload} onclick={push} type={pushed ? 'secondary' : 'primary'}>{pushed ? 'Push again' : 'Push to quay.io'}</Button>
      {#if rhoai}
        <Button icon={faCloudArrowUp} onclick={deploy} type={pushed ? 'primary' : 'secondary'} disabled={!pushed}>Deploy to OpenShift AI</Button>
        <Button icon={faTag} type="secondary" onclick={register} disabled={!pushed}>Register in model registry</Button>
      {/if}
      <Button icon={faPlay} type="secondary" onclick={runLocally}>Test locally with vLLM</Button>
    </div>
  </Card>
  <Card title="Model files">
    <ul>
      {#each FILES as f (f)}<li class="flex items-center gap-2 py-0.5 font-mono text-xs"><span class="opacity-60"><Chip label={f.endsWith('.safetensors') ? 'weights' : 'config'} /></span>{f}</li>{/each}
    </ul>
  </Card>
</div>

{#if deploying}
  <DeployDialog name={img.name.split('/').pop() ?? 'model'} storageUri="oci://{ref}" onclose={close} />
{/if}
