/**
 * redhat.ansible mock data and generators. Shapes follow the real objects:
 * ansible-navigator playbook artifacts (version 2.0), execution-environment.yml
 * v3, ansible-rulebook events and containers.podman 1.21.0 modules.
 * Sources: docs/research/redhat.ansible-{dev-tools,builder,export,eda}.md.
 */
import type { Container, ContainerImage, Pod } from '#lib/world.svelte.ts';
import { ago, extData, findContainer, world } from '#lib/world.svelte.ts';

export const ANSIBLE_ID = 'redhat.ansible';
export const ENGINE = 'podman-machine-default';
export const AAP_CONN = 'aap-acme-prod';
export const RH_REG = 'registry.redhat.io/ansible-automation-platform-27';
export const ADT_IMAGE = `${RH_REG}/ansible-dev-tools-rhel9:26.8.0`;
export const DE_IMAGE = `${RH_REG}/de-supported-rhel9:1.3.1`;
export const EE_SUPPORTED = `${RH_REG}/ee-supported-rhel9:1.0.0`;
export const EE_MINIMAL = `${RH_REG}/ee-minimal-rhel9:2.20`;
export const HOSTS = ['web01.lab.acme', 'web02.lab.acme', 'db01.lab.acme'];

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AnsibleProject {
  type: 'collection' | 'playbook';
  fqcn: string;
  path: string;
  playbooks: string[];
  inventory?: string;
  created: number;
  selected?: boolean;
}

export type TaskResultKind = 'ok' | 'changed' | 'failed' | 'skipped' | 'unreachable';

export interface TaskResult {
  task: string;
  task_action: string;
  host: string;
  __result: TaskResultKind;
  __duration?: string;
  msg?: string;
}

export interface Play {
  name: string;
  tasks: TaskResult[];
}

export interface HostRecap {
  ok: number;
  changed: number;
  unreachable: number;
  failed: number;
  skipped: number;
}

export interface AnsibleRun {
  artifact: string;
  playbook: string;
  inventory: string;
  ee: string;
  status: 'running' | 'successful' | 'failed';
  started: number;
  durationSec?: number;
  plays: Play[];
  stdout: string[];
  selected?: boolean;
}

export interface EdaEvent {
  id: string;
  time: number;
  action: string;
  container: string;
  matchedRule: string;
  ruleAction?: string;
  status: 'running' | 'successful' | 'throttled';
  jobId?: number;
}

export interface AnsibleSettings {
  navigatorEe: string;
  pullPolicy: 'always' | 'missing' | 'never' | 'tag';
}

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

export function seedProjects(): AnsibleProject[] {
  return [
    { type: 'collection', fqcn: 'acme.infra', path: '~/dev/collections/ansible_collections/acme/infra', playbooks: [], created: ago({ d: 21 }) },
    {
      type: 'playbook',
      fqcn: 'acme.ops',
      path: '~/dev/ops-playbooks',
      playbooks: ['site.yml', 'restart-orders.yml', 'deploy-orders.yml', 'podman-hosts.yml'],
      inventory: 'inventory.yml',
      created: ago({ d: 9 }),
    },
  ];
}

interface TaskSpec {
  task: string;
  action: string;
  results: Partial<Record<string, TaskResultKind>>;
  duration?: string;
  msg?: string;
}

