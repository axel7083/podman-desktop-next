<script lang="ts">
/**
 * Analysis report (kantra static report, per target): summary cards, issues
 * grouped by category, incidents, Konveyor AI fixes and the hand-off to the
 * JBoss EAP "Containerize WAR" wizard.
 */
import { faArrowUpRightFromSquare, faBoxOpen, faChevronDown, faChevronRight, faRotateRight, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage, Tab } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { page } from '$app/state';

import AppIcon from '#lib/components/AppIcon.svelte';
import { href, navigate } from '#lib/nav.ts';
import { toast } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import Pill from '../../_appdev/Pill.svelte';
import TaskLog from '../../_appdev/TaskLog.svelte';
import {
  type Analysis,
  CATEGORIES,
  type Category,
  FIXES,
  fixes,
  generateFix,
  type Incident,
  incidentKey,
  pointsOf,
  relPath,
  reportRules,
  resolvedCount,
  resolvedIncidents,
  summary,
  targetLabel,
  type Violation,
  WAR_PATH,
} from '../data.ts';
import FixDialog from './FixDialog.svelte';

interface Props {
  analysis: Analysis;
}

let { analysis }: Props = $props();

const target = $derived(analysis.targets.includes(page.url.searchParams.get('target') ?? '') ? (page.url.searchParams.get('target') as string) : analysis.targets[0]);
const resolved = $derived(resolvedIncidents());
const fixState = $derived(fixes());
const rules = $derived(reportRules(analysis, target));
const sum = $derived(summary(analysis, target, resolved));
const perTarget = $derived(analysis.targets.map(t => ({ id: t, points: summary(analysis, t, resolved).points })));
const pendingFix = $derived(Object.entries(fixState).find(([, f]) => f.state === 'ready')?.[0]);
let expanded = $state<string[]>([]);

const TONE: Record<Category, 'error' | 'warning' | 'info'> = { mandatory: 'error', optional: 'warning', potential: 'info' };
const TITLE: Record<Category, string> = { mandatory: 'Mandatory', optional: 'Optional', potential: 'Potential' };
const HELP: Record<Category, string> = {
  mandatory: 'Must be fixed for the application to run on the target.',
  optional: 'Should be fixed; the application may still work.',
  potential: 'Needs review to decide if a change is required.',
};

function tabUrl(t: string): string {
  return href(`/tools/mta?report=${analysis.id}&target=${t}`);
}

function close(): void {
  navigate('/tools/mta');
}

function rulesOf(c: Category): Violation[] {
  return rules.filter(r => r.category === c);
}

function toggle(ruleId: string): void {
  expanded = expanded.includes(ruleId) ? expanded.filter(r => r !== ruleId) : [...expanded, ruleId];
}

function containerize(): void {
  navigate('/tools/eap?war=' + encodeURIComponent(WAR_PATH));
}

function openStatic(): void {
  toast({ type: 'info', title: `Opening ${analysis.input}/.konveyor/static-report/index.html` });
}

function reanalyze(): void {
  navigate(`/tools/mta?view=analyze&project=${encodeURIComponent(analysis.project)}`);
}

function fix(key: string): void {
  generateFix(key);
}

function openFile(i: Incident): void {
  toast({ type: 'info', title: `Opening ${relPath(i.uri)}:${i.lineNumber} in your editor` });
}

