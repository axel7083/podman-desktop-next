<script lang="ts">
/**
 * Automated analysis report of an archived recording (Cryostat reports
 * rule scores 0–100), a CPU flame graph and the top allocations.
 */
import { faArrowUpRightFromSquare, faDownload } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

import { humanSize, toast } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import Pill from '../../_appdev/Pill.svelte';
import { type ArchivedRecording, type FlameFrame, grafanaUrl, type RuleScore } from '../data.ts';

interface Props {
  archive: ArchivedRecording;
}

let { archive }: Props = $props();

const depth = $derived(Math.max(...archive.report.flame.map(f => f.depth)) + 1);
const rules = $derived([...archive.report.rules].sort((a, b) => b.score - a.score));
const leaves = $derived(archive.report.flame.filter(f => f.depth === depth - 1).map(f => f.frame).join(', '));

const TONE: Record<RuleScore['severity'], 'warning' | 'info' | 'success'> = { warning: 'warning', info: 'info', ok: 'success' };
const BAR: Record<RuleScore['severity'], string> = {
  warning: 'bg-[var(--pd-state-warning)]',
  info: 'bg-[var(--pd-state-info)]',
  ok: 'bg-[var(--pd-state-success)]',
};
const FRAME_TONES = [
  'bg-[var(--pd-label-primary-bg)] text-[var(--pd-label-primary-text)]',
  'bg-[var(--pd-label-secondary-bg)] text-[var(--pd-label-secondary-text)]',
  'bg-[var(--pd-label-quaternary-bg)] text-[var(--pd-label-quaternary-text)]',
];

function frameClass(f: FlameFrame): string {
  if (/OrderResource\.create|HashMap\.resize|OrderMapper\.toEntity/.test(f.frame)) return 'bg-[var(--pd-state-warning)] text-[var(--pd-content-bg)]';
  return FRAME_TONES[f.depth % FRAME_TONES.length];
}

function shortFrame(f: FlameFrame): string {
  const parts = f.frame.split('.');
  return parts.length > 2 ? parts.slice(-2).join('.') : f.frame;
}

function openGrafana(): void {
  toast({ type: 'info', title: 'Opening Grafana', body: grafanaUrl(archive) }, 8000);
}

function download(): void {
  toast({ type: 'success', title: `Downloaded ${archive.name}`, body: `${humanSize(archive.size)} saved to ~/Downloads` });
}
</script>

<section class="space-y-3" aria-label="Analysis report">
  <div class="flex items-center gap-2">
    <h2 class="text-lg font-semibold text-[var(--pd-content-header)]">Automated analysis report</h2>
    <span class="text-sm text-[var(--pd-content-text)] truncate" title={archive.name}>{archive.name}</span>
    <span class="grow"></span>
    <Button type="secondary" icon={faDownload} onclick={download}>Download .jfr</Button>
    <Button icon={faArrowUpRightFromSquare} onclick={openGrafana}>Open in Grafana</Button>
  </div>

  <Card title="Rule scores" subtitle="0–24 OK · 25–74 information · 75–100 warning">
    <ul class="space-y-2" aria-label="Rule scores">
      {#each rules as r (r.rule)}
        <li class="grid grid-cols-[160px_1fr_40px_90px] items-center gap-3">
          <span class="font-medium text-[var(--pd-content-card-header-text)]">{r.rule}</span>
          <div class="flex flex-col gap-1 min-w-0">
            <div class="h-1.5 rounded-full bg-[var(--pd-content-card-inset-bg)]">
              <div class="h-1.5 rounded-full {BAR[r.severity]}" style="width: {r.score}%"></div>
            </div>
            <span class="text-sm truncate" title={r.summary}>{r.summary}</span>
          </div>
          <span class="tabular-nums text-right font-semibold">{r.score}</span>
          <Pill label={r.severity === 'ok' ? 'OK' : r.severity === 'info' ? 'Information' : 'Warning'} tone={TONE[r.severity]} />
        </li>
      {/each}
    </ul>
  </Card>

  <Card title="CPU flame graph" subtitle="Execution samples, root at the top. Highlighted frames are flagged by the Hot Methods rule.">
    <div
      class="relative w-full"
      style="height: {depth * 22}px"
      role="img"
      aria-label="Flame graph, deepest frames: {leaves}">
      {#each archive.report.flame as f (f.depth + f.frame)}
        <div
          class="absolute h-5 rounded-sm px-1 text-xs leading-5 truncate font-mono {frameClass(f)}"
          style="top: {f.depth * 22}px; left: {f.start}%; width: calc({f.width}% - 2px)"
          title="{f.frame} — {f.width}% of samples">
          {shortFrame(f)}
        </div>
      {/each}
    </div>
  </Card>

  <Card title="Top allocations">
    <table class="w-full text-left" aria-label="Top allocations">
      <thead>
        <tr class="text-sm text-[var(--pd-table-body-text)]">
          <th class="py-1 font-normal">Type</th>
          <th class="py-1 font-normal w-48">Share</th>
          <th class="py-1 font-normal w-24 text-right">Allocated</th>
          <th class="py-1 font-normal pl-4">Top frame</th>
        </tr>
      </thead>
      <tbody>
        {#each archive.report.allocations as a (a.type)}
          <tr class="border-t border-[var(--pd-content-divider)]">
            <td class="py-1.5 font-mono text-sm">{a.type}</td>
            <td class="py-1.5">
              <div class="flex items-center gap-2">
                <div class="h-1.5 w-28 rounded-full bg-[var(--pd-content-card-inset-bg)]">
                  <div class="h-1.5 rounded-full bg-[var(--pd-button-primary-bg)]" style="width: {a.percent}%"></div>
                </div>
                <span class="tabular-nums">{a.percent}%</span>
              </div>
            </td>
            <td class="py-1.5 text-right tabular-nums">{a.bytes}</td>
            <td class="py-1.5 pl-4 font-mono text-sm truncate max-w-0 w-1/2" title={a.topFrame}>{a.topFrame}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </Card>
</section>
