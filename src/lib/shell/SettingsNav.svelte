<script lang="ts">
/** Settings navigation – PD's PreferencesNavigation.svelte with ui-svelte SettingsNavItem. */
import { SettingsNavItem } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import CLIToolsIcon from '#lib/images/CLIToolsIcon.svelte';
import DockerCompatibilityIcon from '#lib/images/DockerCompatibilityIcon.svelte';
import PreferencesIcon from '#lib/images/PreferencesIcon.svelte';
import ProxyIcon from '#lib/images/ProxyIcon.svelte';
import RegistriesIcon from '#lib/images/RegistriesIcon.svelte';
import ResourcesIcon from '#lib/images/ResourcesIcon.svelte';
import { href } from '#lib/nav.ts';

interface Props {
  section: string | undefined;
}

let { section }: Props = $props();

const core = [
  { id: 'resources', title: 'Resources', icon: ResourcesIcon },
  { id: 'cli-tools', title: 'CLI Tools', icon: CLIToolsIcon },
  { id: 'registries', title: 'Registries', icon: RegistriesIcon },
  { id: 'proxy', title: 'Proxy', icon: ProxyIcon },
  { id: 'docker-compatibility', title: 'Docker Compatibility', icon: DockerCompatibilityIcon },
  { id: 'preferences', title: 'Preferences', icon: PreferencesIcon },
];

const contributed = $derived(registry.settings.toSorted((a, b) => a.title.localeCompare(b.title)));
</script>

<nav
  class="z-1 w-[220px] min-w-[220px] max-w-none shrink-0 flex-col justify-between flex bg-[var(--pd-secondary-nav-bg)] border-[var(--pd-global-nav-bg-border)] border-r-[1px]"
  aria-label="PreferencesNavigation">
  <div class="flex items-center">
    <div class="pt-4 px-3 mb-5">
      <p class="text-xl font-semibold text-[color:var(--pd-secondary-nav-header-text)] border-l-[4px] border-transparent">
        Settings
      </p>
    </div>
  </div>
  <div class="h-full overflow-y-auto" style="margin-bottom:auto">
    {#each core as item (item.id)}
      <SettingsNavItem title={item.title} href={href(`/settings/${item.id}`)} icon={item.icon} selected={section === item.id} />
    {/each}
    {#if registry.settings.length}
      <div class="flex items-center gap-2 px-4 pt-4 pb-1.5" role="separator" aria-label="Extension settings">
        <span class="text-[11px] font-semibold text-[var(--pd-nav-group-header)]">Extensions</span>
        <span class="grow border-t border-[var(--pd-global-nav-bg-border)]"></span>
      </div>
    {/if}
    <!-- contributed rows: SettingsNavItem markup, but with the contributing extension's
         icon (ui-svelte Icon cannot render image paths) and authored sentence case -->
    {#each contributed as s (s.ext.id + s.id)}
      {@const selected = section === s.id}
      <Contribution ext={s.ext} kind="settings" api="P17">
        <a class="no-underline block w-full" href={href(`/settings/${s.id}`)} aria-label={s.title} title="{s.title} – {s.ext.displayName}" aria-current={selected ? 'page' : undefined}>
          <div
            class="flex box-border w-full py-2 pl-3 pr-3 items-center cursor-pointer border-l-[4px] text-md font-medium {selected
              ? 'bg-[var(--pd-secondary-nav-selected-bg)] border-[var(--pd-secondary-nav-selected-highlight)] text-[color:var(--pd-secondary-nav-text-selected)]'
              : 'border-[var(--pd-secondary-nav-bg)] text-[color:var(--pd-secondary-nav-text)] hover:text-[color:var(--pd-secondary-nav-text-hover)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)] hover:border-[var(--pd-secondary-nav-text-hover-bg)]'}">
            <span class="flex flex-row gap-x-2 items-center min-w-0 grow">
              <span class="w-4 shrink-0 flex justify-center"><AppIcon icon={s.icon ?? s.ext.icon} size="16px" /></span>
              <span class="block truncate">{s.title}</span>
            </span>
          </div>
        </a>
      </Contribution>
    {/each}
  </div>
</nav>
