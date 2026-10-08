/**
 * redhat.aap mock data, shaped like the AAP 2.7 Gateway/controller API
 * (`/api/controller/v2/job_templates|jobs|inventories`) and job events.
 * Source: docs/research/redhat.aap.md.
 */
import { ago, extData, later, toast } from '#lib/world.svelte.ts';

export const AAP_ID = 'redhat.aap';
export const CONN_ID = 'aap-acme-prod';
export const AAP_URL = 'https://aap.acme-corp.com';
export const MCP_URL = 'https://aap.acme-corp.com:8448/mcp';

export type JobStatus = 'new' | 'pending' | 'waiting' | 'running' | 'successful' | 'failed' | 'error' | 'canceled';

export interface JobTemplate {
  id: number;
  name: string;
  description: string;
  job_type: 'run' | 'check';
  playbook: string;
  inventory: string;
  project: string;
  execution_environment: string;
  ask_limit_on_launch: boolean;
  ask_variables_on_launch: boolean;
  last_job_run?: number;
  status: 'successful' | 'failed' | 'never updated' | 'running';
  selected?: boolean;
}

export interface Job {
  id: number;
  name: string;
  template_id: number;
  status: JobStatus;
  launch_type: 'manual' | 'relaunch' | 'callback' | 'scheduled' | 'dependency' | 'workflow' | 'webhook' | 'sync' | 'scm';
  launched_by: string;
  started?: number;
  finished?: number;
  elapsed?: number;
  execution_node: string;
  limit?: string;
  extra_vars?: string;
  /** Lines of stdout already emitted (streaming). */
  shown: number;
  selected?: boolean;
}

export interface Inventory {
  id: number;
  name: string;
  kind: '' | 'smart' | 'constructed';
  total_hosts: number;
  hosts_with_active_failures: number;
  total_groups: number;
  has_inventory_sources: boolean;
  organization: string;
  selected?: boolean;
}

export interface McpState {
  registered: boolean;
  writeEnabled: boolean;
  toolsets: Record<string, boolean>;
}

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

export function seedTemplates(): JobTemplate[] {
  return [
    {
      id: 12,
      name: 'Deploy orders (podman)',
      description: 'Recreates the orders pod as Quadlet units (exported from Podman Desktop)',
      job_type: 'run',
      playbook: 'deploy-orders.yml',
      inventory: 'RHEL app hosts',
      project: 'acme.ops',
      execution_environment: 'acme-ee-network:1.0',
      ask_limit_on_launch: true,
      ask_variables_on_launch: true,
      last_job_run: ago({ m: 3 }),
      status: 'successful',
    },
    {
      id: 15,
      name: 'Remediate orders',
      description: 'Restarts unhealthy orders containers (launched by EDA)',
      job_type: 'run',
      playbook: 'restart-orders.yml',
      inventory: 'RHEL app hosts',
      project: 'acme.ops',
      execution_environment: 'acme-ee-network:1.0',
      ask_limit_on_launch: true,
      ask_variables_on_launch: true,
      last_job_run: ago({ m: 11 }),
      status: 'failed',
    },
    {
      id: 21,
      name: 'Patch RHEL 9 (check mode)',
      description: 'dnf update --check on every RHEL 9 host',
      job_type: 'check',
      playbook: 'patch.yml',
      inventory: 'All RHEL',
      project: 'acme.ops',
      execution_environment: 'ee-supported-rhel9:1.0.0',
      ask_limit_on_launch: true,
      ask_variables_on_launch: false,
      status: 'never updated',
    },
    {
      id: 30,
      name: 'Build EE nightly',
      description: 'ansible-builder build of acme-ee-network, pushed to quay.io/acme',
      job_type: 'run',
      playbook: 'ee-build.yml',
      inventory: 'localhost',
      project: 'acme.ee',
      execution_environment: 'ansible-builder-rhel9:3.1.1',
      ask_limit_on_launch: false,
      ask_variables_on_launch: true,
      last_job_run: ago({ h: 8 }),
      status: 'successful',
    },
  ];
}

export function seedJobs(): Job[] {
  return [
    { id: 4822, name: 'Deploy orders (podman)', template_id: 12, status: 'running', launch_type: 'manual', launched_by: 'alice.dev', started: ago({ m: 1 }), execution_node: 'exec-01', limit: 'web*', shown: 8 },
    { id: 4821, name: 'Remediate orders', template_id: 15, status: 'failed', launch_type: 'webhook', launched_by: 'eda-podman-health', started: ago({ m: 11 }), finished: ago({ m: 10, s: 14 }), elapsed: 46.2, execution_node: 'exec-02', shown: 9999 },
    { id: 4815, name: 'Patch RHEL 9 (check mode)', template_id: 21, status: 'canceled', launch_type: 'scheduled', launched_by: 'schedule: nightly patch check', started: ago({ d: 1, h: 2 }), finished: ago({ d: 1, h: 1, m: 58 }), elapsed: 121.4, execution_node: 'exec-01', shown: 9999 },
    { id: 4810, name: 'Build EE nightly', template_id: 30, status: 'successful', launch_type: 'scheduled', launched_by: 'schedule: nightly', started: ago({ h: 8 }), finished: ago({ h: 7, m: 51 }), elapsed: 512.9, execution_node: 'exec-01', shown: 9999 },
    { id: 4809, name: 'Deploy orders (podman)', template_id: 12, status: 'error', launch_type: 'manual', launched_by: 'alice.dev', started: ago({ h: 3 }), finished: ago({ h: 3 }), elapsed: 2.1, execution_node: 'exec-02', shown: 9999 },
  ];
}

