<script lang="ts">
/** Details page for pods, volumes, networks, secrets and Kubernetes objects. */
import { DetailsPage, EmptyScreen, StatusIcon } from '@podman-desktop/ui-svelte';
import type { Component } from 'svelte';

import LazyComponent from '#lib/components/LazyComponent.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { ResourceContext } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import DetailsTabs from '#lib/resources/DetailsTabs.svelte';
import ActionsCell from '#lib/table/ActionsCell.svelte';
import type { ActionsCellData } from '#lib/table/types.ts';

import CodeView from './CodeView.svelte';
import LogsView from './LogsView.svelte';
import SummaryTable from './SummaryTable.svelte';

interface Props {
  title: string;
  subtitle?: string;
  icon: Component;
  status: string;
  breadcrumb: string;
  listHref: string;
  base: string;
  tab: string;
  ctx?: ResourceContext;
  sections: { title: string; rows: [string, string | undefined][] }[];
  inspect?: string;
  inspectLanguage?: string;
  inspectLabel?: string;
  logs?: string[];
  actions?: ActionsCellData;
}

let { title, subtitle, icon, status, breadcrumb, listHref, base, tab, ctx, sections, inspect, inspectLanguage = 'json', inspectLabel = 'Inspect', logs, actions }: Props =
  $props();

const extTabs = $derived(ctx ? registry.tabsFor(ctx) : []);
const core = $derived([
  { id: 'summary', label: 'Summary' },
  ...(logs ? [{ id: 'logs', label: 'Logs' }] : []),
  ...(inspect ? [{ id: 'inspect', label: inspectLabel }] : []),
]);
const extTab = $derived(extTabs.find(t => t.id === tab));

function close(): void {
  navigate(listHref);
}
</script>

<DetailsPage {title} {subtitle} breadcrumbLeftPart={breadcrumb} breadcrumbRightPart={title} onclose={close} onbreadcrumbClick={close}>
  {#snippet iconSnippet()}
    <StatusIcon {icon} size={24} {status} />
  {/snippet}
  {#snippet actionsSnippet()}
    {#if actions}<ActionsCell object={actions} />{/if}
  {/snippet}
  {#snippet tabsSnippet()}
    <DetailsTabs {base} current={tab} {core} ext={extTabs} />
  {/snippet}
  {#snippet contentSnippet()}
    {#if tab === 'summary'}
      <SummaryTable {sections} />
    {:else if tab === 'logs' && logs}
      <LogsView lines={logs} streaming={false} />
    {:else if tab === 'inspect' && inspect}
      <CodeView code={inspect} language={inspectLanguage} />
    {:else if extTab && ctx}
      {#key extTab.id}
        <LazyComponent component={extTab.component} props={{ ctx }} />
      {/key}
    {:else}
      <EmptyScreen title="Tab not available" message="The extension providing '{tab}' is disabled or does not apply here." />
    {/if}
  {/snippet}
</DetailsPage>
