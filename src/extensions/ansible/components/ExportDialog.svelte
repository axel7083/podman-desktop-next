<script lang="ts">
/**
 * "Export as Ansible…" (P14 menu + new generator kind): turns the selected
 * container or pod into a containers.podman 1.21.0 playbook, recomputed live
 * from the real world objects (name, image, ports, env, labels, pod).
 */
import { faCopy, faFloppyDisk, faPlay, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown } from '@podman-desktop/ui-svelte';
import Checkbox from '#lib/components/Checkbox.svelte';
import Fa from 'svelte-fa';

import AppIcon from '#lib/components/AppIcon.svelte';
import { toast, world } from '#lib/world.svelte.ts';

import { runPlaybook } from '../actions.ts';
import { exportYaml, type ExportMode, hasSecrets, isInfra, store } from '../data.ts';
import PdModal from './PdModal.svelte';

interface Props {
  podId?: string;
  containerIds: string[];
  onclose: () => void;
}

let { podId, containerIds, onclose }: Props = $props();

const pod = $derived(podId ? world.pods.find(p => p.id === podId) : undefined);
const containers = $derived(world.containers.filter(c => containerIds.includes(c.id)));
const members = $derived(containers.filter(c => !isInfra(c)));
const secretsFound = $derived(hasSecrets(containers));

// svelte-ignore state_referenced_locally
let mode = $state<ExportMode>(podId ? 'quadlet' : 'container');
let hosts = $state('app_hosts');
let includePull = $state(true);
// svelte-ignore state_referenced_locally
let vaultSecrets = $state(hasSecrets(world.containers.filter(c => containerIds.includes(c.id))));

const yaml = $derived(exportYaml({ pod, containers }, { mode, hosts, includePull, vaultSecrets }));
const fileName = $derived(pod ? `deploy-${pod.name}.yml` : `deploy-${members[0]?.name ?? 'containers'}.yml`);
const title = $derived(`Export ${pod ? `pod ${pod.name}` : `container ${members[0]?.name ?? ''}`} as Ansible`);

const MODES: { id: ExportMode; label: string; hint: string }[] = [
  { id: 'container', label: 'Container tasks', hint: 'podman_container state: started' },
  { id: 'quadlet', label: 'Quadlet', hint: 'state: quadlet → systemd units' },
  { id: 'system-role', label: 'System role', hint: 'redhat.rhel_system_roles.podman' },
];

function setMode(m: ExportMode): void {
  mode = m;
}

function onHosts(v: string): void {
  hosts = v;
}

function onPull(checked: boolean): void {
  includePull = checked;
}

function onVault(checked: boolean): void {
  vaultSecrets = checked;
}

function copy(): void {
  navigator.clipboard
    ?.writeText(yaml)
    .then(() => toast({ type: 'success', title: 'Playbook copied to clipboard' }))
    .catch(() => toast({ type: 'success', title: 'Playbook copied to clipboard' }));
}

function save(): void {
  const { projects } = store();
  const ops = projects.find(p => p.fqcn === 'acme.ops');
  const name = pod?.name === 'orders' ? 'deploy-orders.yml' : fileName;
  if (ops && !ops.playbooks.includes(name)) ops.playbooks.push(name);
  toast({ type: 'success', title: `Saved to ~/dev/ops-playbooks/${name}`, body: vaultSecrets && secretsFound ? 'Add the vault variables with ansible-vault edit group_vars/all/vault.yml' : undefined });
}

function runNavigator(): void {
  runPlaybook('deploy-orders.yml', hosts === 'localhost' ? 'localhost,' : 'inventory.yml', store().settings.navigatorEe);
  onclose();
}
</script>

<PdModal {title} {onclose} wide>
  {#snippet icon()}<AppIcon icon="icons/redhat.ansible.png" size="20px" />{/snippet}
  {#snippet content()}
    <div class="grid grid-cols-[17rem_minmax(0,1fr)] gap-5">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <span class="font-semibold">Output</span>
          <div class="flex flex-col rounded-md border border-[var(--pd-content-table-border)] overflow-hidden" role="radiogroup" aria-label="Export mode">
            {#each MODES as m (m.id)}
              <button
                role="radio"
                aria-checked={mode === m.id}
                onclick={setMode.bind(undefined, m.id)}
                class="text-left px-3 py-2 border-l-[3px] {mode === m.id
                  ? 'border-[var(--pd-button-tab-border-selected)] bg-[var(--pd-content-card-selected-bg)] text-[var(--pd-button-tab-text-selected)]'
                  : 'border-transparent hover:bg-[var(--pd-content-card-hover-bg)] text-[var(--pd-button-tab-text)]'}">
                <div class="font-semibold">{m.label}</div>
                <div class="text-xs opacity-80 font-mono">{m.hint}</div>
              </button>
            {/each}
          </div>
        </div>
        <label class="flex flex-col gap-1.5">
          <span class="font-semibold">Target hosts</span>
          <Dropdown
            ariaLabel="Target hosts"
            value={hosts}
            onChange={onHosts}
            options={[
              { value: 'app_hosts', label: 'app_hosts (inventory.yml)' },
              { value: 'rhel-9', label: 'rhel-9 (RHEL Podman machine)' },
              { value: 'web', label: 'web (web01, web02)' },
              { value: 'localhost', label: 'localhost' },
            ]} />
        </label>
        <div class="flex flex-col gap-2">
          <Checkbox checked={includePull} onclick={onPull} title="Include image pull">Include image pull</Checkbox>
          <Checkbox checked={vaultSecrets} onclick={onVault} title="Move secrets to podman_secret + vault">Move secrets to podman_secret + vault</Checkbox>
          {#if secretsFound && !vaultSecrets}
            <div class="flex items-start gap-2 text-sm text-[var(--pd-state-warning)]" role="alert">
              <Fa icon={faTriangleExclamation} class="mt-0.5" />
              <span>A PASSWORD variable will be written in clear text in the playbook.</span>
            </div>
          {:else if secretsFound}
            <span class="text-xs opacity-80">POSTGRESQL_PASSWORD detected → podman_secret with <code>vault_*</code> variable.</span>
          {/if}
        </div>
        <div class="text-xs opacity-80 flex flex-col gap-0.5">
          <span>Source: {members.length} container{members.length > 1 ? 's' : ''}{pod ? ` in pod ${pod.name}` : ''}</span>
          <span>containers.podman 1.21.0 · {fileName}</span>
        </div>
      </div>
      <div class="flex flex-col gap-1.5 min-w-0">
        <span class="font-semibold">{fileName}</span>
        <pre
          class="h-[26rem] overflow-auto rounded-lg p-3 text-xs font-mono leading-5 bg-[var(--pd-details-bg)] text-[var(--pd-content-text)] border border-[var(--pd-content-table-border)]"
          aria-label="Generated playbook">{yaml}</pre>
      </div>
    </div>
  {/snippet}
  {#snippet buttons()}
    <Button type="link" onclick={onclose}>Cancel</Button>
    <Button type="secondary" icon={faCopy} onclick={copy}>Copy</Button>
    <Button type="secondary" icon={faFloppyDisk} onclick={save}>Save to project</Button>
    <Button icon={faPlay} onclick={runNavigator}>Run with navigator</Button>
  {/snippet}
</PdModal>
