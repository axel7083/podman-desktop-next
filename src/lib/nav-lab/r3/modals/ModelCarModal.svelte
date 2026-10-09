<script lang="ts">
/** "Package as ModelCar": the OCI image built from the model weights (files under /models, KServe `oci://` storage). */
import { faBoxArchive } from '@fortawesome/free-solid-svg-icons';

import { MODELS, modelcarRef, packageModelCar } from '../ai.ts';
import CodeView from '../CodeView.svelte';
import { closeModal, flows } from '../flows.svelte.ts';
import Field from './Field.svelte';
import { INPUT } from './form.ts';
import Modal from './Modal.svelte';

const model = $derived(flows.modal?.data?.model ?? 'granite-3.3-8b-instruct');

function build(): void {
  const m = model;
  closeModal();
  packageModelCar(m);
}
</script>

<Modal title="Package as ModelCar" icon="icons/redhat.modelcar.png" sub="{model} · {MODELS[model]?.size}" primary="Build ModelCar" primaryIcon={faBoxArchive} onprimary={build} testid="modelcar">
  <Field label="Image" hint="Pushed to Quay next, then deployed on OpenShift AI with storageUri oci://…"><input class="{INPUT} font-mono" aria-label="Image" value={modelcarRef(model)} readonly /></Field>
  <Field label="Containerfile.modelcar">
    <div class="flex h-32 rounded-md overflow-hidden border border-[var(--pd-content-divider)]">
      <CodeView lines={['FROM registry.access.redhat.com/ubi9/ubi-micro:9.6', 'COPY --chown=1001:0 models /models', `LABEL org.opencontainers.image.title="${model}" com.redhat.modelcar=true`, 'USER 1001']} />
    </div>
  </Field>
</Modal>
