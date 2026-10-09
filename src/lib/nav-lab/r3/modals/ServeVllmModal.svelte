<script lang="ts">
/**
 * "Serve with Red Hat AI Inference (vLLM)": GPU check (CDI device, VRAM vs
 * model size), max context, quantization; the vLLM image comes from
 * registry.redhat.io (Red Hat account).
 */
import { faPlay } from '@fortawesome/free-solid-svg-icons';

import Btn from '../Btn.svelte';
import { GPU, MODELS, serveVllm, VLLM_IMAGE } from '../ai.ts';
import { closeModal, flows, openModal } from '../flows.svelte.ts';
import Choice from './Choice.svelte';
import Field from './Field.svelte';
import { CHIP, DOT, INPUT } from './form.ts';
import Modal from './Modal.svelte';

const model = $derived(flows.modal?.data?.model ?? 'granite-3.3-8b-instruct');
let maxLen = $state('16384');
let quant = $state('none');
const needsSignIn = $derived(!flows.account);
const checks = $derived<[string, 'pass' | 'warn', string][]>([
  ['GPU', 'pass', `${GPU.name} · ${GPU.vram} · driver ${GPU.driver}`],
  ['CDI', 'pass', `${GPU.cdi} (nvidia-ctk cdi list)`],
  ['Memory', quant === 'fp8' ? 'pass' : 'warn', quant === 'fp8' ? 'FP8: ~9 GB weights + KV cache fits in 24 GB' : 'BF16: ~16.4 GB weights, 7 GB left for KV cache'],
]);

function serve(): void {
  const m = model;
  closeModal();
  serveVllm(m, { maxLen, quant });
}
</script>

<Modal title="Serve with Red Hat AI Inference Server" icon="icons/redhat.ai-inference-server.png" sub="{model} · {MODELS[model]?.params} · vLLM" primary="Serve" primaryIcon={faPlay} disabled={needsSignIn} onprimary={serve} testid="serve-vllm">
  <Field label="GPU check">
    <div data-testid="gpu-check" class="flex flex-col gap-1.5">
      {#each checks as [k, g, v] (k)}
        <div class="flex items-center gap-2"><span data-gate={g} class="flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[12px] {CHIP[g]}"><span class="w-1.5 h-1.5 rounded-full {DOT[g]}"></span>{k}</span><span class="text-[12px] text-[var(--pd-table-body-text)]">{v}</span></div>
      {/each}
    </div>
  </Field>
  <Field label="Quantization">
    <Choice
      value={[quant]}
      onchange={(v): void => void (quant = v[0])}
      options={[
        { id: 'none', label: 'None (BF16)', sub: 'Best quality' },
        { id: 'fp8', label: 'FP8 dynamic', sub: 'Half the memory, ~1% quality loss' },
      ]} />
  </Field>
  <div class="grid grid-cols-2 gap-3">
    <Field label="Max context (tokens)"><select class={INPUT} aria-label="Max context" bind:value={maxLen}>{#each ['4096', '8192', '16384', '32768'] as v (v)}<option value={v}>{v}</option>{/each}</select></Field>
    <Field label="Endpoint"><input class="{INPUT} font-mono" aria-label="Endpoint" value="http://localhost:8000/v1" readonly /></Field>
  </div>
  <div class="text-[12px] text-[var(--pd-table-body-text)]">Image <span class="font-mono">{VLLM_IMAGE}</span></div>
  {#if needsSignIn}
    <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--pd-content-card-bg)]">
      <span class="flex-1 text-[var(--pd-table-body-text)]">The AI Inference Server image is on registry.redhat.io: sign in with your Red Hat account.</span>
      <Btn icon="icons/redhat.redhat-authentication.png" onclick={(): void => openModal('rh-signin', { then: 'serve-vllm', model })}>Sign in with Red Hat</Btn>
    </div>
  {/if}
</Modal>
