<script lang="ts">
/**
 * "Add connection" from the connection switcher: one card per connection
 * factory contributed by the engines and extensions (grouped like the
 * switcher). RHEL Podman machine opens its wizard; the others the generic form.
 */
import { lab } from '../../lab.svelte.ts';
import LabIcon from '../../ui/LabIcon.svelte';
import { ext, installExt, isInstalled } from '../exts.ts';
import { closeModal, openModal } from '../flows.svelte.ts';
import Modal from './Modal.svelte';

/** [id, group, label, description, icon, extension providing it]. */
const FACTORIES: [string, string, string, string, string, string][] = [
  ['podman-machine', 'Engines', 'Podman machine', 'Fedora CoreOS VM running Podman', 'icons/podman-desktop.podman.png', 'podman'],
  ['rhel-machine', 'Engines', 'RHEL Podman machine', 'Podman on RHEL 10 / 9, registered with your subscription', 'icons/redhat.rhel-registration.png', 'rhel'],
  ['wslc', 'Engines', 'WSL containers', 'wslc engine (Windows)', 'icons/podman-desktop.wslc.png', 'wslc'],
  ['kind', 'Kubernetes', 'Kind cluster', 'Kubernetes in Podman containers', 'icons/podman-desktop.kind.png', 'kind'],
  ['minc', 'Kubernetes', 'MicroShift (minc)', 'Lightweight OpenShift in a container', 'icons/minc-org.minc.png', 'minc'],
  ['openshift-local', 'Kubernetes', 'OpenShift Local', 'Single-node OpenShift 4.20 VM (CRC)', 'icons/redhat.openshift-local.png', 'openshift-local'],
  ['sandbox', 'Kubernetes', 'Developer Sandbox', 'Free hosted OpenShift, sign in with Red Hat', 'icons/redhat.redhat-sandbox.png', 'sandbox'],
  ['rhel-vm', 'Other', 'RHEL VM', 'RHEL 10 virtual machine (libkrun / Hyper-V)', 'icons/redhat.rhel-vms.png', 'rhel-vms'],
];

function pick(id: string, label: string, extId: string): void {
  installExt(extId);
  if (id === 'rhel-machine') openModal('rhel-machine');
  else {
    closeModal();
    lab.openCreate(`New ${label}`);
  }
}
</script>

<Modal title="Add connection" sub="Engines, Kubernetes clusters and VMs provided by your extensions" testid="add-connection">
  {#each ['Engines', 'Kubernetes', 'Other'] as g (g)}
    <div class="flex flex-col gap-2">
      <div class="text-[11px] font-semibold uppercase tracking-wide text-[var(--pd-nav-group-header)]">{g}</div>
      <div class="grid grid-cols-2 gap-2">
        {#each FACTORIES.filter(x => x[1] === g) as [id, , label, desc, icon, extId] (id)}
          <button type="button" data-factory={id} class="flex items-start gap-2.5 p-3 rounded-lg border border-[var(--pd-content-divider)] text-left hover:bg-[var(--pd-action-button-details-bg)]" onclick={(): void => pick(id, label, extId)}>
            <LabIcon {icon} size={20} />
            <span class="flex-1 min-w-0">
              <span class="block text-[13px] font-semibold text-[var(--pd-content-header)]">{label}</span>
              <span class="block text-[12px] text-[var(--pd-table-body-text)]">{desc}</span>
              {#if !isInstalled(extId)}<span class="block pt-1 text-[11px] text-[var(--pd-table-body-text)]">Installs the {ext(extId)?.name} extension</span>{/if}
            </span>
          </button>
        {/each}
      </div>
    </div>
  {/each}
</Modal>