const SITE_TASKS: TaskSpec[] = [
  { task: 'Gathering Facts', action: 'gather_facts', results: { 'web01.lab.acme': 'ok', 'web02.lab.acme': 'ok', 'db01.lab.acme': 'ok' }, duration: '2.1s' },
  { task: 'Install nginx', action: 'ansible.builtin.dnf', results: { 'web01.lab.acme': 'changed', 'web02.lab.acme': 'changed' }, duration: '18.4s' },
  { task: 'Deploy site config', action: 'ansible.builtin.template', results: { 'web01.lab.acme': 'changed', 'web02.lab.acme': 'changed', 'db01.lab.acme': 'ok' }, duration: '0.9s' },
  { task: 'Open firewall port 80', action: 'ansible.posix.firewalld', results: { 'web01.lab.acme': 'ok', 'web02.lab.acme': 'ok', 'db01.lab.acme': 'ok' }, duration: '1.2s' },
  {
    task: 'Start nginx',
    action: 'ansible.builtin.systemd_service',
    results: { 'web01.lab.acme': 'ok', 'web02.lab.acme': 'ok', 'db01.lab.acme': 'failed' },
    duration: '1.4s',
    msg: 'Could not find the requested service nginx: host',
  },
  { task: 'Set httpd_can_network_connect', action: 'ansible.posix.seboolean', results: { 'web01.lab.acme': 'ok', 'web02.lab.acme': 'ok' }, duration: '0.7s' },
  { task: 'Check site health', action: 'ansible.builtin.uri', results: { 'web01.lab.acme': 'ok', 'web02.lab.acme': 'ok' }, duration: '0.4s' },
  { task: 'Install debug tools', action: 'ansible.builtin.dnf', results: { 'web01.lab.acme': 'skipped', 'web02.lab.acme': 'skipped' } },
];

const RESTART_TASKS: TaskSpec[] = [
  { task: 'Gathering Facts', action: 'gather_facts', results: { localhost: 'ok' }, duration: '1.2s' },
  { task: 'Get orders pod info', action: 'containers.podman.podman_pod_info', results: { localhost: 'ok' }, duration: '0.6s' },
  { task: 'Restart orders-db', action: 'containers.podman.podman_container', results: { localhost: 'changed' }, duration: '3.8s' },
  { task: 'Wait for postgres', action: 'ansible.builtin.wait_for', results: { localhost: 'ok' }, duration: '2.2s' },
];

const DEPLOY_TASKS: TaskSpec[] = [
  { task: 'Gathering Facts', action: 'gather_facts', results: { 'web01.lab.acme': 'ok', 'web02.lab.acme': 'ok' }, duration: '2.0s' },
  { task: 'Pull orders-api image', action: 'containers.podman.podman_image', results: { 'web01.lab.acme': 'changed', 'web02.lab.acme': 'changed' }, duration: '9.1s' },
  { task: 'Pod orders', action: 'containers.podman.podman_pod', results: { 'web01.lab.acme': 'changed', 'web02.lab.acme': 'changed' }, duration: '1.1s' },
  { task: 'Container orders-api', action: 'containers.podman.podman_container', results: { 'web01.lab.acme': 'changed', 'web02.lab.acme': 'changed' }, duration: '1.6s' },
  { task: 'Reload systemd', action: 'ansible.builtin.systemd_service', results: { 'web01.lab.acme': 'ok', 'web02.lab.acme': 'ok' }, duration: '0.8s' },
];

const PODMAN_HOSTS_TASKS: TaskSpec[] = [
  { task: 'Gathering Facts', action: 'gather_facts', results: { localhost: 'ok' }, duration: '1.1s' },
  { task: 'Install podman', action: 'ansible.builtin.dnf', results: { localhost: 'ok' }, duration: '4.3s' },
  { task: 'Enable podman.socket', action: 'ansible.builtin.systemd_service', results: { localhost: 'changed' }, duration: '0.6s' },
  { task: 'Configure registries.conf', action: 'ansible.builtin.template', results: { localhost: 'ok' }, duration: '0.3s' },
  { task: 'Log in to registry.redhat.io', action: 'containers.podman.podman_login', results: { localhost: 'ok' }, duration: '1.9s' },
];

export function playbookPlan(playbook: string): { play: string; tasks: TaskSpec[] } {
  if (playbook === 'site.yml') return { play: 'Configure web tier', tasks: SITE_TASKS };
  if (playbook === 'restart-orders.yml') return { play: 'Restart orders containers', tasks: RESTART_TASKS };
  if (playbook === 'deploy-orders.yml') return { play: 'Recreate orders pod (exported by Podman Desktop 2026-10-08)', tasks: DEPLOY_TASKS };
  return { play: 'Prepare Podman hosts', tasks: PODMAN_HOSTS_TASKS };
}

