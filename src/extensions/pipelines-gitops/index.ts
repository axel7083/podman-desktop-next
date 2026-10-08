/**
 * redhat.openshift-pipelines-gitops (proposed) – Tekton PipelineRuns and
 * Argo CD Applications of the active cluster. "Pipelines" / "GitOps" sections
 * appear only on clusters serving those CRDs (P2), Rerun / Sync actions on the
 * objects (P4), Tasks / Sync tabs (P14), dashboard card (P17).
 */
import { faArrowsRotate, faArrowUpRightFromSquare, faCodeBranch, faRotateRight } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension, ResourceContext } from '#lib/ext/types.ts';
import { addKube, type KubeObject, later, runTask, toast, world } from '#lib/world.svelte.ts';

import AppsSection from './components/AppsSection.svelte';
import PipelineCard from './components/PipelineCard.svelte';
import RunsSection from './components/RunsSection.svelte';
import SyncTab from './components/SyncTab.svelte';
import TasksTab from './components/TasksTab.svelte';
import { application, appState, devPipelineRuns, hasCrd, newRunName, PG_ID, pipelineRun, type TaskRunInfo } from './data.ts';

const isKind = (ctx: ResourceContext, kind: string): boolean => 'kind' in ctx.resource && (ctx.resource as KubeObject).kind === kind;

function rerun(ctx: ResourceContext): void {
  const old = ctx.resource as KubeObject;
  const pipeline = String(old.metadata.labels?.['tekton.dev/pipeline'] ?? 'build-and-push');
  const base = old.metadata.name.replace(/-[a-z0-9]{5}$/, '');
  const names = ((old.status?.tasks as TaskRunInfo[] | undefined) ?? []).map(t => t.name);
  const run = pipelineRun(newRunName(base), pipeline, 'Running', new Date().toISOString(), undefined, String(old.metadata.labels?.['pipelinesascode.tekton.dev/sha'] ?? 'c81d2fa'), names.map((n, i) => ({ name: n, reason: i === 0 ? 'Running' : 'Pending' })));
  addKube(ctx.conn.id, [run]);
  const target = (): KubeObject | undefined => world.kube[ctx.conn.id]?.find(o => o.metadata.uid === run.metadata.uid);
  runTask({
    name: `Rerun ${base} on ${ctx.conn.name}`,
    ext: PG_ID,
    steps: names.map(n => ({ label: `TaskRun ${n}`, ms: n === 'buildah' ? 2400 : 900 })),
    action: { label: 'Open PipelineRun', href: `/c/${ctx.conn.id}/kube/PipelineRun~payments-ci~${run.metadata.name}/tasks` },
    onDone: () => {
      const t = target();
      if (!t) return;
      t.status = { ...t.status, state: 'RUNNING', reason: 'Succeeded', completionTime: new Date().toISOString(), tasks: names.map(n => ({ name: n, reason: 'Succeeded', durationS: n === 'buildah' ? 198 : 15 })) };
    },
  });
  // advance the live timeline
  names.forEach((_, i) =>
    later(i * 1200 + 600, () => {
      const t = target();
      if (!t || t.status?.reason !== 'Running') return;
      t.status = { ...t.status, tasks: names.map((n, j) => ({ name: n, reason: j < i ? 'Succeeded' : j === i ? 'Running' : 'Pending' })) };
    }),
  );
}

function sync(ctx: ResourceContext): void {
  const app = ctx.resource as KubeObject;
  const find = (): KubeObject | undefined => world.kube[ctx.conn.id]?.find(o => o.metadata.uid === app.metadata.uid);
  const set = (sync: string, health: string, phase?: string): void => {
    const o = find();
    if (o) o.status = { ...o.status, state: appState(sync, health), sync: { status: sync, revision: 'e41b9c3' }, health: { status: health }, operationState: phase ? { phase } : undefined };
  };
  set(String((app.status?.sync as { status?: string })?.status ?? 'OutOfSync'), String((app.status?.health as { status?: string })?.status ?? 'Healthy'), 'Running');
  runTask({
    name: `Sync ${app.metadata.name}`,
    ext: PG_ID,
    steps: [
      { label: 'Comparing with https://github.com/acme/payments-gitops.git@e41b9c3', ms: 700 },
      { label: 'Applying 6 resources (Deployment payments-api, Service, Route…)', ms: 1200, log: ['deployment.apps/payments-api configured', 'route.route.openshift.io/payments-api unchanged'] },
      { label: 'Waiting for health', ms: 1500 },
    ],
    action: { label: 'Open application', href: `/c/${ctx.conn.id}/kube/Application~openshift-gitops~${app.metadata.name}/sync` },
    onDone: () => set('Synced', 'Healthy', 'Succeeded'),
  });
  later(1900, () => set('Synced', 'Progressing', 'Running'));
}

