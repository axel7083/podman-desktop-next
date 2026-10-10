<script lang="ts">
/** P13 Settings tab: PD settings nav; CLI Tools (PD cards) and Authentication (empty + available extensions). */
import SettingsIcon from '#lib/images/SettingsIcon.svelte';

import LabIcon from '../ui/LabIcon.svelte';
import Btn from './Btn.svelte';
import ExtCards from './ExtCards.svelte';
import { flows, openModal } from './flows.svelte.ts';
import Head from './Head.svelte';
import { isInstalled } from './exts.ts';

let page = $state('Registries');
const PAGES = ['Resources', 'Proxy', 'Registries', 'Authentication', 'CLI Tools', 'Kubernetes', 'Experimental', 'Preferences'];

const BASE_TOOLS: [string, string, string, string, string, string?][] = [
  ['kubectl', 'icons/podman-desktop.kubectl-cli.png', 'kubectl is a command line tool for communicating with a Kubernetes cluster control plane.', 'Kubernetes', 'v1.33.2', 'v1.34.1'],
  ['Compose', 'icons/podman-desktop.compose.png', 'Compose is a tool for defining and running multi-container applications.', 'Compose', 'v2.39.1'],
  ['kind', 'icons/podman-desktop.kind.png', 'Kind is a tool for running local Kubernetes clusters using container "nodes".', 'Kind', 'v0.29.0', 'v0.30.0'],
  ['Podman', 'icons/podman-desktop.podman.png', 'Podman is a daemonless container engine.', 'Podman', 'v5.6.1'],
];
/** The kompose binary (and its version) is managed here, not in the Kompose tab. */
const KOMPOSE_TOOL: [string, string, string, string, string, string?] = ['Kompose', 'icons/kubernetes.kompose.png', 'Kompose converts Compose files, pods and containers into Kubernetes resources.', 'Kompose', 'v1.37.0', 'v1.38.0'];
const TOOLS = $derived(isInstalled('kompose') ? [...BASE_TOOLS, KOMPOSE_TOOL] : BASE_TOOLS);
</script>

<div class="flex flex-col h-full min-h-0">
  <Head icon={SettingsIcon} title="Settings" sub={page} />
  <div class="flex flex-1 min-h-0">
    <nav aria-label="Settings" class="w-48 shrink-0 py-2 border-r border-[var(--pd-content-divider)] bg-[var(--pd-secondary-nav-bg)] text-[13px]">
      {#each PAGES as p (p)}
        <button type="button" class="w-full text-left h-7 px-4 text-[var(--pd-secondary-nav-text)] hover:bg-[var(--pd-secondary-nav-text-hover-bg)]" class:bg-[var(--pd-secondary-nav-selected-bg)]={page === p} class:!text-[var(--pd-secondary-nav-text-selected)]={page === p} onclick={(): void => { page = p; }}>{p}</button>
      {/each}
    </nav>
    <div class="flex-1 min-w-0 overflow-auto p-5 text-[13px]">
      {#if page === 'CLI Tools'}
        <div class="pb-3 text-[var(--pd-table-body-text)]">Command line tools installed and registered by extensions.</div>
        <div data-testid="cli-tools" class="flex flex-col gap-3">
          {#each TOOLS as [name, icon, desc, by, ver, update] (name)}
            <div data-testid="cli-tool" data-tool={name} class="flex rounded-lg bg-[var(--pd-content-card-bg)] p-4 gap-4">
              <div class="flex items-center gap-3 w-48 shrink-0"><LabIcon {icon} size={32} /><span class="text-[14px] font-semibold text-[var(--pd-content-header)]">{name}</span></div>
              <div class="flex-1 min-w-0 flex flex-col gap-2">
                <div class="text-[var(--pd-content-header)]">{desc}</div>
                <div class="text-[12px] text-[var(--pd-table-body-text)]">Registered by {by}</div>
                <div class="flex items-center gap-3">
                  <span class="px-2 py-1 rounded-md border border-[var(--pd-content-divider)] bg-[var(--pd-content-card-inset-bg)] font-mono text-[12px]">{name.toLowerCase()} {ver}</span>
                  {#if update}<Btn>Update to {update}</Btn>{/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else if page === 'Registries'}
        <div class="pb-3 text-[var(--pd-table-body-text)]">Registries used to pull and push images, with their credentials.</div>
        <div data-testid="registries" class="flex flex-col gap-2 max-w-4xl">
          {#each [['docker.io', 'Docker Hub', '—', ''], ['quay.io', 'Red Hat Quay', 'acme+ci_push (robot)', ''], ['ghcr.io', 'GitHub', '—', ''], ...(flows.account ? [['registry.redhat.io', 'Red Hat', `${flows.account.org}|podman-desktop`, 'Configured by Red Hat account']] : [])] as [host, name, user, by] (host)}
            <div data-registry={host} class="flex items-center gap-3 h-12 px-4 rounded-lg bg-[var(--pd-content-card-bg)]">
              <span class="w-44 font-mono text-[12px] text-[var(--pd-content-header)]">{host}</span>
              <span class="w-32 text-[var(--pd-table-body-text)]">{name}</span>
              <span class="flex-1 font-mono text-[12px] text-[var(--pd-table-body-text)]">{user}</span>
              {#if by}<span data-testid="registry-managed" class="flex items-center gap-1.5 h-6 px-2 rounded-full text-[12px] bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]"><LabIcon icon="icons/redhat.redhat-authentication.png" size={14} />{by}</span>{:else}<Btn>Edit</Btn>{/if}
            </div>
          {/each}
          {#if !flows.account}
            <div class="flex items-center gap-3 h-12 px-4 rounded-lg border border-dashed border-[var(--pd-content-divider)]">
              <span class="w-44 font-mono text-[12px] text-[var(--pd-content-header)]">registry.redhat.io</span>
              <span class="flex-1 text-[var(--pd-table-body-text)]">Sign in with your Red Hat account to configure it automatically.</span>
              <Btn icon="icons/redhat.redhat-authentication.png" onclick={(): void => openModal('rh-signin')}>Sign in with Red Hat</Btn>
            </div>
          {/if}
        </div>
      {:else if page === 'Authentication'}
        <div class="flex flex-col items-center py-8 text-center">
          <div class="text-[16px] font-semibold text-[var(--pd-details-empty-header)]">No authentication providers</div>
          <div class="pt-1 text-[var(--pd-details-empty-sub-header)]">Install an extension to sign in to Red Hat, GitHub or a cloud provider.</div>
        </div>
        <ExtCards ids={['rhel', 'aap']} />
      {:else}
        <div class="flex flex-col gap-2 max-w-3xl">
          <div class="text-[14px] font-semibold text-[var(--pd-content-header)] pb-2">{page}</div>
          {#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
            <div class="flex items-center gap-3 h-12 px-4 rounded-lg bg-[var(--pd-content-card-bg)]"><span class="flex-1">{page} setting {i + 1}</span><Btn>Edit</Btn></div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
