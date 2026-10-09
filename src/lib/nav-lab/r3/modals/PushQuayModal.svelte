<script lang="ts">
/**
 * "Push to Quay" (Quay + Trusted Artifact Signer): repository, tag, keyless
 * signing with RHTAS, and the gates of the image (Grype vulnerabilities,
 * Image checker for OpenShift) shown as pass / warn chips before pushing.
 */
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';

import { resource } from '../../data.ts';
import { grypeGate, imageTag, openshiftGate, pushToQuay, quayRepo } from '../chain.ts';
import { closeModal, flows } from '../flows.svelte.ts';
import Field from './Field.svelte';
import { CHIP, DOT, INPUT } from './form.ts';
import Modal from './Modal.svelte';

const r = $derived(resource(flows.modal?.data?.resId));
// svelte-ignore state_referenced_locally
let repo = $state(quayRepo(resource(flows.modal?.data?.resId)?.name ?? 'app'));
// svelte-ignore state_referenced_locally
let tag = $state(imageTag(resource(flows.modal?.data?.resId)?.name ?? 'latest'));
let sign = $state(true);
const gates = $derived(r ? [['Grype', ...grypeGate(r.name)], ['OpenShift checks', ...openshiftGate(r.name)]] : []);
const blocked = $derived(gates.some(g => g[1] === 'fail'));

function push(): void {
  const res = r;
  if (!res) return;
  closeModal();
  pushToQuay(res, { repo, tag, sign });
}
</script>

<Modal title="Push to Quay" icon="icons/redhat.quay.png" sub={r?.name} primary={sign ? 'Push and sign' : 'Push'} primaryIcon={faArrowUp} disabled={!r || !repo} onprimary={push} testid="push-quay">
  <div class="grid grid-cols-[2fr_1fr] gap-3">
    <Field label="Repository" hint="quay.io organization acme · robot acme+ci_push"><input class="{INPUT} font-mono" aria-label="Repository" bind:value={repo} /></Field>
    <Field label="Tag"><input class="{INPUT} font-mono" aria-label="Tag" bind:value={tag} /></Field>
  </div>
  <label class="flex items-start gap-2 p-3 rounded-lg bg-[var(--pd-content-card-bg)]">
    <input type="checkbox" class="mt-0.5" data-testid="push-sign" bind:checked={sign} />
    <span class="flex-1">
      <span class="block font-medium text-[var(--pd-content-header)]">Sign with Trusted Artifact Signer</span>
      <span class="block text-[12px] text-[var(--pd-table-body-text)]">Keyless cosign signature: Fulcio certificate for {flows.account?.email ?? 'your SSO identity'}, recorded in the Rekor transparency log.</span>
    </span>
  </label>
  <Field label="Gates" hint={blocked ? 'A critical vulnerability was found: rebuild on a Hummingbird hardened image before shipping, or push anyway.' : undefined}>
    <div data-testid="push-gates" class="flex flex-wrap gap-2">
      {#each gates as [name, gate, summary] (name)}
        <span data-gate={gate} class="flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[12px] {CHIP[gate as 'pass']}"><span class="w-1.5 h-1.5 rounded-full {DOT[gate as 'pass']}"></span>{name}: {summary}</span>
      {/each}
    </div>
  </Field>
</Modal>