/** Expand a task spec into per-host results (navigator artifact order). */
export function expandTask(spec: TaskSpec): TaskResult[] {
  return Object.entries(spec.results).map(([host, result]) => ({
    task: spec.task,
    task_action: spec.action,
    host,
    __result: result ?? 'ok',
    __duration: spec.duration,
    msg: result === 'failed' ? spec.msg : undefined,
  }));
}

export function stdoutFor(spec: TaskSpec): string[] {
  const lines = [`TASK [${spec.task}] ${'*'.repeat(Math.max(3, 60 - spec.task.length))}`];
  for (const r of expandTask(spec)) {
    if (r.__result === 'failed') lines.push(`fatal: [${r.host}]: FAILED! => {"changed": false, "msg": "${r.msg ?? 'failed'}"}`);
    else if (r.__result === 'skipped') lines.push(`skipping: [${r.host}]`);
    else lines.push(`${r.__result}: [${r.host}]`);
  }
  return lines;
}

export function recapOf(run: Pick<AnsibleRun, 'plays'>): Record<string, HostRecap> {
  const out: Record<string, HostRecap> = {};
  for (const play of run.plays) {
    for (const t of play.tasks) {
      const r = (out[t.host] ??= { ok: 0, changed: 0, unreachable: 0, failed: 0, skipped: 0 });
      if (t.__result === 'ok' || t.__result === 'changed') r.ok += 1;
      if (t.__result === 'changed') r.changed += 1;
      if (t.__result === 'failed') r.failed += 1;
      if (t.__result === 'skipped') r.skipped += 1;
      if (t.__result === 'unreachable') r.unreachable += 1;
    }
  }
  return out;
}

export function recapLines(run: Pick<AnsibleRun, 'plays'>): string[] {
  const recap = recapOf(run);
  return [
    `PLAY RECAP ${'*'.repeat(60)}`,
    ...Object.entries(recap).map(
      ([h, r]) => `${h.padEnd(26)}: ok=${r.ok}    changed=${r.changed}    unreachable=${r.unreachable}    failed=${r.failed}    skipped=${r.skipped}    rescued=0    ignored=0`,
    ),
  ];
}

function completedRun(artifact: string, playbook: string, ee: string, started: number, durationSec: number): AnsibleRun {
  const plan = playbookPlan(playbook);
  const plays = [{ name: plan.play, tasks: plan.tasks.flatMap(expandTask) }];
  const failed = plays[0].tasks.some(t => t.__result === 'failed');
  return {
    artifact,
    playbook,
    inventory: playbook === 'podman-hosts.yml' ? 'localhost,' : 'inventory.yml',
    ee,
    status: failed ? 'failed' : 'successful',
    started,
    durationSec,
    plays,
    stdout: [
      `PLAY [${plan.play}] ${'*'.repeat(40)}`,
      ...plan.tasks.flatMap(stdoutFor),
      '',
      ...recapLines({ plays }),
    ],
  };
}

export function seedRuns(): AnsibleRun[] {
  return [
    completedRun('site-artifact-2026-10-08T09:41:12.json', 'site.yml', `${RH_REG}/ee-supported-rhel9:latest`, ago({ h: 1 }), 71),
    completedRun('podman-hosts-artifact-2026-10-07T16:02:55.json', 'podman-hosts.yml', EE_MINIMAL, ago({ d: 1 }), 24),
  ];
}

export function newRun(playbook: string, inventory: string, ee: string): AnsibleRun {
  const stamp = new Date().toISOString().slice(0, 19);
  return {
    artifact: `${playbook.replace(/\.ya?ml$/, '')}-artifact-${stamp}.json`,
    playbook,
    inventory,
    ee,
    status: 'running',
    started: Date.now(),
    plays: [],
    stdout: [],
  };
}

