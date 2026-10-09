<script lang="ts">
/**
 * Extension page tab (MTA, Image Builder, Konflux, Quay, …) in the P13
 * patterns, driven by `TOOL_CFG` (tool-cfg.ts):
 * header (rule E14: logo, name, description, segmented filter, filter field,
 * secondary then primary action), optional counters, the extension's
 * collection as a ModernTable (rule E17), the details of the clicked row as a
 * key/value card, then the "Resources" card (docs / repository / product).
 * `bootc` renders the bootc extension view; a tool without a config shows an
 * empty state, never placeholder items.
 */
import { faPuzzlePiece, faXmark } from '@fortawesome/free-solid-svg-icons';
import { EmptyScreen } from '@podman-desktop/ui-svelte';

import type { LabTarget } from '../data.ts';
import { tool as findTool } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import LabIcon from '../ui/LabIcon.svelte';
import BootcView from './BootcView.svelte';
import Btn from './Btn.svelte';
import Card from './Card.svelte';
import type { LabRow } from './cells/types.ts';
import Head from './Head.svelte';
import KV, { type KvRow } from './KV.svelte';
import ModernTable from './ModernTable.svelte';
import ResourcesCard from './ResourcesCard.svelte';
import Section from './Section.svelte';
import SegFilter from './SegFilter.svelte';
import StatGrid from './StatGrid.svelte';
import { TOOL_CFG, type ToolRow, type ToolStatus } from './tool-cfg.ts';
import { findNode, TREE_PROVIDERS, treeRoot } from './trees.ts';

