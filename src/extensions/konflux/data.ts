/**
 * Konflux tenant `acme-tenant` objects (application-api, integration-service,
 * release-service, Tekton PipelineRuns) – shapes from docs/research/redhat.konflux.md.
 */
import { addKube, isoAgo, kube, type KubeObject, later, toast, world } from '#lib/world.svelte.ts';

export const KONFLUX = 'konflux-acme';
export const NS = 'acme-tenant';
const AS = 'appstudio.redhat.com/v1alpha1';

export interface TaskRun {
  name: string;
  status: 'Succeeded' | 'Failed' | 'Running' | 'Pending' | 'Skipped';
  duration?: string;
}

const BUILD_TASKS = ['init', 'clone-repository', 'prefetch-dependencies', 'build-container', 'build-image-index', 'source-build', 'sast-snyk-check', 'clair-scan', 'ecosystem-cert-preflight-checks', 'sbom-json-check', 'apply-tags', 'push-dockerfile'];

function taskRuns(failedAt?: string, running = false): TaskRun[] {
  let state: TaskRun['status'] = 'Succeeded';
  return BUILD_TASKS.map((name, i) => {
    if (running && i >= 4) return { name, status: i === 4 ? 'Running' : 'Pending' };
    const current = state;
    if (name === failedAt) {
      state = 'Skipped';
      return { name, status: 'Failed' as const, duration: '1m 12s' };
    }
    return { name, status: current, duration: current === 'Succeeded' ? `${(i % 4) + 1}m ${(i * 7) % 60}s` : undefined };
  });
}

export function pipelineRun(name: string, component: string, opts: { type?: string; event?: string; sha: string; reason: string; failedTask?: string; ageM: number; digest?: string; running?: boolean }): KubeObject {
  const status = opts.reason === 'Succeeded' ? 'True' : opts.reason === 'Failed' ? 'False' : 'Unknown';
  return kube(
    'tekton.dev/v1',
    'PipelineRun',
    name,
    NS,
    { pipelineRef: 'docker-build-oci-ta', params: { 'git-url': 'https://github.com/acme/payments', revision: opts.sha } },
    {
      state: status === 'True' ? 'RUNNING' : status === 'False' ? 'DEGRADED' : 'STARTING',
      conditions: [{ type: 'Succeeded', status, reason: opts.reason }],
      reason: opts.reason,
      startTime: isoAgo({ m: opts.ageM }),
      failedTask: opts.failedTask,
      taskRuns: taskRuns(opts.failedTask, opts.running),
      results: opts.digest ? { IMAGE_URL: `quay.io/redhat-user-workloads/acme-tenant/${component}`, IMAGE_DIGEST: opts.digest } : {},
    },
    { m: opts.ageM },
    {
      'appstudio.openshift.io/application': 'payments',
      'appstudio.openshift.io/component': component,
      'pipelines.appstudio.openshift.io/type': opts.type ?? 'build',
      'pipelinesascode.tekton.dev/event-type': opts.event ?? 'push',
      'pipelinesascode.tekton.dev/sha': opts.sha,
    },
  );
}

export const SNYK_LOG = [
  'step-sast-snyk-check: Running snyk code test --org=acme --severity-threshold=high',
  'step-sast-snyk-check: Testing /workspace/source ...',
  'step-sast-snyk-check:  ✗ [High] Path Traversal',
  'step-sast-snyk-check:    Path: src/main/java/com/acme/payments/ReceiptResource.java, line 48',
  'step-sast-snyk-check:    Info: Unsanitized input from an HTTP parameter flows into java.io.File',
  'step-sast-snyk-check: ✗ 1 high severity issue found (threshold: high)',
  'step-sast-snyk-check: TEST_OUTPUT={"result":"FAILURE","failures":1,"successes":0,"warnings":0}',
  'step-sast-snyk-check: exit status 1',
];

