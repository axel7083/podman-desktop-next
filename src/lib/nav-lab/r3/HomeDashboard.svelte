<script lang="ts">
/**
 * P13 Dashboard tab, close to today's PD 1.29 dashboard: title + customize
 * pencil, the recommended-extension banner (purple gradient, close ✕),
 * collapsible "Explore Features", "Learning Center" (carousel) and "System
 * Overview" (status pill, providers with version, status and start/stop).
 */
import {
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faDownload,
  faHouse,
  faPenToSquare,
  faPlay,
  faStop,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import { ContainerIcon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import ImageIcon from '#lib/images/ImageIcon.svelte';
import KubernetesIcon from '#lib/images/KubernetesIcon.svelte';
import PodIcon from '#lib/images/PodIcon.svelte';

import { type LabTarget, STATUS_DOT } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { labConns } from '../r2/simple.ts';
import ConnIcon from '../ui/ConnIcon.svelte';
import ActBtn from './ActBtn.svelte';
import { hash } from './details.ts';
import { ext, installExt, isInstalled } from './exts.ts';
import Head from './Head.svelte';
import { connStatus, isUp, toggleConn } from './live.svelte.ts';

interface Props {
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { onopen }: Props = $props();

let banner = $state(true);
let collapsed = $state<string[]>([]);
let strip = $state<HTMLDivElement>();

const conns = $derived(labConns());
const engines = $derived(conns.filter(c => c.group === 'Engines'));
const kube = $derived(conns.filter(c => c.group === 'Kubernetes'));
const promo = $derived(['ai-lab', 'bootc', 'grype'].find(id => !isInstalled(id)) ?? 'ai-lab');
const BANNERS: Record<string, [string, string]> = {
  'ai-lab': ['Supercharge your apps with Podman AI Lab!', 'Run open models locally, start from AI recipes, and chat with models in playgrounds. Serve them with an OpenAI-compatible API to your containers.'],
  bootc: ['Build bootable OS images from containers', 'Turn a Containerfile into a bootable operating system and build qcow2, raw, ISO or AMI disk images.'],
  grype: ['Find vulnerabilities before you ship', 'Scan images and containers for known CVEs right from the images list.'],
};
const allOk = $derived(conns.every(c => connStatus(c) !== 'error'));

const FEATURES: [string, string, import('#lib/ext/types.ts').IconRef, LabTarget][] = [
  ['Run a container', 'Start your first container from an image and open it in a tab.', ContainerIcon, { kind: 'list', connId: 'podman-machine-default', sectionId: 'containers' }],
  ['Pull or build an image', 'Pull from a registry or build from a Containerfile.', ImageIcon, { kind: 'list', connId: 'podman-machine-default', sectionId: 'images' }],
  ['Group containers in pods', 'Create pods or play a Kubernetes YAML locally.', PodIcon, { kind: 'kubeplay', connId: 'podman-machine-default' }],
  ['Work with Kubernetes', 'Create a local cluster or connect to a remote one.', KubernetesIcon, { kind: 'connection', connId: 'kind-dev' }],
];

const GUIDES: [string, string, string][] = [
  ['Quarkus', 'Build and run a Quarkus app in a container with dev services.', 'icons/redhat.quarkus.png'],
  ['Spring Boot', 'Containerize a Spring Boot application with a Containerfile.', 'icons/podman-desktop.podman.png'],
  ['Python containers', 'Package a Python web app with UBI and run it with Podman.', 'icons/podman-desktop.podman.png'],
  ['LLMs with Podman AI Lab', 'Run a local model and wire it into your app with AI Lab.', 'icons/redhat.ai-lab.png'],
  ['Kubernetes with Kind', 'Create a local cluster and deploy a pod to it.', 'icons/podman-desktop.kind.png'],
  ['Quadlets', 'Run containers as systemd services with Quadlet.', 'icons/podman-desktop.quadlet.png'],
];

function toggle(id: string): void {
  collapsed = collapsed.includes(id) ? collapsed.filter(x => x !== id) : [...collapsed, id];
}

function scroll(dir: number): void {
  strip?.scrollBy({ left: dir * 420, behavior: 'smooth' });
}

function version(id: string): string {
  return id.includes('docker') ? 'v28.4.0' : id.includes('kind') ? 'v0.29.0' : id.includes('ocp') || id.includes('openshift') ? 'v4.19.3' : `v5.6.${hash(id) % 3}`;
}
</script>

{#snippet sectionHead(id: string, title: string)}
  <button type="button" class="flex items-center gap-2 pt-5 pb-2 text-base font-semibold text-[var(--pd-content-header)]" aria-expanded={!collapsed.includes(id)} onclick={(): void => toggle(id)}>
    <span class="w-3 text-[11px]"><AppIcon icon={collapsed.includes(id) ? faChevronRight : faChevronDown} /></span>{title}
  </button>
{/snippet}

{#snippet provider(c: (typeof conns)[number])}
  {@const st = connStatus(c)}
  {@const up = isUp(st)}
  <div class="flex items-center gap-3 h-11 px-3 rounded-md bg-[var(--pd-content-card-inset-bg)]" data-conn={c.id}>
    <ConnIcon connId={c.id} size={22} ring="var(--pd-content-card-inset-bg)" />
    <button type="button" class="font-semibold text-[var(--pd-content-card-header-text)] hover:underline truncate" onclick={(): void => onopen({ kind: 'connection', connId: c.id }, {})}>{c.name}</button>
    <span class="px-1.5 rounded text-[11px] bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">{version(c.id)}</span>
    <span class="flex-1"></span>
    <span class="flex items-center gap-1.5 text-xs capitalize text-[var(--pd-content-card-text)]"><span class="w-2 h-2 rounded-full {STATUS_DOT[st]}"></span><span data-testid="provider-status">{st}</span></span>
    <ActBtn icon={up ? faStop : faPlay} label="{up ? 'Stop' : 'Start'} {c.name}" onclick={(): void => toggleConn(c)} />
  </div>
{/snippet}

{#snippet actions()}<ActBtn icon={faPenToSquare} label="Customize the dashboard" onclick={(): void => lab.openCreate('Customize the dashboard')} />{/snippet}

<div class="flex flex-col h-full min-h-0">
  <Head icon={faHouse} title="Dashboard" {actions} />
  <div data-testid="home-dashboard" class="flex-1 min-h-0 overflow-auto px-5 pb-6 text-[13px]">
    {#if banner}
      {@const e = ext(promo)}
      <div
        aria-label="Recommended extension"
        data-testid="dashboard-banner"
        class="mt-4 grid grid-cols-[20px_8fr_7fr] gap-4 px-5 py-5 max-h-[180px] rounded-lg overflow-hidden text-white"
        style:background="linear-gradient(110deg, #4c1d95 0%, #7c3aed 55%, #a855f7 100%)">
        <div><AppIcon icon={e?.icon} size="16px" /></div>
        <div class="flex flex-col min-w-0">
          <span class="text-xl font-semibold">{BANNERS[promo][0]}</span>
          <div class="grid grid-cols-[2fr_1fr] gap-3 pt-1">
            <span class="text-[13px] opacity-90 line-clamp-4">{BANNERS[promo][1]}</span>
            <span class="flex items-center justify-center rounded-lg bg-white/10 h-24"><AppIcon icon={e?.icon} size="72px" /></span>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex justify-end">
            <button type="button" aria-label="Close banner" class="w-6 h-6 rounded hover:bg-white/15" onclick={(): void => { banner = false; }}><AppIcon icon={faXmark} size="xs" /></button>
          </div>
          <div class="flex items-center gap-3 p-3 rounded-lg bg-black/25">
            <AppIcon icon={e?.icon} size="32px" />
            <div class="flex-1 min-w-0 leading-tight">
              <div class="text-[10px] uppercase tracking-wide opacity-70">Extension</div>
              <div class="font-semibold truncate">{e?.name}</div>
            </div>
            {#if isInstalled(promo)}
              <span class="flex items-center gap-1 text-xs"><AppIcon icon={faCircleCheck} size="xs" />Installed</span>
            {:else}
              <Button icon={faDownload} onclick={(): void => installExt(promo)}>Install</Button>
            {/if}
          </div>
          <span class="text-xs text-right opacity-80 truncate">{e?.description}</span>
        </div>
      </div>
    {/if}

    {@render sectionHead('features', 'Explore Features')}
    {#if !collapsed.includes('features')}
      <div class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
        {#each FEATURES as [t, d, ic, target] (t)}
          <div class="flex flex-col gap-2 p-4 rounded-lg bg-[var(--pd-content-card-bg)]">
            <span class="text-[var(--pd-content-card-icon)]"><AppIcon icon={ic} size="22px" /></span>
            <span class="font-semibold text-[var(--pd-content-card-header-text)]">{t}</span>
            <span class="text-[var(--pd-content-card-text)] flex-1">{d}</span>
            <div><Button type="secondary" onclick={(): void => onopen(target, {})}>Explore</Button></div>
          </div>
        {/each}
      </div>
    {/if}

    <div class="flex items-center">
      {@render sectionHead('learning', 'Learning Center')}
      <span class="flex-1"></span>
      {#if !collapsed.includes('learning')}
        <ActBtn icon={faChevronLeft} label="Previous guides" onclick={(): void => scroll(-1)} />
        <ActBtn icon={faChevronRight} label="Next guides" onclick={(): void => scroll(1)} />
      {/if}
    </div>
    {#if !collapsed.includes('learning')}
      <div bind:this={strip} data-testid="learning-center" class="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
        {#each GUIDES as [t, d, icon] (t)}
          <div class="flex flex-col gap-2 w-[260px] shrink-0 p-4 rounded-lg bg-[var(--pd-content-card-bg)]">
            <AppIcon {icon} size="32px" />
            <span class="font-semibold text-[var(--pd-content-card-header-text)]">{t}</span>
            <span class="text-[var(--pd-content-card-text)] line-clamp-2 flex-1">{d}</span>
            <div><Button onclick={(): void => lab.openCreate(`Guide: ${t}`)}>Get started</Button></div>
          </div>
        {/each}
      </div>
    {/if}

    {@render sectionHead('overview', 'System Overview')}
    {#if !collapsed.includes('overview')}
      <div data-testid="system-overview" class="flex flex-col gap-3 p-4 rounded-lg bg-[var(--pd-content-card-bg)]">
        <div>
          {#if allOk}
            <span class="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs bg-[color-mix(in_srgb,var(--pd-status-running)_20%,transparent)] text-[var(--pd-status-running)]"><AppIcon icon={faCircleCheck} size="xs" />All systems operational</span>
          {:else}
            <span class="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs bg-[color-mix(in_srgb,var(--pd-status-degraded)_20%,transparent)] text-[var(--pd-status-degraded)]"><AppIcon icon={faTriangleExclamation} size="xs" />Some providers need attention</span>
          {/if}
        </div>
        {#if engines.length}
          <div class="text-[var(--pd-content-card-text)]">Container providers:</div>
          <div data-testid="providers" class="flex flex-col gap-1.5">{#each engines as c (c.id)}{@render provider(c)}{/each}</div>
        {/if}
        {#if kube.length}
          <div class="pt-1 text-[var(--pd-content-card-text)]">Kubernetes:</div>
          <div class="flex flex-col gap-1.5">{#each kube as c (c.id)}{@render provider(c)}{/each}</div>
        {/if}
      </div>
    {/if}
  </div>
</div>
