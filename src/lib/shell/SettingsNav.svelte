<script lang="ts">
/** Settings navigation – PD's PreferencesNavigation.svelte with ui-svelte SettingsNavItem. */
import { SettingsNavItem } from '@podman-desktop/ui-svelte';

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
</script>

<nav
  class="z-1 w-leftsidebar min-w-leftsidebar max-w-none shrink-0 flex-col justify-between flex bg-[var(--pd-secondary-nav-bg)] border-[var(--pd-global-nav-bg-border)] border-r-[1px]"
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
    {#each registry.settings as s (s.ext.id + s.id)}
      <Contribution ext={s.ext} kind="settings" api="P17">
        <SettingsNavItem title={s.title} href={href(`/settings/${s.id}`)} icon={PreferencesIcon} selected={section === s.id} />
      </Contribution>
    {/each}
  </div>
</nav>
