<script lang="ts">
/** SSH terminal of a RHEL VM / RHEL Podman machine (VmProviderConnection.shellAccess). */
import { EmptyScreen } from '@podman-desktop/ui-svelte';
import { faTerminal } from '@fortawesome/free-solid-svg-icons';

import Terminal from '#lib/details/Terminal.svelte';
import type { ResourceContext } from '#lib/ext/types.ts';

import { registrationOf } from '../../rhel-registration/store.ts';
import { rhelTerminal } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const conn = $derived(ctx.conn);
const release = $derived((conn.capabilities ?? []).find(c => c.startsWith('rhel:'))?.slice(5) ?? '10.2');
const registered = $derived(registrationOf(conn.id)?.status === 'Current');
const answers = $derived(rhelTerminal(conn.name, release, registered));
const user = $derived(conn.kind === 'vm' ? 'core' : 'user');
</script>

{#if conn.status !== 'started'}
  <EmptyScreen icon={faTerminal} title="{conn.name} is not running" message="Start {conn.name} to open an SSH session." />
{:else}
  {#key conn.id + registered}
    <Terminal
      prompt="[{user}@{conn.name} ~]$ "
      {answers}
      banner={`Connected to ${conn.name} (${conn.kind === 'vm' ? `macadam ssh ${conn.name}` : `podman machine ssh ${conn.name}`})\nTry: cat /etc/redhat-release · sudo subscription-manager status · sudo dnf repolist · podman version\n`} />
  {/key}
{/if}
