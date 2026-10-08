<script lang="ts">
/** "Package as ModelCar": tag, base image and the generated Containerfile. */
import { Button, Checkbox, Dropdown, Input } from '@podman-desktop/ui-svelte';

import Dialog from '#lib/components/Dialog.svelte';

import CodeBlock from '../../ai-lab/components/ui/CodeBlock.svelte';
import type { CatalogModel } from '../../ai-lab/shared.ts';
import { BASES, buildModelCar, containerfile, defaultTag } from '../shared.ts';

interface Props {
  model: CatalogModel;
  onclose: () => void;
}

let { model, onclose }: Props = $props();

// svelte-ignore state_referenced_locally
let tag = $state(defaultTag(model));
let base = $state(BASES[0].value);
let artifact = $state(false);
const file = $derived(containerfile(model, base));

function toggleArtifact(checked: boolean): void {
  artifact = checked;
}

function build(): void {
  buildModelCar(model, tag, base);
  onclose();
}
</script>

<Dialog title="Package as ModelCar" {onclose}>
  {#snippet content()}
    <div class="flex flex-col gap-3 text-sm">
      <p>Packages <b>{model.name}</b> as an OCI image whose files live under <span class="font-mono">/models</span>, ready for KServe <span class="font-mono">storageUri: oci://…</span>.</p>
      <label>Image name <Input class="mt-1" aria-label="Image name" bind:value={tag} /></label>
      <label>Base image <Dropdown class="mt-1" ariaLabel="Base image" bind:value={base} options={BASES} /></label>
      <Checkbox checked={artifact} onclick={toggleArtifact} title="Push as OCI artifact">Store as a Podman OCI artifact instead (podman artifact add, P7)</Checkbox>
      <CodeBlock wrap code={file} label="Containerfile" maxHeight="14rem" />
    </div>
  {/snippet}
  {#snippet buttons()}
    <Button type="link" onclick={onclose}>Cancel</Button>
    <Button onclick={build}>Build ModelCar</Button>
  {/snippet}
</Dialog>
