<script lang="ts">
/** Install an MCP server from its registry `packages[]` (OCI container or npm process). */
import { Button, Checkbox, Dropdown, Input } from '@podman-desktop/ui-svelte';

import Dialog from '#lib/components/Dialog.svelte';
import { navigate } from '#lib/nav.ts';

import { type McpServerEntry } from '../data.ts';
import { install, TOOL } from '../shared.ts';

interface Props {
  entry: McpServerEntry;
  onclose: () => void;
}

let { entry, onclose }: Props = $props();

// svelte-ignore state_referenced_locally
let pkgIndex = $state('0');
const pkg = $derived(entry.packages[Number(pkgIndex)]);
let kubeconfig = $state(true);
let readOnly = $state(true);
const isK8s = $derived(entry.name.includes('kubernetes'));

function setKube(v: boolean): void {
  kubeconfig = v;
}

function setRo(v: boolean): void {
  readOnly = v;
}

function go(): void {
  install(entry, pkg, { kubeconfig: isK8s && kubeconfig, readOnly }, id => navigate(`${TOOL}?server=${id}`));
  onclose();
}
</script>

<Dialog title="Install {entry.title}" {onclose}>
  {#snippet content()}
    <div class="flex flex-col gap-3 text-sm">
      <p class="font-mono text-xs">{entry.name} · {entry.version}</p>
      <label>Package
        <Dropdown class="mt-1" ariaLabel="Package" bind:value={pkgIndex} options={entry.packages.map((p, i) => ({ value: String(i), label: `${p.registryType === 'oci' ? 'Container (OCI)' : p.registryType} · ${p.identifier} · ${p.transport}` }))} />
      </label>
      {#if isK8s}
        <Checkbox checked={kubeconfig} onclick={setKube} title="Mount kubeconfig">Mount ~/.kube/config read-only</Checkbox>
        <Checkbox checked={readOnly} onclick={setRo} title="Read-only toolset">Read-only mode (no create, update or delete tools)</Checkbox>
      {/if}
      {#each pkg.env ?? [] as env (env.name)}
        <label>{env.name}{env.isRequired ? ' *' : ''}
          <Input class="mt-1" aria-label={env.name} type={env.isSecret ? 'password' : 'text'} placeholder={env.isSecret ? 'Stored as a Podman secret' : ''} />
        </label>
      {/each}
    </div>
  {/snippet}
  {#snippet buttons()}
    <Button type="link" onclick={onclose}>Cancel</Button>
    <Button onclick={go}>Install</Button>
  {/snippet}
</Dialog>
