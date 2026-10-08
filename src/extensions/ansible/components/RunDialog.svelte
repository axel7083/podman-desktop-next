<script lang="ts">
/** "Run playbook" (ansible-navigator run … --ee true --eei <image> --ce podman). */
import { Button, Dropdown } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import { navigate } from '#lib/nav.ts';

import { runPlaybook } from '../actions.ts';
import { ansibleImages, imageRef, store } from '../data.ts';
import PdModal from './PdModal.svelte';

interface Props {
  playbook?: string;
  onclose: () => void;
}

let { playbook: initial = 'site.yml', onclose }: Props = $props();

const { projects, settings } = store();

const playbooks = $derived([...new Set(projects.flatMap(p => p.playbooks))]);
const eeOptions = $derived.by(() => {
  const refs = ansibleImages(['EE']).map(imageRef);
  if (!refs.includes(settings.navigatorEe)) refs.unshift(settings.navigatorEe);
  return refs.map(r => ({ value: r, label: `${r.split('/').pop()}${r === settings.navigatorEe ? ' (navigator default)' : ''}` }));
});

// svelte-ignore state_referenced_locally
let playbook = $state(initial);
let inventory = $state('inventory.yml');
let ee = $state(settings.navigatorEe);

function onPlaybook(v: string): void {
  playbook = v;
  if (v === 'restart-orders.yml' || v === 'podman-hosts.yml') inventory = 'localhost,';
  else inventory = 'inventory.yml';
}

function onInventory(v: string): void {
  inventory = v;
}

function onEe(v: string): void {
  ee = v;
}

function run(): void {
  runPlaybook(playbook, inventory, ee);
  const artifact = store().runs[0]?.artifact;
  onclose();
  navigate(`/tools/ansible?tab=runs${artifact ? `&run=${encodeURIComponent(artifact)}` : ''}`);
}
</script>

<PdModal title="Run playbook" {onclose}>
  {#snippet icon()}<AppIcon icon="icons/redhat.ansible.png" size="20px" />{/snippet}
  {#snippet content()}
    <div class="flex flex-col gap-3">
      <label class="flex flex-col gap-1">
        <span class="font-semibold">Playbook</span>
        <Dropdown ariaLabel="Playbook" value={playbook} onChange={onPlaybook} options={playbooks.map(p => ({ value: p, label: p }))} />
      </label>
      <label class="flex flex-col gap-1">
        <span class="font-semibold">Inventory</span>
        <Dropdown
          ariaLabel="Inventory"
          value={inventory}
          onChange={onInventory}
          options={[
            { value: 'inventory.yml', label: 'inventory.yml (web01, web02, db01)' },
            { value: 'localhost,', label: 'localhost' },
          ]} />
      </label>
      <label class="flex flex-col gap-1">
        <span class="font-semibold">Execution environment</span>
        <Dropdown ariaLabel="Execution environment" value={ee} onChange={onEe} options={eeOptions} />
      </label>
      <code class="text-xs break-all opacity-80">ansible-navigator run {playbook} -i {inventory} --mode stdout --ee true --eei {ee} --ce podman --pp missing</code>
    </div>
  {/snippet}
  {#snippet buttons()}
    <Button type="link" onclick={onclose}>Cancel</Button>
    <Button onclick={run}>Run</Button>
  {/snippet}
</PdModal>