export function seedInventories(): Inventory[] {
  return [
    { id: 3, name: 'RHEL app hosts', kind: '', total_hosts: 6, hosts_with_active_failures: 1, total_groups: 3, has_inventory_sources: false, organization: 'ACME' },
    { id: 4, name: 'All RHEL', kind: 'constructed', total_hosts: 42, hosts_with_active_failures: 0, total_groups: 7, has_inventory_sources: true, organization: 'ACME' },
    { id: 5, name: 'Edge kiosks', kind: 'smart', total_hosts: 4, hosts_with_active_failures: 0, total_groups: 1, has_inventory_sources: false, organization: 'ACME' },
  ];
}

export function store(): { templates: JobTemplate[]; jobs: Job[]; inventories: Inventory[]; mcp: McpState } {
  return {
    templates: extData(AAP_ID, 'templates', seedTemplates()),
    jobs: extData(AAP_ID, 'jobs', seedJobs()),
    inventories: extData(AAP_ID, 'inventories', seedInventories()),
    mcp: extData<McpState>(AAP_ID, 'mcp', { registered: false, writeEnabled: false, toolsets: { job_management: true, inventory_management: true } }),
  };
}

/* ------------------------------------------------------------------ */
/* Job output (stdout + job events)                                    */
/* ------------------------------------------------------------------ */

type Result = 'ok' | 'changed' | 'failed' | 'skipped';

interface PlanTask {
  task: string;
  results: Record<string, Result>;
  msg?: string;
}

interface Plan {
  play: string;
  tasks: PlanTask[];
  /** Fatal output for jobs that never reach a play. */
  error?: string[];
}

function hostsFor(limit: string | undefined, all: string[]): string[] {
  if (!limit) return all;
  const re = new RegExp(`^${limit.replace(/\./g, '\\.').replace(/\*/g, '.*')}`);
  const out = all.filter(h => re.test(h));
  return out.length ? out : all;
}

function each(hosts: string[], r: Result): Record<string, Result> {
  return Object.fromEntries(hosts.map(h => [h, r]));
}

export function planOf(job: Job): Plan {
  const app = ['web01.lab.acme', 'web02.lab.acme', 'db01.lab.acme'];
  if (job.template_id === 12 && job.status === 'error') {
    return { play: '', tasks: [], error: ['ERROR! the playbook: deploy-orders.yml could not be found', 'Project acme.ops revision 1f2e9ab has no file deploy-orders.yml'] };
  }
  if (job.template_id === 12) {
    const h = hostsFor(job.limit, app);
    return {
      play: 'Recreate orders pod (exported by Podman Desktop 2026-10-08)',
      tasks: [
        { task: 'Gathering Facts', results: each(h, 'ok') },
        { task: 'Pull orders-api image', results: each(h, 'changed') },
        { task: 'Secret for orders-db', results: each(h, 'ok') },
        { task: 'Pod orders', results: each(h, 'changed') },
        { task: 'Container orders-db', results: each(h, 'ok') },
        { task: 'Container orders-api', results: each(h, 'changed') },
        { task: 'Reload systemd', results: each(h, 'ok') },
      ],
    };
  }
  if (job.template_id === 15) {
    return {
      play: 'Restart orders containers',
      tasks: [
        { task: 'Gathering Facts', results: each(app, 'ok') },
        { task: 'Get orders pod info', results: each(app, 'ok') },
        {
          task: 'Restart orders-db',
          results: { 'web01.lab.acme': 'skipped', 'web02.lab.acme': 'skipped', 'db01.lab.acme': 'failed' },
          msg: 'Unable to start service orders-db.service: Job for orders-db.service failed because the control process exited with error code.',
        },
        { task: 'Restart orders-api', results: { 'web01.lab.acme': 'changed', 'web02.lab.acme': 'changed' } },
      ],
    };
  }
  if (job.template_id === 21) {
    const h = ['rhel9-app-01.acme', 'rhel9-app-02.acme', 'rhel9-app-03.acme'];
    return { play: 'Patch RHEL 9', tasks: [{ task: 'Gathering Facts', results: each(h, 'ok') }, { task: 'Check for updates', results: each(h, 'ok') }] };
  }
  return {
    play: 'Build execution environment',
    tasks: [
      { task: 'Gathering Facts', results: { localhost: 'ok' } },
      { task: 'Render execution-environment.yml', results: { localhost: 'changed' } },
      { task: 'ansible-builder build', results: { localhost: 'changed' } },
      { task: 'Push quay.io/acme/ee-network:1.0', results: { localhost: 'changed' } },
    ],
  };
}

