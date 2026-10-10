<script lang="ts" module>
/** Wizard draft, kept while the Red Hat sign-in modal is shown in between. */
const draft = $state({ release: '10.2', source: 'official', provider: 'wsl', cpus: '4', memory: '8', disk: '100', register: true, key: 'podman-desktop', name: '' });
</script>

<script lang="ts">
/**
 * RHEL Podman machine wizard (RHEL VMs extension `connectionFactories`, with
 * Red Hat Authentication): release, image source, provider (Hyper-V has no
 * official image: real `provider hyperv is not supported` error + fixes),
 * resources, activation-key registration. Create runs a task (download →
 * verify sha256 → podman machine init --image → start → subscription-manager
 * register) and adds the connection to the switcher as the current one.
 */
import { faCircleExclamation, faPlusCircle } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { EXT, engineSections } from '../../data.ts';
import Btn from '../Btn.svelte';
import { ACTIVATION_KEYS, addConnection, closeModal, flows, openModal, runTask, sha } from '../flows.svelte.ts';
import { live } from '../live.svelte.ts';
import Choice from './Choice.svelte';
import Field from './Field.svelte';
import { INPUT } from './form.ts';
import Modal from './Modal.svelte';

const name = $derived(draft.name || `rhel-${draft.release.replace('.', '-')}`);
const hyperv = $derived(draft.provider === 'hyperv' && draft.source === 'official');
const needsSignIn = $derived(!flows.account && (draft.source === 'official' || draft.register));
const file = $derived(`rhel${draft.release.split('.')[0]}.${draft.provider === 'wsl' ? 'tar.gz' : 'qcow2'}`);

function create(): void {
  const d = { ...draft };
  const id = name;
  const release = `RHEL ${d.release}`;
  const provider = { wsl: 'WSL', hyperv: 'Hyper-V', applehv: 'applehv' }[d.provider] ?? d.provider;
  const src = d.source === 'official' ? `api.access.redhat.com/management/v1/images/${sha(file, 64)}/download` : 'Image Builder compose rhel-wsl-podman (succeeded 2 hours ago)';
  const path = d.provider === 'wsl' ? `C:\\Users\\alice\\AppData\\Roaming\\Podman Desktop\\extensions-storage\\redhat.rhel-vms\\images\\${file}` : `~/.local/share/containers/podman-desktop/extensions-storage/redhat.rhel-vms/images/${file}`;
  const key = d.key;
  const register = d.register;
  closeModal();
  runTask({
    title: `Create ${id}`,
    connId: 'podman-machine-default',
    icon: 'icons/redhat.rhel-registration.png',
    label: 'Create RHEL Podman machine',
    cmd: `Create RHEL Podman machine ${id} (${release} · ${provider})`,
    lines: [
      `[1/5] Download ${file} from ${src}`,
      `      ${d.provider === 'wsl' ? '861' : '1085'} MB ████████████████████ 100%`,
      `[2/5] Verify sha256 ${sha(file, 8)}…${sha(file + 'x', 4)} ✔`,
      `[3/5] podman machine init --image ${path} --cpus ${d.cpus} --memory ${Number(d.memory) * 1024} --disk-size ${d.disk} ${id}`,
      'Machine init complete',
      `[4/5] podman machine start ${id}`,
      `Machine "${id}" started successfully`,
      ...(register
        ? [`[5/5] podman machine ssh ${id} sudo subscription-manager register --force --activationkey ${key} --org ${flows.account?.org ?? '19830412'}`, `The system has been registered with ID: ${sha(id, 8)}-${sha(id + 'a', 4)}-4f6e-9d3c-${sha(id + 'b', 12)}`, 'The registered system name is: ' + id]
        : ['[5/5] Skipped subscription registration']),
      `✔ ${id} is ready (${release} · Podman 5.6 · ${register ? 'subscribed' : 'not registered'})`,
    ],
    done: () => {
      addConnection({
        id,
        engine: 'podman',
        name: id,
        group: 'Engines',
        product: `RHEL Podman (${provider})`,
        detail: `${release} · ${provider} · ${d.cpus} CPU · ${d.memory} GB${register ? ' · subscribed' : ''}`,
        icon: 'icons/redhat.rhel-registration.png',
        status: 'running',
        color: '#e5421d',
        initials: 'R' + d.release.split('.')[0],
        sections: engineSections(0, 0, 0, [{ id: 'subscription', label: 'Subscription', icon: 'icons/redhat.rhel-registration.png', count: register ? 1 : 0, ext: EXT.rhel }]),
      });
      if (register) {
        flows.registered[id] = key;
        ACTIVATION_KEYS.find(k => k.name === key)?.usedBy.push(id);
      }
      live.status[`conn:${id}`] = 'running';
    },
  });
}
</script>

