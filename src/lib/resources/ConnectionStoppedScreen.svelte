<script lang="ts">
/** Empty state when the connection is stopped or its extension is disabled (docs/ia.md rule 7). */
import { faPlay, faPuzzlePiece } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen } from '@podman-desktop/ui-svelte';

import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import EngineIcon from '#lib/images/ResourcesIcon.svelte';
import { startVerb, statusLabel } from '#lib/nav.ts';
import { startConnection } from '#lib/world.svelte.ts';

interface Props {
  conn: ConnectionView;
  kind: string;
}

let { conn, kind }: Props = $props();

const busy = $derived(['starting', 'stopping', 'creating'].includes(conn.status));

function start(): void {
  startConnection(conn.id, conn.name);
}

function enable(): void {
  registry.enable(conn.ext.id);
}
</script>

{#if conn.extensionDisabled}
  <EmptyScreen icon={faPuzzlePiece} title="{conn.ext.displayName} is disabled" message="Enable the extension to manage {conn.name} and see its {kind}.">
    <Button icon={faPuzzlePiece} onclick={enable}>Enable {conn.ext.displayName}</Button>
  </EmptyScreen>
{:else}
  <EmptyScreen
    icon={EngineIcon}
    title={busy ? `${conn.name} is ${statusLabel(conn).toLowerCase()}…` : `${conn.name} is ${conn.remote ? 'not connected' : 'not running'}`}
    message="{startVerb(conn)} {conn.remote ? 'to' : 'the'} {conn.kind === 'kubernetes' ? 'cluster' : 'connection'} to see its {kind}.">
    <Button icon={faPlay} inProgress={busy} disabled={busy} onclick={start}>{startVerb(conn)} {conn.remote ? 'to ' : ''}{conn.name}</Button>
  </EmptyScreen>
{/if}
