<script lang="ts">
/**
 * Container › Debug tab (P14): pick a toolbox image, start a debug container
 * sharing the target's pid/net/ipc namespaces, then use its shell.
 */
import { faBug, faPowerOff } from '@fortawesome/free-solid-svg-icons';
import { Button, Dropdown } from '@podman-desktop/ui-svelte';

import Terminal from '#lib/details/Terminal.svelte';
import type { ResourceContext } from '#lib/ext/types.ts';
import { href } from '#lib/nav.ts';
import type { Container } from '#lib/world.svelte.ts';
import { world } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import CopyField from '../../_appdev/CopyField.svelte';
import Pill from '../../_appdev/Pill.svelte';
import TaskLog from '../../_appdev/TaskLog.svelte';
import { answersFor, bannerFor, DEBUG_IMAGES, debugCommand, endDebugShell, promptOf, sessionOf, startDebugShell } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const target = $derived(ctx.resource as Container);
const session = $derived(sessionOf(target.id));
const debugContainer = $derived(session ? world.containers.find(c => c.id === session.debugContainerId) : undefined);

let image = $state(DEBUG_IMAGES[0].value);
let taskId = $state<string | undefined>();
const task = $derived(taskId ? world.tasks.find(t => t.id === taskId) : undefined);
const starting = $derived(task?.status === 'in-progress');

const command = $derived(debugCommand(target, image));
const imageOptions = DEBUG_IMAGES.map(i => ({ value: i.value, label: i.label }));

const sessionImage = $derived(session?.debugImage ?? image);
const answers = $derived(answersFor(target, sessionImage));
const banner = $derived(bannerFor(target, sessionImage));
const prompt = $derived(promptOf(sessionImage));

function start(): void {
  taskId = startDebugShell(target, image);
}

function end(): void {
  taskId = undefined;
  endDebugShell(target.id);
}
</script>

{#if session && debugContainer}
  <div class="flex flex-col h-full" aria-label="Debug shell">
    <div class="flex items-center gap-3 px-5 py-2 text-sm text-[var(--pd-content-text)] border-b border-[var(--pd-content-divider)]">
      <Pill label="Attached" tone="running" />
      <span class="truncate">
        <a class="text-[var(--pd-link)]" href={href(`/c/${debugContainer.engineId}/containers/${debugContainer.id}/summary`)}>{debugContainer.name}</a>
        · {session.debugImage} · namespaces {session.namespaces.join(', ')} of {target.name}
      </span>
      <span class="grow"></span>
      <Button type="secondary" icon={faPowerOff} onclick={end}>End session</Button>
    </div>
    <div class="grow min-h-0">
      {#key session.debugContainerId}
        <Terminal {prompt} {answers} {banner} />
      {/key}
    </div>
  </div>
{:else}
  <div class="h-full overflow-auto px-5 py-4 space-y-3" aria-label="Debug">
    <Card title="Debug shell" subtitle="Open a shell with real tools inside any container — even distroless — without changing the image.">
      <div class="space-y-3 max-w-[900px]">
        <p class="text-sm">
          A temporary toolbox container joins the pid, network and IPC namespaces of <strong>{target.name}</strong>. You see its processes as
          your own, reach its ports on localhost and browse its filesystem under <code>/proc/1/root</code>. The container is removed when the session ends.
        </p>
        <div class="flex flex-col gap-1 max-w-[520px]">
          <label for="debug-image" class="text-sm">Toolbox image</label>
          <Dropdown id="debug-image" bind:value={image} options={imageOptions} ariaLabel="Toolbox image" disabled={starting} />
        </div>
        <CopyField label="Command" value={command} toastTitle="Copied the debug command to the clipboard" />
        <div class="flex items-center gap-2">
          <Button icon={faBug} onclick={start} inProgress={starting} disabled={starting}>Start debug shell</Button>
          <span class="text-sm opacity-80"><span class="inline-flex items-center gap-1"><Pill label="SYS_PTRACE" tone="info" /></span> added so strace and gdb can attach.</span>
        </div>
        {#if task && task.status !== 'success'}
          <TaskLog {taskId} label="Debug shell progress" />
        {/if}
      </div>
    </Card>
    <Card title="Suggested commands" inset>
      <ul class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm font-mono" aria-label="Suggested commands">
        <li>ps aux</li>
        <li>ss -ltnp</li>
        <li>ls /proc/1/root/deployments</li>
        <li>curl -s localhost:8080/q/health</li>
        <li>cat /proc/1/root/deployments/config/application.properties</li>
        <li>env</li>
      </ul>
      <p class="mt-2 text-sm flex items-center gap-2"><span class="text-[var(--pd-content-card-icon)]">Tip:</span> pick <code>netshoot</code> for tcpdump, dig and iperf3 on the target's network.</p>
    </Card>
  </div>
{/if}
