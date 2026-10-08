<script lang="ts">
/**
 * Image "Security" tab (docs/ia.md rule 4): one section per enabled checker
 * (P5 structured findings) plus a merged summary. With no checker enabled it
 * degrades to an EmptyScreen linking to the Extensions catalog (rule 7).
 * Scaling: the summary lists every checker (counts + headline) first; with
 * more than 3 checkers, sections collapse unless they hold critical/high
 * findings or a remediation action. Every finding row has the same columns.
 */
import { faArrowUpRightFromSquare, faChevronDown, faChevronRight, faCircleCheck, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { Button, EmptyScreen, Spinner } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { SvelteMap } from 'svelte/reactivity';

import AppIcon from '#lib/components/AppIcon.svelte';
import Contribution from '#lib/components/Contribution.svelte';
import { registry } from '#lib/ext/registry.svelte.ts';
import type { Finding, Severity } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { plural } from '#lib/util.ts';
import { type ContainerImage, later, toast } from '#lib/world.svelte.ts';

interface Props {
  image: ContainerImage;
}

let { image }: Props = $props();

const results = new SvelteMap<string, Finding[] | 'scanning'>();
const checkers = $derived(registry.checkers.filter(c => c.when?.(image) ?? true));

$effect(() => {
  for (const c of checkers) {
    const key = `${image.id}:${c.ext.id}:${c.id}`;
    if (!results.has(key)) {
      results.set(key, 'scanning');
      later(c.durationMs ?? 1200, () => results.set(key, c.check(image)));
    }
  }
});

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const SEV_CLASS: Record<Severity, string> = {
  // one ramp in both themes (proposed tokens); critical carries the most weight
  critical: 'bg-[var(--pd-severity-critical-bg)] text-[var(--pd-severity-critical-text)] font-bold',
  high: 'bg-[var(--pd-severity-high-bg)] text-[var(--pd-severity-high-text)]',
  medium: 'bg-[var(--pd-severity-medium-bg)] text-[var(--pd-severity-medium-text)]',
  low: 'bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]',
  info: 'bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]',
  success: 'bg-[var(--pd-state-success)] text-[var(--pd-status-contrast)]',
};

function findingsOf(key: string): Finding[] {
  const r = results.get(key);
  return Array.isArray(r) ? r : [];
}

const all = $derived(checkers.flatMap(c => findingsOf(`${image.id}:${c.ext.id}:${c.id}`)));
const scanning = $derived(checkers.some(c => results.get(`${image.id}:${c.ext.id}:${c.id}`) === 'scanning'));

function count(sev: Severity): number {
  return all.filter(f => f.severity === sev && f.vexStatus !== 'not_affected' && f.vexStatus !== 'will_not_fix').length;
}

function countIn(list: Finding[], sev: Severity): number {
  return list.filter(f => f.severity === sev && f.vexStatus !== 'not_affected' && f.vexStatus !== 'will_not_fix').length;
}

const COLLAPSE_ABOVE = 3;
const expandedOverride = new SvelteMap<string, boolean>();

function keyOf(c: (typeof checkers)[number]): string {
  return `${image.id}:${c.ext.id}:${c.id}`;
}

function isExpanded(c: (typeof checkers)[number]): boolean {
  const k = keyOf(c);
  const o = expandedOverride.get(k);
  if (o !== undefined) return o;
  if (checkers.length <= COLLAPSE_ABOVE) return true;
  const list = findingsOf(k);
  return list.some(f => f.actions?.length) || countIn(list, 'critical') > 0;
}

function toggleSection(c: (typeof checkers)[number]): void {
  expandedOverride.set(keyOf(c), !isExpanded(c));
}

function jumpTo(c: (typeof checkers)[number]): void {
  expandedOverride.set(keyOf(c), true);
  requestAnimationFrame(() => document.getElementById(`checker-${c.ext.id}-${c.id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
}

function openCatalog(): void {
  navigate('/extensions?tab=catalog&q=checker');
}

function openAdvisory(f: Finding): void {
  toast({ type: 'info', title: `Opening ${f.advisoryUrl}` });
}
</script>

{#if checkers.length === 0}
  <EmptyScreen icon={faShieldHalved} title="No image checker enabled" message="Enable an image checker extension (Grype, Red Hat Security Data VEX, OpenSCAP…) to see vulnerabilities and policy results here.">
    <Button onclick={openCatalog}>Enable a checker</Button>
  </EmptyScreen>
{:else}
  <div class="h-full overflow-auto px-5 py-4 space-y-3 text-[var(--pd-content-text)]">
    <div class="rounded-lg bg-[var(--pd-content-card-bg)] p-4" aria-label="Security summary">
      <div class="flex items-center gap-3">
        <Icon icon={faShieldHalved} size="lg" />
        <div class="grow">
          <div class="font-semibold text-[var(--pd-content-card-header-text)]">
            {scanning ? 'Scanning…' : all.length === 0 ? 'No issues found' : `${plural(all.length, 'finding')} from ${plural(checkers.length, 'checker')}`}
          </div>
          <div class="text-sm">Merged across providers; VEX "not affected" and "will not fix" findings are excluded from counts.</div>
        </div>
        {#each SEVERITIES as sev (sev)}
          <span class="rounded-sm px-2 py-0.5 text-sm font-semibold capitalize {count(sev) ? SEV_CLASS[sev] : 'bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] opacity-60'}">{count(sev)} {sev}</span>
        {/each}
      </div>
      {#if checkers.length > 1}
        <table class="w-full mt-3 text-left table-fixed" aria-label="Checkers">
          <tbody>
            {#each checkers as c (c.ext.id + c.id)}
              {@const key = keyOf(c)}
              {@const list = findingsOf(key)}
              {@const done = Array.isArray(results.get(key))}
              {@const headline = done ? c.summary?.(image, list) : undefined}
              <tr class="border-t border-[var(--pd-content-divider)] hover:bg-[var(--pd-content-card-hover-bg)] cursor-pointer" onclick={jumpTo.bind(undefined, c)}>
                <td class="py-1.5 w-64">
                  <span class="flex items-center gap-2 min-w-0"><AppIcon icon={c.ext.icon} size="16px" /><span class="truncate text-[var(--pd-table-body-text-highlight)]" title={c.label}>{c.label}</span></span>
                </td>
                <td class="py-1.5 w-72">
                  {#if !done}
                    <span class="flex items-center gap-1.5 text-sm"><Spinner size="1em" />Scanning…</span>
                  {:else if list.length === 0}
                    <span class="flex items-center gap-1.5 text-sm text-[var(--pd-state-success)]"><Icon icon={faCircleCheck} />Passed</span>
                  {:else}
                    <span class="flex gap-1">
                      {#each SEVERITIES.filter(sev => countIn(list, sev)) as sev (sev)}
                        <span class="rounded-sm px-1.5 text-xs font-semibold capitalize {SEV_CLASS[sev]}">{countIn(list, sev)} {sev}</span>
                      {/each}
                      {#if SEVERITIES.every(sev => !countIn(list, sev))}<span class="text-sm">{plural(list.length, 'finding')} (excluded by VEX)</span>{/if}
                    </span>
                  {/if}
                </td>
                <td class="py-1.5 text-sm truncate" title={headline}>{headline ?? ''}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
    {#each checkers as c (c.ext.id + c.id)}
      {@const key = keyOf(c)}
      {@const open = isExpanded(c)}
      <Contribution ext={c.ext} kind="imageChecker" api="P5">
        <section id="checker-{c.ext.id}-{c.id}" class="rounded-lg bg-[var(--pd-content-card-bg)] px-4 py-3 scroll-mt-2" aria-label={c.label}>
          <button class="flex items-center gap-2 w-full text-left" aria-expanded={open} onclick={toggleSection.bind(undefined, c)}>
            <span class="w-3 text-[var(--pd-content-sub-header)]"><Icon icon={open ? faChevronDown : faChevronRight} size="xs" /></span>
            <AppIcon icon={c.ext.icon} size="20px" />
            <h2 class="text-lg font-semibold text-[var(--pd-content-card-header-text)] grow">{c.label}</h2>
            {#if results.get(key) === 'scanning'}<Spinner size="1em" /><span class="text-sm">Scanning…</span>
            {:else if !open}<span class="text-sm">{findingsOf(key).length ? plural(findingsOf(key).length, 'finding') : 'Passed'}</span>{/if}
          </button>
          {#if open}
            <div class="mt-2">
              {#if c.description}<p class="text-sm mb-2">{c.description}</p>{/if}
              {#if Array.isArray(results.get(key))}
                {@const list = findingsOf(key)}
                {@const headline = c.summary?.(image, list)}
                {@const pkgCols = list.some(f => f.package || f.fixedIn || f.vexStatus)}
                {#if headline}<p class="mb-2 font-semibold text-[var(--pd-content-card-header-text)]" aria-label="{c.label} summary">{headline}</p>{/if}
                {#if list.length === 0}
                  <p class="text-[var(--pd-state-success)]">Passed – no findings.</p>
                {:else}
                  <table class="w-full text-left table-fixed">
                    <thead class="text-xs uppercase text-[var(--pd-table-header-text)]">
                      <tr><th class="py-1 w-24">Severity</th><th>Finding</th>{#if pkgCols}<th class="w-44">Package</th><th class="w-32">Fixed in</th><th class="w-32">VEX</th>{/if}<th class="w-52"></th></tr>
                    </thead>
                    <tbody>
                      {#each list as f (f.id)}
                        <tr class="border-t border-[var(--pd-content-divider)] {f.vexStatus === 'not_affected' || f.vexStatus === 'will_not_fix' ? 'opacity-60' : ''}">
                          <td class="py-1.5"><span class="rounded-sm px-1.5 text-xs font-semibold capitalize {SEV_CLASS[f.severity]}">{f.severity}</span></td>
                          <td class="py-1.5 pr-2"><div class="text-[var(--pd-table-body-text-highlight)] break-words">{f.cve ?? f.ruleId ?? f.id}</div><div class="text-xs">{f.title}</div></td>
                          {#if pkgCols}
                            <td class="py-1.5 pr-2 text-sm break-words">{f.package ?? ''}{f.installed ? ` ${f.installed}` : ''}</td>
                            <td class="py-1.5 pr-2 text-sm break-words">{f.fixedIn ?? '—'}</td>
                            <td class="py-1.5 pr-2 text-sm">{f.vexStatus?.replaceAll('_', ' ') ?? '—'}</td>
                          {/if}
                          <td class="py-1.5 text-right whitespace-nowrap">
                            {#each f.actions ?? [] as a (a.label)}
                              <Button type="secondary" class="mr-2" onclick={a.run.bind(undefined, image)}>{a.label}</Button>
                            {/each}
                            {#if f.advisoryUrl}
                              <button class="text-[var(--pd-link)]" title="Open advisory" aria-label="Open advisory" onclick={openAdvisory.bind(undefined, f)}>
                                <Icon icon={faArrowUpRightFromSquare} />
                              </button>
                            {/if}
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {/if}
              {/if}
            </div>
          {/if}
        </section>
      </Contribution>
    {/each}
  </div>
{/if}
