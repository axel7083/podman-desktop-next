<script lang="ts">
/** Connection tab "Docker context": `docker context inspect` + make current (P1). */
import { faCircleInfo, faStar } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import { registry } from '#lib/ext/registry.svelte.ts';
import type { ResourceContext } from '#lib/ext/types.ts';

import { contextsFor, currentContext, makeCurrent } from '../contexts.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const windows = $derived(registry.scenarioCtx.has('windows'));
const context = $derived(contextsFor(windows).find(c => c.connectionId === ctx.conn.id && !c.skipped));
const isCurrent = $derived(context?.Name === currentContext());
const remote = $derived(context?.DockerEndpoint.startsWith('ssh://') ?? false);

function sha(name: string): string {
  let h = 0x811c9dc5;
  let out = '';
  for (let round = 0; round < 8; round++) {
    for (const ch of `${round}${name}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
    out += h.toString(16).padStart(8, '0');
  }
  return out;
}

const inspect = $derived(
  context
    ? JSON.stringify(
        [
          {
            Name: context.Name,
            Metadata: { Description: context.Description },
            Endpoints: { docker: { Host: context.DockerEndpoint, SkipTLSVerify: false } },
            TLSMaterial: {},
            Storage: {
              MetadataPath: windows ? `C:\\Users\\sam\\.docker\\contexts\\meta\\${sha(context.Name)}` : `/home/user/.docker/contexts/meta/${sha(context.Name)}`,
              TLSPath: windows ? `C:\\Users\\sam\\.docker\\contexts\\tls\\${sha(context.Name)}` : `/home/user/.docker/contexts/tls/${sha(context.Name)}`,
            },
          },
        ],
        null,
        2,
      )
    : '',
);

function use(): void {
  makeCurrent(ctx.conn, windows);
}
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-4">
  {#if !context}
    <div class="rounded-lg p-4 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)]">{ctx.conn.name} is not backed by a Docker context.</div>
  {:else}
    {#if remote}
      <div class="flex items-start gap-3 rounded-lg p-3 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)] border-l-4 border-[var(--pd-state-info)]" role="note" aria-label="Remote context">
        <Icon icon={faCircleInfo} class="text-[var(--pd-state-info)] mt-0.5" />
        <span>Remote SSH context (preview). Starting {ctx.conn.name} opens an SSH connection to <code>{context.DockerEndpoint.replace('ssh://', '')}</code> using your SSH agent; containers and images are listed from the remote engine.</span>
      </div>
    {/if}
    <div class="flex items-center gap-3 rounded-lg p-4 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)]">
      <div class="grow">
        <div class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">Context {context.Name}</div>
        <div class="text-sm">{isCurrent ? 'This is the current context: the docker CLI targets this engine.' : 'The docker CLI currently targets another context.'}</div>
      </div>
      <Button icon={faStar} disabled={isCurrent} onclick={use} aria-label="Make current Docker context">{isCurrent ? 'Current context' : 'Make current'}</Button>
    </div>
    <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-4">
      <div class="text-sm text-[var(--pd-content-card-light-title)] mb-2 font-mono">docker context inspect {context.Name}</div>
      <pre class="font-mono text-xs text-[var(--pd-content-card-text)] whitespace-pre-wrap" aria-label="Context metadata">{inspect}</pre>
    </div>
  {/if}
</div>
