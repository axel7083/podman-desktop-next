<script lang="ts">
/** "Deploy to OpenShift AI": KServe InferenceService on rhoai-dev serving the pushed ModelCar with the vLLM runtime. */
import { faRocket } from '@fortawesome/free-solid-svg-icons';

import { deployRhoai, isvcName, modelcarRef, RHOAI, RHOAI_NS } from '../ai.ts';
import { pushedRef } from '../chain.ts';
import CodeView from '../CodeView.svelte';
import { closeModal, flows } from '../flows.svelte.ts';
import Field from './Field.svelte';
import { INPUT } from './form.ts';
import Modal from './Modal.svelte';

const model = $derived(flows.modal?.data?.model ?? 'granite-3.3-8b-instruct');
const ref = $derived(pushedRef(modelcarRef(model)) ?? modelcarRef(model));
let runtime = $state('vLLM NVIDIA GPU ServingRuntime for KServe');
let gpus = $state('1');

function deploy(): void {
  const m = model;
  closeModal();
  deployRhoai(m, { ns: RHOAI_NS, runtime, gpus });
}
</script>

<Modal title="Deploy to OpenShift AI" icon="icons/redhat.openshift-ai.png" sub="{RHOAI} · project {RHOAI_NS}" primary="Deploy" primaryIcon={faRocket} onprimary={deploy} testid="deploy-rhoai" width="40rem">
  <div class="grid grid-cols-2 gap-3">
    <Field label="Serving runtime">
      <select class={INPUT} aria-label="Serving runtime" bind:value={runtime}>
        <option>vLLM NVIDIA GPU ServingRuntime for KServe</option>
        <option>vLLM Intel Gaudi ServingRuntime for KServe</option>
        <option>OpenVINO Model Server</option>
      </select>
    </Field>
    <Field label="Accelerators"><select class={INPUT} aria-label="Accelerators" bind:value={gpus}>{#each ['1', '2'] as v (v)}<option value={v}>{v} × nvidia.com/gpu</option>{/each}</select></Field>
  </div>
  {#if !pushedRef(modelcarRef(model))}<div class="text-[12px] text-[var(--pd-table-body-text)]">The ModelCar is not pushed yet: push it to Quay so the cluster can pull it.</div>{/if}
  <Field label="InferenceService">
    <div class="flex h-48 rounded-md overflow-hidden border border-[var(--pd-content-divider)]">
      <CodeView
        lang="yaml"
        lines={['apiVersion: serving.kserve.io/v1beta1', 'kind: InferenceService', 'metadata:', `  name: ${isvcName(model)}`, `  namespace: ${RHOAI_NS}`, '  annotations: { serving.kserve.io/deploymentMode: RawDeployment }', 'spec:', '  predictor:', '    model:', '      modelFormat: { name: vLLM }', '      runtime: vllm-cuda-runtime', `      storageUri: oci://${ref}`, `      resources: { limits: { nvidia.com/gpu: "${gpus}" } }`]} />
    </div>
  </Field>
</Modal>
