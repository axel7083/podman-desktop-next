<script lang="ts">
/** Settings › Registries – PD's PreferencesRegistriesEditing (table of registries with login state). */
import { faPlusCircle, faUser } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import { toast } from '#lib/world.svelte.ts';

import SettingsPage from './SettingsPage.svelte';

/** One row per server: a contribution with credentials wins over a suggestion. */
const rows = $derived.by(() => {
  const byServer = new Map<string, (typeof registry.registries)[number]>();
  for (const r of registry.registries) {
    const existing = byServer.get(r.server);
    if (!existing || (!existing.user && r.user)) byServer.set(r.server, r);
  }
  return [...byServer.values()];
});

function add(): void {
  toast({ type: 'info', title: 'Add registry', body: 'Registry form is out of scope for this wave.' });
}

function configure(name: string): void {
  toast({ type: 'info', title: `Configure ${name}` });
}
</script>

<SettingsPage title="Registries">
  {#snippet subtitle()}<span>Configure the image registries Podman Desktop authenticates to.</span>{/snippet}
  {#snippet actions()}<Button icon={faPlusCircle} onclick={add}>Add registry</Button>{/snippet}
  <div class="bg-[var(--pd-invert-content-card-bg)] rounded-md">
    <div class="grid grid-cols-[2fr_2fr_1.5fr_120px] px-4 py-2 text-xs uppercase font-semibold text-[var(--pd-table-header-text)] border-b border-[var(--pd-content-divider)]">
      <span>Repository</span><span>Server</span><span>Username</span><span></span>
    </div>
    {#each rows as r (r.ext.id + r.id)}
      <Contribution ext={r.ext} kind="registry" api="P16">
        <div class="grid grid-cols-[2fr_2fr_1.5fr_120px] items-center px-4 py-2.5 border-b last:border-b-0 border-[var(--pd-content-divider)] text-[var(--pd-invert-content-card-text)]">
          <span class="flex items-center gap-2 font-semibold text-[var(--pd-invert-content-card-header-text)]">
            <span class="w-5 flex justify-center">{#if r.icon}<AppIcon icon={r.icon} size="18px" />{/if}</span>{r.name}
          </span>
          <span>{r.server}</span>
          <span class="flex items-center gap-1.5">{#if r.user}<Icon icon={faUser} size="xs" />{r.user}{:else}<span class="text-[var(--pd-content-sub-header)]">Not logged in</span>{/if}</span>
          <span class="text-right"><Button type="link" onclick={configure.bind(undefined, r.name)}>{r.user ? 'Edit' : 'Configure'}</Button></span>
        </div>
      </Contribution>
    {/each}
  </div>
</SettingsPage>
