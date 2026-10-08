<script lang="ts">
/** "Sign & push" dialog (RHTAS): destination, keyless signing, SBOM attestation. */
import { Button, CloseButton, Dropdown, Input, Modal } from '@podman-desktop/ui-svelte';
import Checkbox from '#lib/components/Checkbox.svelte';

import type { ContainerImage } from '#lib/world.svelte.ts';

import { signAndPush } from '../actions.ts';
import { peek, RHTAS, shortRef } from '../supply-chain.ts';

interface Props {
  image: ContainerImage;
  onclose: () => void;
}

let { image, onclose }: Props = $props();

const repo = $derived(image.name.replace(/^[^/]+\//, ''));
let registry = $state('quay.io');
let sign = $state(true);
let attachSbom = $state(true);
const identity = 'alice.dev@acme-corp.com';
const hasSbom = $derived(!!peek(image).sbom?.generated);
const destination = $derived(registry === 'localhost:5000' ? `localhost:5000/${repo}:${image.tag}` : `${registry}/${repo}:${image.tag}`);

function setRegistry(v: string): void {
  registry = v;
}

function submit(): void {
  signAndPush(image, { destination, sign, attachSbom: attachSbom && hasSbom, identity });
  onclose();
}
</script>

<Modal name="Sign and push image" {onclose}>
  <div class="flex items-center justify-between pl-4 pr-3 py-3 space-x-2 text-[var(--pd-modal-header-text)]">
    <h1 class="grow text-lg font-bold">Push {shortRef(image)}</h1>
    <CloseButton onclick={onclose} />
  </div>
  <div class="px-10 py-4 space-y-4 text-[var(--pd-modal-text)] w-[560px]">
    <div class="space-y-1">
      <label for="sp-registry" class="block text-sm font-semibold">Registry</label>
      <Dropdown
        id="sp-registry"
        ariaLabel="Registry"
        value={registry}
        onChange={setRegistry}
        options={[
          { value: 'quay.io', label: 'quay.io (acme organization)' },
          { value: 'localhost:5000', label: 'localhost:5000 (local registry)' },
        ]} />
      <div class="text-sm text-[var(--pd-content-sub-header)] font-mono break-all">{destination}</div>
    </div>
    <Checkbox bind:checked={sign} title="Sign after push">
      <span class="ml-1">Sign after push with Trusted Artifact Signer</span>
    </Checkbox>
    {#if sign}
      <div role="region" class="rounded-md bg-[var(--pd-content-card-inset-surface)] p-3 text-sm space-y-1" aria-label="Signing identity">
        <div>Keyless signing (cosign 3.1.3) – a browser window opens to sign in to <span class="font-mono">sso.acme-corp.com</span>.</div>
        <div class="grid grid-cols-[110px_1fr] gap-x-2">
          <span>Identity</span><span class="font-mono">{identity}</span>
          <span>OIDC issuer</span><span class="font-mono break-all">{RHTAS.oidcIssuer}</span>
          <span>Rekor</span><span class="font-mono break-all">{RHTAS.rekorUrl}</span>
        </div>
      </div>
      <Checkbox bind:checked={attachSbom} disabled={!hasSbom} disabledTooltip="Generate an SBOM first (SBOM tab)" title="Attach SBOM attestation">
        <span class="ml-1">Attach SBOM as an attestation{hasSbom ? '' : ' (no SBOM generated yet)'}</span>
      </Checkbox>
    {/if}
    <div class="space-y-1">
      <label for="sp-identity" class="block text-sm font-semibold">Signed-off by</label>
      <Input id="sp-identity" value={identity} readonly aria-label="Signer identity" />
    </div>
  </div>
  <div class="px-5 py-5 mt-2 flex flex-row w-full justify-end space-x-2">
    <Button type="link" onclick={onclose}>Cancel</Button>
    <Button onclick={submit}>{sign ? 'Push and sign' : 'Push'}</Button>
  </div>
</Modal>
