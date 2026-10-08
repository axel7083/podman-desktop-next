<script lang="ts">
/** OpenShell gateway › Agents registered in Kaiden (agents.registerAgent). */
import { NavPage } from '@podman-desktop/ui-svelte';

import type { ConnectionView } from '#lib/ext/types.ts';

import Card from '../../ai-lab/components/ui/Card.svelte';
import Chip from '../../ai-lab/components/ui/Chip.svelte';
import { AGENTS } from '../shared.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();
</script>

<NavPage title="Agents" searchEnabled={false}>
  {#snippet content()}
    <div class="grid grid-cols-3 gap-4 px-5 py-4 w-full content-start">
      {#each AGENTS as a (a.id)}
        <Card title={a.name}>
          {#snippet actions()}{#each a.tags as t (t)}<Chip label={t} />{/each}{/snippet}
          <div class="font-mono text-xs">{a.command}</div>
          <div class="font-mono text-xs truncate opacity-80" title={a.baseImage}>{a.baseImage}</div>
          <div class="text-xs mt-1">Skills folder <span class="font-mono">{a.skills}</span></div>
        </Card>
      {/each}
    </div>
  {/snippet}
</NavPage>
