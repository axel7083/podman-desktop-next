<script lang="ts">
/** Dashboard card "Supply chain posture" (RHADS pack, P17). */
import { navigate } from '#lib/nav.ts';
import { world } from '#lib/world.svelte.ts';

import { isAcme, lastConforma, peek, signatureStatus } from '../supply-chain.ts';

const images = $derived(world.images.filter(isAcme));
const signed = $derived(images.filter(i => signatureStatus(i) === 'verified').length);
const sbom = $derived(images.filter(i => peek(i).sbom?.uploaded).length);
const policy = $derived(images.filter(i => lastConforma(i)?.report.success).length);
const rows = $derived([
  { label: 'Signed', n: signed },
  { label: 'SBOM in TPA', n: sbom },
  { label: 'Policy passing', n: policy },
]);

function open(): void {
  const first = images[0];
  if (first) navigate(`/c/${first.engineId}/images/${first.id}/supply-chain`);
}
</script>

<div role="region" class="space-y-2 text-[var(--pd-content-card-text)]" aria-label="Supply chain posture">
  <div class="text-sm">acme-rhads · {images.length} ACME images on this machine</div>
  {#each rows as r (r.label)}
    <div class="flex items-center gap-2">
      <span class="w-28 text-sm">{r.label}</span>
      <div class="grow h-2 rounded-full bg-[var(--pd-content-card-inset-bg)] overflow-hidden">
        <div class="h-full bg-[var(--pd-state-success)]" style:width="{images.length ? (r.n / images.length) * 100 : 0}%"></div>
      </div>
      <span class="w-10 text-right tabular-nums text-sm">{r.n}/{images.length}</span>
    </div>
  {/each}
  <button class="text-sm text-[var(--pd-link)] hover:underline" onclick={open}>Review images</button>
</div>
