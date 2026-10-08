<script lang="ts">
/** Settings › Satellite: server, content views, activation keys, container repositories. */
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import { runTask } from '#lib/world.svelte.ts';

import { ACTIVATION_KEYS, CONTENT_VIEWS, ENVIRONMENTS, REPOS, SERVER } from '../data.ts';

function pull(path: string, tag: string): void {
  runTask({ name: `Pull ${path.split('/').slice(-2).join('/')}:${tag}`, ext: 'redhat.satellite', steps: [{ label: `podman pull ${path}:${tag}`, ms: 1800 }], action: { label: 'Open images', href: '/c/podman-machine-default/images' } });
}
</script>

<div class="space-y-6 text-[var(--pd-invert-content-card-text)]">
  <section class="bg-[var(--pd-invert-content-card-bg)] rounded-md p-4" aria-label="Satellite server">
    <div class="font-semibold text-[var(--pd-invert-content-card-header-text)]">{SERVER.url} · Satellite {SERVER.version}</div>
    <div class="text-sm">Connected as {SERVER.user} (Personal Access Token) · organization {SERVER.organization} · lifecycle {ENVIRONMENTS.join(' → ')} · CA katello-server-ca.crt imported</div>
  </section>
  <section aria-label="Content views">
    <h2 class="text-lg font-semibold text-[var(--pd-invert-content-header-text)] mb-2">Content views</h2>
    <div class="bg-[var(--pd-invert-content-card-bg)] rounded-md">
      {#each CONTENT_VIEWS as cv (cv.id)}
        <div class="grid grid-cols-[1.5fr_0.7fr_2fr_1fr] px-4 py-2.5 border-b last:border-b-0 border-[var(--pd-content-divider)]">
          <span class="font-semibold text-[var(--pd-invert-content-card-header-text)]">{cv.name}{cv.composite ? ' (composite)' : ''}</span>
          <span>v{cv.latest_version}</span><span>{cv.environments.join(', ')}</span><span>published {cv.last_published}</span>
        </div>
      {/each}
    </div>
  </section>
  <section aria-label="Satellite activation keys">
    <h2 class="text-lg font-semibold text-[var(--pd-invert-content-header-text)] mb-2">Activation keys</h2>
    <div class="bg-[var(--pd-invert-content-card-bg)] rounded-md">
      {#each ACTIVATION_KEYS as k (k.name)}
        <div class="grid grid-cols-[1.2fr_1.2fr_0.8fr_1fr_1fr] px-4 py-2.5 border-b last:border-b-0 border-[var(--pd-content-divider)]">
          <span class="font-semibold text-[var(--pd-invert-content-card-header-text)]">{k.name}</span>
          <span>{k.content_view}</span><span>{k.environment}</span><span>{k.service_level}</span>
          <span class={k.max_hosts && k.usage_count / k.max_hosts > 0.9 ? 'text-[var(--pd-state-warning)]' : ''}>{k.usage_count}/{k.max_hosts ?? '∞'} hosts</span>
        </div>
      {/each}
    </div>
  </section>
  <section aria-label="Container repositories">
    <h2 class="text-lg font-semibold text-[var(--pd-invert-content-header-text)] mb-2">Container repositories</h2>
    <div class="bg-[var(--pd-invert-content-card-bg)] rounded-md">
      {#each REPOS as r (r.path)}
        <div class="flex items-center gap-3 px-4 py-2 border-b last:border-b-0 border-[var(--pd-content-divider)]">
          <span class="grow font-mono text-sm">{r.path}</span>
          <span class="text-sm">{r.tags.join(', ')}</span>
          <Button type="secondary" icon={faDownload} onclick={pull.bind(undefined, r.path, r.tags[0])}>Pull</Button>
        </div>
      {/each}
    </div>
  </section>
</div>
