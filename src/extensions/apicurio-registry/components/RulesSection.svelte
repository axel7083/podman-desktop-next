<script lang="ts">
/** Apicurio › Rules (global, group and artifact scopes). */
import { NavPage } from '@podman-desktop/ui-svelte';

import type { ConnectionView } from '#lib/ext/types.ts';

import Card from '../../_appdev/Card.svelte';
import Pill from '../../_appdev/Pill.svelte';
import { registryData } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const rules = $derived(registryData(conn.id).rules);
const HELP: Record<string, string> = {
  COMPATIBILITY: 'New versions must stay compatible with previous ones (BACKWARD: consumers using the new schema can read old data).',
  VALIDITY: 'Content must be syntactically and semantically valid before it is stored.',
  INTEGRITY: 'Artifact references must exist and be mapped.',
};
</script>

<NavPage title="rules" searchEnabled={false}>
  {#snippet content()}
    <div class="w-full px-5 py-4 space-y-3">
      {#each rules as r (r.ruleType + r.scope + (r.target ?? ''))}
        <Card>
          <div class="flex items-center gap-3">
            <span class="font-semibold text-[var(--pd-content-card-header-text)] w-40">{r.ruleType}</span>
            <Pill label={r.config} tone="info" />
            <span class="text-sm">{r.scope}{r.target ? ` · ${r.target}` : ''}</span>
          </div>
          <p class="text-sm mt-1 opacity-80">{HELP[r.ruleType]}</p>
        </Card>
      {/each}
    </div>
  {/snippet}
</NavPage>
