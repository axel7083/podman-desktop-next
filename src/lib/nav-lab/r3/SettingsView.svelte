<script lang="ts">
/** P13 Settings tab: PD settings nav; CLI Tools (PD cards) and Authentication (empty + available extensions). */
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import SettingsIcon from '#lib/images/SettingsIcon.svelte';

import ExtCards from './ExtCards.svelte';
import Head from './Head.svelte';

let page = $state('CLI Tools');
const PAGES = ['Resources', 'Proxy', 'Registries', 'Authentication', 'CLI Tools', 'Kubernetes', 'Experimental', 'Preferences'];

const TOOLS: [string, string, string, string, string, string?][] = [
  ['kubectl', 'icons/podman-desktop.kubectl-cli.png', 'kubectl is a command line tool for communicating with a Kubernetes cluster control plane.', 'Kubernetes', 'v1.33.2', 'v1.34.1'],
  ['Compose', 'icons/podman-desktop.compose.png', 'Compose is a tool for defining and running multi-container applications.', 'Compose', 'v2.39.1'],
  ['kind', 'icons/podman-desktop.kind.png', 'Kind is a tool for running local Kubernetes clusters using container "nodes".', 'Kind', 'v0.29.0', 'v0.30.0'],
  ['Podman', 'icons/podman-desktop.podman.png', 'Podman is a daemonless container engine.', 'Podman', 'v5.6.1'],
];
</script>

<div class="flex flex-col h-full min-h-0">
  <Head icon={SettingsIcon} title="Settings" sub={page} />
  <div class="flex flex-1 min-h-0">
    <nav aria-label="Settings" class="w-48 shrink-0 py-2 border-r border-[var(--pd-content-divider)] bg-[var(--pd-secondary-nav-bg)] text-[13px]">
      {#each PAGES as p (p)}
        <button type="button" class="w-full text-left h-8 px-4 text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]" class:bg-[var(--pd-secondary-nav-selected-bg)]={page === p} class:!text-[var(--pd-secondary-nav-text-selected)]={page === p} onclick={(): void => { page = p; }}>{p}</button>
      {/each}
    </nav>
    <div class="flex-1 min-w-0 overflow-auto p-5 text-[13px]">
      {#if page === 'CLI Tools'}
        <div class="pb-3 text-[var(--pd-content-text)]">Command line tools installed and registered by extensions.</div>
        <div data-testid="cli-tools" class="flex flex-col gap-3">
          {#each TOOLS as [name, icon, desc, by, ver, update] (name)}
            <div class="flex rounded-lg bg-[var(--pd-content-card-bg)] p-4 gap-4">
              <div class="flex items-center gap-3 w-48 shrink-0"><AppIcon {icon} size="32px" /><span class="text-base font-semibold text-[var(--pd-content-card-header-text)]">{name}</span></div>
              <div class="flex-1 min-w-0 flex flex-col gap-2">
                <div class="text-[var(--pd-content-card-text)]">{desc}</div>
                <div class="text-xs text-[var(--pd-content-card-text)] opacity-80">Registered by {by}</div>
                <div class="flex items-center gap-3">
                  <span class="px-2 py-1 rounded-md border border-[var(--pd-content-divider)] bg-[var(--pd-content-card-inset-bg)] font-mono text-xs">{name.toLowerCase()} {ver}</span>
                  {#if update}<button type="button" class="text-[var(--pd-link)] hover:underline text-xs">Update available ({update})</button>{/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else if page === 'Authentication'}
        <div class="flex flex-col items-center py-8 text-center">
          <div class="text-lg font-semibold text-[var(--pd-details-empty-header)]">No authentication providers</div>
          <div class="pt-1 text-[var(--pd-details-empty-sub-header)]">Install an extension to sign in to Red Hat, GitHub or a cloud provider.</div>
        </div>
        <ExtCards ids={['sandbox', 'openshift-local', 'rhel', 'aap']} />
      {:else}
        <div class="flex flex-col gap-2 max-w-3xl">
          <div class="text-base font-semibold text-[var(--pd-content-header)] pb-2">{page}</div>
          {#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
            <div class="flex items-center gap-3 h-12 px-4 rounded-lg bg-[var(--pd-content-card-bg)]"><span class="flex-1">{page} setting {i + 1}</span><Button type="secondary">Edit</Button></div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
