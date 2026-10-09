<script lang="ts">
/**
 * P13 Kubernetes cluster Overview (PD Kubernetes extension dashboard): the
 * header (Overview icon, cluster name, status, product, namespace picker,
 * terminal + `⋯` quick actions, primary "New cluster…"), cluster metrics
 * (Nodes, Namespaces), per-namespace metrics for the selected namespaces,
 * then articles to explore. Every card opens its list.
 */
import { faArrowUpRightFromSquare, faEllipsisVertical, faPlusCircle, faTerminal } from '@fortawesome/free-solid-svg-icons';

import { type LabConnection, type LabTarget, resourcesOf } from '../data.ts';
import LabIcon from '../ui/LabIcon.svelte';
import ActBtn from './ActBtn.svelte';
import Btn from './Btn.svelte';
import { openModal } from './flows.svelte.ts';
import Head from './Head.svelte';
import { nsMenu } from './kube-menu.ts';
import { inNs, nsLabel } from './kube-ns.svelte.ts';
import { connActions, connStatus, isUp, live, openConnTerminal, openMenu, resStatus } from './live.svelte.ts';
import NsSelect from './NsSelect.svelte';
import Section from './Section.svelte';
import StatGrid from './StatGrid.svelte';
import { OVERVIEW_ICON } from './trees.ts';

interface Props {
  c: LabConnection;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { c, onopen }: Props = $props();

const st = $derived(connStatus(c));
const up = $derived(isUp(st));

/** Live resources of a kind (not deleted, optionally in the selected namespaces). */
function current(sectionId: string, scoped = true): ReturnType<typeof resourcesOf> {
  void live.added;
  return resourcesOf(c.id, sectionId).filter(r => !live.deleted.includes(r.id) && (!scoped || inNs(r)));
}

function openList(sectionId: string): void {
  onopen({ kind: 'list', connId: c.id, sectionId }, {});
}

const icon = (id: string): LabConnection['sections'][number]['icon'] | undefined => c.sections.find(s => s.id === id)?.icon;

const cluster = $derived.by(() => {
  void live.status;
  const nodes = current('nodes', false);
  const ready = nodes.filter(n => resStatus(n) === 'ready' || resStatus(n) === 'running').length;
  return [
    { label: 'Nodes ready', count: nodes.length ? `${ready}/${nodes.length}` : '—', icon: icon('nodes'), onclick: (): void => openList('nodes') },
    { label: 'Namespaces', count: current('namespaces', false).length, icon: icon('namespaces'), onclick: (): void => openList('namespaces') },
  ];
});

/** [label, section to open, sections counted, word for the running ones (shown as running/total)]. */
const NS_METRICS: [string, string, string[], string?][] = [
  ['Deployments', 'deployments', ['deployments'], 'active'],
  ['Pods', 'kpods', ['kpods'], 'running'],
  ['Services', 'services', ['services']],
  ['Ingresses & Routes', 'routes', ['routes']],
  ['Persistent Volume Claims', 'pvcs', ['pvcs']],
  ['ConfigMaps & Secrets', 'configmaps', ['configmaps', 'secrets']],
  ['Jobs', 'jobs', ['jobs'], 'running'],
  ['CronJobs', 'cronjobs', ['cronjobs']],
];

const nsCards = $derived.by(() => {
  void live.status;
  return NS_METRICS.map(([label, open, ids, word]) => {
    const all = ids.flatMap(id => current(id));
    const count = word ? `${all.filter(r => resStatus(r) === 'running').length}/${all.length}` : all.length;
    return { label: word ? `${label} ${word}` : label, count, icon: icon(open), onclick: (): void => openList(open) };
  });
});

const ARTICLES: [string, string, string][] = [
  ['Working with Kubernetes', 'Connect to clusters, switch contexts and browse workloads from Podman Desktop.', 'https://podman-desktop.io/docs/kubernetes'],
  ['Deploying a pod to Kubernetes', 'Turn a local pod into Kubernetes YAML and run it on a cluster in a few clicks.', 'https://podman-desktop.io/docs/kubernetes/deploying-a-pod-to-kubernetes'],
  ['Kubernetes basics', 'The official interactive tutorial: deploy, expose, scale and update an app.', 'https://kubernetes.io/docs/tutorials/kubernetes-basics/'],
  ['Developer Sandbox for Red Hat OpenShift', 'A free, shared OpenShift cluster with your own namespaces for 30 days.', 'https://developers.redhat.com/developer-sandbox'],
];
</script>

{#snippet filters()}
  <NsSelect connId={c.id} />
{/snippet}

{#snippet actions()}
  <ActBtn icon={faTerminal} label="Open terminal" disabled={!up} onclick={(): void => openConnTerminal(c)} />
  <ActBtn icon={faEllipsisVertical} label="More actions" onclick={(e): void => openMenu(e, [...connActions(c, onopen), ...nsMenu(c, onopen)])} />
  <Btn kind="primary" icon={faPlusCircle} onclick={(): void => openModal('add-connection')}>New cluster…</Btn>
{/snippet}

<div data-testid="kube-overview" class="flex flex-col h-full min-h-0">
  <Head icon={OVERVIEW_ICON} title={c.name} status={st} sub="{c.product} · {c.detail}" provenance={c.product} {filters} {actions} />
  <div class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-6">
    <Section title="Cluster" testid="kube-cluster-metrics">
      <div class="w-full"><StatGrid items={cluster} /></div>
    </Section>
    <Section title="Namespace: {nsLabel(c.id)}" testid="kube-ns-metrics">
      <div class="w-full"><StatGrid items={nsCards} /></div>
    </Section>
    <Section title="Explore articles and blog posts" testid="kube-articles">
      <div class="w-full grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {#each ARTICLES as [title, text, href] (href)}
          <a {href} target="_blank" rel="noreferrer" class="group flex flex-col gap-1 p-4 rounded-lg bg-[var(--pd-content-card-bg)] hover:bg-[var(--pd-content-card-hover-bg)]">
            <span class="flex items-start gap-2 text-[14px] font-semibold text-[var(--pd-content-header)]">
              <span class="flex-1">{title}</span>
              <span class="text-[var(--pd-table-body-text)] group-hover:text-[var(--pd-link)]"><LabIcon icon={faArrowUpRightFromSquare} size={14} /></span>
            </span>
            <span class="text-[13px] text-[var(--pd-table-body-text)]">{text}</span>
            <span class="text-[12px] text-[var(--pd-table-body-text)]">{new URL(href).host}</span>
          </a>
        {/each}
      </div>
    </Section>
  </div>
</div>
