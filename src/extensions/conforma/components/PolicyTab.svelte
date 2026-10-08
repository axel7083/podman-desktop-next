<script lang="ts">
/** Image › Policy (Conforma): grouped violations / warnings / successes with solutions. */
import { faCircleCheck, faCircleXmark, faFileContract, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen, Expandable } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import type { ResourceContext } from '#lib/ext/types.ts';
import { type ContainerImage, world } from '#lib/world.svelte.ts';

import { runConforma } from '../../rhads-pack/actions.ts';
import { lastConforma, shortRef } from '../../rhads-pack/supply-chain.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const image = $derived(ctx.resource as ContainerImage);
const last = $derived(lastConforma(image));
const running = $derived(world.tasks.some(t => t.status === 'in-progress' && t.name.startsWith(`Validate ${shortRef(image)}`)));

function validate(): void {
  runConforma(image);
}
</script>

{#if !last}
  <EmptyScreen icon={faFileContract} title="Not validated" message="Validate {shortRef(image)} against the @redhat release policy (signature, attestations, SLSA provenance, CVE blockers, labels).">
    <Button onclick={validate} inProgress={running}>Validate release policy</Button>
  </EmptyScreen>
{:else}
  <div role="region" class="h-full overflow-auto px-5 py-4 space-y-3 text-[var(--pd-content-text)]" aria-label="Policy results">
    <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 flex items-center gap-4">
      <span class="text-2xl {last.report.success ? 'text-[var(--pd-state-success)]' : 'text-[var(--pd-state-error)]'}"><Icon icon={last.report.success ? faCircleCheck : faCircleXmark} /></span>
      <div class="grow">
        <div class="font-semibold text-[var(--pd-content-card-header-text)]">{last.report.success ? 'Release policy passed' : 'Release policy failed'}</div>
        <div class="text-sm">Policy github.com/conforma/policy//policy/release · collection @redhat · {last.by} · {new Date(last.at).toLocaleString()}</div>
      </div>
      <Button onclick={validate} inProgress={running}>Validate again</Button>
    </div>
    <Expandable>
      {#snippet title()}<span class="text-[var(--pd-state-error)] font-semibold">Violations ({last.report.violations.length})</span>{/snippet}
      <div class="space-y-2 pl-6">
        {#each last.report.violations as v (v.code)}
          <div class="rounded-md bg-[var(--pd-content-card-bg)] p-3">
            <div class="flex items-center gap-2"><span class="text-[var(--pd-state-error)]"><Icon icon={faCircleXmark} /></span><span class="font-mono text-sm">{v.code}</span>{#if v.term}<span class="text-xs rounded-sm px-1.5 bg-[var(--pd-label-bg)]">{v.term}</span>{/if}</div>
            <div class="mt-1">{v.msg}</div>
            {#if v.solution}<div class="mt-1 text-sm text-[var(--pd-content-sub-header)]">Solution: {v.solution}</div>{/if}
          </div>
        {:else}<div class="text-sm">None.</div>{/each}
      </div>
    </Expandable>
    <Expandable>
      {#snippet title()}<span class="text-[var(--pd-state-warning)] font-semibold">Warnings ({last.report.warnings.length})</span>{/snippet}
      <div class="space-y-1 pl-6">
        {#each last.report.warnings as w (w.code + (w.term ?? ''))}
          <div class="flex items-center gap-2 text-sm"><span class="text-[var(--pd-state-warning)]"><Icon icon={faTriangleExclamation} /></span><span class="font-mono">{w.code}</span><span>{w.msg}</span></div>
        {:else}<div class="text-sm">None.</div>{/each}
      </div>
    </Expandable>
    <Expandable expanded={false}>
      {#snippet title()}<span class="text-[var(--pd-state-success)] font-semibold">Successes ({last.report.successes.length})</span>{/snippet}
      <div class="grid grid-cols-2 gap-1 pl-6">
        {#each last.report.successes as s (s.code)}
          <div class="flex items-center gap-2 text-sm"><span class="text-[var(--pd-state-success)]"><Icon icon={faCircleCheck} /></span><span class="font-mono truncate">{s.code}</span></div>
        {/each}
      </div>
    </Expandable>
  </div>
{/if}