const extension: MockExtension = {
  id: PG_ID,
  displayName: 'Pipelines & GitOps',
  publisher: 'redhat',
  description: 'See PipelineRuns and Argo CD application sync/health for the active cluster; rerun and sync from the desktop.',
  version: '0.2.0',
  icon: 'icons/redhat.openshift-pipelines-gitops.svg',
  tags: ['openshift'],
  pApis: ['P2', 'P4', 'P14', 'P17'],
  contributes: {
    navSections: [
      {
        id: 'pipelines',
        label: 'Pipelines',
        icon: 'icons/redhat.openshift-pipelines-gitops.svg',
        when: conn => conn.status === 'started' && hasCrd(conn.id, 'pipelineruns.tekton.dev'),
        component: RunsSection,
        counter: (w, conn) => (w.kube[conn.id] ?? []).filter(o => o.kind === 'PipelineRun').length,
        order: 10,
      },
      {
        id: 'gitops',
        label: 'GitOps',
        icon: 'icons/argo-cd.svg',
        when: conn => conn.status === 'started' && hasCrd(conn.id, 'applications.argoproj.io'),
        component: AppsSection,
        counter: (w, conn) => (w.kube[conn.id] ?? []).filter(o => o.kind === 'Application').length,
        order: 11,
      },
    ],
    tabs: [
      { id: 'tasks', label: 'Tasks', target: 'kube-resource', when: ctx => isKind(ctx, 'PipelineRun'), component: TasksTab },
      { id: 'sync', label: 'Sync', target: 'kube-resource', when: ctx => isKind(ctx, 'Application'), component: SyncTab },
    ],
    menus: [
      { id: 'pr-rerun', label: 'Rerun', icon: faRotateRight, target: 'kube-resource', placement: 'row', when: ctx => isKind(ctx, 'PipelineRun'), run: rerun },
      { id: 'app-sync', label: 'Sync', icon: faArrowsRotate, target: 'kube-resource', placement: 'row', when: ctx => isKind(ctx, 'Application'), run: sync },
      {
        id: 'app-open',
        label: 'Open in Argo CD',
        icon: faArrowUpRightFromSquare,
        target: 'kube-resource',
        placement: 'kebab',
        when: ctx => isKind(ctx, 'Application'),
        run: ctx => toast({ type: 'info', title: `Opening https://openshift-gitops-server-openshift-gitops.apps.${ctx.conn.id}…/applications/${(ctx.resource as KubeObject).metadata.name}` }),
      },
      {
        id: 'pr-logs',
        label: 'Open in OpenShift console',
        icon: faCodeBranch,
        target: 'kube-resource',
        placement: 'kebab',
        when: ctx => isKind(ctx, 'PipelineRun'),
        run: ctx => toast({ type: 'info', title: `Opening pipelines/ns/payments-ci/pipeline-runs/${(ctx.resource as KubeObject).metadata.name}` }),
      },
    ],
    dashboardCards: [{ id: 'pipelines-gitops', title: 'Pipelines & GitOps', component: PipelineCard }],
  },
  seed(): void {
    addKube('ocp-dev', [
      ...devPipelineRuns(),
      application('payments-dev', 'payments', 'envs/dev', 'c81d2fa', 'in-cluster/payments', 'Synced', 'Healthy', true),
      application('ledger-dev', 'payments', 'ledger/dev', '77e0b19', 'in-cluster/ledger', 'Synced', 'Progressing', true),
    ]);
    addKube('ocp-prod', [
      application('payments-prod', 'payments', 'envs/prod', 'c81d2fa', 'in-cluster/payments', 'OutOfSync', 'Healthy', false),
      application('observability', 'platform', 'platform/obs', 'v2.3.0', 'in-cluster/openshift-monitoring', 'Synced', 'Degraded', true),
    ]);
  },
};

export default extension;
