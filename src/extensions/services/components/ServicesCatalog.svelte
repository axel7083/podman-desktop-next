<script lang="ts">
/**
 * Services catalog: running service connections + a gallery built from every
 * contributed `service` factory (whatever extension provides it).
 */
import { faArrowRight, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Button, NavPage } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView, Contributed, FactoryDef } from '#lib/ext/types.ts';
import { navigate, STATUS_DOT_CLASS, STATUS_LABEL } from '#lib/nav.ts';

let searchTerm = $state('');

const services = $derived(registry.activeConnections.filter(c => c.kind === 'service'));
const factories = $derived(
  registry.factories
    .filter(f => f.kind === 'service')
    .filter(f => {
      const t = searchTerm.toLowerCase();
      return !t || f.label.toLowerCase().includes(t) || (f.description ?? '').toLowerCase().includes(t) || f.ext.displayName.toLowerCase().includes(t);
    }),
);

function title(f: FactoryDef): string {
  return f.label.replace(/^Create /, '');
}

function create(f: Contributed<FactoryDef>): void {
  navigate(`/settings/create/${f.id}`);
}

function clearSearch(): void {
  searchTerm = '';
}

function open(c: ConnectionView): void {
  navigate(`/c/${c.id}`);
}
</script>

<NavPage bind:searchTerm={searchTerm} title="Services catalog">
  {#snippet content()}
    <div class="w-full h-full overflow-auto px-5 py-4 space-y-6">
      <section aria-label="Your services">
        <h2 class="text-lg font-semibold text-[var(--pd-content-header)] mb-2">Your services ({services.length})</h2>
        <div class="grid grid-cols-3 gap-3">
          {#each services as c (c.id)}
            <button class="flex items-center gap-3 rounded-lg p-3 bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)] text-left" onclick={open.bind(undefined, c)}>
              <AppIcon icon={c.icon} size="28px" />
              <span class="flex flex-col min-w-0 grow">
                <span class="font-semibold text-[var(--pd-content-card-header-text)] truncate">{c.name}</span>
                <span class="text-sm text-[var(--pd-content-card-text)] truncate">{c.providerName} · {c.endpoint}</span>
              </span>
              <span class="flex items-center gap-1.5 text-sm text-[var(--pd-content-card-text)]">
                <span class="w-2 h-2 rounded-full {STATUS_DOT_CLASS[c.status]}"></span>{STATUS_LABEL[c.status]}
              </span>
            </button>
          {/each}
        </div>
      </section>

      <section aria-label="Add a service">
        <h2 class="text-lg font-semibold text-[var(--pd-content-header)] mb-1">Add a service</h2>
        <p class="text-sm text-[var(--pd-content-text)] mb-3">Each service runs as a container on podman-machine-default and becomes a connection your apps (and Quarkus Dev Services) can discover.</p>
        <div class="grid grid-cols-3 gap-3">
          {#each factories as f (f.ext.id + f.id)}
            <Contribution ext={f.ext} kind="service factory" api="P12">
              <div class="flex flex-col h-full rounded-lg p-4 bg-[var(--pd-content-card-bg)] gap-2" role="region" aria-label={title(f)}>
                <div class="flex items-center gap-3">
                  <AppIcon icon={f.ext.icon} size="32px" />
                  <div class="min-w-0">
                    <div class="font-semibold text-[var(--pd-content-card-header-text)] truncate">{title(f)}</div>
                    <div class="text-xs text-[var(--pd-content-card-text)] opacity-80 truncate">by {f.ext.displayName}</div>
                  </div>
                </div>
                <p class="text-sm text-[var(--pd-content-card-text)] grow">{f.description}</p>
                <div class="flex justify-end">
                  <Button type="secondary" icon={faPlus} onclick={create.bind(undefined, f)} aria-label="Create {title(f)}">Create</Button>
                </div>
              </div>
            </Contribution>
          {/each}
        </div>
        {#if factories.length === 0}
          <div class="text-[var(--pd-content-text)] flex items-center gap-2">No service matches "{searchTerm}". <Button type="link" icon={faArrowRight} onclick={clearSearch}>Clear search</Button></div>
        {/if}
      </section>
    </div>
  {/snippet}
</NavPage>
