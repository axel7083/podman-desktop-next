<script lang="ts">
/** Rulebooks (EDA): podman-health.yml in a DE container fed by `podman events` relayed to the webhook source. */
import { faHeartCrack, faPlay, faSkullCrossbones, faStop } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import Badge from '#lib/components/Badge.svelte';
import CodeView from '#lib/details/CodeView.svelte';
import { href } from '#lib/nav.ts';
import { startContainer, stopContainer, world } from '#lib/world.svelte.ts';

import { simulateDied, simulateUnhealthy } from '../actions.ts';
import { AAP_CONN, aapEnabled, store } from '../data.ts';
import DotCell from './DotCell.svelte';

const { events } = store();

const activation = $derived(world.containers.find(c => c.name === 'eda-podman-health'));
const running = $derived(activation?.state === 'RUNNING');
const busy = $derived(activation?.state === 'STARTING' || activation?.state === 'STOPPING');
const aap = $derived(aapEnabled());

const RULEBOOK = `---
- name: Podman container health
  hosts: localhost
  sources:
    - ansible.eda.webhook:
        host: 0.0.0.0
        port: 5000
  rules:
    - name: Restart unhealthy orders containers
      condition: >-
        event.payload.Action == "health_status" and
        event.payload.Actor.Attributes.health_status == "unhealthy"
      action:
        run_playbook:
          name: restart-orders.yml
          extra_vars:
            container: "{{ event.payload.Actor.Attributes.name }}"
      throttle:
        once_within: 5 minutes
        group_by_attributes:
          - event.payload.Actor.Attributes.name

    - name: Escalate died containers
      condition: event.payload.Action == "died"
      action:
        run_job_template:
          name: Remediate orders
          organization: ACME`;

function start(): void {
  if (activation) startContainer(activation.id);
}

function stop(): void {
  if (activation) stopContainer(activation.id);
}

function time(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
</script>

<div class="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4 px-5 pb-5">
  <div class="flex flex-col gap-4 min-w-0">
    <section class="bg-[var(--pd-content-card-bg)] rounded-lg p-4 flex flex-col gap-2" aria-label="Activation eda-podman-health">
      <div class="flex items-center gap-2">
        <span class="text-base font-semibold text-[var(--pd-content-card-header-text)]">eda-podman-health</span>
        <Badge label="DE" color="bg-[var(--pd-label-bg)]" class="text-[var(--pd-label-text)]" />
        <span class="grow"></span>
        {#if running}
          <Button type="secondary" icon={faStop} onclick={stop} inProgress={busy}>Stop</Button>
        {:else}
          <Button icon={faPlay} onclick={start} inProgress={busy} disabled={!activation}>Start</Button>
        {/if}
      </div>
      <div class="flex items-center gap-1.5 text-sm {running ? 'text-[var(--pd-status-running)]' : 'text-[var(--pd-status-stopped)]'}">
        <span class="w-2 h-2 rounded-full {running ? 'bg-[var(--pd-status-running)]' : 'bg-[var(--pd-status-stopped)]'}"></span>
        {running ? 'Running · waiting for events on webhook :5000' : (activation?.state.toLowerCase() ?? 'not created')}
      </div>
      <code class="text-xs text-[var(--pd-content-card-light-title)] break-all">ansible-rulebook -r rulebooks/podman-health.yml -i inventory.yml --verbose</code>
      <span class="text-xs text-[var(--pd-content-card-text)]">de-supported-rhel9:1.3.1 · ansible-rulebook 1.3.2 · ansible.eda 2.13.0 · source: podman events → ansible.eda.webhook</span>
    </section>
    <section class="rounded-lg overflow-hidden border border-[var(--pd-content-table-border)]" aria-label="Rulebook podman-health.yml">
      <div class="px-4 py-2 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-header-text)] font-semibold">rulebooks/podman-health.yml</div>
      <CodeView code={RULEBOOK} language="yaml" />
    </section>
  </div>

  <section class="bg-[var(--pd-content-card-bg)] rounded-lg p-4 flex flex-col gap-3 min-w-0" aria-label="Event log">
    <div class="flex items-center gap-2 flex-wrap">
      <h2 class="text-base font-semibold text-[var(--pd-content-card-header-text)] grow">Event log</h2>
      <Button type="secondary" icon={faHeartCrack} onclick={simulateUnhealthy} disabled={!running}>Simulate: make orders-db unhealthy</Button>
      <Button type="secondary" icon={faSkullCrossbones} onclick={simulateDied} disabled={!running}>Simulate: orders-api died</Button>
    </div>
    {#if events.length}
      <table class="w-full text-sm text-[var(--pd-table-body-text)]" aria-label="EDA events">
        <thead>
          <tr class="text-left uppercase text-xs text-[var(--pd-table-header-text)]">
            <th class="py-1 pr-3 font-semibold">Time</th>
            <th class="py-1 pr-3 font-semibold">Event</th>
            <th class="py-1 pr-3 font-semibold">Container</th>
            <th class="py-1 pr-3 font-semibold">Matched rule</th>
            <th class="py-1 pr-3 font-semibold">Action</th>
            <th class="py-1 pr-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {#each events as e (e.id)}
            <tr class="border-t border-[var(--pd-content-table-border)] align-top">
              <td class="py-2 pr-3 tabular-nums whitespace-nowrap">{time(e.time)}</td>
              <td class="py-2 pr-3 font-mono text-xs">{e.action}</td>
              <td class="py-2 pr-3 text-[var(--pd-table-body-text-highlight)]">{e.container}</td>
              <td class="py-2">{e.matchedRule}</td>
              <td class="py-2 pr-3 font-mono text-xs">
                {e.status === 'throttled' ? '— (once_within 5 minutes)' : e.ruleAction}
                {#if e.jobId && e.status === 'successful'}
                  <div class="mt-1">
                    {#if aap}
                      <a class="text-[var(--pd-link)] font-sans" href={href(`/c/${AAP_CONN}/aap-jobs?job=${e.jobId}`)}>AAP job {e.jobId}</a>
                    {:else}
                      <span class="font-sans">AAP job {e.jobId}</span>
                    {/if}
                  </div>
                {/if}
              </td>
              <td class="py-2"><DotCell object={{ status: e.status }} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="text-[var(--pd-content-card-text)] py-6 text-center">
        {running ? 'No events yet. Podman events are relayed to the rulebook webhook — use a Simulate button to trigger one.' : 'Start the activation to receive Podman events.'}
      </p>
    {/if}
  </section>
</div>