function stars(prefix: string): string {
  return `${prefix} ${'*'.repeat(Math.max(3, 79 - prefix.length))}`;
}

export function stdoutOf(job: Job): string[] {
  const plan = planOf(job);
  const out = [`Identity added: /runner/artifacts/${job.id}/ssh_key_data (alice.dev@acme-corp.com)`, ''];
  if (plan.error) return [...out, ...plan.error];
  out.push(stars(`PLAY [${plan.play}]`), '');
  const tasks = job.status === 'canceled' ? plan.tasks.slice(0, 1) : plan.tasks;
  for (const t of tasks) {
    out.push(stars(`TASK [${t.task}]`));
    for (const [h, r] of Object.entries(t.results)) {
      if (r === 'failed') out.push(`fatal: [${h}]: FAILED! => {"changed": false, "msg": "${t.msg ?? 'failed'}"}`);
      else if (r === 'skipped') out.push(`skipping: [${h}]`);
      else out.push(`${r}: [${h}]`);
    }
    out.push('');
  }
  if (job.status === 'canceled') return [...out, 'Job was canceled by alice.dev'];
  out.push(stars('PLAY RECAP'));
  for (const [h, r] of Object.entries(hostSummary(job))) {
    out.push(`${h.padEnd(27)}: ok=${r.ok}    changed=${r.changed}    unreachable=0    failed=${r.failed}    skipped=${r.skipped}    rescued=0    ignored=0`);
  }
  return out;
}

export function hostSummary(job: Job): Record<string, { ok: number; changed: number; failed: number; skipped: number }> {
  const out: Record<string, { ok: number; changed: number; failed: number; skipped: number }> = {};
  for (const t of planOf(job).tasks) {
    for (const [h, r] of Object.entries(t.results)) {
      const s = (out[h] ??= { ok: 0, changed: 0, failed: 0, skipped: 0 });
      if (r === 'ok' || r === 'changed') s.ok += 1;
      if (r === 'changed') s.changed += 1;
      if (r === 'failed') s.failed += 1;
      if (r === 'skipped') s.skipped += 1;
    }
  }
  return out;
}

export function failedEvents(job: Job): { host: string; task: string; msg: string }[] {
  return planOf(job).tasks.flatMap(t =>
    Object.entries(t.results)
      .filter(([, r]) => r === 'failed')
      .map(([host]) => ({ host, task: t.task, msg: t.msg ?? '' })),
  );
}

export function elapsedLabel(job: Job): string {
  const s = job.elapsed ?? (job.started ? (Date.now() - job.started) / 1000 : 0);
  if (!job.started) return '–';
  return s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${s.toFixed(s < 10 ? 1 : 0)}s`;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

const driving = new Set<number>();

/** Stream stdout of a running job line by line until it finishes. */
export function driveJob(id: number): void {
  if (driving.has(id)) return;
  const job = store().jobs.find(j => j.id === id);
  if (!job || (job.status !== 'running' && job.status !== 'pending')) return;
  driving.add(id);
  const tick = (): void => {
    const j = store().jobs.find(x => x.id === id);
    if (!j) {
      driving.delete(id);
      return;
    }
    if (j.status === 'pending') {
      j.status = 'running';
      j.started = Date.now();
      j.shown = 0;
      later(450, tick);
      return;
    }
    const total = stdoutOf(j).length;
    if (j.shown < total) {
      j.shown += 1;
      later(220, tick);
      return;
    }
    const failed = failedEvents(j).length > 0;
    j.status = failed ? 'failed' : 'successful';
    j.finished = Date.now();
    j.elapsed = Math.round(((j.finished - (j.started ?? j.finished)) / 1000) * 10) / 10;
    const tpl = store().templates.find(t => t.id === j.template_id);
    if (tpl) {
      tpl.status = j.status === 'failed' ? 'failed' : 'successful';
      tpl.last_job_run = j.finished;
    }
    driving.delete(id);
    toast({ type: failed ? 'error' : 'success', title: `AAP job ${j.id} ${j.status}`, body: j.name, action: { label: 'Open job', href: `/c/${CONN_ID}/aap-jobs?job=${j.id}` } });
  };
  later(job.status === 'pending' ? 1200 : 300, tick);
}

export function launchTemplate(tpl: JobTemplate, limit: string, extraVars: string, launchType: Job['launch_type'] = 'manual'): number {
  const { jobs } = store();
  const id = Math.max(4822, ...jobs.map(j => j.id)) + 1;
  jobs.unshift({
    id,
    name: tpl.name,
    template_id: tpl.id,
    status: 'pending',
    launch_type: launchType,
    launched_by: 'alice.dev',
    execution_node: id % 2 ? 'exec-02' : 'exec-01',
    limit: limit || undefined,
    extra_vars: extraVars || undefined,
    shown: 0,
  });
  tpl.status = 'running';
  toast({ type: 'info', title: `Job ${id} launched`, body: `${tpl.name} · POST /api/controller/v2/job_templates/${tpl.id}/launch/` });
  driveJob(id);
  return id;
}
