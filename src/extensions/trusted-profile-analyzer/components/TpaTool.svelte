<script lang="ts">
/** Tools › Trusted Profile Analyzer: uploaded SBOMs (org view) + search by purl. */
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { NavPage } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import { navigate } from '#lib/nav.ts';
import { world } from '#lib/world.svelte.ts';

import { peek, refOf, TPA_URL } from '../../rhads-pack/supply-chain.ts';

let searchTerm = $state('pkg:rpm/redhat/openssl-libs');

const ORG_SBOMS = [
  { id: 'urn:uuid:019a4f10-2b33-7aa1-8e02-1f7c3d9e0b55', name: 'quay.io/acme/payments-api:1.5.0', published: '2026-10-06T16:02:10Z', packages: 287, source: 'konflux', openssl: true },
  { id: 'urn:uuid:019a2210-9c01-7b0e-b1aa-77d2e4f0c321', name: 'registry.access.redhat.com/ubi9/ubi-minimal:9.8', published: '2026-10-06T07:40:35Z', packages: 104, source: 'redhat', openssl: true },
  { id: 'urn:uuid:019a3a77-0c1e-7d2f-91b0-3e4f5a6b7c8d', name: 'quay.io/acme/payments-worker:1.5.0', published: '2026-10-06T16:04:51Z', packages: 241, source: 'konflux', openssl: true },
  { id: 'urn:uuid:019a1b02-6d7e-7a8b-9c0d-1e2f3a4b5c6d', name: 'quay.io/acme/ledger-worker:0.9.2', published: '2026-10-02T11:20:09Z', packages: 156, source: 'konflux', openssl: true },
  { id: 'urn:uuid:0199f0aa-1b2c-7d3e-8f40-5a6b7c8d9e0f', name: 'registry.redhat.io/rhel9/postgresql-16:9.8', published: '2026-10-01T05:12:44Z', packages: 188, source: 'redhat', openssl: true },
  { id: 'urn:uuid:0199e5c3-4d5e-7f60-8a1b-2c3d4e5f6a7b', name: 'quay.io/acme/notifications:3.1', published: '2026-09-29T14:02:19Z', packages: 97, source: 'konflux', openssl: true },
  { id: 'urn:uuid:0199d1e2-3f4a-7b5c-8d6e-7f8091a2b3c4', name: 'quay.io/acme/edge-agent:0.4', published: '2026-09-25T08:41:00Z', packages: 63, source: 'konflux', openssl: true },
  { id: 'urn:uuid:0199c0b1-2a3b-7c4d-9e5f-6a7b8c9d0e1f', name: 'quay.io/acme/legacy-portal:1.9', published: '2025-09-02T10:00:00Z', packages: 512, source: 'podman-desktop', openssl: false },
];

const local = $derived(
  world.images
    .filter(i => peek(i).sbom?.uploaded && peek(i).sbom?.source === 'podman-desktop')
    .map(i => ({ id: peek(i).sbom?.id ?? '', name: refOf(i), published: peek(i).sbom?.published ?? '', packages: peek(i).sbom?.packages ?? 0, source: 'podman-desktop', openssl: true })),
);
const all = $derived([...local, ...ORG_SBOMS.filter(s => !local.some(l => l.name === s.name))]);
const matching = $derived(
  all.filter(s => {
    const t = searchTerm.toLowerCase().trim();
    if (!t) return true;
    if (t.startsWith('pkg:')) return t.includes('openssl') ? s.openssl : false;
    return s.name.toLowerCase().includes(t);
  }),
);

function localImage(name: string): string | undefined {
  const img = world.images.find(i => refOf(i) === name);
  return img ? `/c/${img.engineId}/images/${img.id}/sbom` : undefined;
}

function open(path: string): void {
  navigate(path);
}
</script>

<NavPage bind:searchTerm={searchTerm} title="Trusted Profile Analyzer">
  {#snippet bottomAdditionalActions()}
    <span class="text-sm text-[var(--pd-content-text)]">{TPA_URL} · TPA 2.2 · {matching.length} of {all.length} SBOMs</span>
  {/snippet}
  {#snippet content()}
    <div role="region" class="w-full px-5 py-3 space-y-2 text-[var(--pd-content-text)]" aria-label="SBOMs">
      {#if searchTerm.startsWith('pkg:')}
        <div class="flex items-center gap-2 text-sm"><Icon icon={faMagnifyingGlass} /> {matching.length} SBOMs contain <span class="font-mono">{searchTerm}</span> · {matching.filter(m => localImage(m.name)).length} match local images</div>
      {/if}
      {#each matching as s (s.id)}
        {@const href = localImage(s.name)}
        <div class="flex items-center gap-4 rounded-lg bg-[var(--pd-content-card-bg)] px-4 h-12">
          <div class="grow min-w-0">
            <div class="text-[var(--pd-table-body-text-highlight)] truncate">{s.name}</div>
            <div class="text-xs font-mono truncate">{s.id}</div>
          </div>
          <span class="text-sm w-28">{s.packages} packages</span>
          <span class="text-xs rounded-sm px-1.5 py-0.5 bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] w-28 text-center">source: {s.source}</span>
          <span class="text-sm w-40">{s.published.slice(0, 10)}</span>
          {#if href}<button class="text-sm text-[var(--pd-link)] hover:underline w-24 text-right" onclick={open.bind(undefined, href)}>Local image</button>{:else}<span class="w-24"></span>{/if}
        </div>
      {/each}
    </div>
  {/snippet}
</NavPage>
