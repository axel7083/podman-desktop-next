<script lang="ts">
/**
 * AI Lab tool page (P3). Keeps the real AI Lab webview structure: its own
 * navigation (Dashboard, AI APPS, MODELS, SERVER INFORMATION, TUNING) and
 * sub-pages addressed with `?p=` so tasks and toasts can deep-link.
 */
import { faBookOpen, faBrain, faCircleDown, faGaugeHigh, faGear, faHouse, faMessage, faRocket, faServer } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { page } from '$app/state';
import { appUrl } from '#lib/nav.ts';

import SecondaryNavItem from '#lib/shell/SecondaryNavItem.svelte';

import { ai, toolHref } from '../shared.ts';
import Catalog from './pages/Catalog.svelte';
import CreateService from './pages/CreateService.svelte';
import Dashboard from './pages/Dashboard.svelte';
import LocalServer from './pages/LocalServer.svelte';
import Playground from './pages/Playground.svelte';
import Playgrounds from './pages/Playgrounds.svelte';
import Recipes from './pages/Recipes.svelte';
import Running from './pages/Running.svelte';
import ServiceDetails from './pages/ServiceDetails.svelte';
import Services from './pages/Services.svelte';
import Tuning from './pages/Tuning.svelte';

const p = $derived(appUrl().searchParams.get('p') ?? 'dashboard');
const id = $derived(appUrl().searchParams.get('id') ?? '');
const st = $derived(ai());

const NAV: { header?: string; id: string; label: string; icon: typeof faHouse; also?: string[]; count?: () => number }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: faHouse },
  { header: 'AI APPS', id: 'recipes', label: 'Recipe Catalog', icon: faBookOpen },
  { id: 'running', label: 'Running', icon: faServer, count: (): number => ai().apps.length },
  { header: 'MODELS', id: 'catalog', label: 'Catalog', icon: faBookOpen },
  { id: 'services', label: 'Services', icon: faRocket, also: ['service', 'create-service'], count: (): number => ai().services.length },
  { id: 'playgrounds', label: 'Playgrounds', icon: faMessage, also: ['playground'], count: (): number => ai().playgrounds.length },
  { header: 'SERVER INFORMATION', id: 'local-server', label: 'Local Server', icon: faGear },
  { header: 'TUNING', id: 'tuning', label: 'About InstructLab', icon: faGaugeHigh },
];
</script>

<div class="flex flex-row h-full w-full min-h-0">
  <nav
    class="z-1 w-leftsidebar min-w-leftsidebar shrink-0 flex-col flex bg-[var(--pd-secondary-nav-bg)] border-[var(--pd-global-nav-bg-border)] border-r-[1px]"
    aria-label="AI Lab Navigation">
    <div class="pt-4 px-3 mb-6 flex items-center gap-2 border-l-[4px] border-transparent">
      <Icon icon={faBrain} size="1.25x" class="text-[var(--pd-content-header-icon)]" />
      <p class="text-base font-semibold text-[color:var(--pd-secondary-nav-header-text)]">AI Lab</p>
    </div>
    <div class="h-full overflow-y-auto pb-3">
      {#each NAV as item (item.id)}
        {#if item.header}
          <div class="pl-4 mt-3 mb-1 text-xs font-semibold tracking-wide text-[color:var(--pd-secondary-nav-header-text)] opacity-80">{item.header}</div>
        {/if}
        <SecondaryNavItem href={toolHref(item.id)} title={item.label} selected={p === item.id || (item.also?.includes(p) ?? false)} counter={item.count?.()}>
          {#snippet icon()}<Icon icon={item.icon} />{/snippet}
        </SecondaryNavItem>
      {/each}
      <div class="mx-4 mt-4 flex items-center gap-1.5 text-xs text-[var(--pd-secondary-nav-text)] opacity-70">
        <Icon icon={faCircleDown} size="0.9x" />
        <span>{st.downloaded.length} models downloaded</span>
      </div>
    </div>
  </nav>
  <div class="flex flex-col grow min-w-0 h-full overflow-hidden bg-[var(--pd-content-bg)]">
    {#if p === 'recipes'}
      <Recipes />
    {:else if p === 'running'}
      <Running />
    {:else if p === 'catalog'}
      <Catalog />
    {:else if p === 'services'}
      <Services />
    {:else if p === 'create-service'}
      {#key appUrl().search}
        <CreateService modelId={appUrl().searchParams.get('model') ?? ''} backend={appUrl().searchParams.get('backend') ?? ''} />
      {/key}
    {:else if p === 'service'}
      <ServiceDetails {id} />
    {:else if p === 'playgrounds'}
      <Playgrounds />
    {:else if p === 'playground'}
      {#key id}
        <Playground {id} switchTo={appUrl().searchParams.get('switch') ?? ''} />
      {/key}
    {:else if p === 'local-server'}
      <LocalServer />
    {:else if p === 'tuning'}
      <Tuning />
    {:else}
      <Dashboard />
    {/if}
  </div>
</div>
