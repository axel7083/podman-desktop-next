<script lang="ts">
/**
 * "Deploy to…": target cluster (Developer Sandbox, OpenShift Local, minc,
 * kind) and the generated Deployment / Service / Route (Ingress on kind).
 * The Developer Sandbox needs the Red Hat account (sign in inline).
 */
import { faRocket } from '@fortawesome/free-solid-svg-icons';

import { conn, resource } from '../../data.ts';
import Btn from '../Btn.svelte';
import { appName, DEPLOY_TARGETS, deployTo, hostFor, manifests, pushedRef } from '../chain.ts';
import CodeView from '../CodeView.svelte';
import { installExt } from '../exts.ts';
import { closeModal, flows, openModal } from '../flows.svelte.ts';
import { connStatus } from '../live.svelte.ts';
import Choice from './Choice.svelte';
import Field from './Field.svelte';
import Modal from './Modal.svelte';

const r = $derived(resource(flows.modal?.data?.resId));
// svelte-ignore state_referenced_locally
let target = $state(flows.modal?.data?.target ?? 'openshift-local');
const t = $derived(DEPLOY_TARGETS.find(x => x[0] === target) ?? DEPLOY_TARGETS[1]);
const app = $derived(appName(r?.name ?? 'app'));
const image = $derived(r ? (pushedRef(r.name) ?? r.name) : '');
const needsSignIn = $derived(target === 'sandbox' && !flows.account);
const yaml = $derived(manifests(app, image, t[2], t[3], hostFor(app, target, t[2])));

function deploy(): void {
  const res = r;
  if (!res) return;
  if (target === 'sandbox') installExt('sandbox');
  closeModal();
  deployTo(res, target);
}
</script>

<Modal title="Deploy to…" icon={faRocket} sub={image} primary="Deploy" primaryIcon={faRocket} disabled={!r || needsSignIn} onprimary={deploy} testid="deploy" width="44rem">
  <Field label="Target">
    <Choice
      testid="deploy-target"
      value={[target]}
      onchange={(v): void => void (target = v[0])}
      options={DEPLOY_TARGETS.map(([id, label, ns]) => ({ id, label, sub: `${conn(id)?.product ?? label} · namespace ${ns} · ${id === 'sandbox' && !flows.account ? 'sign in required' : connStatus(conn(id))}`, icon: conn(id)?.icon }))} />
  </Field>
  {#if needsSignIn}
    <div data-testid="deploy-signin" class="flex items-center gap-3 p-3 rounded-lg bg-[var(--pd-content-card-bg)]">
      <span class="flex-1 text-[var(--pd-table-body-text)]">The Developer Sandbox is free hosted OpenShift for 30 days: sign in with your Red Hat account to use it.</span>
      <Btn icon="icons/redhat.redhat-authentication.png" testid="deploy-signin-btn" onclick={(): void => openModal('rh-signin', { then: 'deploy', resId: r?.id ?? '', target: 'sandbox' })}>Sign in with Red Hat</Btn>
    </div>
  {/if}
  {#if !pushedRef(r?.name ?? '') && target !== 'kind-dev'}
    <div class="text-[12px] text-[var(--pd-table-body-text)]">This image is not pushed to a registry yet: the cluster pulls <span class="font-mono">{image}</span>. Push it to Quay first for a remote cluster.</div>
  {/if}
  <Field label="Generated resources · Deployment, Service, {t[3]}">
    <div class="flex h-56 rounded-md overflow-hidden border border-[var(--pd-content-divider)]"><CodeView lines={yaml} lang="yaml" testid="deploy-yaml" /></div>
  </Field>
</Modal>
