<script lang="ts">
/** Image details – PD image/ImageDetails.svelte (Summary/History/Inspect) + core Security tab + extension tabs. */
import { DetailsPage, EmptyScreen, StatusIcon } from '@podman-desktop/ui-svelte';

import LazyComponent from '#lib/components/LazyComponent.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ConnectionView, ResourceContext } from '#lib/ext/types.ts';
import ImageIcon from '#lib/images/ImageIcon.svelte';
import { navigate } from '#lib/nav.ts';
import { imageActions } from '#lib/resources/actions.ts';
import DetailsTabs from '#lib/resources/DetailsTabs.svelte';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import { type ContainerImage, humanAge, humanSize, shortImage, world } from '#lib/world.svelte.ts';

import CodeView from './CodeView.svelte';
import SecurityTab from './SecurityTab.svelte';
import SummaryTable from './SummaryTable.svelte';

interface Props {
  conn: ConnectionView;
  image: ContainerImage;
  tab: string;
}

let { conn, image, tab }: Props = $props();

const base = $derived(`/c/${conn.id}/images/${image.id}`);
const ctx: ResourceContext = $derived({ target: 'image', conn, resource: image });
const extTabs = $derived(registry.tabsFor(ctx));
const core = [
  { id: 'summary', label: 'Summary' },
  { id: 'history', label: 'History' },
  { id: 'inspect', label: 'Inspect' },
  { id: 'security', label: 'Security' },
];
const extTab = $derived(extTabs.find(t => t.id === tab));
const inUse = $derived(world.containers.some(c => c.engineId === conn.id && shortImage(c.image) === `${shortImage(image.name)}:${image.tag}`));

function close(): void {
  navigate(`/c/${conn.id}/images`);
}

const layers = $derived(
  image.layers ?? [
    { id: image.id.slice(0, 12), command: `/bin/sh -c #(nop)  CMD ["${image.name.split('/').pop()}"]`, size: 0 },
    { id: image.id.slice(12, 24), command: '/bin/sh -c #(nop) COPY dir:a1b2c3 in /app', size: Math.round(image.size * 0.3) },
    { id: image.id.slice(24, 36), command: `/bin/sh -c #(nop) ADD file:${image.id.slice(40, 52)} in /`, size: Math.round(image.size * 0.7) },
  ],
);
</script>

<DetailsPage title={shortImage(image.name)} titleDetail={image.tag} subtitle={image.id.slice(0, 12)} breadcrumbLeftPart="Images" breadcrumbRightPart="Image Details" onclose={close} onbreadcrumbClick={close}>
  {#snippet iconSnippet()}
    <StatusIcon icon={ImageIcon} size={24} status={inUse ? 'USED' : 'UNUSED'} />
  {/snippet}
  {#snippet actionsSnippet()}
    <ActionsCell object={imageActions(image, inUse, true)} />
  {/snippet}
  {#snippet tabsSnippet()}
    <DetailsTabs {base} current={tab} {core} ext={extTabs} />
  {/snippet}
  {#snippet contentSnippet()}
    {#if tab === 'summary'}
      <SummaryTable
        sections={[
          {
            title: 'Details',
            rows: [
              ['Name', image.name],
              ['Tag', image.tag],
              ['ID', image.id],
              ['Digest', image.digest],
              ['Size', humanSize(image.size)],
              ['Created', `${humanAge(image.created)} ago`],
              ['OS / Arch', `${image.os ?? 'linux'}/${image.arch ?? 'amd64'}`],
              ['Base', image.base],
            ],
          },
          { title: 'Labels', rows: Object.entries(image.labels ?? {}) as [string, string][] },
        ]} />
    {:else if tab === 'history'}
      <div class="px-5 py-4 h-full overflow-auto">
        <table class="w-full text-left text-[var(--pd-table-body-text)]">
          <thead class="text-xs uppercase text-[var(--pd-table-header-text)]"><tr><th class="py-1">Layer</th><th>Command</th><th class="text-right">Size</th></tr></thead>
          <tbody>
            {#each layers as l (l.id)}
              <tr class="border-t border-[var(--pd-content-divider)]">
                <td class="py-1.5 font-mono text-sm">{l.id}</td>
                <td class="py-1.5 font-mono text-sm break-all">{l.command}</td>
                <td class="py-1.5 text-right">{humanSize(l.size)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else if tab === 'inspect'}
      <CodeView code={JSON.stringify({ Id: `sha256:${image.id}`, RepoTags: [`${image.name}:${image.tag}`], RepoDigests: image.digest ? [`${image.name}@${image.digest}`] : [], Created: new Date(image.created).toISOString(), Size: image.size, Os: image.os ?? 'linux', Architecture: image.arch ?? 'amd64', Labels: image.labels ?? {} }, undefined, 2)} />
    {:else if tab === 'security'}
      <SecurityTab {image} />
    {:else if extTab}
      {#key extTab.id}
        <LazyComponent component={extTab.component} props={{ ctx }} />
      {/key}
    {:else}
      <EmptyScreen title="Tab not available" message="The extension providing '{tab}' is disabled or does not apply here." />
    {/if}
  {/snippet}
</DetailsPage>
