<script lang="ts">
/** Apicurio › Artifacts: list by group; `?artifact=` shows versions, content and rules. */
import { faCodeCompare, faUpload } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage, NavPage } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import type { NameCellData } from '#lib/table/types.ts';
import { runTask, toast } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import DataTable from '../../_appdev/DataTable.svelte';
import KeyValue from '../../_appdev/KeyValue.svelte';
import Pill from '../../_appdev/Pill.svelte';
import type { DataColumn } from '../../_appdev/types.ts';
import { APICURIO_EXT, type Artifact, latest, registryData, type VersionState } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
const artifactId = $derived(page.url.searchParams.get('artifact'));
const data = $derived(registryData(conn.id));
const rows = $derived(data.artifacts.filter(a => `${a.groupId}/${a.artifactId} ${a.name}`.toLowerCase().includes(searchTerm.toLowerCase())));
const selected = $derived(artifactId ? data.artifacts.find(a => a.artifactId === artifactId) : undefined);
const rules = $derived(selected ? data.rules.filter(r => r.scope === 'global' || r.target === selected.artifactId || r.target === selected.groupId) : []);

function key(a: Artifact): string {
  return `${a.groupId}/${a.artifactId}`;
}

function nameOf(a: Artifact): NameCellData {
  return { title: a.artifactId, sub: [a.groupId, a.name], href: `/c/${conn.id}/artifacts?artifact=${encodeURIComponent(a.artifactId)}` };
}

const columns: DataColumn<Artifact>[] = [
  { title: 'Type', width: '110px', value: (a): string => a.artifactType },
  { title: 'Versions', width: '90px', value: (a): string => String(a.versions.length) },
  { title: 'Latest', width: '90px', value: (a): string => latest(a).version },
  { title: 'Modified', width: '120px', value: (a): string => a.modifiedOn.slice(0, 10) },
];

function tone(s: VersionState): 'success' | 'warning' | 'neutral' | 'info' {
  return s === 'ENABLED' ? 'success' : s === 'DEPRECATED' ? 'warning' : s === 'DRAFT' ? 'info' : 'neutral';
}

function compare(): void {
  if (selected) toast({ type: 'info', title: `${selected.artifactId}: v${selected.versions.length - 1} → v${selected.versions.length}`, body: selected.versions[selected.versions.length - 1].note ?? 'No change summary' });
}

function close(): void {
  navigate(`/c/${conn.id}/artifacts`);
}

function reset(): void {
  searchTerm = '';
}

function upload(): void {
  const a = selected;
  if (!a) return;
  const v = latest(a);
  runTask({
    name: `Upload new version of ${a.artifactId}`,
    ext: APICURIO_EXT,
    steps: [
      { label: `POST /apis/registry/v3/groups/${a.groupId}/artifacts/${a.artifactId}/versions`, ms: 700 },
      { label: 'Checking rules (COMPATIBILITY=BACKWARD, VALIDITY=FULL)', ms: 800, log: ['Compatibility check passed: 1 field added with default value'] },
    ],
    onDone: () => {
      v.state = 'DEPRECATED';
      a.versions.push({ version: String(Number(v.version) + 1 || `${v.version}.1`), globalId: v.globalId + 4, contentId: v.contentId + 3, state: 'ENABLED', createdOn: new Date().toISOString(), note: 'Added optional field shippingMethod' });
      a.modifiedOn = new Date().toISOString();
    },
  });
}
</script>

{#if selected}
  <DetailsPage title={selected.artifactId} subtitle="{selected.groupId} · {selected.artifactType} · {selected.versions.length} versions · {conn.name}" breadcrumbLeftPart="Artifacts" breadcrumbRightPart={selected.artifactId} onclose={close} onbreadcrumbClick={close}>
    {#snippet iconSnippet()}<AppIcon icon="icons/redhat.apicurio-registry.svg" size="28px" />{/snippet}
    {#snippet actionsSnippet()}
      <Button type="secondary" icon={faCodeCompare} onclick={compare}>Compare versions</Button>
      <Button icon={faUpload} onclick={upload}>Upload new version</Button>
    {/snippet}
    {#snippet contentSnippet()}
      <div class="h-full overflow-auto px-5 py-4 grid grid-cols-[1fr_1.4fr] gap-3 content-start">
        <div class="space-y-3">
          <Card title="Metadata">
            <KeyValue labelWidth="w-28" rows={[['Name', selected.name], ['Group', selected.groupId], ['Type', selected.artifactType], ['Owner', selected.owner], ['Created', selected.createdOn], ['Modified', selected.modifiedOn], ...Object.entries(selected.labels ?? {}).map(([k, v]) => [`label ${k}`, v] as [string, string])]} />
          </Card>
          <Card title="Versions">
            {#each [...selected.versions].reverse() as v (v.version)}
              <div class="flex items-center gap-3 py-1.5 border-t first:border-t-0 border-[var(--pd-content-divider)]">
                <span class="w-12 font-semibold text-[var(--pd-content-card-header-text)]">v{v.version}</span>
                <Pill label={v.state} tone={tone(v.state)} />
                <span class="grow truncate text-sm">{v.note ?? ''}</span>
                <span class="text-xs tabular-nums opacity-80">globalId {v.globalId}</span>
              </div>
            {/each}
          </Card>
          <Card title="Rules">
            {#each rules as r (r.ruleType + r.scope)}
              <div class="flex items-center gap-2 py-1"><span class="w-36">{r.ruleType}</span><Pill label={r.config} tone="info" /><span class="text-xs opacity-80">{r.scope}</span></div>
            {/each}
          </Card>
        </div>
        <Card title="Content · v{latest(selected).version}">
          <pre class="text-xs font-mono rounded-md p-3 bg-[var(--pd-content-card-inset-surface)] overflow-auto">{selected.content}</pre>
        </Card>
      </div>
    {/snippet}
  </DetailsPage>
{:else}
  <NavPage bind:searchTerm={searchTerm} title="artifacts">
    {#snippet content()}
      {#if conn.status !== 'started'}
        <ConnectionStoppedScreen {conn} kind="artifacts" />
      {:else}
        <DataTable kind="artifacts" {rows} total={data.artifacts.length} {searchTerm} onResetFilter={reset} {key} name={nameOf} {columns} emptyMessage="Producers with auto-register enabled create artifacts on first send." />
      {/if}
    {/snippet}
  </NavPage>
{/if}
