<script lang="ts">
/** zot › Repositories: catalog, tags and OCI 1.1 referrers (signatures, SBOMs). */
import { faBoxArchive, faCopy } from '@fortawesome/free-solid-svg-icons';
import { EmptyScreen, NavPage } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import type { ConnectionView } from '#lib/ext/types.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import { toast, world } from '#lib/world.svelte.ts';

import { LR, type Repo, SEED_REPOS } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
const list = $derived((world.ext[LR]?.repos as Repo[] | undefined) ?? SEED_REPOS);
const filtered = $derived(list.filter(r => r.name.includes(searchTerm)));

function copy(ref: string): void {
  navigator.clipboard?.writeText(ref).catch(() => undefined);
  toast({ type: 'success', title: 'Copied', body: ref });
}

function kindOf(t?: string): string {
  if (!t) return 'image';
  if (t.includes('helm')) return 'Helm chart';
  if (t.includes('sigstore')) return 'signature';
  if (t.includes('cyclonedx')) return 'SBOM';
  return t;
}
</script>

<NavPage bind:searchTerm={searchTerm} title="Repositories">
  {#snippet bottomAdditionalActions()}<span class="text-sm text-[var(--pd-content-text)]">{conn.endpoint}/v2/_catalog · {list.length} repositories</span>{/snippet}
  {#snippet content()}
    {#if conn.status !== 'started'}
      <ConnectionStoppedScreen {conn} kind="repositories" />
    {:else if filtered.length === 0}
      <EmptyScreen icon={faBoxArchive} title="No repositories" message="Push an image with “Push to local registry” from the Images list." />
    {:else}
      <div role="region" class="w-full px-5 py-3 space-y-2 text-[var(--pd-content-text)]" aria-label="Repositories">
        {#each filtered as r (r.name)}
          <div class="rounded-lg bg-[var(--pd-content-card-bg)] px-4 py-3">
            <div class="flex items-center gap-3">
              <Icon icon={faBoxArchive} />
              <span class="text-[var(--pd-table-body-text-highlight)] grow">localhost:5000/{r.name}</span>
              <span class="text-xs rounded-sm px-1.5 py-0.5 bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">{kindOf(r.artifactType)}</span>
              {#if r.pushed && Date.now() - r.pushed < 10 * 60_000}<span class="text-xs text-[var(--pd-state-success)]">just pushed</span>{/if}
            </div>
            <div class="flex flex-wrap gap-2 mt-2 pl-7">
              {#each r.tags as t (t)}
                <button class="flex items-center gap-1 text-sm rounded-sm px-2 py-0.5 bg-[var(--pd-content-card-inset-surface)] hover:text-[var(--pd-link)]" title="Copy reference" aria-label="Copy localhost:5000/{r.name}:{t}" onclick={copy.bind(undefined, `localhost:5000/${r.name}:${t}`)}>
                  {t} <Icon icon={faCopy} size="xs" />
                </button>
              {/each}
            </div>
            {#if r.referrers?.length}
              <div class="mt-2 pl-7 text-sm space-y-0.5">
                {#each r.referrers as ref (ref.artifactType)}
                  <div>↳ referrer <span class="font-mono">{ref.subject}</span> · {kindOf(ref.artifactType)} <span class="text-xs text-[var(--pd-content-sub-header)]">({ref.artifactType})</span></div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/snippet}
</NavPage>
