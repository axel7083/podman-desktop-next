<script lang="ts">
/** Dashboard card: dev-mode status per project. */
import { href } from '#lib/nav.ts';

import { devServicesOf, isDevModeRunning, PROJECTS } from '../data.ts';
</script>

<div class="space-y-1 text-[var(--pd-content-card-text)]">
  {#each PROJECTS as p (p.name)}
    {@const running = isDevModeRunning(p)}
    <a class="flex items-center gap-2 no-underline text-[var(--pd-content-card-text)] hover:text-[var(--pd-link)]" href={href('/tools/quarkus')}>
      <span class="w-2 h-2 rounded-full {running ? 'bg-[var(--pd-status-running)]' : 'bg-[var(--pd-status-stopped)]'}"></span>
      <span class="font-semibold text-[var(--pd-content-card-header-text)]">{p.name}</span>
      <span class="grow">{running ? 'dev mode running' : 'stopped'}</span>
      <span>{devServicesOf(p).length} dev services</span>
    </a>
  {/each}
</div>
