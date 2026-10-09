<script lang="ts">
/** Connection › Sandbox (P14): account, expiry, namespace quota and product links. */
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import type { ResourceContext } from '#lib/ext/types.ts';
import { toast } from '#lib/world.svelte.ts';

import { CONTEXT, daysLeft, QUOTA, SIGNUP } from '../data.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

function open(url: string): void {
  toast({ type: 'info', title: `Opening ${url}` });
}
</script>

<div class="h-full overflow-auto px-5 py-4 space-y-4 text-[var(--pd-content-card-text)]">
  <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 flex items-center gap-4" aria-label="Sandbox status">
    <div class="grow">
      <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)]">{SIGNUP.status.reason} · {daysLeft()} days left</h2>
      <div class="text-sm">
        {SIGNUP.givenName}
        {SIGNUP.familyName} ({SIGNUP.username}) · {SIGNUP.company} · active {SIGNUP.startDate.slice(0, 10)} → {SIGNUP.endDate.slice(0, 10)}. Workloads are idled after 12 hours. API {ctx.conn.endpoint}.
      </div>
    </div>
    <Button disabled title="Available once the sandbox is deactivated">Renew</Button>
  </section>
  <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4" aria-label="Quota">
    <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] mb-2">Quota of {CONTEXT.namespace}</h2>
    <div class="grid grid-cols-2 gap-x-8 gap-y-3">
      {#each QUOTA as q (q.resource)}
        <div class="flex flex-col gap-1 text-sm">
          <div class="flex justify-between"><span>{q.label} <span class="text-[var(--pd-content-card-title)]">({q.resource})</span></span><span class="tabular-nums">{q.used} / {q.hard} {q.unit}</span></div>
          <div class="h-1.5 rounded-full bg-[var(--pd-content-card-inset-surface)] overflow-hidden" role="progressbar" aria-label={q.label} aria-valuenow={q.used} aria-valuemax={q.hard}>
            <div class="h-full {q.used / q.hard > 0.8 ? 'bg-[var(--pd-state-warning)]' : 'bg-[var(--pd-status-running)]'}" style:width="{Math.round((q.used / q.hard) * 100)}%"></div>
          </div>
        </div>
      {/each}
    </div>
  </section>
  <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 flex flex-wrap gap-2" aria-label="Links">
    <Button type="secondary" icon={faArrowUpRightFromSquare} onclick={open.bind(undefined, SIGNUP.consoleURL)}>OpenShift console</Button>
    <Button type="secondary" icon={faArrowUpRightFromSquare} onclick={open.bind(undefined, SIGNUP.rhodsMemberURL)}>OpenShift AI</Button>
    <Button type="secondary" icon={faArrowUpRightFromSquare} onclick={open.bind(undefined, SIGNUP.cheDashboardURL)}>Dev Spaces</Button>
  </section>
</div>
