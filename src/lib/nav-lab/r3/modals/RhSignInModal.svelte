<script lang="ts">
/**
 * Red Hat SSO sign-in (Red Hat Authentication extension): the browser flow
 * is simulated (sso.redhat.com, ~2 s), then the extension configures
 * registry.redhat.io (service account `podman-desktop`), reads the org's
 * subscriptions and activation keys. `data.then` = modal to reopen afterwards.
 */
import { faArrowUpRightFromSquare, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import Btn from '../Btn.svelte';
import { installExt } from '../exts.ts';
import { closeModal, flows, type ModalKind, openModal, signIn } from '../flows.svelte.ts';
import Modal from './Modal.svelte';

let phase = $state<'start' | 'browser' | 'configuring' | 'done'>(flows.account ? 'done' : 'start');
let step = $state(0);
const STEPS = ['Signed in to sso.redhat.com', 'Created registry service account podman-desktop', 'Added registry.redhat.io to Settings › Registries', 'Read subscriptions (2) and activation keys (4)'];

function start(): void {
  installExt('redhat-account');
  phase = 'browser';
  setTimeout(() => {
    signIn();
    phase = 'configuring';
    const t = setInterval(() => {
      step++;
      if (step >= STEPS.length) {
        clearInterval(t);
        phase = 'done';
      }
    }, 450);
  }, 1600);
}

function finish(): void {
  const then = flows.modal?.data?.then as ModalKind | undefined;
  if (then) openModal(then, flows.modal?.data);
  else closeModal();
}
</script>

<Modal title="Sign in with Red Hat" icon="icons/redhat.redhat-authentication.png" sub="Red Hat Authentication · single sign-on" primary={phase === 'start' ? 'Sign in with Red Hat' : phase === 'done' ? 'Done' : 'Waiting…'} disabled={phase === 'browser' || phase === 'configuring'} onprimary={phase === 'start' ? start : finish} testid="rh-signin">
  {#if phase === 'start'}
    <p class="text-[var(--pd-table-body-text)]">Podman Desktop opens <span class="font-mono text-[12px] text-[var(--pd-content-header)]">sso.redhat.com</span> in your browser. After you sign in, the Red Hat account extension:</p>
    <ul class="flex flex-col gap-1 pl-4 list-disc text-[var(--pd-content-header)]">
      <li>configures <span class="font-mono text-[12px]">registry.redhat.io</span> with a registry service account,</li>
      <li>registers RHEL Podman machines and VMs with an activation key,</li>
      <li>signs you in to the Developer Sandbox.</li>
    </ul>
    <p class="text-[12px] text-[var(--pd-table-body-text)]">No Red Hat account? <a class="hover:text-[var(--pd-link)] hover:underline" href="https://developers.redhat.com/register" target="_blank" rel="noreferrer">Create a free Red Hat Developer account <AppIcon icon={faArrowUpRightFromSquare} size="xs" /></a></p>
  {:else if phase === 'browser'}
    <div data-testid="rh-signin-browser" class="flex flex-col items-center gap-3 py-6 text-center">
      <span class="text-[20px] text-[var(--pd-table-body-text)]"><AppIcon icon={faSpinner} class="animate-spin" /></span>
      <div class="text-[14px] font-semibold text-[var(--pd-content-header)]">Continue in your browser</div>
      <div class="text-[var(--pd-table-body-text)]">Waiting for sso.redhat.com… <span class="font-mono text-[12px]">https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/auth</span></div>
      <Btn onclick={(): void => undefined}>Copy sign-in link</Btn>
    </div>
  {:else}
    <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--pd-content-card-bg)]">
      <span class="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white bg-[#ee0000]">AD</span>
      <div class="flex-1 min-w-0">
        <div class="text-[13px] font-semibold text-[var(--pd-content-header)]">{flows.account?.name}</div>
        <div class="text-[12px] text-[var(--pd-table-body-text)]">{flows.account?.email} · org {flows.account?.org}</div>
      </div>
    </div>
    <ul data-testid="rh-signin-steps" class="flex flex-col gap-1.5">
      {#each STEPS as s, i (s)}
        <li class="flex items-center gap-2" class:opacity-40={phase !== 'done' && i >= step}>
          <span class="w-4 flex justify-center text-[12px]">{#if phase === 'done' || i < step}<AppIcon icon={faCheck} class="text-[var(--pd-status-running)]" />{:else if i === step}<AppIcon icon={faSpinner} class="animate-spin" />{/if}</span>{s}
        </li>
      {/each}
    </ul>
  {/if}
</Modal>
