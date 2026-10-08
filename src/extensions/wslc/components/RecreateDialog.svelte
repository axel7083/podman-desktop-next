<script lang="ts">
/**
 * "Recreate on Podman" (WSLC journey 3): copy the run arguments of a WSLC
 * container and recreate it on a Podman machine, as a task (P15).
 */
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { Button, Checkbox, CloseButton, Dropdown, Modal } from '@podman-desktop/ui-svelte';

import { mkContainer } from '#lib/ext/helpers.ts';
import { registry } from '#lib/ext/registry.svelte.ts';
import { type Container, type Port, runTask, shortImage, stopContainer, world } from '#lib/world.svelte.ts';

import { WSLC_ID } from '../data.ts';

interface Props {
  container: Container;
  onclose: () => void;
}

let { container, onclose }: Props = $props();

const targets = $derived(registry.activeConnections.filter(c => c.kind === 'engine' && c.engineType === 'podman'));
const options = $derived(targets.map(c => ({ value: c.id, label: `${c.name}${c.status === 'started' ? '' : ` (${c.status})`}` })));
let target = $state('podman-machine-default');
let stopSource = $state(false);

const used = $derived(new Set(world.containers.filter(c => c.engineId === target && c.state === 'RUNNING').flatMap(c => c.ports.map(p => p.host))));

/** Same ports, shifted by +1 when the host port is already taken on the target. */
const ports: (Port & { shifted: boolean })[] = $derived(
  container.ports.map(p => {
    let host = p.host;
    while (used.has(host)) host += 1;
    return { ...p, host, shifted: host !== p.host };
  }),
);

const command = $derived(
  [
    'podman run -d',
    `--name ${container.name}`,
    ...ports.map(p => `-p ${p.host}:${p.container}`),
    ...(container.env ?? []).map(e => `-e ${e}`),
    container.image,
    ...(container.command ? [container.command] : []),
  ].join(' '),
);

const targetName = $derived(targets.find(t => t.id === target)?.name ?? target);

function copy(): void {
  navigator.clipboard?.writeText(command).catch(() => undefined);
}

function recreate(): void {
  const created = mkContainer(target, {
    name: container.name,
    image: container.image,
    ports: ports.map(p => [p.host, p.container]),
    env: container.env,
    command: container.command,
    labels: { 'io.podman-desktop.recreated-from': `wslc/${container.name}` },
    ageH: 0,
    upM: 0,
  });
  const source = container;
  const stop = stopSource;
  const dest = targetName;
  runTask({
    name: `Recreate ${source.name} on ${dest}`,
    ext: WSLC_ID,
    steps: [
      { label: `Pulling ${shortImage(source.image)} on ${dest}`, ms: 1800, log: [`Trying to pull ${source.image}...`, 'Writing manifest to image destination'] },
      { label: `Creating container ${source.name}`, ms: 900, log: [command] },
      { label: `Starting ${source.name}`, ms: 700 },
      ...(stop ? [{ label: `Stopping ${source.name} on WSLC default`, ms: 600, log: [`wslc container stop ${source.name}`] }] : []),
    ],
    action: { label: 'Open container', href: `/c/${target}/containers/${created.id}/summary` },
    onDone: () => {
      created.startedAt = Date.now();
      world.containers.push(created);
      if (stop) stopContainer(source.id);
    },
  });
  onclose();
}

function setStop(checked: boolean): void {
  stopSource = checked;
}
</script>

<Modal name="Recreate {container.name} on Podman" {onclose}>
  <div class="flex items-center justify-between pl-4 pr-3 py-3 space-x-2 text-[var(--pd-modal-header-text)]">
    <h1 class="grow text-lg font-bold">Recreate {container.name} on Podman</h1>
    <CloseButton onclick={onclose} />
  </div>
  <div class="relative max-h-[60vh] overflow-auto text-[var(--pd-modal-text)] px-10 py-4">
    <div class="flex flex-col gap-4 text-sm" aria-label="Recreate on Podman">
      <p>The run arguments of <strong>{container.name}</strong> on WSLC default are copied to a new Podman container. Both can run side by side.</p>
      <table class="w-full" aria-label="Copied run arguments">
        <tbody>
          <tr><td class="py-1 w-28 text-[var(--pd-table-body-text)]">Name</td><td class="py-1">{container.name}</td></tr>
          <tr><td class="py-1 text-[var(--pd-table-body-text)]">Image</td><td class="py-1 wrap-anywhere">{container.image}</td></tr>
          <tr>
            <td class="py-1 text-[var(--pd-table-body-text)] align-top">Ports</td>
            <td class="py-1">
              {#each ports as p (p.container)}
                <div>
                  {p.host}:{p.container}/tcp
                  {#if p.shifted}<span class="text-xs text-[var(--pd-state-warning)]">(host port in use on {targetName}, shifted)</span>{/if}
                </div>
              {:else}<span>None</span>{/each}
            </td>
          </tr>
          <tr>
            <td class="py-1 text-[var(--pd-table-body-text)] align-top">Environment</td>
            <td class="py-1">
              {#each container.env ?? [] as e (e)}<div class="font-mono text-xs">{e}</div>{:else}<span>None</span>{/each}
            </td>
          </tr>
        </tbody>
      </table>
      <label class="flex flex-col gap-1">
        <span class="font-semibold">Target engine</span>
        <Dropdown bind:value={target} {options} ariaLabel="Target engine" />
      </label>
      <div class="flex items-start gap-2 rounded-md p-2 bg-[var(--pd-content-card-inset-bg)]">
        <code class="grow font-mono text-xs wrap-anywhere" aria-label="Equivalent command">{command}</code>
        <Button type="link" icon={faCopy} title="Copy command" aria-label="Copy command" onclick={copy}></Button>
      </div>
      <Checkbox checked={stopSource} onclick={setStop} title="Stop the WSLC container afterwards">Stop {container.name} on WSLC default afterwards</Checkbox>
    </div>
  </div>
  <div class="px-5 py-5 mt-2 flex flex-row w-full justify-end space-x-2">
    <Button type="link" onclick={onclose}>Cancel</Button>
    <Button onclick={recreate} disabled={!targets.length}>Recreate</Button>
  </div>
</Modal>
