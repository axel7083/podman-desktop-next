<script lang="ts">
/** Developer Hub › Templates (P2): software template cards; `?template=` opens the scaffolder form. */
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate, appUrl } from '#lib/nav.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';

import Pill from '../../_appdev/Pill.svelte';
import { hub, type SoftwareTemplate } from '../data.ts';
import TemplateForm from './TemplateForm.svelte';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
const templateName = $derived(appUrl().searchParams.get('template'));
const templates = $derived(hub(conn.id).templates);
const rows = $derived(templates.filter(t => `${t.title} ${t.description} ${t.tags.join(' ')}`.toLowerCase().includes(searchTerm.toLowerCase())));
const selected = $derived(templateName ? templates.find(t => t.name === templateName) : undefined);

function choose(t: SoftwareTemplate): void {
  navigate(`/c/${conn.id}/templates?template=${encodeURIComponent(t.name)}`);
}
</script>

{#if selected}
  {#key selected.name}
    <TemplateForm {conn} template={selected} />
  {/key}
{:else}
  <NavPage bind:searchTerm={searchTerm} title="templates">
    {#snippet content()}
      {#if conn.status !== 'started'}
        <ConnectionStoppedScreen {conn} kind="templates" />
      {:else}
        <div class="w-full h-full overflow-auto px-5 py-4">
          <div class="grid grid-cols-3 gap-3">
            {#each rows as t (t.name)}
              <section class="flex flex-col rounded-lg p-4 bg-[var(--pd-content-card-bg)] text-[var(--pd-content-card-text)]" aria-label={t.title}>
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs uppercase font-semibold opacity-70">{t.type}</span>
                  <span class="grow"></span>
                  <span class="text-xs opacity-70">{t.owner}</span>
                </div>
                <h2 class="text-base font-semibold text-[var(--pd-content-card-header-text)] mb-1">{t.title}</h2>
                <p class="text-sm grow">{t.description}</p>
                <div class="flex flex-wrap gap-1 my-3">
                  {#each t.tags as tag (tag)}<Pill label={tag} />{/each}
                </div>
                <div class="flex justify-end">
                  <Button icon={faWandMagicSparkles} onclick={choose.bind(undefined, t)} aria-label="Choose {t.title}">Choose</Button>
                </div>
              </section>
            {:else}
              <p class="text-[var(--pd-content-text)]">No template matches "{searchTerm}".</p>
            {/each}
          </div>
        </div>
      {/if}
    {/snippet}
  </NavPage>
{/if}
