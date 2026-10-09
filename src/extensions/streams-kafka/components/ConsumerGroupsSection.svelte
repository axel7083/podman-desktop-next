<script lang="ts">
/** Kafka › Consumer groups (P2): state, members, lag; `?group=` shows per-partition offsets + Reset offsets. */
import { faBackwardStep, faForwardStep, faUsers } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage, NavPage } from '@podman-desktop/ui-svelte';
import { page } from '$app/state';

import AppIcon from '#lib/components/AppIcon.svelte';
import { confirm } from '#lib/confirm.svelte.ts';
import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate, appUrl } from '#lib/nav.ts';
import ConnectionStoppedScreen from '#lib/resources/ConnectionStoppedScreen.svelte';
import type { ActionsCellData, NameCellData, StatusCellData } from '#lib/table/types.ts';
import { runTask } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import DataTable from '../../_appdev/DataTable.svelte';
import Pill from '../../_appdev/Pill.svelte';
import type { DataColumn } from '../../_appdev/types.ts';
import { cluster, type ConsumerGroup, KAFKA_EXT, lagOf } from '../data.ts';

interface Props {
  conn: ConnectionView;
}

let { conn }: Props = $props();

let searchTerm = $state('');
const groupId = $derived(appUrl().searchParams.get('group'));
const all = $derived(cluster(conn.id).groups);
const rows = $derived(all.filter(g => g.groupId.toLowerCase().includes(searchTerm.toLowerCase())));
const selected = $derived(groupId ? all.find(g => g.groupId === groupId) : undefined);

function key(g: ConsumerGroup): string {
  return g.groupId;
}

function nameOf(g: ConsumerGroup): NameCellData {
  const topics = [...new Set(g.offsets.map(o => o.topic))];
  return { title: g.groupId, sub: [topics.join(', '), `${g.protocol} protocol`], href: `/c/${conn.id}/consumer-groups?group=${encodeURIComponent(g.groupId)}` };
}

function status(g: ConsumerGroup): StatusCellData {
  return { status: g.state === 'Stable' ? 'RUNNING' : g.state === 'Empty' ? 'EXITED' : 'STARTING', icon: faUsers };
}

const columns: DataColumn<ConsumerGroup>[] = [
  { title: 'State', width: '130px', value: (g): string => g.state },
  { title: 'Members', width: '90px', value: (g): string => String(g.members) },
  { title: 'Lag', width: '90px', value: (g): string => lagOf(g).toLocaleString('en-US') },
];

function actions(g: ConsumerGroup): ActionsCellData {
  return {
    buttons: [{ title: 'Reset offsets to latest', icon: faForwardStep, onClick: (): void => reset(g, 'latest'), enabled: lagOf(g) > 0 }],
    menu: [{ title: 'Reset offsets to earliest', icon: faBackwardStep, onClick: (): void => reset(g, 'earliest') }],
  };
}

function reset(g: ConsumerGroup, to: 'latest' | 'earliest'): void {
  confirm({
    title: 'Reset offsets?',
    message: `Are you sure you want to reset the offsets of consumer group ${g.groupId} to the ${to} offset?${g.state === 'Stable' ? ` The group has ${g.members} active member${g.members === 1 ? '' : 's'}: the consumer is paused while the offsets are reset.` : ''}`,
    buttonLabel: 'Reset offsets',
    variant: 'primary',
  })
    .then(ok => {
      if (!ok) return;
      runTask({
        name: `Reset offsets of ${g.groupId}`,
        ext: KAFKA_EXT,
        steps: [
          { label: 'Pausing group members', ms: 600 },
          { label: `kafka-consumer-groups.sh --reset-offsets --to-${to} --group ${g.groupId} --all-topics --execute`, ms: 1000, log: g.offsets.map(o => `${o.topic} ${o.partition} ${to === 'latest' ? o.logEndOffset : 0}`) },
          { label: 'Resuming group members', ms: 500 },
        ],
        action: { label: 'Open group', href: `/c/${conn.id}/consumer-groups?group=${encodeURIComponent(g.groupId)}` },
        onDone: () => {
          for (const o of g.offsets) o.currentOffset = to === 'latest' ? o.logEndOffset : 0;
        },
      });
    })
    .catch(console.error);
}

