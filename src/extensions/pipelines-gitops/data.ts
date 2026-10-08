/** Tekton `PipelineRun` (tekton.dev/v1) and Argo CD `Application` (argoproj.io/v1alpha1) objects. */
import { hexId, kube, type KubeObject, world } from '#lib/world.svelte.ts';

export const PG_ID = 'redhat.openshift-pipelines-gitops';

export interface TaskRunInfo {
  name: string;
  reason: 'Succeeded' | 'Failed' | 'Running' | 'Skipped' | 'Pending';
  durationS?: number;
}

export const STATE_OF_REASON: Record<string, string> = {
  Succeeded: 'RUNNING',
  Completed: 'RUNNING',
  Running: 'STARTING',
  Started: 'STARTING',
  Failed: 'DEGRADED',
  PipelineRunTimeout: 'DEGRADED',
  Cancelled: 'EXITED',
};

export function pipelineRun(name: string, pipeline: string, reason: string, startTime: string, completionTime: string | undefined, sha: string, tasks: TaskRunInfo[]): KubeObject {
  const o = kube(
    'tekton.dev/v1',
    'PipelineRun',
    name,
    'payments-ci',
    { pipelineRef: { name: pipeline }, params: [{ name: 'git-revision', value: sha }, { name: 'image', value: 'quay.io/acme/payments-api' }], timeouts: { pipeline: '1h0m0s' } },
    {
      state: STATE_OF_REASON[reason] ?? 'UNKNOWN',
      conditions: [{ type: 'Succeeded', status: reason === 'Succeeded' ? 'True' : reason === 'Running' ? 'Unknown' : 'False', reason }],
      reason,
      startTime,
      completionTime,
      tasks,
    },
    { h: Math.max(0, Math.round((Date.now() - new Date(startTime).getTime()) / 3600_000)) },
    { 'tekton.dev/pipeline': pipeline, 'pipelinesascode.tekton.dev/sha': sha },
  );
  o.metadata.creationTimestamp = startTime;
  return o;
}

export function application(name: string, project: string, path: string, rev: string, destination: string, sync: string, health: string, automated: boolean): KubeObject {
  return kube(
    'argoproj.io/v1alpha1',
    'Application',
    name,
    'openshift-gitops',
    { project, source: { repoURL: 'https://github.com/acme/payments-gitops.git', path, targetRevision: path.startsWith('platform') ? 'v2.3.0' : 'main' }, destination: { name: destination.split('/')[0], namespace: destination.split('/')[1] }, syncPolicy: automated ? { automated: { prune: true, selfHeal: true } } : {} },
    { state: appState(sync, health), sync: { status: sync, revision: rev }, health: { status: health }, operationState: undefined },
    { d: 40 },
  );
}

export function appState(sync: string, health: string): string {
  if (health === 'Progressing') return 'STARTING';
  if (health === 'Degraded' || health === 'Missing') return 'DEGRADED';
  if (sync === 'OutOfSync') return 'DEGRADED';
  return 'RUNNING';
}

const BUILD_TASKS = (last: TaskRunInfo['reason'] = 'Succeeded'): TaskRunInfo[] => [
  { name: 'git-clone', reason: 'Succeeded', durationS: 14 },
  { name: 'buildah', reason: 'Succeeded', durationS: 212 },
  { name: 'acs-image-check', reason: last === 'Failed' ? 'Failed' : 'Succeeded', durationS: 31 },
  { name: 'push', reason: last === 'Failed' ? 'Skipped' : 'Succeeded', durationS: last === 'Failed' ? undefined : 19 },
];

export function devPipelineRuns(): KubeObject[] {
  return [
    pipelineRun('payments-api-build-x7k2p', 'build-and-push', 'Failed', '2026-10-08T08:41:03Z', '2026-10-08T08:47:55Z', '9f2c1e7', BUILD_TASKS('Failed')),
    pipelineRun('payments-api-build-r4m9q', 'build-and-push', 'Succeeded', '2026-10-07T16:12:00Z', '2026-10-07T16:19:31Z', '4ab7d03', BUILD_TASKS()),
    pipelineRun('ledger-worker-build-z8t1c', 'build-and-push', 'Running', new Date(Date.now() - 4 * 60_000).toISOString(), undefined, '77e0b19', [
      { name: 'git-clone', reason: 'Succeeded', durationS: 12 },
      { name: 'buildah', reason: 'Running' },
      { name: 'acs-image-check', reason: 'Pending' },
      { name: 'push', reason: 'Pending' },
    ]),
    pipelineRun('e2e-nightly-k3v7w', 'e2e', 'PipelineRunTimeout', '2026-10-08T01:00:00Z', '2026-10-08T02:00:00Z', 'c81d2fa', [
      { name: 'deploy-ephemeral', reason: 'Succeeded', durationS: 140 },
      { name: 'run-e2e', reason: 'Failed', durationS: 3460 },
    ]),
  ];
}

export function newRunName(base: string): string {
  return `${base}-${hexId(5).replace(/[0-9]/g, c => 'kmnpqrstvw'[Number(c)])}`;
}

export const ACS_STEP_LOG = [
  'STEP-ROXCTL-IMAGE-CHECK',
  '$ roxctl image check --image quay.io/acme/payments-api@sha256:7f3c1d9a… -o table',
  'Policy check results for image: quay.io/acme/payments-api:1.5.0',
  '(TOTAL: 4, LOW: 1, MEDIUM: 1, HIGH: 2, CRITICAL: 0)',
  '+--------------------------------------+----------+--------------+',
  '|                POLICY                | SEVERITY | BREAKS BUILD |',
  '| Fixable Severity at least Important  |   HIGH   |      X       |',
  '| Docker CIS 4.1: Ensure That a User…  |   HIGH   |      X       |',
  '| Latest tag                           |  MEDIUM  |      -       |',
  '| Red Hat Package Manager in Image     |   LOW    |      -       |',
  'ERROR: failed policies found: 2 policies violated that are failing the check',
];

export function hasCrd(connId: string, name: string): boolean {
  return (world.kube[connId] ?? []).some(o => o.kind === 'CustomResourceDefinition' && o.metadata.name === name);
}
