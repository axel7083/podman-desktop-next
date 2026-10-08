<script lang="ts">
/**
 * Settings › Docker contexts: every `docker context ls` entry, which one the
 * docker CLI targets, and why some are not connections of their own (P1).
 */
import { faCirclePlus, faTerminal } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import { registry } from '#lib/ext/registry.svelte.ts';
import { href, STATUS_DOT_CLASS, STATUS_LABEL } from '#lib/nav.ts';
import { toast } from '#lib/world.svelte.ts';

import { contextsFor, createPodmanContext, currentContext, type DockerContext, makeCurrent, setCurrentContext } from '../contexts.ts';

const windows = $derived(registry.scenarioCtx.has('windows'));
const contexts = $derived(contextsFor(windows));
const current = $derived(currentContext());
const podman = $derived(registry.activeConnections.find(c => c.id === 'podman-machine-default'));
const hasPodmanContext = $derived(contexts.some(c => c.Name === 'podman-machine-default'));

function connOf(ctx: DockerContext): ReturnType<typeof registry.getConnection> {
  return ctx.connectionId ? registry.getConnection(ctx.connectionId) : undefined;
}

function use(ctx: DockerContext): void {
  const conn = connOf(ctx);
  if (conn && !ctx.skipped) makeCurrent(conn, windows);
  else {
    setCurrentContext(ctx.Name);
    toast({ type: 'success', title: `docker CLI now targets context ${ctx.Name}`, body: `docker context use ${ctx.Name}` });
  }
}

function createForPodman(): void {
  if (!podman) return;
  createPodmanContext(podman.name, podman.endpoint);
  makeCurrent(podman, windows);
}
</script>

<div class="flex flex-col gap-4 text-[var(--pd-content-card-text)]">
  <div class="flex items-center gap-3">
    <p class="grow text-sm">
      Contexts from <code>{windows ? 'C:\\Users\\sam\\.docker\\contexts' : '~/.docker/contexts'}</code>. Live local contexts appear as connections in the primary navigation; the current context is what the
      <code>docker</code> CLI targets.
    </p>
    <Button icon={faCirclePlus} disabled={!podman || hasPodmanContext} onclick={createForPodman} aria-label="Create context for podman-machine-default">Create context for podman-machine-default</Button>
  </div>
  <table class="w-full" aria-label="Docker contexts">
    <thead>
      <tr class="text-left text-[var(--pd-table-header-text)]">
        <th class="py-2 px-3 w-20 font-semibold">Current</th>
        <th class="py-2 px-3 font-semibold">Name</th>
        <th class="py-2 px-3 font-semibold">Description</th>
        <th class="py-2 px-3 font-semibold">Endpoint</th>
        <th class="py-2 px-3 font-semibold">Status</th>
        <th class="py-2 px-3 font-semibold">Notes</th>
      </tr>
    </thead>
    <tbody>
      {#each contexts as ctx (ctx.Name)}
        {@const conn = connOf(ctx)}
        {@const isCurrent = ctx.Name === current}
        <tr class="border-t border-[var(--pd-content-divider)] {ctx.skipped ? 'text-[var(--pd-table-body-text)]' : ''}" aria-label="Context {ctx.Name}">
          <td class="py-2 px-3">
            <input
              type="radio"
              name="docker-current-context"
              class="accent-[var(--pd-button-primary-bg)]"
              checked={isCurrent}
              onchange={use.bind(undefined, ctx)}
              aria-label="Make {ctx.Name} the current context" />
          </td>
          <td class="py-2 px-3">
            <span class="font-semibold {ctx.skipped ? '' : 'text-[var(--pd-table-body-text-highlight)]'}">{ctx.Name}</span>
            {#if isCurrent}<span class="ml-1 text-xs px-1.5 py-0.5 rounded-sm bg-[var(--pd-label-primary-bg)] text-[var(--pd-label-primary-text)]">current</span>{/if}
          </td>
          <td class="py-2 px-3 text-sm">{ctx.Description}</td>
          <td class="py-2 px-3 font-mono text-xs wrap-anywhere">{ctx.DockerEndpoint}</td>
          <td class="py-2 px-3 text-sm whitespace-nowrap">
            {#if conn && !ctx.skipped}
              <a class="flex items-center gap-1.5 text-[var(--pd-link)]" href={href(`/c/${conn.id}`)}>
                <span class="w-2 h-2 rounded-full {STATUS_DOT_CLASS[conn.status]}"></span>{STATUS_LABEL[conn.status]}
              </a>
            {:else if ctx.skipped}
              <span>Skipped</span>
            {:else}
              <span>–</span>
            {/if}
          </td>
          <td class="py-2 px-3 text-sm">
            {#if ctx.note}
              {#if ctx.skipped && conn}
                <span>{ctx.note.split(' — ')[0]} — shown as <a class="text-[var(--pd-link)]" href={href(`/c/${conn.id}`)}>{conn.name}</a></span>
              {:else}
                <span>{ctx.note}</span>
              {/if}
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  <div class="flex items-center gap-2 text-sm rounded-md p-2 bg-[var(--pd-content-card-inset-bg)]" aria-label="Current context command">
    <Button type="link" icon={faTerminal} aria-label="docker CLI"></Button>
    <code class="font-mono text-xs">docker context use {current}</code>
  </div>
</div>
