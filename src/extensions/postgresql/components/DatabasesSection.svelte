<script lang="ts">
/** PostgreSQL › Databases: databases and their tables (row estimates). */
import { NavPage } from '@podman-desktop/ui-svelte';

import type { ConnectionView } from '#lib/ext/types.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';

import Card from '../../_appdev/Card.svelte';
import CopyField from '../../_appdev/CopyField.svelte';
import { databases } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

const dbs = $derived(databases(conn.id));
</script>

<NavPage title="databases" searchEnabled={false}>
  {#snippet content()}
    {#if conn.status !== 'started'}
      <ConnectionStoppedScreen {conn} kind="databases" />
    {:else}
      <div class="w-full px-5 py-4 space-y-3 overflow-auto">
        {#each dbs as db (db.name)}
          <Card title={db.name} subtitle="owner {db.owner} · {db.encoding} · {db.tables.length} tables">
            <CopyField label="JDBC URL" value="jdbc:postgresql://localhost:5432/{db.name}" />
            <div class="mt-3 rounded-md overflow-hidden" role="table" aria-label="Tables of {db.name}">
              {#each db.tables as t (t.schema + t.name)}
                <div class="grid grid-cols-[2fr_1fr_1fr] gap-2 py-1.5 text-sm border-t border-[var(--pd-content-divider)]" role="row">
                  <span class="text-[var(--pd-content-card-header-text)]">{t.schema}.{t.name}</span>
                  <span class="tabular-nums">{t.rows.toLocaleString('en-US')} rows</span>
                  <span class="tabular-nums">{t.sizeMB} MB</span>
                </div>
              {/each}
            </div>
          </Card>
        {/each}
      </div>
    {/if}
  {/snippet}
</NavPage>
