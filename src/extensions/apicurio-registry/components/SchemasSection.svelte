<script lang="ts">
/** Kafka › Schemas (contributed by Apicurio): value schemas of the cluster topics. */
import { NavPage } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import Card from '../../_appdev/Card.svelte';
import Pill from '../../_appdev/Pill.svelte';
import { cluster } from '../../streams-kafka/data.ts';
import { findTopicSchema, latest } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const rows = $derived(
  cluster(conn.id)
    .topics.filter(t => !t.internal)
    .map(t => ({ topic: t.name, schema: findTopicSchema(t.name) })),
);

function open(connId: string, artifactId: string): void {
  navigate(`/c/${connId}/artifacts?artifact=${encodeURIComponent(artifactId)}`);
}

function openTopic(topic: string): void {
  navigate(`/c/${conn.id}/topics?topic=${encodeURIComponent(topic)}&tab=schema`);
}
</script>

<NavPage title="schemas" searchEnabled={false}>
  {#snippet content()}
    <div class="w-full px-5 py-4 space-y-3">
      <p class="text-sm text-[var(--pd-content-text)] flex items-center gap-2"><AppIcon icon="icons/redhat.apicurio-registry.svg" size="14px" />Value schemas resolved with TopicIdStrategy (<code>&lt;topic&gt;-value</code>) from the Apicurio registries on this machine.</p>
      {#each rows as r (r.topic)}
        <Card>
          <div class="flex items-center gap-3">
            <button class="font-semibold text-[var(--pd-link)] hover:underline w-56 text-left truncate" onclick={openTopic.bind(undefined, r.topic)}>{r.topic}</button>
            {#if r.schema}
              <Pill label={r.schema.artifact.artifactType} tone="info" />
              <button class="text-[var(--pd-link)] hover:underline truncate" onclick={open.bind(undefined, r.schema.connId, r.schema.artifact.artifactId)}>{r.schema.artifact.groupId}/{r.schema.artifact.artifactId}</button>
              <span class="ml-auto text-sm">v{latest(r.schema.artifact).version} · {r.schema.connId}</span>
            {:else}
              <span class="text-sm opacity-80">No registered schema (raw JSON / string)</span>
            {/if}
          </div>
        </Card>
      {/each}
    </div>
  {/snippet}
</NavPage>
