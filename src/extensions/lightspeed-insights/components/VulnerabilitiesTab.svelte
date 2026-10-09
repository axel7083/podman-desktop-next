<script lang="ts">
/** Connection › Vulnerabilities (P14): CVEs affecting a registered RHEL system. */
import { faBolt } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import Checkbox from '#lib/components/Checkbox.svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import type { ResourceContext } from '#lib/ext/types.ts';
import { runTask, toast } from '#lib/world.svelte.ts';

import { LS_EXT, lsStore, mutableStore, type SystemCve } from '../data.ts';
import CheckIn from './CheckIn.svelte';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const conn = $derived(ctx.conn);
let importantOnly = $state(false);
const ORDER = { Critical: 4, Important: 3, Moderate: 2, Low: 1 };
const all = $derived(lsStore().cves.filter(c => c.host === conn.id).toSorted((a, b) => ORDER[b.impact] - ORDER[a.impact]));
const cves = $derived(importantOnly ? all.filter(c => ORDER[c.impact] >= 3) : all);
const IMPACT_CLASS = {
  Critical: 'bg-[var(--pd-status-terminated)] text-[var(--pd-status-contrast)]',
  Important: 'bg-[var(--pd-state-error)] text-[var(--pd-status-contrast)]',
  Moderate: 'bg-[var(--pd-state-warning)] text-[var(--pd-status-contrast)]',
  Low: 'bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]',
};

function toggleFilter(checked: boolean): void {
  importantOnly = checked;
}

function apply(c: SystemCve): void {
  const rhsa = c.advisories_list[0];
  runTask({
    name: `Apply ${rhsa} on ${conn.name}`,
    ext: LS_EXT,
    steps: [
      { label: `dnf upgrade --advisory ${rhsa}`, ms: 2400, log: [`[core@${conn.name} ~]$ sudo dnf upgrade -y --advisory ${rhsa}`, `Upgrading: ${c.package}`, 'Complete!'] },
      { label: 'insights-client (upload)', ms: 900 },
    ],
    onDone: () => {
      const s = mutableStore();
      s.cves = s.cves.map(x => (x.host === c.host && x.synopsis === c.synopsis ? { ...x, status_name: 'Resolved' } : x));
    },
  });
}

function openCve(c: SystemCve): void {
  toast({ type: 'info', title: `Opening ${c.synopsis}`, body: `https://access.redhat.com/security/cve/${c.synopsis.toLowerCase()}` });
}
</script>

<CheckIn {conn}>
  <div class="h-full overflow-auto px-5 py-4 space-y-3 text-[var(--pd-content-card-text)]">
    <div class="flex items-center gap-3">
      <div class="grow">
        <h2 class="text-lg font-semibold text-[var(--pd-content-header)]">{all.filter(c => c.status_name !== 'Resolved').length} CVEs affect {conn.name}</h2>
        <div class="text-sm">Red Hat Lightspeed Vulnerability · host-based (installed RPMs), not container images</div>
      </div>
      <Checkbox checked={importantOnly} onclick={toggleFilter}>Important and Critical only</Checkbox>
    </div>
    <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-4">
      <table class="w-full text-left" aria-label="CVEs">
        <thead class="text-xs uppercase text-[var(--pd-table-header-text)]">
          <tr><th class="py-1">CVE</th><th>Impact</th><th>CVSS</th><th>Package</th><th>Advisory</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {#each cves as c (c.synopsis)}
            <tr class="border-t border-[var(--pd-content-divider)]">
              <td class="py-2">
                <button class="text-[var(--pd-link)]" onclick={openCve.bind(undefined, c)}>{c.synopsis}</button>
                {#if c.known_exploit}<span class="ml-1 text-xs text-[var(--pd-state-error)]" title="Known exploit"><Icon icon={faBolt} /> exploit</span>{/if}
                <div class="text-xs opacity-80">published {c.public_date}</div>
              </td>
              <td><span class="rounded-sm px-1.5 text-xs font-semibold {IMPACT_CLASS[c.impact]}">{c.impact}</span></td>
              <td class="tabular-nums">{c.cvss3_score}</td>
              <td>{c.package}</td>
              <td>{c.advisories_list.join(', ') || '—'}</td>
              <td class={c.status_name === 'Resolved' ? 'text-[var(--pd-state-success)]' : ''}>{c.status_name}</td>
              <td class="text-right">
                {#if c.advisory_available && c.status_name !== 'Resolved'}
                  <Button type="secondary" onclick={apply.bind(undefined, c)} disabled={conn.status !== 'started'}>Apply {c.advisories_list[0]}</Button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</CheckIn>