export function seedEvents(): EdaEvent[] {
  return [];
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export function store(): {
  projects: AnsibleProject[];
  runs: AnsibleRun[];
  events: EdaEvent[];
  settings: AnsibleSettings;
} {
  return {
    projects: extData(ANSIBLE_ID, 'projects', seedProjects()),
    runs: extData(ANSIBLE_ID, 'runs', seedRuns()),
    events: extData(ANSIBLE_ID, 'events', seedEvents()),
    settings: extData<AnsibleSettings>(ANSIBLE_ID, 'settings', { navigatorEe: EE_SUPPORTED, pullPolicy: 'missing' }),
  };
}

/* ------------------------------------------------------------------ */
/* Image classification (EE / DE / ADT)                                */
/* ------------------------------------------------------------------ */

export type AnsibleImageKind = 'EE' | 'DE' | 'ADT';

export function ansibleKind(img: Pick<ContainerImage, 'name' | 'labels'>): AnsibleImageKind | undefined {
  const last = img.name.split('/').pop() ?? '';
  if (/ansible-dev-tools/.test(last)) return 'ADT';
  if (img.labels?.['ansible-decision-environment'] === 'true' || /^de-/.test(last)) return 'DE';
  if (img.labels?.['ansible-execution-environment'] === 'true' || /^ee-/.test(last)) return 'EE';
  return undefined;
}

export function imageRef(img: Pick<ContainerImage, 'name' | 'tag'>): string {
  return `${img.name}:${img.tag}`;
}

export function ansibleImages(kinds: AnsibleImageKind[] = ['EE', 'DE', 'ADT']): ContainerImage[] {
  return world.images.filter(i => {
    const k = ansibleKind(i);
    return !!k && kinds.includes(k);
  });
}

/* ------------------------------------------------------------------ */
/* execution-environment.yml v3                                        */
/* ------------------------------------------------------------------ */

export interface CollectionRow {
  name: string;
  version: string;
}

export interface EeForm {
  base: string;
  tag: string;
  collections: CollectionRow[];
  python: string;
  system: string;
}

export const BASE_IMAGES = [
  { value: EE_MINIMAL, label: 'ee-minimal-rhel9:2.20 (AAP 2.7, ansible-core 2.20)' },
  { value: `${RH_REG}/ee-minimal-rhel9:2.16`, label: 'ee-minimal-rhel9:2.16 (AAP 2.7, ansible-core 2.16)' },
  { value: EE_SUPPORTED, label: 'ee-supported-rhel9:1.0.0 (AAP 2.7, certified collections)' },
  { value: 'registry.redhat.io/ansible-automation-platform-26/ee-minimal-rhel9:2.0', label: 'ee-minimal-rhel9:2.0 (AAP 2.6)' },
  { value: DE_IMAGE, label: 'de-supported-rhel9:1.3.1 (AAP 2.7, decision environment)' },
];

function lines(text: string): string[] {
  return text
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

function q(v: string): string {
  return /[:#{}[\],&*?|<>=!%@`'"]|^\s|\s$/.test(v) ? `"${v.replace(/"/g, '\\"')}"` : v;
}

export function eeYaml(f: EeForm): string {
  const out = ['---', 'version: 3', '', 'images:', '  base_image:', `    name: ${f.base}`, '', 'dependencies:'];
  const cols = f.collections.filter(c => c.name.trim());
  if (cols.length) {
    out.push('  galaxy:', '    collections:');
    for (const c of cols) {
      out.push(`      - name: ${c.name.trim()}`);
      if (c.version.trim()) out.push(`        version: "${c.version.trim()}"`);
    }
  }
  const py = lines(f.python);
  if (py.length) out.push('  python:', ...py.map(p => `    - ${q(p)}`));
  const sys = lines(f.system);
  if (sys.length) out.push('  system:', ...sys.map(s => `    - ${q(s)}`));
  out.push(
    '',
    'options:',
    `  package_manager_path: ${f.base.includes('minimal') ? '/usr/bin/microdnf' : '/usr/bin/dnf'}`,
    '  tags:',
    `    - ${f.tag}`,
  );
  return out.join('\n');
}

/* ------------------------------------------------------------------ */
/* Export as Ansible (containers.podman 1.21.0)                        */
/* ------------------------------------------------------------------ */

export type ExportMode = 'container' | 'quadlet' | 'system-role';

export interface ExportOptions {
  mode: ExportMode;
  hosts: string;
  includePull: boolean;
  vaultSecrets: boolean;
}

/** Fields libpod returns but the mock world does not model (volumes, healthchecks, restart policy). */
const EXTRA: Record<string, { volume?: string[]; healthcheck?: string; restart_policy?: string }> = {
  'orders-db': { volume: ['orders-pgdata:/var/lib/pgsql/data:Z'] },
  'orders-api': { healthcheck: 'curl -fs http://localhost:8080/q/health || exit 1' },
  valkey: { volume: ['valkey-data:/data:Z'], restart_policy: 'always' },
};

const RUNTIME_LABEL = /^(io\.ansible\.|ansible-runner|com\.docker\.compose\.|PODMAN_SYSTEMD_UNIT|io\.podman\.annotations)/;

export function isInfra(c: Container): boolean {
  return c.name.endsWith('-infra') || c.image.includes('podman-pause');
}

export function isSecretKey(key: string): boolean {
  return /PASSWORD|SECRET|TOKEN/i.test(key);
}

export function hasSecrets(containers: Container[]): boolean {
  return containers.some(c => (c.env ?? []).some(e => isSecretKey(e.split('=')[0])));
}

interface Prepared {
  c: Container;
  env: [string, string][];
  secrets: { name: string; key: string; vaultVar: string }[];
  labels: [string, string][];
  ports: string[];
}

function prepare(c: Container, opts: ExportOptions, inPod: boolean): Prepared {
  const env: [string, string][] = [];
  const secrets: Prepared['secrets'] = [];
  for (const e of c.env ?? []) {
    const i = e.indexOf('=');
    const key = i >= 0 ? e.slice(0, i) : e;
    const value = i >= 0 ? e.slice(i + 1) : '';
    if (opts.vaultSecrets && isSecretKey(key)) {
      const suffix = key.split('_').pop()?.toLowerCase() ?? 'secret';
      const name = `${c.name}-${suffix}`;
      secrets.push({ name, key, vaultVar: `vault_${name.replace(/-/g, '_')}` });
    } else {
      env.push([key, value]);
    }
  }
  return {
    c,
    env,
    secrets,
    labels: Object.entries(c.labels).filter(([k]) => !RUNTIME_LABEL.test(k)),
    ports: inPod ? [] : c.ports.map(p => `${p.host}:${p.container}`),
  };
}

function flowMap(entries: [string, string][]): string {
  return `{${entries.map(([k, v]) => `${k}: ${q(v)}`).join(', ')}}`;
}

function flowList(items: string[]): string {
  return `[${items.map(i => `"${i}"`).join(', ')}]`;
}

/** Generate the playbook for a pod (with its containers) or a single container. */
export function exportYaml(target: { pod?: Pod; containers: Container[] }, opts: ExportOptions): string {
  const members = target.containers.filter(c => !isInfra(c));
  const pod = target.pod;
  const podPorts = pod ? [...new Set(target.containers.flatMap(c => c.ports.map(p => `${p.host}:${p.container}`)))] : [];
  const prepared = members.map(c => prepare(c, opts, !!pod));
  const subject = pod ? `${pod.name} pod` : members.map(c => c.name).join(', ');
  const date = new Date().toISOString().slice(0, 10);
  const out = [
    '# Generated by Podman Desktop — Export as Ansible',
    '# requires: containers.podman >= 1.21.0' + (opts.mode === 'system-role' ? ', redhat.rhel_system_roles' : ''),
    `- name: Recreate ${subject} (exported by Podman Desktop ${date})`,
    `  hosts: ${opts.hosts}`,
    '  become: false',
  ];
  if (opts.mode === 'system-role') {
    out.push('  vars:', '    podman_create_host_directories: true');
    const secrets = prepared.flatMap(p => p.secrets);
    if (secrets.length) {
      out.push('    podman_secrets:');
      for (const s of secrets) out.push(`      - name: ${s.name}`, '        state: present', `        data: "{{ ${s.vaultVar} }}"`);
    }
    out.push('    podman_quadlet_specs:');
    if (pod) {
      out.push(`      - name: ${pod.name}`, '        type: pod', '        Pod:', `          PublishPort: ${flowList(podPorts)}`, '        Install:', '          WantedBy: default.target');
    }
    for (const p of prepared) {
      const x = EXTRA[p.c.name] ?? {};
      out.push(`      - name: ${p.c.name}`, '        type: container', '        Container:', `          Image: ${p.c.image}`);
      if (pod) out.push(`          Pod: ${pod.name}.pod`);
      if (p.ports.length) out.push(`          PublishPort: ${flowList(p.ports)}`);
      if (p.env.length) out.push(`          Environment: ${flowList(p.env.map(([k, v]) => `${k}=${v}`))}`);
      if (p.secrets.length) out.push(`          Secret: ${flowList(p.secrets.map(s => `${s.name},type=env,target=${s.key}`))}`);
      if (x.volume) out.push(`          Volume: ${flowList(x.volume)}`);
      if (x.healthcheck) out.push(`          HealthCmd: "${x.healthcheck}"`);
      if (p.labels.length) out.push(`          Label: ${flowList(p.labels.map(([k, v]) => `${k}=${v}`))}`);
      if (x.restart_policy) out.push('        Service:', `          Restart: ${x.restart_policy}`);
      out.push('        Install:', '          WantedBy: default.target');
    }
    out.push('  roles:', '    - redhat.rhel_system_roles.podman');
    return out.join('\n');
  }

  const state = opts.mode === 'quadlet' ? 'quadlet' : 'started';
  out.push('  tasks:');
  if (opts.includePull) {
    for (const image of [...new Set(prepared.map(p => p.c.image))]) {
      out.push(`    - name: Pull ${image.split('/').pop()}`, '      containers.podman.podman_image:', `        name: ${image}`, '        pull: true');
    }
  }
  if (pod) {
    out.push(`    - name: Pod ${pod.name}`, '      containers.podman.podman_pod:', `        name: ${pod.name}`, `        state: ${opts.mode === 'quadlet' ? 'quadlet' : 'started'}`);
    if (podPorts.length) out.push(`        publish: ${flowList(podPorts)}`);
    if (opts.mode === 'quadlet') out.push('        quadlet_options: ["[Install]", "WantedBy=default.target"]');
  }
  for (const p of prepared) {
    for (const s of p.secrets) {
      out.push(
        `    - name: Secret for ${p.c.name}`,
        '      containers.podman.podman_secret:',
        `        name: ${s.name}`,
        `        data: "{{ ${s.vaultVar} }}"`,
        '        skip_existing: true',
      );
    }
  }
  for (const p of prepared) {
    const x = EXTRA[p.c.name] ?? {};
    out.push(`    - name: Container ${p.c.name}`, '      containers.podman.podman_container:', `        name: ${p.c.name}`, `        image: ${p.c.image}`);
    if (pod) out.push(`        pod: ${opts.mode === 'quadlet' ? `${pod.name}.pod` : pod.name}`);
    out.push(`        state: ${state}`);
    if (p.ports.length) out.push(`        publish: ${flowList(p.ports)}`);
    if (p.c.command && !pod) out.push(`        command: ${q(p.c.command)}`);
    if (p.env.length) out.push(`        env: ${flowMap(p.env)}`);
    if (p.secrets.length) out.push(`        secrets: ${flowList(p.secrets.map(s => `${s.name},type=env,target=${s.key}`))}`);
    if (x.volume) out.push(`        volume: ${flowList(x.volume)}`);
    if (x.healthcheck) out.push(`        healthcheck: "${x.healthcheck}"`);
    if (x.restart_policy) out.push(`        restart_policy: ${x.restart_policy}`);
    if (p.labels.length) out.push(`        labels: ${flowMap(p.labels)}`);
    if (opts.mode === 'quadlet') out.push('        quadlet_options: ["[Install]", "WantedBy=default.target"]');
  }
  return out.join('\n');
}

/** Terminal deep link of the ADT workspace container (or undefined). */
export function adtTerminalPath(): string | undefined {
  const c = findContainer('adt-workspace');
  return c ? `/c/${c.engineId}/containers/${c.id}/terminal` : undefined;
}

/**
 * redhat.aap is enabled (its seed stored data). Extensions must not import the
 * registry statically: it eagerly imports every extension (import cycle).
 */
export function aapEnabled(): boolean {
  return !!world.ext['redhat.aap'] && !world.deletedConnections.includes(AAP_CONN);
}
