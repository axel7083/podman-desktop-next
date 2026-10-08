<script lang="ts">
/** Tools › Hardened images: Hummingbird catalog and local images with an alternative. */
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import { href } from '#lib/nav.ts';
import { runTask, shortImage, world } from '#lib/world.svelte.ts';

import { alternativeFor, CATALOG } from '../data.ts';

let searchTerm = $state('');
const items = $derived(CATALOG.filter(c => c.name.includes(searchTerm.toLowerCase())));
const candidates = $derived(world.images.filter(i => !i.base?.startsWith('hummingbird') && alternativeFor(i.base, i.name)));

function pull(name: string, tag: string): void {
  runTask({ name: `Pull quay.io/hummingbird/${name}:${tag}`, ext: 'redhat.hummingbird', steps: [{ label: 'Copying blobs', ms: 1500 }, { label: 'Writing manifest', ms: 400 }] });
}
</script>

<NavPage title="Hardened images" bind:searchTerm={searchTerm}>
  {#snippet content()}
    <div class="px-5 pb-5 space-y-4 text-[var(--pd-content-card-text)]">
      {#if candidates.length}
        <section class="rounded-lg bg-[var(--pd-content-card-bg)] p-4" aria-label="Rebase suggestions">
          <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] mb-2"><Icon icon={faShieldHalved} /> {candidates.length} local images have a hardened alternative</h2>
          {#each candidates as i (i.id)}
            {@const alt = alternativeFor(i.base, i.name)}
            <div class="flex items-center gap-3 py-1.5 border-t border-[var(--pd-content-divider)]">
              <a class="text-[var(--pd-link)] w-80 truncate" href={href(`/c/${i.engineId}/images/${i.id}/security`)}>{shortImage(i.name)}:{i.tag}</a>
              <span class="grow">→ quay.io/hummingbird/{alt?.image.name}:{alt?.image.latest_tag} · {alt?.localCves} → {alt?.image.vulnerabilities.total} CVEs · {Math.round(i.size / 1048576)} → {alt?.image.sizeMB} MB</span>
            </div>
          {/each}
        </section>
      {/if}
      <div class="grid grid-cols-3 gap-3" aria-label="Catalog">
        {#each items as c (c.name)}
          <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-4 flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="grow font-semibold text-[var(--pd-content-card-header-text)]">hummingbird/{c.name}</span>
              <span class="text-xs rounded-sm px-1.5 bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">{c.application_category}</span>
            </div>
            <div class="text-sm">{c.description}</div>
            <div class="text-sm">:{c.latest_tag} · {c.architectures.join(', ')} · {c.sizeMB} MB</div>
            <div class="text-sm {c.vulnerabilities.total ? '' : 'text-[var(--pd-state-success)]'}">{c.vulnerabilities.total} CVEs ({c.vulnerabilities.critical} critical)</div>
            <div class="mt-1"><Button type="secondary" onclick={pull.bind(undefined, c.name, c.latest_tag)}>Pull</Button></div>
          </div>
        {/each}
      </div>
    </div>
  {/snippet}
</NavPage>
