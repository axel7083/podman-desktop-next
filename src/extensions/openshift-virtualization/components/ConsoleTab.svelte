<script lang="ts">
/** VirtualMachine › Console (P14): serial console (virtctl console) mock. */
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen } from '@podman-desktop/ui-svelte';

import type { ResourceContext } from '#lib/ext/types.ts';
import type { KubeObject } from '#lib/world.svelte.ts';

import { setVm } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();
const vm = $derived(ctx.resource as KubeObject);
const st = $derived(String(vm.status?.printableStatus ?? ''));
const os = $derived(String(vm.status?.guestOS ?? 'Red Hat Enterprise Linux 9.6 (Plow)'));
const kernel = $derived(os.includes('10.') ? '6.12.0-55.el10.x86_64' : '5.14.0-570.12.1.el9_6.x86_64');

function start(): void {
  setVm(ctx.conn.id, vm.metadata.uid, 'Starting');
  setTimeout(() => setVm(ctx.conn.id, vm.metadata.uid, 'Running', { nodeName: 'worker-0.ocp-dev.acme.internal', ipAddress: '10.129.0.77' }), 2000);
}
</script>

{#if st === 'Running' || st === 'Migrating'}
  <div class="h-full p-4 bg-[var(--pd-terminal-background)]" role="log" aria-label="Serial console">
    <pre class="font-mono text-sm text-[var(--pd-terminal-foreground)] whitespace-pre-wrap">Successfully connected to {vm.metadata.name} console. The escape sequence is ^]

{os}
Kernel {kernel} on an x86_64

Activate the web console with: systemctl enable --now cockpit.socket

{vm.metadata.name} login: <span class="animate-pulse">▌</span></pre>
  </div>
{:else if st === 'Starting' || st === 'Provisioning' || st === 'Stopping'}
  <EmptyScreen title="{vm.metadata.name} is {st.toLowerCase()}…" message="The serial console connects once the VirtualMachineInstance is running." />
{:else}
  <EmptyScreen title="{vm.metadata.name} is {st === 'Stopped' ? 'stopped' : st}" message={st === 'ErrImagePull' ? 'The containerDisk image cannot be pulled: add a pull secret for quay.io/containerdisks to the namespace.' : 'Start the VM to open its serial console.'}>
    {#if st === 'Stopped'}<Button icon={faPlay} onclick={start}>Start VM</Button>{/if}
  </EmptyScreen>
{/if}
