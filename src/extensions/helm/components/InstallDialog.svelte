<script lang="ts">
/** Install a chart: target cluster, release name, namespace, values.yaml → task. */
import { Button, CloseButton, Dropdown, Input, Modal } from '@podman-desktop/ui-svelte';

import { registry } from '#lib/ext/registry.svelte.ts';
import { world } from '#lib/world.svelte.ts';

import { install } from '../actions.ts';
import { type ChartPackage, DEFAULT_VALUES } from '../data.ts';

interface Props {
  chart: ChartPackage;
  onclose: () => void;
}

let { chart, onclose }: Props = $props();

const clusters = $derived(registry.activeConnections.filter(c => c.kind === 'kubernetes'));
const options = $derived(clusters.map(c => ({ value: c.id, label: `${c.name}${c.status === 'started' ? '' : ` (${c.status})`}` })));

// default to the current kube context (kind-dev), else the first running cluster
const running = registry.activeConnections.filter(c => c.kind === 'kubernetes' && c.status === 'started');
const initial = running.find(c => c.id === world.currentKubeContext) ?? running[0];
let target = $state(initial?.id ?? '');
// svelte-ignore state_referenced_locally
let name = $state(chart.name);
let namespace = $state('default');
// svelte-ignore state_referenced_locally
let values = $state(DEFAULT_VALUES[chart.name] ?? '');

const conn = $derived(clusters.find(c => c.id === target));
const valid = $derived(!!conn && conn.status === 'started' && /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name) && /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(namespace));

function submit(): void {
  if (!conn || !valid) return;
  install(conn, chart, name, namespace, values);
  onclose();
}
</script>

<Modal name="Install {chart.name}" {onclose}>
  <div class="flex items-center justify-between pl-4 pr-3 py-3 space-x-2 text-[var(--pd-modal-header-text)]">
    <h1 class="grow text-lg font-bold">Install {chart.name} {chart.version}</h1>
    <CloseButton onclick={onclose} />
  </div>
  <div class="relative max-h-[65vh] overflow-auto text-[var(--pd-modal-text)] px-10 py-4 flex flex-col gap-3 text-sm">
    <div class="font-mono text-xs text-[var(--pd-content-card-light-title)]">{chart.ref} --version {chart.version}</div>
    <label class="flex flex-col gap-1">
      <span class="font-semibold">Kubernetes cluster</span>
      <Dropdown bind:value={target} {options} ariaLabel="Kubernetes cluster" />
      {#if conn && conn.status !== 'started'}<span class="text-xs text-[var(--pd-input-field-error-text)]">{conn.name} is not running.</span>{/if}
    </label>
    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1">
        <span class="font-semibold">Release name</span>
        <Input bind:value={name} aria-label="Release name" required />
      </label>
      <label class="flex flex-col gap-1">
        <span class="font-semibold">Namespace</span>
        <Input bind:value={namespace} aria-label="Namespace" required />
      </label>
    </div>
    <label class="flex flex-col gap-1">
      <span class="font-semibold">Values (YAML)</span>
      <textarea
        bind:value={values}
        rows="8"
        spellcheck="false"
        aria-label="Values YAML"
        class="font-mono text-xs p-2 rounded-md bg-[var(--pd-input-field-bg)] text-[var(--pd-input-field-focused-text)] border border-[var(--pd-input-field-stroke)] focus:border-[var(--pd-input-field-hover-stroke)] outline-none"></textarea>
    </label>
  </div>
  <div class="px-5 py-5 mt-2 flex flex-row w-full justify-end space-x-2">
    <Button type="link" onclick={onclose}>Cancel</Button>
    <Button onclick={submit} disabled={!valid}>Install</Button>
  </div>
</Modal>