function started(): string {
  return new Date(analysis.startedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}
</script>

<DetailsPage
  title={analysis.project}
  subtitle="{analysis.id} · {analysis.source} → {analysis.targets.join(', ')} · {analysis.mode} · {analysis.runLocal ? 'containerless' : 'hybrid (Podman)'} · {started()}"
  breadcrumbLeftPart="Migration toolkit"
  breadcrumbRightPart="{analysis.project} report"
  onclose={close}
  onbreadcrumbClick={close}>
  {#snippet iconSnippet()}<AppIcon icon="icons/redhat.mta.svg" size="28px" />{/snippet}
  {#snippet actionsSnippet()}
    <Button type="secondary" icon={faRotateRight} onclick={reanalyze}>Analyze again</Button>
    <Button type="secondary" icon={faArrowUpRightFromSquare} onclick={openStatic}>Open static report</Button>
    {#if analysis.project === 'inventory-service' && analysis.targets.includes('eap8')}
      <Button icon={faBoxOpen} onclick={containerize}>Containerize with EAP 8.1</Button>
    {/if}
  {/snippet}
  {#snippet tabsSnippet()}
    {#each analysis.targets as t (t)}
      <Tab title={t} selected={t === target} url={tabUrl(t)} />
    {/each}
  {/snippet}
  {#snippet contentSnippet()}
    <div class="h-full overflow-auto px-5 py-4 space-y-3" aria-label="Report for {target}">
      <div class="grid grid-cols-4 gap-3">
        {#each CATEGORIES as c (c)}
          <Card>
            <div class="text-2xl font-semibold tabular-nums text-[var(--pd-content-card-header-text)]" aria-label="{TITLE[c]} issues">{sum[c]}</div>
            <div class="text-sm flex items-center gap-2">{TITLE[c]} issues</div>
          </Card>
        {/each}
        <Card>
          <div class="text-2xl font-semibold tabular-nums text-[var(--pd-content-card-header-text)]" aria-label="Story points">{sum.points}</div>
          <div class="text-sm">Story points · {sum.incidents.toLocaleString('en-US')} incidents</div>
        </Card>
      </div>

      {#if perTarget.length > 1}
        <div class="text-sm text-[var(--pd-content-text)]" aria-label="Story points by target">
          Effort by target:
          {#each perTarget as p, i (p.id)}
            {#if i > 0}<span aria-hidden="true">&nbsp;·&nbsp;</span>{/if}
            <a class="text-[var(--pd-link)] hover:underline {p.id === target ? 'font-semibold' : ''}" href={tabUrl(p.id)}>{targetLabel(p.id)} {p.points} pts</a>
          {/each}
        </div>
      {/if}

      {#if rules.length === 0}
        <Card title="No migration issues for {target}">
          <p>kantra found no violation of the {target} rulesets in {analysis.input}.</p>
        </Card>
      {/if}

      {#each CATEGORIES as c (c)}
        {@const list = rulesOf(c)}
        {#if list.length}
          <section class="rounded-lg bg-[var(--pd-content-card-bg)] overflow-hidden text-[var(--pd-table-body-text)]" aria-label="{TITLE[c]} issues list">
            <div class="flex items-center gap-2 px-4 pt-3 pb-1">
              <h2 class="text-base font-semibold text-[var(--pd-content-card-header-text)]">{TITLE[c]} ({list.length})</h2>
              <span class="text-sm opacity-80">{HELP[c]}</span>
            </div>
            <div class="grid grid-cols-[20px_minmax(0,2fr)_minmax(0,3fr)_80px_60px_90px] gap-2 px-4 py-2 text-xs uppercase font-semibold text-[var(--pd-table-header-text)]" role="row">
              <span></span><span>Rule</span><span>Description</span><span class="text-right">Incidents</span><span class="text-right">Effort</span><span class="text-right">Story points</span>
            </div>
            {#each list as v (v.ruleId)}
              {@const open = expanded.includes(v.ruleId)}
              {@const done = resolvedCount(v, resolved)}
              <button
                class="w-full grid grid-cols-[20px_minmax(0,2fr)_minmax(0,3fr)_80px_60px_90px] gap-2 px-4 py-2.5 text-left text-sm border-t border-[var(--pd-content-divider)] hover:bg-[var(--pd-content-card-hover-bg)]"
                aria-label={v.ruleId}
                aria-expanded={open}
                onclick={toggle.bind(undefined, v.ruleId)}>
                <Icon icon={open ? faChevronDown : faChevronRight} />
                <span class="font-mono truncate text-[var(--pd-table-body-text-highlight)]" title={v.ruleId}>{v.ruleId}</span>
                <span class="truncate" title={v.description}>{v.description}</span>
                <span class="text-right tabular-nums">{v.incidentCount}{done ? ` (${done} resolved)` : ''}</span>
                <span class="text-right tabular-nums">{v.effort}</span>
                <span class="text-right tabular-nums">{pointsOf(v, resolved)}</span>
              </button>
              {#if open}
                <div class="px-4 pb-3 pl-11 space-y-2 bg-[var(--pd-content-card-inset-bg)]" aria-label="Incidents of {v.ruleId}">
                  <div class="flex items-center gap-2 pt-3 text-sm">
                    <Pill label={v.category} tone={TONE[v.category]} />
                    {#each v.labels as l (l)}<Pill label={l} />{/each}
                  </div>
                  {#each v.incidents as i (incidentKey(v, i))}
                    {@const k = incidentKey(v, i)}
                    {@const f = fixState[k]}
                    {@const isResolved = resolved.includes(k)}
                    <div class="rounded-md bg-[var(--pd-content-card-bg)] px-3 py-2 space-y-1.5">
                      <div class="flex items-center gap-3">
                        <button class="font-mono text-sm text-[var(--pd-link)] hover:underline {isResolved ? 'line-through' : ''}" onclick={openFile.bind(undefined, i)}>{relPath(i.uri)}:{i.lineNumber}</button>
                        <span class="grow"></span>
                        {#if isResolved}
                          <Pill label="Resolved" tone="success" />
                        {:else if FIXES[k] && f?.state !== 'generating' && f?.state !== 'ready'}
                          <Button type="secondary" icon={faWandMagicSparkles} onclick={fix.bind(undefined, k)}>{f?.state === 'rejected' ? 'Regenerate fix' : 'Generate fix with Konveyor AI'}</Button>
                        {/if}
                      </div>
                      <p class="text-sm">{i.message}</p>
                      {#if f?.state === 'generating'}
                        <TaskLog taskId={f.taskId} label="Konveyor AI progress" />
                      {/if}
                    </div>
                  {/each}
                  {#if v.incidentCount > v.incidents.length}
                    <p class="text-sm opacity-80">Showing {v.incidents.length} of {v.incidentCount} incidents. <button class="text-[var(--pd-link)] hover:underline" onclick={openStatic}>Open the static report</button> for the full list.</p>
                  {/if}
                  {#each v.links ?? [] as link (link.url)}
                    <a class="block text-sm text-[var(--pd-link)] hover:underline" href={link.url} target="_blank" rel="noreferrer">{link.title}</a>
                  {/each}
                </div>
              {/if}
            {/each}
          </section>
        {/if}
      {/each}
    </div>
  {/snippet}
</DetailsPage>

{#if pendingFix}
  <FixDialog incident={pendingFix} />
{/if}
