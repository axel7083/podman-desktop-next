<script lang="ts">
/** Container details – PD container/ContainerDetails.svelte (Summary/Logs/Inspect/Kube/Terminal + extension tabs). */
import { DetailsPage, EmptyScreen, Link, StatusIcon } from '@podman-desktop/ui-svelte';
import { ContainerIcon } from '@podman-desktop/ui-svelte/icons';

import LazyComponent from '#lib/components/LazyComponent.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView, ResourceContext } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { containerActions } from '#lib/resources/actions.ts';
import DetailsTabs from '#lib/resources/DetailsTabs.svelte';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import { type Container, humanAge, shortImage, world } from '#lib/world.svelte.ts';

import CodeView from './CodeView.svelte';
import { containerAnswers, defaultLogs, logTail, toKubeYaml } from './fixtures.ts';
import LogsView from './LogsView.svelte';
import SummaryTable from './SummaryTable.svelte';
import Terminal from './Terminal.svelte';

interface Props {
  conn: ConnectionView;
  container: Container;
  tab: string;
}

let { conn, container, tab }: Props = $props();

const base = $derived(`/c/${conn.id}/containers/${container.id}`);
const ctx: ResourceContext = $derived({ target: 'container', conn, resource: container });
const extTabs = $derived(registry.tabsFor(ctx));
const isPodman = $derived(conn.engineType === 'podman');
const core = $derived([
  { id: 'summary', label: 'Summary' },
  { id: 'logs', label: 'Logs' },
  { id: 'inspect', label: 'Inspect' },
  ...(isPodman ? [{ id: 'kube', label: 'Kube' }] : []),
  { id: 'terminal', label: 'Terminal' },
]);
const extTab = $derived(extTabs.find(t => t.id === tab));
const image = $derived(world.images.find(i => `${i.name}:${i.tag}` === container.image || `${shortImage(i.name)}:${i.tag}` === shortImage(container.image)));

function close(): void {
  navigate(`/c/${conn.id}/containers`);
}

function openImage(): void {
  if (image) navigate(`/c/${conn.id}/images/${image.id}/summary`);
}

const summary = $derived([
  {
    title: 'Details',
    rows: [
      ['Name', container.name],
      ['ID', container.id],
      ['Command', container.command],
      ['State', container.state],
      ['Created', `${humanAge(container.created)} ago`],
      ['Uptime', container.startedAt ? humanAge(container.startedAt) : undefined],
      ['Image', container.image],
      ['Ports', container.ports.map(p => `${p.host}:${p.container}/${p.protocol ?? 'tcp'}`).join(', ')],
      ['Pod', container.podId ? world.pods.find(p => p.id === container.podId)?.name : undefined],
      ['Engine', `${conn.name} (${conn.providerName})`],
    ] as [string, string | undefined][],
  },
  {
    title: 'Labels',
    rows: Object.entries(container.labels) as [string, string][],
  },
  { title: 'Environment', rows: (container.env ?? []).map(e => e.split('=') as [string, string]) },
]);
</script>

<DetailsPage title={container.name} breadcrumbLeftPart="Containers" breadcrumbRightPart={container.name} onclose={close} onbreadcrumbClick={close}>
  {#snippet iconSnippet()}
    <StatusIcon icon={ContainerIcon} size={24} status={container.state} />
  {/snippet}
  {#snippet subtitleSnippet()}
    <Link aria-label="Image Details" onclick={openImage}>{shortImage(container.image)}</Link>
  {/snippet}
  {#snippet actionsSnippet()}
    <ActionsCell object={containerActions(container, true)} />
  {/snippet}
  {#snippet tabsSnippet()}
    <DetailsTabs {base} current={tab} {core} ext={extTabs} />
  {/snippet}
  {#snippet contentSnippet()}
    {#if tab === 'summary'}
      <SummaryTable sections={summary} />
    {:else if tab === 'logs'}
      <LogsView lines={container.logs ?? defaultLogs(container)} streaming={container.state === 'RUNNING'} tail={logTail(container)} />
    {:else if tab === 'inspect'}
      <CodeView code={JSON.stringify({ Id: container.id, Name: container.name, Image: container.image, State: { Status: container.state.toLowerCase(), Running: container.state === 'RUNNING', StartedAt: container.startedAt ? new Date(container.startedAt).toISOString() : '0001-01-01T00:00:00Z' }, Created: new Date(container.created).toISOString(), Config: { Labels: container.labels, Env: container.env ?? [], Cmd: container.command?.split(' ') ?? [] }, NetworkSettings: { Ports: Object.fromEntries(container.ports.map(p => [`${p.container}/${p.protocol ?? 'tcp'}`, [{ HostIp: '0.0.0.0', HostPort: String(p.host) }]])) } }, undefined, 2)} />
    {:else if tab === 'kube'}
      <CodeView language="yaml" code={toKubeYaml(container)} />
    {:else if tab === 'terminal'}
      {#if container.state === 'RUNNING'}
        <Terminal prompt="sh-5.2# " answers={containerAnswers(container)} />
      {:else}
        <EmptyScreen icon={ContainerIcon} title="No terminal" message="Container is not running." />
      {/if}
    {:else if extTab}
      {#key extTab.id}
        <LazyComponent component={extTab.component} props={{ ctx }} />
      {/key}
    {:else}
      <EmptyScreen title="Tab not available" message="The extension providing '{tab}' is disabled or does not apply here." />
    {/if}
  {/snippet}
</DetailsPage>