export function seedKonflux(): void {
  addKube(KONFLUX, [
    kube(AS, 'Application', 'payments', NS, { displayName: 'Payments' }, { state: 'RUNNING' }, { d: 40 }),
    kube(AS, 'Application', 'orders', NS, { displayName: 'Orders' }, { state: 'RUNNING' }, { d: 31 }),
    kube(AS, 'Component', 'payments-api', NS, { application: 'payments', source: { git: { url: 'https://github.com/acme/payments', revision: 'main', dockerfileUrl: 'Containerfile' } }, containerImage: 'quay.io/redhat-user-workloads/acme-tenant/payments-api' }, { state: 'RUNNING', lastPromotedImage: 'quay.io/redhat-user-workloads/acme-tenant/payments-api@sha256:2a9e4c7b' }, { d: 40 }, { 'appstudio.openshift.io/application': 'payments' }),
    kube(AS, 'Component', 'payments-worker', NS, { application: 'payments', source: { git: { url: 'https://github.com/acme/payments', revision: 'main', context: 'worker' } }, containerImage: 'quay.io/redhat-user-workloads/acme-tenant/payments-worker' }, { state: 'RUNNING', lastPromotedImage: 'quay.io/redhat-user-workloads/acme-tenant/payments-worker@sha256:5d1e0aa3' }, { d: 40 }, { 'appstudio.openshift.io/application': 'payments' }),
    kube(AS, 'Component', 'orders-api', NS, { application: 'orders', source: { git: { url: 'https://github.com/acme/orders', revision: 'main', dockerfileUrl: 'Containerfile' } }, containerImage: 'quay.io/redhat-user-workloads/acme-tenant/orders-api' }, { state: 'STARTING' }, { d: 31 }, { 'appstudio.openshift.io/application': 'orders' }),
    pipelineRun('payments-api-on-push-7k2xq', 'payments-api', { sha: 'e41c9a0', reason: 'Failed', failedTask: 'sast-snyk-check', ageM: 52 }),
    pipelineRun('payments-api-on-pull-request-h2v8n', 'payments-api', { event: 'pull_request', sha: 'c03d5e1', reason: 'Running', ageM: 6, running: true }),
    pipelineRun('payments-api-on-push-r9d4m', 'payments-api', { sha: 'b77f210', reason: 'Succeeded', ageM: 60 * 26, digest: 'sha256:2a9e4c7b' }),
    pipelineRun('payments-worker-on-push-m3c8z', 'payments-worker', { sha: 'b77f210', reason: 'Succeeded', ageM: 60 * 26, digest: 'sha256:5d1e0aa3' }),
    pipelineRun('payments-enterprise-contract-5tq2z', 'payments-api', { type: 'test', sha: 'b77f210', reason: 'Succeeded', ageM: 60 * 25 }),
    kube(AS, 'Snapshot', 'payments-20261008-0912', NS, { application: 'payments', components: [{ name: 'payments-api', containerImage: 'quay.io/redhat-user-workloads/acme-tenant/payments-api@sha256:2a9e4c7b' }, { name: 'payments-worker', containerImage: 'quay.io/redhat-user-workloads/acme-tenant/payments-worker@sha256:5d1e0aa3' }] }, { state: 'RUNNING', AppStudioTestSucceeded: 'True' }, { h: 25 }, { 'appstudio.openshift.io/application': 'payments' }),
    kube(AS, 'ReleasePlan', 'payments-to-quay', NS, { application: 'payments', target: 'rhtap-releng-tenant' }, { state: 'RUNNING' }, { d: 30 }),
    kube(AS, 'Release', 'payments-1-5-0-rel-x8wp', NS, { snapshot: 'payments-20261008-0912', releasePlan: 'payments-to-quay' }, { state: 'RUNNING', Released: 'Succeeded', target: 'quay.io/acme/payments-api:1.5.0' }, { h: 24 }, { 'appstudio.openshift.io/application': 'payments' }),
  ]);
}

function objects(): KubeObject[] {
  return world.kube[KONFLUX] ?? [];
}

function find(kind: string, name: string): KubeObject | undefined {
  return objects().find(o => o.kind === kind && o.metadata.name === name);
}

/** Re-run a build after a local fix: Running → Succeeded → Snapshot → Release Succeeded. */
export function rerun(component: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  const name = `${component}-on-push-${suffix}`;
  addKube(KONFLUX, [pipelineRun(name, component, { sha: 'f9a1d22', reason: 'Running', ageM: 0, running: true })]);
  toast({ type: 'info', title: `PipelineRun ${name} started`, body: 'Pipelines-as-Code push event (f9a1d22 “fix: sanitize receipt path”)' });
  const advance = (i: number): void => {
    const pr = find('PipelineRun', name);
    if (!pr?.status) return;
    const runs = pr.status.taskRuns as TaskRun[];
    if (i >= runs.length) {
      pr.status.state = 'RUNNING';
      pr.status.reason = 'Succeeded';
      pr.status.conditions = [{ type: 'Succeeded', status: 'True', reason: 'Succeeded' }];
      pr.status.results = { IMAGE_URL: `quay.io/redhat-user-workloads/acme-tenant/${component}`, IMAGE_DIGEST: 'sha256:8be1f04c' };
      const snap = `payments-20261008-${new Date().toTimeString().slice(0, 5).replace(':', '')}`;
      addKube(KONFLUX, [
        kube(AS, 'Snapshot', snap, NS, { application: 'payments', components: [{ name: component, containerImage: `quay.io/redhat-user-workloads/acme-tenant/${component}@sha256:8be1f04c` }] }, { state: 'STARTING', AppStudioTestSucceeded: 'Unknown' }, { m: 0 }, { 'appstudio.openshift.io/application': 'payments' }),
      ]);
      later(1800, () => {
        const s = find('Snapshot', snap);
        if (s?.status) {
          s.status.state = 'RUNNING';
          s.status.AppStudioTestSucceeded = 'True';
        }
        const rel = `payments-1-5-1-rel-${suffix.slice(0, 4)}`;
        addKube(KONFLUX, [kube(AS, 'Release', rel, NS, { snapshot: snap, releasePlan: 'payments-to-quay' }, { state: 'STARTING', Released: 'Progressing', target: 'quay.io/acme/payments-api:1.5.1' }, { m: 0 }, { 'appstudio.openshift.io/application': 'payments' })]);
        later(2500, () => {
          const r = find('Release', rel);
          if (r?.status) {
            r.status.state = 'RUNNING';
            r.status.Released = 'Succeeded';
          }
          toast({ type: 'success', title: `Release ${rel} succeeded`, body: 'quay.io/acme/payments-api:1.5.1 · signed by Tekton Chains', action: { label: 'Open releases', href: `/c/${KONFLUX}/konflux-releases` } });
        });
      });
      return;
    }
    runs[i].status = 'Running';
    for (let j = 0; j < i; j++) if (runs[j].status !== 'Succeeded') runs[j] = { ...runs[j], status: 'Succeeded', duration: `${(j % 3) + 1}m ${(j * 11) % 60}s` };
    later(450, () => {
      runs[i] = { ...runs[i], status: 'Succeeded', duration: `${(i % 3) + 1}m ${(i * 13) % 60}s` };
      advance(i + 1);
    });
  };
  const pr = find('PipelineRun', name);
  if (pr?.status) (pr.status.taskRuns as TaskRun[]).forEach((t, i) => (t.status = i === 0 ? 'Running' : 'Pending'));
  later(400, () => advance(0));
  return name;
}
