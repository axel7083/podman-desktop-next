<script lang="ts">
/** Image › SBOM (TPA): generate (syft) → upload → vulnerabilities with Red Hat VEX status, by purl. */
import { faFileArrowDown, faUpload } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen } from '@podman-desktop/ui-svelte';

import type { ResourceContext } from '#lib/ext/types.ts';
import { type ContainerImage, toast, world } from '#lib/world.svelte.ts';

import { generateSbom, uploadSbom } from '../../rhads-pack/actions.ts';
import { peek, shortRef, TPA_URL, tpaFindings } from '../../rhads-pack/supply-chain.ts';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const image = $derived(ctx.resource as ContainerImage);
const c = $derived(peek(image));
const findings = $derived(tpaFindings(image));
const running = $derived(world.tasks.some(t => t.status === 'in-progress' && t.name.includes('SBOM')));
let filter = $state<'all' | 'affected' | 'not_affected'>('affected');
const shown = $derived(findings.filter(f => filter === 'all' || (filter === 'affected' ? f.status === 'affected' || f.status === 'under_investigation' : f.status === filter)));

const STATUS_CLASS: Record<string, string> = {
  affected: 'bg-[var(--pd-state-error)] text-[var(--pd-status-contrast)]',
  under_investigation: 'bg-[var(--pd-state-warning)] text-[var(--pd-status-contrast)]',
  not_affected: 'bg-[var(--pd-state-success)] text-[var(--pd-status-contrast)]',
  fixed: 'bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]',
};

function gen(): void {
  generateSbom(image);
}

function upload(): void {
  uploadSbom(image);
}

function setFilter(f: 'all' | 'affected' | 'not_affected'): void {
  filter = f;
}

function recommend(purl: string, fixed?: string): void {
  toast({ type: 'info', title: `POST /api/v2/purl/recommend`, body: fixed ? `${purl.split('@')[0]} → ${fixed}` : `No fixed version known for ${purl}` });
}

function download(): void {
  toast({ type: 'success', title: 'SBOM saved', body: `~/Downloads/${shortRef(image).replace(/[/:]/g, '-')}.cdx.json` });
}
</script>

{#if !c.sbom?.generated}
  <EmptyScreen icon={faFileArrowDown} title="No SBOM for {shortRef(image)}" message="Generate a CycloneDX SBOM with syft, then upload it to Trusted Profile Analyzer ({TPA_URL}) to see vulnerabilities and Red Hat VEX status.">
    <Button onclick={gen} inProgress={running}>Generate SBOM</Button>
  </EmptyScreen>
{:else}
  <div role="region" class="h-full overflow-auto px-5 py-4 space-y-4 text-[var(--pd-content-text)]" aria-label="SBOM">
    <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 flex items-center gap-6">
      <div><div class="text-xs uppercase text-[var(--pd-table-header-text)]">Format</div><div class="font-semibold text-[var(--pd-content-card-header-text)]">{c.sbom.format === 'cyclonedx' ? 'CycloneDX 1.6' : 'SPDX 2.3'}</div></div>
      <div><div class="text-xs uppercase text-[var(--pd-table-header-text)]">Packages</div><div class="font-semibold text-[var(--pd-content-card-header-text)]">{c.sbom.packages}</div></div>
      <div><div class="text-xs uppercase text-[var(--pd-table-header-text)]">Source</div><div class="font-semibold text-[var(--pd-content-card-header-text)]">{c.sbom.source}</div></div>
      <div class="min-w-0"><div class="text-xs uppercase text-[var(--pd-table-header-text)]">TPA document</div><div class="font-mono text-sm truncate">{c.sbom.uploaded ? c.sbom.id : 'Not uploaded'}</div></div>
      <div class="ml-auto flex gap-2">
        <Button type="secondary" icon={faFileArrowDown} onclick={download}>Download</Button>
        {#if !c.sbom.uploaded}<Button icon={faUpload} onclick={upload} inProgress={running}>Upload to TPA</Button>{/if}
      </div>
    </div>
    {#if c.sbom.uploaded}
      <div class="flex items-center gap-2" role="group" aria-label="VEX filter">
        <Button type="tab" selected={filter === 'affected'} onclick={setFilter.bind(undefined, 'affected')}>Affected ({findings.filter(f => f.status === 'affected' || f.status === 'under_investigation').length})</Button>
        <Button type="tab" selected={filter === 'not_affected'} onclick={setFilter.bind(undefined, 'not_affected')}>Not affected via VEX ({findings.filter(f => f.status === 'not_affected').length})</Button>
        <Button type="tab" selected={filter === 'all'} onclick={setFilter.bind(undefined, 'all')}>All ({findings.length})</Button>
      </div>
      <table class="w-full text-left rounded-lg bg-[var(--pd-content-card-bg)]" aria-label="Vulnerabilities">
        <thead class="text-xs uppercase text-[var(--pd-table-header-text)]">
          <tr><th class="p-2">Vulnerability</th><th>Package URL</th><th>Severity</th><th>VEX status</th><th>Fixed in</th><th></th></tr>
        </thead>
        <tbody>
          {#each shown as f (f.vulnerability + f.purl)}
            <tr class="border-t border-[var(--pd-content-divider)]">
              <td class="p-2 text-[var(--pd-table-body-text-highlight)]">{f.vulnerability}{#if f.advisory}<div class="text-xs text-[var(--pd-content-sub-header)]">{f.advisory}</div>{/if}</td>
              <td class="pr-2 font-mono text-xs break-all">{f.purl}</td>
              <td class="pr-2 capitalize">{f.severity}{f.score ? ` ${f.score}` : ''}</td>
              <td class="pr-2"><span class="rounded-sm px-1.5 text-xs font-semibold {STATUS_CLASS[f.status]}">{f.status.replace('_', ' ')}</span>{#if f.justification}<div class="text-xs">{f.justification.replaceAll('_', ' ')}</div>{/if}</td>
              <td class="pr-2 text-sm">{f.fixed ?? '—'}</td>
              <td class="pr-2 text-right">{#if f.status === 'affected'}<Button type="link" onclick={recommend.bind(undefined, f.purl, f.fixed)}>Recommend</Button>{/if}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p>Upload the SBOM to analyze its {c.sbom.packages} packages against Red Hat security data.</p>
    {/if}
  </div>
{/if}