<Modal title="Create a RHEL Podman machine" icon="icons/redhat.rhel-registration.png" sub="RHEL VMs extension · Podman engine on RHEL, registered with your subscription" primary="Create" primaryIcon={faPlusCircle} disabled={hyperv || needsSignIn} onprimary={create} testid="rhel-machine" width="40rem">
  <Field label="Name"><input class={INPUT} aria-label="Name" placeholder={name} bind:value={draft.name} /></Field>
  <Field label="Release">
    <Choice
      testid="rhel-release"
      value={[draft.release]}
      onchange={(v): void => void (draft.release = v[0])}
      options={[
        { id: '10.2', label: 'RHEL 10.2', sub: 'Latest · kernel 6.12' },
        { id: '9.8', label: 'RHEL 9.8', sub: 'Extended update support until 2032' },
      ]} />
  </Field>
  <Field label="Image source">
    <Choice
      testid="rhel-source"
      value={[draft.source]}
      onchange={(v): void => void (draft.source = v[0])}
      options={[
        { id: 'official', label: 'Official RHEL image', sub: 'Downloaded from Red Hat (sign-in required)', icon: 'icons/redhat.rhel-registration.png' },
        { id: 'compose', label: 'Image Builder compose', sub: 'Blueprint rhel-wsl-podman · built 2 hours ago', icon: 'icons/redhat.image-builder.png' },
      ]} />
  </Field>
  <Field label="Provider">
    <Choice
      testid="rhel-provider"
      cols={3}
      value={[draft.provider]}
      onchange={(v): void => void (draft.provider = v[0])}
      options={[
        { id: 'wsl', label: 'WSL', sub: 'Windows Subsystem for Linux 2' },
        { id: 'hyperv', label: 'Hyper-V', sub: 'Windows Pro / Enterprise' },
        { id: 'applehv', label: 'applehv', sub: 'macOS (Apple silicon)' },
      ]} />
  </Field>
  {#if hyperv}
    <div data-testid="rhel-hyperv-error" class="flex gap-2 p-3 rounded-lg bg-[color-mix(in_srgb,var(--pd-status-dead)_12%,transparent)]">
      <span class="pt-0.5 text-[var(--pd-status-dead)]"><AppIcon icon={faCircleExclamation} /></span>
      <div class="flex-1 flex flex-col gap-2">
        <div class="text-[var(--pd-content-header)]"><span class="font-mono text-[12px]">Error: provider hyperv is not supported</span> — Red Hat does not publish an official RHEL image for Hyper-V.</div>
        <div class="flex gap-2">
          <Btn testid="rhel-fix-wsl" onclick={(): void => void (draft.provider = 'wsl')}>Use WSL instead</Btn>
          <Btn testid="rhel-fix-compose" onclick={(): void => void (draft.source = 'compose')}>Use an Image Builder compose (vhdx)</Btn>
        </div>
      </div>
    </div>
  {/if}
  <div class="grid grid-cols-3 gap-3">
    <Field label="CPUs">
      <select class={INPUT} aria-label="CPUs" bind:value={draft.cpus}>{#each ['2', '4', '6', '8'] as v (v)}<option value={v}>{v}</option>{/each}</select>
    </Field>
    <Field label="Memory">
      <select class={INPUT} aria-label="Memory" bind:value={draft.memory}>{#each ['4', '8', '16'] as v (v)}<option value={v}>{v} GB</option>{/each}</select>
    </Field>
    <Field label="Disk size">
      <select class={INPUT} aria-label="Disk size" bind:value={draft.disk}>{#each ['50', '100', '200'] as v (v)}<option value={v}>{v} GB</option>{/each}</select>
    </Field>
  </div>
  <Field label="Subscription" hint={flows.account ? `Signed in as ${flows.account.email} · org ${flows.account.org}` : undefined}>
    <label class="flex items-center gap-2 text-[13px] text-[var(--pd-content-header)]"><input type="checkbox" bind:checked={draft.register} /> Register with an activation key (subscription-manager)</label>
    {#if flows.account && draft.register}
      <select class={INPUT} aria-label="Activation key" bind:value={draft.key}>
        {#each ACTIVATION_KEYS as k (k.name)}<option value={k.name}>{k.name} · {k.role} · {k.usage}</option>{/each}
      </select>
    {/if}
  </Field>
  {#if needsSignIn}
    <div data-testid="rhel-signin-needed" class="flex items-center gap-3 p-3 rounded-lg bg-[var(--pd-content-card-bg)]">
      <span class="flex-1 text-[var(--pd-table-body-text)]">Sign in with your Red Hat account to download the official image and register the machine.</span>
      <Btn icon="icons/redhat.redhat-authentication.png" testid="rhel-signin" onclick={(): void => openModal('rh-signin', { then: 'rhel-machine' })}>Sign in with Red Hat</Btn>
    </div>
  {/if}
</Modal>
