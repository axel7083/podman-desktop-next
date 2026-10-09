<script lang="ts">
/**
 * Extension page tab (Image Builder, Dev containers, MTA, Helm, …) in the P13
 * patterns: shared header (logo, name, description, filter, one primary
 * action), then the extension's collection as a ModernTable (rule E17).
 * Replaces the old placeholder page (big title, purple subtitle, tabs in a
 * tab, skeleton cards).
 */
import { faCirclePlus, faPlay, faTrash } from '@fortawesome/free-solid-svg-icons';

import type { LabTarget } from '../data.ts';
import { tool as findTool } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import Btn from './Btn.svelte';
import type { LabRow } from './cells/types.ts';
import { hash } from './details.ts';
import Head from './Head.svelte';
import ModernTable from './ModernTable.svelte';

interface Props {
  toolId: string;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { toolId }: Props = $props();

let search = $state('');

const t = $derived(findTool(toolId));

/** Per extension: primary action, item noun, columns, sample items [name, col1, col2, status]. */
const CFG: Record<string, { action: string; noun: string; cols: [string, string][]; items: [string, string, string, string][] }> = {
  'image-builder': {
    action: 'Build image',
    noun: 'blueprints',
    cols: [['Distribution', 'a'], ['Output', 'b']],
    items: [
      ['rhel-10-edge', 'RHEL 10.0', 'qcow2', 'running'],
      ['rhel-9-webserver', 'RHEL 9.6', 'ami', 'exited'],
      ['kiosk', 'RHEL 10.0', 'iso', 'exited'],
    ],
  },
  devcontainers: {
    action: 'Open dev container',
    noun: 'dev containers',
    cols: [['Folder', 'a'], ['Image', 'b']],
    items: [
      ['orders', '~/src/orders', 'mcr.microsoft.com/devcontainers/java:21', 'running'],
      ['checkout', '~/src/checkout', 'mcr.microsoft.com/devcontainers/go:1.25', 'exited'],
    ],
  },
  mta: {
    action: 'New analysis',
    noun: 'analyses',
    cols: [['Application', 'a'], ['Target', 'b']],
    items: [
      ['orders-monolith', '~/src/orders-legacy', 'Quarkus 3 · OpenJDK 21', 'running'],
      ['billing', '~/src/billing', 'EAP 8', 'exited'],
      ['inventory', '~/src/inventory', 'Containerization', 'exited'],
    ],
  },
  helm: {
    action: 'Install chart',
    noun: 'charts',
    cols: [['Repository', 'a'], ['Version', 'b']],
    items: [
      ['kafka-ui', 'kafbat', '0.7.6', ''],
      ['grafana', 'grafana', '8.5.2', ''],
      ['postgresql', 'bitnami', '16.0.1', ''],
    ],
  },
};

const cfg = $derived(
  CFG[toolId] ?? {
    action: `New in ${t?.name ?? 'extension'}`,
    noun: 'items',
    cols: [
      ['Type', 'a'],
      ['Updated', 'b'],
    ] as [string, string][],
    items: Array.from({ length: 3 }, (_, i): [string, string, string, string] => [`${t?.name ?? 'item'} ${i + 1}`, t?.category ?? '', `${1 + (hash(toolId) % 5) + i} days ago`, '']),
  },
);

const rows = $derived<LabRow[]>(
  cfg.items
    .filter(([n]) => !search || n.toLowerCase().includes(search.toLowerCase()))
    .map(([n, a, b, st]) => ({
      name: `${toolId}/${n}`,
      status: st === 'running' ? 'RUNNING' : st ? 'EXITED' : '',
      icon: t?.icon ?? '',
      title: n,
      sub: [],
      cols: { a, b },
      open: (): void => lab.openCreate(`${t?.name} · ${n}`),
      buttons: [
        { title: 'Run', icon: faPlay, run: (): void => lab.openCreate(`Run ${n}`) },
        { title: 'Delete', icon: faTrash, danger: true, run: (): void => lab.openCreate(`Delete ${n}`) },
      ],
    })),
);
</script>

{#snippet actions()}
  <Btn kind="primary" icon={faCirclePlus} onclick={(): void => lab.openCreate(cfg.action)}>{cfg.action}</Btn>
{/snippet}

{#if t}
  <div data-testid="tool-view" class="flex flex-col h-full min-h-0">
    <Head icon={t.icon} title={t.name} sub={t.description} provenance={t.name} placeholder="Filter {cfg.noun}" bind:search {actions} />
    <div class="flex flex-1 min-h-0 overflow-auto">
      {#if rows.length}
        <ModernTable {rows} cols={cfg.cols.map(([title, key]): [string, string, string] => [title, key, 'minmax(10rem, 1fr)'])} variant={lab.table === 'grid' ? 'grid' : 'modern'} />
      {:else}
        <div class="px-4 py-3 text-[12px] text-[var(--pd-table-body-text)]">No {cfg.noun} match “{search}”.</div>
      {/if}
    </div>
  </div>
{/if}
