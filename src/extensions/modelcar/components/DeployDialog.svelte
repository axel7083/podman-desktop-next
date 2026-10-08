<script lang="ts">
/** "Deploy to OpenShift AI": target project, runtime, GPUs and the generated InferenceService YAML. */
import { Button, Dropdown, Input } from '@podman-desktop/ui-svelte';

import Dialog from '#lib/components/Dialog.svelte';

import CodeBlock from '../../ai-lab/components/ui/CodeBlock.svelte';
import { deployInferenceService, isvcYaml, RHOAI_CONN } from '../../openshift-ai/shared.ts';

interface Props {
  name: string;
  storageUri: string;
  onclose: () => void;
}

let { name: initialName, storageUri, onclose }: Props = $props();

function k8sName(n: string): string {
  return n.toLowerCase().replace(/^modelcar-/, '').replace('granite-3.1-8b-instruct', 'granite-31-8b').replace(/[^a-z0-9-]+/g, '-').replace(/-instruct|-quantized/g, '').slice(0, 40).replace(/-+$/, '');
}

// svelte-ignore state_referenced_locally
let name = $state(k8sName(initialName));
let namespace = $state('sam-ai');
let runtime = $state('vllm-cuda-runtime');
let gpus = $state('1');
const yaml = $derived(isvcYaml(name, namespace, storageUri, runtime, Number(gpus)));

function apply(): void {
  deployInferenceService({ name, namespace, storageUri, runtime, gpus: Number(gpus) });
  onclose();
}
</script>

<Dialog title="Deploy to OpenShift AI" {onclose}>
  {#snippet content()}
    <div class="flex flex-col gap-3 text-sm">
      <div class="grid grid-cols-2 gap-3">
        <label>Cluster <Dropdown class="mt-1" ariaLabel="Cluster" value={RHOAI_CONN} options={[{ value: RHOAI_CONN, label: 'rhoai-dev (OpenShift AI 3.5)' }]} /></label>
        <label>Data science project <Dropdown class="mt-1" ariaLabel="Data science project" bind:value={namespace} options={[{ value: 'sam-ai', label: 'sam-ai' }, { value: 'acme-support', label: 'acme-support' }]} /></label>
        <label>Deployment name <Input class="mt-1" aria-label="Deployment name" bind:value={name} /></label>
        <label>Serving runtime <Dropdown class="mt-1" ariaLabel="Serving runtime" bind:value={runtime} options={[{ value: 'vllm-cuda-runtime', label: 'vLLM NVIDIA GPU (vllm-cuda-runtime)' }, { value: 'vllm-cpu-runtime', label: 'vLLM CPU (vllm-cpu-runtime)' }]} /></label>
      </div>
      <label>Accelerators (nvidia.com/gpu) <Input class="mt-1" aria-label="GPUs" type="number" bind:value={gpus} /></label>
      <CodeBlock code={yaml} label="InferenceService YAML" maxHeight="14rem" />
    </div>
  {/snippet}
  {#snippet buttons()}
    <Button type="link" onclick={onclose}>Cancel</Button>
    <Button onclick={apply}>Apply</Button>
  {/snippet}
</Dialog>