interface Props {
  toolId: string;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { toolId, onopen }: Props = $props();

let search = $state('');
/** Segmented filter value and clicked row, scoped to the tool (the view is reused across tool tabs). */
let segOf = $state<{ tool: string; v: string }>({ tool: '', v: 'all' });
let selOf = $state<{ tool: string; name: string } | undefined>(undefined);
const seg = $derived(segOf.tool === toolId ? segOf.v : 'all');
const selected = $derived(selOf?.tool === toolId ? selOf.name : undefined);

const t = $derived(findTool(toolId));
const cfg = $derived(TOOL_CFG[toolId]);

const bootc = $derived(toolId === 'bootc' ? findNode(treeRoot(TREE_PROVIDERS.find(p => p.id === 'bootc')!, 'podman-machine-default').id) : undefined);

/** ModernTable tones: RUNNING = green, CREATED = hollow (done / idle), DEGRADED = failure, else grey. */
const TONE: Record<ToolStatus, string> = { running: 'RUNNING', ready: 'CREATED', error: 'DEGRADED', stopped: 'STOPPED', '': '' };
const LABEL: Record<ToolStatus, string> = { running: 'Running', ready: 'Ready', error: 'Error', stopped: 'Stopped', '': '' };

function segValue(r: ToolRow, key: string): string {
  return key === 'status' ? r.status : (r.cols[key] ?? '');
}

function matches(r: ToolRow): boolean {
  if (cfg?.seg && seg !== 'all' && segValue(r, cfg.seg.key) !== seg) return false;
  if (!search) return true;
  const q = search.toLowerCase();
  return [r.name, ...Object.values(r.cols)].some(v => v.toLowerCase().includes(q));
}

/** Page action (no target) or row quick action (target = row name). */
function run(label: string, target?: string): void {
  lab.openCreate(target ? `${label} · ${target}` : `${t?.name ?? toolId} · ${label}`);
}

const rows = $derived<LabRow[]>(
  (cfg?.rows ?? []).filter(matches).map(r => {
    const acts = cfg!.actions(r);
    return {
      name: `${toolId}/${r.name}`,
      status: TONE[r.status],
      icon: '',
      title: r.name,
      sub: [],
      cols: r.cols,
      open: (): void => {
        selOf = { tool: toolId, name: r.name };
      },
      buttons: acts.map(a => ({ title: a.title, icon: a.icon, danger: a.danger, run: (): void => run(a.title, r.name) })),
      menu: () => acts.map(a => ({ label: a.title, icon: a.icon, danger: a.danger, run: (): void => run(a.title, r.name) })),
    };
  }),
);

const sel = $derived(cfg?.rows.find(r => r.name === selected));
const selKv = $derived<KvRow[]>(
  sel && cfg
    ? [
        { k: 'Name', v: sel.name },
        ...(sel.status ? [{ k: 'Status', v: LABEL[sel.status] }] : []),
        ...cfg.cols.map(c => ({ k: c.title, v: sel.cols[c.key] || '—', mono: c.mono })),
      ]
    : [],
);

const sectionTitle = $derived(cfg ? cfg.noun.charAt(0).toUpperCase() + cfg.noun.slice(1) : '');

function clear(): void {
  search = '';
  segOf = { tool: toolId, v: 'all' };
}
</script>

{#snippet actions()}
  {#if cfg}
    {#if cfg.secondary}<Btn icon={cfg.secondary.icon} testid="tool-secondary" onclick={(): void => run(cfg.secondary!.label)}>{cfg.secondary.label}</Btn>{/if}
    <Btn kind="primary" icon={cfg.primary.icon} testid="tool-primary" onclick={(): void => run(cfg.primary.label)}>{cfg.primary.label}</Btn>
  {/if}
{/snippet}

{#snippet filters()}
  {#if cfg?.seg}
    <SegFilter tabs={[['all', 'All'], ...cfg.seg.options]} value={seg} label="Filter {cfg.noun}" testid="tool-seg" onpick={(v): void => { segOf = { tool: toolId, v }; }} />
  {/if}
{/snippet}

{#if toolId === 'bootc' && bootc}
  <BootcView f={bootc} {onopen} />
{:else if t && cfg}
  <div data-testid="tool-view" data-tool={toolId} class="flex flex-col h-full min-h-0">
    <Head icon={t.icon} title={t.name} sub={t.description} provenance={t.name} placeholder="Filter {cfg.noun}" bind:search filters={cfg.seg ? filters : undefined} {actions} />
    <div class="flex-1 min-h-0 overflow-auto">
      <div class="flex flex-col gap-4 p-5">
        <p data-testid="tool-about" class="text-[13px] text-[var(--pd-table-body-text)]">{cfg.about}</p>
        {#if cfg.stats?.length}<StatGrid items={cfg.stats} />{/if}
        <Section title={sectionTitle} count={rows.length} testid="tool-items">
          {#if rows.length}
            <ModernTable
              {rows}
              cols={cfg.cols.map((c): [string, string, string, boolean?] => [c.title, c.key, c.width ?? 'minmax(8rem, 1fr)', c.numeric])}
              mono={cfg.cols.filter(c => c.mono).map(c => c.key)}
              readonly={cfg.readonly}
              initialSort=""
              variant={lab.table === 'grid' ? 'grid' : 'modern'} />
          {:else}
            <div data-testid="tool-no-match" class="flex items-center gap-2 h-[34px] px-2 text-[12px] text-[var(--pd-table-body-text)]">
              No {cfg.noun} match{search ? ` “${search}”` : ' this filter'}.
              <button type="button" class="text-[var(--pd-content-header)] hover:text-[var(--pd-link)] hover:underline" onclick={clear}>Clear filters</button>
            </div>
          {/if}
        </Section>
        {#if sel}
          <div class="relative" data-testid="tool-details">
            <Card title={sel.name}><KV rows={selKv} /></Card>
            <button
              type="button"
              class="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded text-[var(--pd-action-button-details-text)] hover:bg-[var(--pd-action-button-details-bg)] hover:text-[var(--pd-action-button-details-hover-text)]"
              title="Close details"
              aria-label="Close details"
              onclick={(): void => { selOf = undefined; }}><LabIcon icon={faXmark} size={14} /></button>
          </div>
        {/if}
        <ResourcesCard id={toolId} />
      </div>
    </div>
  </div>
{:else}
  <div data-testid="tool-view" data-tool={toolId} class="flex flex-col h-full min-h-0">
    <Head icon={t?.icon ?? faPuzzlePiece} title={t?.name ?? toolId} sub={t?.description} provenance={t?.name} />
    <div class="flex flex-col flex-1 min-h-0 overflow-auto p-5 gap-4">
      <div data-testid="tool-empty"><EmptyScreen icon={faPuzzlePiece} title="Nothing to show yet" message="{t?.name ?? 'This extension'} does not contribute a page." /></div>
      <ResourcesCard id={toolId} />
    </div>
  </div>
{/if}