function resetLatest(): void {
  if (selected) reset(selected, 'latest');
}

function resetFilter(): void {
  searchTerm = '';
}

function close(): void {
  navigate(`/c/${conn.id}/consumer-groups`);
}

function openTopic(t: string): void {
  navigate(`/c/${conn.id}/topics?topic=${encodeURIComponent(t)}`);
}
</script>

{#if selected}
  <DetailsPage title={selected.groupId} subtitle="{selected.state} · {selected.members} member{selected.members === 1 ? '' : 's'} · {selected.protocol} protocol · lag {lagOf(selected)}" breadcrumbLeftPart="Consumer groups" breadcrumbRightPart={selected.groupId} onclose={close} onbreadcrumbClick={close}>
    {#snippet iconSnippet()}<AppIcon icon="icons/redhat.streams-kafka.svg" size="28px" />{/snippet}
    {#snippet actionsSnippet()}
      <Button icon={faForwardStep} onclick={resetLatest} disabled={lagOf(selected) === 0}>Reset offsets</Button>
    {/snippet}
    {#snippet contentSnippet()}
      <div class="h-full overflow-auto px-5 py-4 space-y-3">
        <div class="grid grid-cols-3 gap-3">
          <Card><div class="text-2xl font-semibold text-[var(--pd-content-card-header-text)] tabular-nums">{lagOf(selected)}</div><div class="text-sm">Total lag (messages)</div></Card>
          <Card><div class="text-2xl font-semibold text-[var(--pd-content-card-header-text)]">{selected.members}</div><div class="text-sm">Members</div></Card>
          <Card><div class="flex items-center gap-2 text-2xl font-semibold text-[var(--pd-content-card-header-text)]">{selected.state}</div><div class="text-sm">State</div></Card>
        </div>
        <div class="rounded-lg bg-[var(--pd-content-card-bg)] overflow-hidden" role="table" aria-label="Offsets">
          <div class="grid grid-cols-[2fr_90px_130px_130px_90px_2fr] gap-2 px-4 py-2 text-xs uppercase text-[var(--pd-table-header-text)] font-semibold" role="row">
            <span>Topic</span><span>Partition</span><span>Current offset</span><span>Log end offset</span><span>Lag</span><span>Consumer</span>
          </div>
          {#each selected.offsets as o (o.topic + o.partition)}
            {@const lag = o.logEndOffset - o.currentOffset}
            <div class="grid grid-cols-[2fr_90px_130px_130px_90px_2fr] gap-2 px-4 py-2 text-sm border-t border-[var(--pd-content-divider)] text-[var(--pd-table-body-text)] tabular-nums items-center" role="row">
              <button class="text-left text-[var(--pd-link)] hover:underline" onclick={openTopic.bind(undefined, o.topic)}>{o.topic}</button>
              <span>{o.partition}</span><span>{o.currentOffset.toLocaleString('en-US')}</span><span>{o.logEndOffset.toLocaleString('en-US')}</span>
              <span>{#if lag > 0}<Pill label={String(lag)} tone="warning" />{:else}0{/if}</span>
              <span class="truncate">{o.consumerId ? `${o.consumerId} ${o.host}` : '–'}</span>
            </div>
          {/each}
        </div>
      </div>
    {/snippet}
  </DetailsPage>
{:else}
  <NavPage bind:searchTerm={searchTerm} title="consumer groups">
    {#snippet content()}
      {#if conn.status !== 'started'}
        <ConnectionStoppedScreen {conn} kind="consumer groups" />
      {:else}
        <DataTable kind="consumer groups" {rows} total={all.length} {searchTerm} onResetFilter={resetFilter} {key} name={nameOf} {status} {columns} {actions} emptyMessage="Consumer groups appear when an application commits offsets." />
      {/if}
    {/snippet}
  </NavPage>
{/if}
