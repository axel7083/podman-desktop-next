<script lang="ts">
/** Host of the P13 flow modals (one open at a time, `flows.modal`). */
import { flows } from '../r3/flows.svelte.ts';
import AddConnectionModal from '../r3/modals/AddConnectionModal.svelte';
import BootVmModal from '../r3/modals/BootVmModal.svelte';
import BuildDiskModal from '../r3/modals/BuildDiskModal.svelte';
import DeployModal from '../r3/modals/DeployModal.svelte';
import DeployRhoaiModal from '../r3/modals/DeployRhoaiModal.svelte';
import ModelCarModal from '../r3/modals/ModelCarModal.svelte';
import PushQuayModal from '../r3/modals/PushQuayModal.svelte';
import RhelMachineModal from '../r3/modals/RhelMachineModal.svelte';
import RhSignInModal from '../r3/modals/RhSignInModal.svelte';
import RunVirtModal from '../r3/modals/RunVirtModal.svelte';
import ServeVllmModal from '../r3/modals/ServeVllmModal.svelte';

const MODALS = {
  'rh-signin': RhSignInModal,
  'add-connection': AddConnectionModal,
  'rhel-machine': RhelMachineModal,
  'build-disk': BuildDiskModal,
  'boot-vm': BootVmModal,
  'run-virt': RunVirtModal,
  'push-quay': PushQuayModal,
  deploy: DeployModal,
  'serve-vllm': ServeVllmModal,
  modelcar: ModelCarModal,
  'deploy-rhoai': DeployRhoaiModal,
};

const M = $derived(flows.modal ? MODALS[flows.modal.kind] : undefined);
</script>

{#if M}
  {#key flows.modal}<M />{/key}
{/if}
