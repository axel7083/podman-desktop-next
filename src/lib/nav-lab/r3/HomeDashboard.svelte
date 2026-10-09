<script lang="ts">
/**
 * P13 Dashboard tab: today's PD dashboard, compact. Release-notes banner
 * (Update), providers with status and start/stop, Learning Center carousel,
 * and installed extensions (All extensions mode only).
 */
import { faChevronLeft, faChevronRight, faCircleArrowUp, faPlay, faStop, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import welcome from '#lib/images/welcome-bg.png';

import { CONN_GROUPS, type LabTarget, STATUS_DOT } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { labConns } from '../r2/simple.ts';
import ConnIcon from '../ui/ConnIcon.svelte';
import { EXTENSIONS, isInstalled } from './exts.ts';
import { connStatus, isUp, toggleConn } from './live.svelte.ts';

interface Props {
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { onopen }: Props = $props();

let banner = $state(true);
let strip = $state<HTMLDivElement>();

const conns = $derived(labConns());
const exts = $derived(EXTENSIONS.filter(e => !e.builtin && isInstalled(e.id)));

const GUIDES: [string, string, string][] = [
  ['Getting started with containers', 'icons/podman-desktop.podman.png', '#7f39fb'],
  ['Run a Compose stack', 'icons/podman-desktop.compose.png', '#2563eb'],
  ['Create a local Kubernetes cluster with Kind', 'icons/podman-desktop.kind.png', '#15803d'],
  ['Deploy a pod to Kubernetes', 'icons/podman-desktop.kube-context.png', '#0e7490'],
  ['Push an image to a registry', 'icons/podman-desktop.registries.png', '#b45309'],
  ['Build a bootable container', 'icons/redhat.bootc.png', '#b91c1c'],
  ['Serve a model with AI Lab', 'icons/redhat.ai-lab.png', '#9333ea'],
  ['Run containers as systemd services', 'icons/podman-desktop.quadlet.png', '#475569'],
];

function scroll(dir: number): void {
  strip?.scrollBy({ left: dir * 400, behavior: 'smooth' });
}
</script>

{#snippet title(t: string, extra?: string)}
  <div class="flex items-center gap-2 pt-4 pb-1.5 text-sm font-semibold text-[var(--pd-content-card-header-text)]">{t}{#if extra}<span class="font-normal opacity-50">{extra}</span>{/if}</div>
{/snippet}

<div data-testid="home-dashboard" class="h-full overflow-auto px-4 pb-5 text-sm">
  {#if banner}
    <div class="flex items-stretch mt-3 h-[96px] rounded-md overflow-hidden bg-[var(--pd-content-card-bg)]">
      <img src={welcome} alt="" class="w-[140px] object-cover" />
      <div class="flex-1 min-w-0 flex flex-col gap-1 px-4 py-2.5">
        <div class="flex items-center gap-2">
          <span class="text-base font-bold text-[var(--pd-content-card-header-text)]">Podman Desktop 2.1 is available</span>
          <span class="flex-1"></span>
          <button type="button" aria-label="Dismiss" class="w-6 h-6 rounded hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => { banner = false; }}><AppIcon icon={faXmark} size="xs" /></button>
        </div>
        <div class="text-[var(--pd-content-card-text)] line-clamp-1">Tabs for every resource, a bottom panel for terminals and logs, extension trees in the navigation and faster startup.</div>
        <div class="flex items-center gap-3 mt-auto">
          <button type="button" class="text-[var(--pd-link)] hover:underline">Release notes</button>
          <Button icon={faCircleArrowUp} onclick={(): void => lab.openCreate('Update Podman Desktop to 2.1')}>Update</Button>
        </div>
      </div>
    </div>
  {/if}

  {#each CONN_GROUPS as g (g)}
    {@const list = conns.filter(c => c.group === g)}
    {#if list.length}
      {@render title(g === 'VMs & services' ? 'Other providers' : g, String(list.length))}
      <div data-testid="providers" class="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-2">
        {#each list as c (c.id)}
          {@const st = connStatus(c)}
          {@const up = isUp(st)}
          <div class="flex items-center gap-2.5 h-14 px-2.5 rounded-md bg-[var(--pd-content-card-bg)]" data-conn={c.id}>
            <ConnIcon connId={c.id} size={26} ring="var(--pd-content-card-bg)" />
            <button type="button" class="flex-1 min-w-0 text-left leading-tight" onclick={(): void => onopen({ kind: 'connection', connId: c.id }, {})}>
              <span class="block font-semibold truncate text-[var(--pd-content-card-header-text)] hover:underline">{c.name}</span>
              <span class="flex items-center gap-1 text-xs text-[var(--pd-content-card-text)] truncate"
                ><span class="w-1.5 h-1.5 rounded-full shrink-0 {STATUS_DOT[st]}"></span><span data-testid="provider-status">{st}</span> · {c.product}</span>
            </button>
            <button
              type="button"
              aria-label="{up ? 'Stop' : 'Start'} {c.name}"
              title={up ? 'Stop' : 'Start'}
              class="w-7 h-7 rounded border border-[var(--pd-content-divider)] hover:bg-[var(--pd-content-card-hover-bg)] text-[11px]"
              onclick={(): void => toggleConn(c)}><AppIcon icon={up ? faStop : faPlay} size="xs" /></button>
          </div>
        {/each}
      </div>
    {/if}
  {/each}

  <div class="flex items-center">
    {@render title('Learning Center')}
    <span class="flex-1"></span>
    <button type="button" aria-label="Previous guides" class="w-6 h-6 rounded hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => scroll(-1)}><AppIcon icon={faChevronLeft} size="xs" /></button>
    <button type="button" aria-label="Next guides" class="w-6 h-6 rounded hover:bg-[var(--pd-content-card-hover-bg)]" onclick={(): void => scroll(1)}><AppIcon icon={faChevronRight} size="xs" /></button>
  </div>
  <div bind:this={strip} class="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
    {#each GUIDES as [t, icon, col] (t)}
      <button type="button" class="w-[180px] shrink-0 rounded-md overflow-hidden bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)] text-left">
        <span class="flex items-center justify-center h-[72px]" style:background="linear-gradient(135deg, {col}, color-mix(in srgb, {col} 35%, #000))"><AppIcon {icon} size="34px" /></span>
        <span class="block px-2 py-1.5 leading-snug line-clamp-2 text-[var(--pd-content-card-header-text)]">{t}</span>
      </button>
    {/each}
  </div>

  {#if lab.install === 'all'}
    {@render title('Extensions', String(exts.length))}
    <div data-testid="dashboard-extensions" class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
      {#each exts as e (e.id)}
        <button type="button" class="flex items-center gap-2 h-11 px-2 rounded-md bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)] text-left" onclick={(): void => onopen({ kind: 'extensions' }, {})}>
          <AppIcon icon={e.icon} size="22px" />
          <span class="min-w-0 leading-tight"><span class="block font-semibold truncate text-[var(--pd-content-card-header-text)]">{e.name}</span><span class="block text-xs truncate text-[var(--pd-content-card-text)]">{e.description}</span></span>
        </button>
      {/each}
    </div>
  {/if}
</div>
