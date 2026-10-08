<script lang="ts">
/** Connection › Advisor (P14): Red Hat Lightspeed Advisor recommendations for a registered system. */
import { faArrowsRotate, faArrowUpRightFromSquare, faChevronDown, faChevronRight, faCircleCheck, faWandMagicSparkles, faWrench } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';
import { SvelteSet } from 'svelte/reactivity';

import type { ResourceContext } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { runTask, toast } from '#lib/world.svelte.ts';

import { type AdvisorHit, CATEGORY, LS_EXT, lsStore, mutableStore, RISK } from '../data.ts';
import CheckIn from './CheckIn.svelte';

interface Props {
  ctx: ResourceContext;
}

let { ctx }: Props = $props();

const conn = $derived(ctx.conn);
const hits = $derived(lsStore().advisor.filter(h => h.host === conn.id).toSorted((a, b) => b.total_risk - a.total_risk));
const open = new SvelteSet<string>();
let checking = $state(false);

const RISK_CLASS = ['', 'bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]', 'bg-[var(--pd-state-warning)] text-[var(--pd-status-contrast)]', 'bg-[var(--pd-state-error)] text-[var(--pd-status-contrast)]', 'bg-[var(--pd-status-terminated)] text-[var(--pd-status-contrast)]'];

$effect.pre(() => {
  if (open.size === 0 && hits.length) open.add(hits[0].rule_id);
});

function toggle(id: string): void {
  if (open.has(id)) open.delete(id);
  else open.add(id);
}

function explain(h: AdvisorHit): void {
  const q = `How do I fix ${h.rule_id.split('|')[1]} on ${conn.name}? ${h.summary}`;
  navigate(`/tools/rhel-lightspeed?ask=${encodeURIComponent(q)}&source=advisor`);
}

function fix(h: AdvisorHit): void {
  runTask({
    name: `Remediate ${h.rule_id.split('|')[1]} on ${conn.name}`,
    ext: LS_EXT,
    steps: h.remediation.map(cmd => ({ label: cmd, ms: 1100, log: [`[core@${conn.name} ~]$ ${cmd}`] })),
    action: { label: 'Open Advisor', href: `/c/${conn.id}?tab=advisor` },
    onDone: () => {
      const s = mutableStore();
      s.advisor = s.advisor.map(x => (x.host === h.host && x.rule_id === h.rule_id ? { ...x, state: 'remediated' } : x));
    },
  });
}

function recheck(): void {
  checking = true;
  runTask({
    name: `insights-client --check-results on ${conn.name}`,
    ext: LS_EXT,
    steps: [
      { label: 'Collecting system profile', ms: 1200, log: ['Starting to collect Insights data for ' + conn.name] },
      { label: 'Uploading to console.redhat.com', ms: 1000, log: ['Successfully uploaded report from ' + conn.name] },
      { label: 'Evaluating rules', ms: 900 },
    ],
    onDone: () => {
      checking = false;
      const s = mutableStore();
      const resolved = s.advisor.filter(x => x.host === conn.id && x.state === 'remediated').length;
      s.advisor = s.advisor.filter(x => !(x.host === conn.id && x.state === 'remediated'));
      toast({ type: 'success', title: resolved ? `${resolved} recommendation${resolved > 1 ? 's' : ''} resolved on ${conn.name}` : `No change on ${conn.name}` });
    },
  });
}

function console_(): void {
  toast({ type: 'info', title: 'Opening console.redhat.com', body: `https://console.redhat.com/insights/advisor/systems/classic/${conn.name}` });
}
</script>

<CheckIn {conn}>
  <div class="h-full overflow-auto px-5 py-4 space-y-3 text-[var(--pd-content-card-text)]">
    <div class="flex items-center gap-3">
      <div class="grow">
        <h2 class="text-lg font-semibold text-[var(--pd-content-header-text)]">{hits.length} recommendation{hits.length === 1 ? '' : 's'}</h2>
        <div class="text-sm">Red Hat Lightspeed Advisor · last check-in {checking ? 'in progress…' : '12 minutes ago'}</div>
      </div>
      <Button type="secondary" icon={faArrowsRotate} inProgress={checking} onclick={recheck}>Re-check</Button>
      <Button type="link" icon={faArrowUpRightFromSquare} onclick={console_}>Open in console</Button>
    </div>
    {#if hits.length === 0}
      <div class="flex items-center gap-3 rounded-lg bg-[var(--pd-content-card-bg)] p-4">
        <span class="text-[var(--pd-state-success)]"><Icon icon={faCircleCheck} size="lg" /></span>
        <span>No recommendations: {conn.name} matches every Advisor rule.</span>
      </div>
    {/if}
    {#each hits as h (h.rule_id)}
      <section class="rounded-lg bg-[var(--pd-content-card-bg)]" aria-label={h.rule_id}>
        <button class="w-full flex items-center gap-3 p-3 text-left" onclick={toggle.bind(undefined, h.rule_id)} aria-expanded={open.has(h.rule_id)}>
          <Icon icon={open.has(h.rule_id) ? faChevronDown : faChevronRight} />
          <span class="rounded-sm px-1.5 text-xs font-semibold w-20 text-center {RISK_CLASS[h.total_risk]}">{RISK[h.total_risk]}</span>
          <span class="grow text-[var(--pd-content-card-header-text)] font-semibold">{h.description}</span>
          {#if h.state === 'remediated'}<span class="text-sm text-[var(--pd-state-success)]">Remediated · pending check-in</span>{/if}
          <span class="text-sm w-24">{CATEGORY[h.category]}</span>
          {#if h.reboot_required}<span class="text-xs rounded-sm px-1 bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]">Reboot</span>{/if}
        </button>
        {#if open.has(h.rule_id)}
          <div class="px-10 pb-4 space-y-2">
            <div class="font-mono text-xs opacity-80">{h.rule_id} · likelihood {h.likelihood}/4 · impact {h.impact}/4 · published {h.publish_date}</div>
            <p>{h.summary}</p>
            <pre class="rounded-md bg-[var(--pd-terminal-background)] text-[var(--pd-terminal-foreground)] p-2 text-xs font-mono">{h.remediation.join('\n')}</pre>
            <div class="flex gap-2">
              <Button icon={faWrench} onclick={fix.bind(undefined, h)} disabled={h.state === 'remediated' || conn.status !== 'started'}>Fix in terminal</Button>
              <Button type="secondary" icon={faWandMagicSparkles} onclick={explain.bind(undefined, h)}>Explain with RHEL Lightspeed</Button>
            </div>
          </div>
        {/if}
      </section>
    {/each}
  </div>
</CheckIn>
