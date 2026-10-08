<script lang="ts">
/** Connection tab "Prerequisites": `container system start` banner + Start (journey 1). */
import { faCircleCheck, faPlay, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import type { ResourceContext } from '#lib/ext/types.ts';
import { startConnection } from '#lib/world.svelte.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const status = $derived(ctx.conn.status);

const checks = [
  { label: 'macOS 26 on Apple silicon', ok: true },
  { label: 'container CLI 1.5.0 installed (/usr/local/bin/container)', ok: true },
  { label: 'socktainer v1.5.0 bundled with the extension', ok: true },
];

function start(): void {
  startConnection(ctx.conn.id, ctx.conn.name);
}
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-4">
  {#if status === 'started'}
    <div class="flex items-center gap-3 rounded-lg p-3 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)] border-l-4 border-[var(--pd-status-running)]" role="status" aria-label="container system status">
      <Icon icon={faCircleCheck} class="text-[var(--pd-status-running)]" />
      <span class="grow">The container system service is running. socktainer listens on <code>{ctx.conn.endpoint}</code>.</span>
    </div>
  {:else}
    <div class="flex items-center gap-3 rounded-lg p-3 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)] border-l-4 border-[var(--pd-state-warning)]" role="status" aria-label="container system status">
      <Icon icon={faTriangleExclamation} class="text-[var(--pd-state-warning)]" />
      <span class="grow">
        The container system service is not running. Run <code class="px-1 rounded-sm bg-[var(--pd-content-card-inset-surface)]">container system start</code> or start it from here.
      </span>
      <Button icon={faPlay} inProgress={status === 'starting'} onclick={start} aria-label="Start container system">Start</Button>
    </div>
  {/if}
  <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 text-[var(--pd-content-card-text)]">
    <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] mb-2">Prerequisites</h2>
    <ul class="space-y-1" aria-label="Prerequisites">
      {#each checks as c (c.label)}
        <li class="flex items-center gap-2"><Icon icon={faCircleCheck} class="text-[var(--pd-status-running)]" />{c.label}</li>
      {/each}
      <li class="flex items-center gap-2">
        <Icon icon={status === 'started' ? faCircleCheck : faTriangleExclamation} class={status === 'started' ? 'text-[var(--pd-status-running)]' : 'text-[var(--pd-state-warning)]'} />
        container system service ({status === 'started' ? 'running' : 'stopped'})
      </li>
    </ul>
  </div>
</div>
