<script lang="ts">
/**
 * Secondary navigation of the selected connection (docs/ia.md rule 2):
 * core resources first, then an "Extensions" divider, then contributions whose
 * `when` matches the connection (P2), each with its extension badge.
 * Frame from PD's SubmenuNavigation.svelte (w-leftsidebar, secondary-nav tokens).
 */
import { faGauge } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import ExtBadge from '#lib/components/ExtBadge.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import { coreResourcesOf, href, KUBE_KINDS, STATUS_DOT_CLASS, STATUS_LABEL } from '#lib/nav.ts';
import { world } from '#lib/world.svelte.ts';

import SecondaryNavItem from './SecondaryNavItem.svelte';

interface Props {
  conn: ConnectionView;
  /** Current resource segment (`containers`, an extension section id…) or undefined for the overview. */
  resource: string | undefined;
}

let { conn, resource }: Props = $props();

const core = $derived(coreResourcesOf(conn));
const sections = $derived(conn.extensionDisabled ? [] : registry.navSectionsFor(conn));
const running = $derived(conn.status === 'started');

function count(id: string): number | undefined {
  const mine = <T extends { engineId: string }>(list: T[]): number => list.filter(x => x.engineId === conn.id).length;
  switch (id) {
    case 'containers':
      return mine(world.containers);
    case 'pods':
      return mine(world.pods);
    case 'images':
      return mine(world.images);
    case 'volumes':
      return mine(world.volumes);
    case 'networks':
      return mine(world.networks);
    case 'secrets':
      return mine(world.secrets);
    default: {
      const kinds = KUBE_KINDS[id];
      if (!kinds) return undefined;
      return (world.kube[conn.id] ?? []).filter(o => kinds.includes(o.kind)).length;
    }
  }
}
</script>

<nav
  class="z-1 w-leftsidebar min-w-leftsidebar shrink-0 flex-col flex bg-[var(--pd-secondary-nav-bg)] border-[var(--pd-global-nav-bg-border)] border-r-[1px]"
  aria-label="{conn.name} Navigation Bar">
  <a href={href(`/c/${conn.id}`)} class="block pt-4 px-3 mb-4 border-l-[4px] border-transparent group/header" title="{conn.name} overview">
    <div class="flex items-center gap-2 min-w-0">
      <AppIcon icon={conn.icon} size="20px" class="shrink-0" />
      <p class="text-lg font-semibold text-[color:var(--pd-secondary-nav-header-text)] truncate group-hover/header:underline">{conn.name}</p>
    </div>
    <div class="flex items-center gap-1.5 mt-1 pl-0.5 text-xs text-[var(--pd-secondary-nav-text)] opacity-80">
      <span class="w-2 h-2 rounded-full {STATUS_DOT_CLASS[conn.status]}"></span>
      <span class="truncate">{conn.extensionDisabled ? 'Extension disabled' : STATUS_LABEL[conn.status]} · {conn.providerName}</span>
    </div>
  </a>

  <div class="h-full overflow-y-auto pb-3">
    <SecondaryNavItem href="/c/{conn.id}" title="Overview" selected={resource === undefined}>
      {#snippet icon()}<Icon icon={faGauge} />{/snippet}
    </SecondaryNavItem>
    {#each core as r (r.id)}
      <SecondaryNavItem href="/c/{conn.id}/{r.id}" title={r.label} selected={resource === r.id} counter={count(r.id)} dimmed={!running}>
        {#snippet icon()}<AppIcon icon={r.icon} size="16" />{/snippet}
      </SecondaryNavItem>
    {/each}

    {#if sections.length}
      <div class="flex items-center gap-2 px-4 pt-4 pb-1.5" role="separator" aria-label="Extensions">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-[var(--pd-nav-group-header)]">Extensions</span>
        <span class="grow border-t border-[var(--pd-global-nav-bg-border)]"></span>
      </div>
      {#each sections as s (s.ext.id + s.id)}
        <Contribution ext={s.ext} kind="navSection" api="P2">
          <SecondaryNavItem href="/c/{conn.id}/{s.id}" title={s.label} selected={resource === s.id} counter={s.counter?.(world, conn)} dimmed={!running}>
            {#snippet icon()}<AppIcon icon={s.icon ?? s.ext.icon} size="14px" />{/snippet}
            {#snippet badge()}{#if s.icon}<ExtBadge ext={s.ext} size={12} />{/if}{/snippet}
          </SecondaryNavItem>
        </Contribution>
      {/each}
    {/if}
  </div>
</nav>
