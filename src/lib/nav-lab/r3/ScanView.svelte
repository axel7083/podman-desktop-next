<script lang="ts">
/**
 * "Scan · <image>" tab (Grype): progress while scanning, severity counts,
 * results table (severity, CVE, package, installed, fixed in) and Rescan.
 * Without Grype installed (Vanilla): the PD empty-screen promotion.
 */
import { faArrowUpRightFromSquare, faRotateRight, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { Button, LinearProgress } from '@podman-desktop/ui-svelte';

import type { LabResource, LabTarget } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import type { LabRow } from './cells/types.ts';
import { hash } from './details.ts';
import { ext, isInstalled } from './exts.ts';
import Head from './Head.svelte';
import ModernTable from './ModernTable.svelte';
import PromoEmpty from './PromoEmpty.svelte';
import SegFilter from './SegFilter.svelte';

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
let sev = $state('all');
const shown = $derived(results.filter(r => (sev === 'all' || r.sev === sev) && (!search || `${r.id} ${r.pkg}`.toLowerCase().includes(search.toLowerCase()))));
const segs = $derived<[string, string][]>([
  ['all', `All ${results.length}`],
  ...SEV.map((sv): [string, string] => [sv, `${sv} ${results.filter(r => r.sev === sv).length}`]).filter(([sv]) => results.some(r => r.sev === sv)),
]);
const rows = $derived<LabRow[]>(
  shown.map(r => ({
    name: `${r.id}/${r.pkg}`,
    status: r.sev.toUpperCase(),
    icon: faShieldHalved,
    title: r.id,
    sub: [],
    cols: { sev: r.sev, pkg: r.pkg, inst: r.inst, fixed: r.fixed || "won't fix" },
    buttons: [{ title: 'Open in NVD', icon: faArrowUpRightFromSquare, run: (): void => void window.open(`https://nvd.nist.gov/vuln/detail/${r.id}`, '_blank') }],
  })),
);
</script>

{#snippet seg()}
  <SegFilter tabs={segs} value={sev} label="Severity" testid="scan-summary" onpick={(v): void => void (sev = v)} />
{/snippet}

{#snippet actions()}
  {#if installed}<Button type="secondary" icon={faRotateRight} inProgress={scanning} onclick={(): void => void run++}>Rescan</Button>{/if}
{/snippet}

<div data-testid="scan-view" class="flex flex-col h-full min-h-0">
  <Head icon={ext('grype')?.icon} title="Scan · {image}" connId={res.connId} onconn={(): void => onopen({ kind: 'connection', connId: res.connId }, {})} provenance="Grype" placeholder="Filter vulnerabilities" search={installed && !scanning ? search : undefined} filters={installed && !scanning ? seg : undefined} {actions} />
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
      <div class="text-xs text-[var(--pd-table-body-text)]">Cataloging packages · matching against the Grype DB (updated 2 hours ago)</div>
    </div>
  {:else}
    <div data-testid="scan-table" class="flex flex-1 min-h-0 overflow-auto">
      {#if rows.length}
        <ModernTable {rows} cols={[['Severity', 'sev', '110px'], ['Package', 'pkg', 'minmax(8rem, 1fr)'], ['Installed', 'inst', '150px'], ['Fixed in', 'fixed', '150px']]} variant={lab.table === 'grid' ? 'grid' : 'modern'} initialSort="" mono={['inst', 'fixed']} readonly />
      {:else}
        <div class="px-4 py-3 text-xs text-[var(--pd-table-body-text)]">No vulnerabilities match.</div>
      {/if}
    </div>
  {/if}
</div>
