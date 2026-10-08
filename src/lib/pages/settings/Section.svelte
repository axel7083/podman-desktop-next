<script lang="ts">
/** Dispatcher for /settings/[section]: core sections + contributed sections (P17). */
import { EmptyScreen } from '@podman-desktop/ui-svelte';

import Contribution from '#lib/components/Contribution.svelte';
import LazyComponent from '#lib/components/LazyComponent.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { SettingProperty } from '#lib/ext/types.ts';
import { ui } from '#lib/ui.svelte.ts';

import CliTools from './CliTools.svelte';
import PropertiesSection from './PropertiesSection.svelte';
import Registries from './Registries.svelte';
import Resources from './Resources.svelte';
import SettingsPage from './SettingsPage.svelte';

interface Props {
  section: string;
}

let { section }: Props = $props();

const contributed = $derived(registry.settings.find(s => s.id === section));

const appearance: SettingProperty[] = [
  { id: 'preferences.appearance', title: 'Appearance', description: 'Select between light or dark mode, or use your system setting.', type: 'enum', default: 'dark', enum: ['system', 'dark', 'light'] },
  { id: 'preferences.navigationBar', title: 'Show navigation labels', description: 'Show text labels next to the primary navigation icons.', type: 'boolean', default: true },
  { id: 'preferences.terminal.fontSize', title: 'Terminal font size', type: 'number', default: 10 },
  { id: 'preferences.telemetry', title: 'Telemetry', description: 'Help improve Podman Desktop by sending anonymous usage data.', type: 'boolean', default: false },
];

const proxy: SettingProperty[] = [
  { id: 'proxy.mode', title: 'Proxy configuration', type: 'enum', default: 'system', enum: ['disabled', 'manual', 'system'] },
  { id: 'proxy.http', title: 'Web proxy (HTTP)', type: 'string', default: '' },
  { id: 'proxy.https', title: 'Secure web proxy (HTTPS)', type: 'string', default: '' },
  { id: 'proxy.noProxy', title: 'Bypass proxy settings for these hosts and domains', type: 'string', default: 'localhost,127.0.0.1' },
];

const dockerCompat: SettingProperty[] = [
  { id: 'dockerCompatibility.enabled', title: 'Docker compatibility', description: 'Make the Podman socket available to Docker tools (docker CLI, Testcontainers…).', type: 'boolean', default: true },
  { id: 'dockerCompatibility.context', title: 'Docker CLI context', type: 'enum', default: 'podman', enum: ['podman', 'desktop-linux', 'default'] },
];

function onPreference(id: string, value: string | number | boolean): void {
  if (id === 'preferences.appearance' && (value === 'dark' || value === 'light')) ui.setTheme(value);
  if (id === 'preferences.navigationBar') ui.setNavWidth(value ? 200 : 50);
}
</script>

{#if section === 'resources'}
  <Resources />
{:else if section === 'cli-tools'}
  <CliTools />
{:else if section === 'registries'}
  <Registries />
{:else if section === 'proxy'}
  <SettingsPage title="Proxy">
    {#snippet subtitle()}<span>Network proxy used by Podman Desktop and the engines it manages.</span>{/snippet}
    <PropertiesSection properties={proxy} />
  </SettingsPage>
{:else if section === 'docker-compatibility'}
  <SettingsPage title="Docker Compatibility">
    {#snippet subtitle()}<span>Use Docker tooling with Podman.</span>{/snippet}
    <PropertiesSection properties={dockerCompat} />
  </SettingsPage>
{:else if section === 'preferences'}
  <SettingsPage title="Preferences">
    {#snippet subtitle()}<span>Appearance and application behaviour.</span>{/snippet}
    <PropertiesSection properties={appearance} onchange={onPreference} />
  </SettingsPage>
{:else if contributed}
  <SettingsPage title={contributed.title}>
    {#snippet subtitle()}<span>Contributed by {contributed.ext.displayName}</span>{/snippet}
    <Contribution ext={contributed.ext} kind="settings" api="P17">
      {#if contributed.component}
        <LazyComponent component={contributed.component} />
      {:else}
        <PropertiesSection properties={contributed.properties ?? []} />
      {/if}
    </Contribution>
  </SettingsPage>
{:else}
  <EmptyScreen title="Unknown settings section" message="'{section}' is not available. The extension providing it may be disabled." />
{/if}
