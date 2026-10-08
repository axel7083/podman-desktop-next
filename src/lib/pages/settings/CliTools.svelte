<script lang="ts">
/** Settings › CLI Tools – PD's PreferencesCliToolsRendering / PreferencesCliTool (P17 CLI lifecycle). */
import { faCircleArrowUp } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { CliToolDef, Contributed } from '#lib/ext/types.ts';
import { runTask, world } from '#lib/world.svelte.ts';

import SettingsPage from './SettingsPage.svelte';

function versionOf(t: Contributed<CliToolDef>): string | undefined {
  return (world.settings[`cli.${t.ext.id}.${t.id}`] as string | undefined) ?? t.version;
}

function update(t: Contributed<CliToolDef>): void {
  const key = `cli.${t.ext.id}.${t.id}`;
  runTask({
    name: `Update ${t.displayName} to v${t.latest}`,
    ext: t.ext.id,
    steps: [
      { label: `Downloading ${t.name} v${t.latest}`, ms: 1800 },
      { label: 'Verifying checksum', ms: 400 },
      { label: `Installing to ${t.path ?? '/usr/local/bin'}`, ms: 600 },
    ],
    onDone: () => (world.settings[key] = t.latest ?? ''),
  });
}
</script>

<SettingsPage title="CLI Tools">
  {#snippet subtitle()}<span>Command-line tools installed and kept up to date by extensions.</span>{/snippet}
  {#each registry.cliTools as t (t.ext.id + t.id)}
    {@const version = versionOf(t)}
    <Contribution ext={t.ext} kind="cliTool" api="P17">
      <div role="row" class="bg-[var(--pd-invert-content-card-bg)] mb-5 rounded-md p-3 flex flex-col" aria-label={t.displayName}>
        <div class="divide-x divide-[var(--pd-content-divider)] flex flex-row">
          <div class="w-[170px] h-full flex flex-col justify-between pr-3">
            <div class="flex flex-row">
              <AppIcon icon={t.ext.icon} size="40px" class="max-w-[40px] max-h-[40px] shrink-0" title="{t.name} logo" />
              <span class="my-auto ml-3 break-all font-semibold text-[var(--pd-invert-content-header-text)]" aria-label="cli-name">{t.name}</span>
            </div>
            {#if t.latest && version !== t.latest}
              <div class="mt-2">
                <Button icon={faCircleArrowUp} onclick={update.bind(undefined, t)} title="Update to v{t.latest}">Update to v{t.latest}</Button>
              </div>
            {/if}
          </div>
          <div class="flex flex-col px-3 grow text-[var(--pd-invert-content-card-text)]">
            <span class="font-semibold text-[var(--pd-invert-content-card-header-text)]">{t.displayName}</span>
            <span aria-label="cli-display-name">{t.description}</span>
            <div class="flex flex-row items-center mt-2 gap-2 text-sm">
              {#if version}
                <span class="text-[var(--pd-invert-content-card-text)]">{t.name} v{version}</span>
                {#if t.path}<span class="text-[var(--pd-content-sub-header)] truncate">· {t.path}</span>{/if}
              {:else}
                <span class="text-[var(--pd-content-sub-header)]">Not installed</span>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </Contribution>
  {/each}
</SettingsPage>
