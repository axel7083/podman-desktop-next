<script lang="ts">
/** "Play Kubernetes YAML" form (today's PD Kube play): file picker, from scratch, YAML editor, options. */
import { faFolderOpen, faPlay } from '@fortawesome/free-solid-svg-icons';
import { Checkbox } from '@podman-desktop/ui-svelte';

import LabIcon from '../ui/LabIcon.svelte';

import PodIcon from '#lib/images/PodIcon.svelte';

import type { LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import Btn from './Btn.svelte';
import Head from './Head.svelte';

interface Props {
  connId: string;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { connId, onopen }: Props = $props();

let mode = $state<'file' | 'scratch'>('scratch');
let file = $state('');
let yaml = $state('apiVersion: v1\nkind: Pod\nmetadata:\n  name: hello\nspec:\n  containers:\n    - name: hello\n      image: quay.io/podman/hello:latest\n');
let replace = $state(false);
let build = $state(false);
</script>

<div class="flex flex-col h-full min-h-0">
  <Head icon={PodIcon} title="Play Kubernetes YAML" {connId} onconn={(): void => onopen({ kind: 'connection', connId }, {})} />
  <div data-testid="kubeplay" class="flex-1 min-h-0 overflow-auto p-5 text-[13px]">
    <div class="max-w-4xl flex flex-col gap-4 p-5 rounded-lg bg-[var(--pd-content-card-bg)]">
      <div class="text-[14px] font-semibold text-[var(--pd-content-header)]">Create pods from a Kubernetes YAML file</div>
      <label class="flex items-center gap-2"><input type="radio" bind:group={mode} value="file" />Kubernetes YAML file</label>
      <div class="flex gap-2 pl-6" class:opacity-50={mode !== 'file'}>
        <input class="flex-1 h-7 px-2 rounded-md bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] text-[var(--pd-input-field-focused-text)]" placeholder="Select a .yaml file to play" bind:value={file} disabled={mode !== 'file'} />
        <Btn icon={faFolderOpen} disabled={mode !== 'file'} onclick={(): void => { file = '/home/dev/orders/pod.yaml'; }}>Browse…</Btn>
      </div>
      <label class="flex items-center gap-2"><input type="radio" bind:group={mode} value="scratch" />Create a file from scratch</label>
      {#if mode === 'scratch'}
        <textarea aria-label="Kubernetes YAML" class="ml-6 h-56 p-3 rounded-md font-mono text-[12px] leading-5 bg-black text-[#e5e5e5] border border-[var(--pd-input-field-stroke)] outline-none" bind:value={yaml}></textarea>
      {/if}
      <div class="pt-2 text-[14px] font-semibold text-[var(--pd-content-header)]">Options</div>
      <div class="flex flex-col gap-2 pl-1">
        <Checkbox bind:checked={replace} title="Replace">Replace existing pods and containers</Checkbox>
        <Checkbox bind:checked={build} title="Build">Build images referenced in the YAML</Checkbox>
      </div>
      <div class="flex justify-end pt-2">
        <Btn kind="primary" icon={faPlay} onclick={(): void => lab.openCreate('Play custom YAML')}>Play custom YAML</Btn>
      </div>
    </div>
    <div class="flex items-center gap-2 pt-3 text-[12px] text-[var(--pd-table-body-text)]"><LabIcon icon="icons/podman-desktop.podman.png" size={14} />Runs `podman kube play` on this connection.</div>
  </div>
</div>
