<script lang="ts">
/**
 * "Scan · <image>" tab (Grype): progress while scanning, severity counts,
 * results table (severity, CVE, package, installed, fixed in) and Rescan.
 * Without Grype installed (Vanilla): the PD empty-screen promotion.
 */
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { Button, LinearProgress } from '@podman-desktop/ui-svelte';

import type { LabResource, LabTarget } from '../data.ts';
import { hash } from './details.ts';
import { ext, isInstalled } from './exts.ts';
import Head from './Head.svelte';
import PromoEmpty from './PromoEmpty.svelte';

interface Props {
  res: LabResource;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { res, onopen }: Props = $props();

const image = $derived(res.sectionId === 'images' ? res.name : res.sub);
const installed = $derived(isInstalled('grype'));
let scanning = $state(true);
let run = $state(0);
let search = $state('');

$effect(() => {
  void run;
  if (!installed) return;
  scanning = true;
  const t = setTimeout(() => (scanning = false), 1400);
  return (): void => clearTimeout(t);
});

const SEV = ['Critical', 'High', 'Medium', 'Low', 'Negligible'] as const;
const SEV_COLOR: Record<string, string> = {
  Critical: 'bg-[var(--pd-status-dead)] text-white',
  High: 'bg-[var(--pd-status-degraded)] text-black',
  Medium: 'bg-[var(--pd-status-starting)] text-black',
  Low: 'bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]',
  Negligible: 'bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] opacity-70',
};
const PKGS: [string, string, string][] = [
  ['openssl-libs', '3.5.1-4.el10', '3.5.1-5.el10'],
  ['glibc', '2.39-12.el10', '2.39-14.el10'],
  ['zlib', '1.3.1-2', ''],
  ['libxml2', '2.12.5-1', '2.12.5-3'],
  ['curl', '8.9.1-2', '8.9.1-4'],
  ['python3', '3.12.5-1', ''],
  ['expat', '2.6.2-1', '2.6.3-1'],
  ['sqlite-libs', '3.46.0-1', ''],
  ['jackson-databind', '2.17.1', '2.17.2'],
  ['netty-codec-http', '4.1.110', '4.1.112'],
  ['krb5-libs', '1.21.3-1', ''],
  ['systemd-libs', '256.4-1', '256.7-1'],
];

const results = $derived.by(() => {
  const h = hash(image);
  const n = 6 + (h % 7);
  return Array.from({ length: n }, (_, i) => {
    const [pkg, inst, fixed] = PKGS[(h + i * 5) % PKGS.length];
    return { sev: SEV[Math.min(4, (h >> i) % 5)], id: `CVE-202${5 + (i % 2)}-${String((h >> (i % 9)) % 90000).padStart(5, '1')}`, pkg, inst, fixed };
  }).sort((a, b) => SEV.indexOf(a.sev) - SEV.indexOf(b.sev));
});
const shown = $derived(results.filter(r => !search || `${r.id} ${r.pkg}`.toLowerCase().includes(search.toLowerCase())));
</script>

{#snippet actions()}
  {#if installed}<Button type="secondary" icon={faRotateRight} inProgress={scanning} onclick={(): void => void run++}>Rescan</Button>{/if}
{/snippet}

<div data-testid="scan-view" class="flex flex-col h-full min-h-0">
  <Head icon={ext('grype')?.icon} title="Scan · {image}" connId={res.connId} onconn={(): void => onopen({ kind: 'connection', connId: res.connId }, {})} sub="Grype" search={installed && !scanning ? search : undefined} {actions} />
  {#if !installed}
    <PromoEmpty
      icon={ext('grype')?.icon ?? ''}
      title="No vulnerability scanner"
      description="Scan images for known vulnerabilities (CVEs) of their OS packages and language dependencies. Install a scanner extension to get started."
      extId="grype"
      info="github.com/anchore/grype"
      actionLabel="Scan now"
      onaction={(): void => void run++}
      onbrowse={(): void => onopen({ kind: 'extensions' }, {})} />
  {:else if scanning}
    <div class="flex flex-col items-center justify-center gap-3 flex-1 text-[var(--pd-content-text)]">
      <div class="text-base">Scanning {image}…</div>
      <div class="w-80"><LinearProgress /></div>
      <div class="text-xs text-[var(--pd-content-sub-header)]">Cataloging packages · matching against the Grype DB (updated 2 hours ago)</div>
    </div>
  {:else}
    <div class="flex-1 min-h-0 overflow-auto px-5 py-4">
      <div data-testid="scan-summary" class="flex flex-wrap items-center gap-2 pb-4">
        <span class="text-base font-semibold text-[var(--pd-content-header)] mr-2">{results.length} vulnerabilities</span>
        {#each SEV as sv (sv)}
          {@const n = results.filter(r => r.sev === sv).length}
          <span class="flex items-center gap-1.5 h-6 px-2 rounded-md bg-[var(--pd-content-card-bg)] text-sm"><span class="w-2 h-2 rounded-full {SEV_COLOR[sv].split(' ')[0]}"></span>{sv}<span class="font-semibold">{n}</span></span>
        {/each}
      </div>
      <table data-testid="scan-table" class="w-full text-[13px] text-[var(--pd-table-body-text)]">
        <thead>
          <tr class="text-left text-xs uppercase text-[var(--pd-table-header-text)] border-b border-[var(--pd-content-divider)]">
            <th class="font-semibold py-2 w-28">Severity</th><th class="font-semibold">CVE</th><th class="font-semibold">Package</th><th class="font-semibold">Installed</th><th class="font-semibold">Fixed in</th>
          </tr>
        </thead>
        <tbody>
          {#each shown as r (r.id + r.pkg)}
            <tr class="border-b border-[var(--pd-content-divider)] h-10 hover:bg-[var(--pd-content-card-hover-bg)]">
              <td><span class="px-2 py-0.5 rounded text-[11px] font-semibold {SEV_COLOR[r.sev]}">{r.sev}</span></td>
              <td><a class="text-[var(--pd-link)] hover:underline" href="https://nvd.nist.gov/vuln/detail/{r.id}" target="_blank" rel="noreferrer">{r.id}</a></td>
              <td class="text-[var(--pd-table-body-text-highlight)]">{r.pkg}</td>
              <td class="font-mono text-xs">{r.inst}</td>
              <td class="font-mono text-xs">{#if r.fixed}{r.fixed}{:else}<span class="opacity-50">won't fix</span>{/if}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
