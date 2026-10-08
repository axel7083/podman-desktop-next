/**
 * redhat.ansible actions: navigator runs, creator scaffolding, builder
 * builds and EDA event simulation. Every long action is a task (P15).
 */
import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import { navigate } from '#lib/nav.ts';
import { findContainer, hexId, later, restartContainer, runTask, stopContainer, toast, uid, world } from '#lib/world.svelte.ts';

import {
  AAP_CONN,
  aapEnabled,
  adtTerminalPath,
  ANSIBLE_ID,
  type AnsibleProject,
  type EdaEvent,
  type EeForm,
  ENGINE,
  expandTask,
  imageRef,
  newRun,
  playbookPlan,
  recapLines,
  store,
} from './data.ts';

/* ------------------------------------------------------------------ */
/* ansible-navigator run                                               */
/* ------------------------------------------------------------------ */

export function runPlaybook(playbook: string, inventory: string, ee: string): string {
  const { runs } = store();
  const run = newRun(playbook, inventory, ee);
  runs.unshift(run);
  const plan = playbookPlan(playbook);
  const runnerId = hexId(32);
  const taskMs = 650;
  const pullMs = 1200;
  const startMs = 700;
  const playMs = plan.tasks.length * taskMs + 300;

  const live = (): typeof run | undefined => store().runs.find(r => r.artifact === run.artifact);

  // live stdout + artifact plays, in step with the task below
  later(pullMs + startMs, () => {
    const r = live();
    if (!r) return;
    r.plays.push({ name: plan.play, tasks: [] });
    r.stdout.push(`PLAY [${plan.play}] ${'*'.repeat(40)}`);
  });
  plan.tasks.forEach((spec, index) => {
    later(pullMs + startMs + 200 + index * taskMs, () => {
      const r = live();
      if (!r?.plays[0]) return;
      r.plays[0].tasks.push(...expandTask(spec));
      r.stdout.push(`TASK [${spec.task}] ${'*'.repeat(Math.max(3, 60 - spec.task.length))}`);
      for (const t of expandTask(spec)) {
        if (t.__result === 'failed') r.stdout.push(`fatal: [${t.host}]: FAILED! => {"changed": false, "msg": "${t.msg ?? 'failed'}"}`);
        else if (t.__result === 'skipped') r.stdout.push(`skipping: [${t.host}]`);
        else r.stdout.push(`${t.__result}: [${t.host}]`);
      }
    });
  });

  return runTask({
    name: `ansible-navigator run ${playbook}`,
    ext: ANSIBLE_ID,
    steps: [
      {
        label: `Pulling ${ee.split('/').pop()} (pull policy: missing)`,
        ms: pullMs,
        log: [`$ ansible-navigator run ${playbook} -i ${inventory} --mode stdout --ee true --eei ${ee} --ce podman --pp missing`],
      },
      { label: `Starting ansible_runner_${runnerId.slice(0, 8)}`, ms: startMs, log: [`Container ansible_runner_${runnerId} created`] },
      { label: `Running ${plan.play}`, ms: playMs, log: plan.tasks.map(t => `TASK [${t.task}]`) },
      { label: 'Saving playbook artifact', ms: 400, log: [`Artifact saved to ~/dev/ops-playbooks/${run.artifact}`] },
    ],
    action: { label: 'Open replay', href: `/tools/ansible?tab=runs&run=${encodeURIComponent(run.artifact)}` },
    onDone: () => {
      const r = live();
      if (!r) return;
      const failed = r.plays.some(p => p.tasks.some(t => t.__result === 'failed'));
      r.status = failed ? 'failed' : 'successful';
      r.durationSec = Math.round((Date.now() - r.started) / 1000);
      r.stdout.push('', ...recapLines(r));
      world.containers.push(
        mkContainer(ENGINE, {
          name: `ansible_runner_${runnerId}`,
          image: ee,
          state: 'EXITED',
          ageH: 0,
          labels: { 'ansible-runner': playbook },
          command: `ansible-playbook ${playbook} -i ${inventory}`,
        }),
      );
      if (failed) toast({ type: 'error', title: `${playbook}: 1 host failed`, body: 'db01.lab.acme: Start nginx', action: { label: 'Open replay', href: `/tools/ansible?tab=runs&run=${encodeURIComponent(r.artifact)}` } });
    },
  });
}

/* ------------------------------------------------------------------ */
/* ansible-creator                                                     */
/* ------------------------------------------------------------------ */

export function createProject(type: AnsibleProject['type'], fqcn: string, path: string): string {
  const [ns, name] = fqcn.split('.');
  return runTask({
    name: `ansible-creator init ${type} ${fqcn}`,
    ext: ANSIBLE_ID,
    steps: [
      {
        label: `Scaffolding ${type} ${fqcn}`,
        ms: 1400,
        log:
          type === 'collection'
            ? [
                `$ ansible-creator init collection ${fqcn} ${path}`,
                `Note: collection ${ns}.${name} created at ${path}`,
                '  galaxy.yml, plugins/, roles/run/, tests/integration/, extensions/molecule/',
              ]
            : [
                `$ ansible-creator init playbook ${fqcn} ${path}`,
                `Note: ansible project created at ${path}`,
                '  site.yml, inventory/hosts.yml, collections/ansible_collections/' + `${ns}/${name}`,
              ],
      },
      { label: 'Adding devcontainer (ADT image)', ms: 700, log: [`$ ansible-creator add resource devcontainer ${path}`, 'Note: resource devcontainer added to .devcontainer/podman/devcontainer.json'] },
      { label: 'Adding execution-environment.yml', ms: 500, log: [`$ ansible-creator add resource execution-environment ${path}`] },
    ],
    action: { label: 'Open projects', href: '/tools/ansible?tab=projects' },
    onDone: () => {
      const { projects } = store();
      projects.push({
        type,
        fqcn,
        path,
        playbooks: type === 'playbook' ? ['site.yml'] : [],
        inventory: type === 'playbook' ? 'inventory/hosts.yml' : undefined,
        created: Date.now(),
      });
    },
  });
}

/* ------------------------------------------------------------------ */
/* ansible-builder                                                     */
/* ------------------------------------------------------------------ */

export function buildEe(form: EeForm): string {
  const cols = form.collections.filter(c => c.name.trim());
  const [repo, tag] = splitTag(form.tag);
  return runTask({
    name: `ansible-builder build ${form.tag}`,
    ext: ANSIBLE_ID,
    steps: [
      {
        label: 'Generating build context',
        ms: 600,
        log: [`$ ansible-builder build -f execution-environment.yml -t ${form.tag} --container-runtime podman -v 3`, 'Complete! The build context can be found at: context/'],
      },
      { label: `Base stage: ${form.base.split('/').pop()}`, ms: 1200, log: [`STEP 1/24: FROM ${form.base} AS base`, 'STEP 2/24: USER root'] },
      {
        label: 'Galaxy stage: installing collections',
        ms: 1800,
        log: [
          '$ ansible-galaxy collection install -r requirements.yml --collections-path "/usr/share/ansible/collections"',
          ...cols.map(c => `Installing '${c.name}:${c.version || 'latest'}' to '/usr/share/ansible/collections/ansible_collections/${c.name.replace('.', '/')}'`),
        ],
      },
      {
        label: 'Builder stage: Python and system dependencies',
        ms: 1500,
        log: ['$ /output/scripts/assemble', `Successfully installed ${form.python.split('\n').filter(Boolean).join(' ') || 'nothing'}`, 'bindep: git-core [platform:rpm]'],
      },
      { label: 'Final stage', ms: 900, log: ['STEP 24/24: CMD ["bash"]', `COMMIT ${form.tag}`, `Successfully tagged ${form.tag}`] },
    ],
    action: { label: 'Open images', href: `/c/${ENGINE}/images` },
    onDone: () => {
      world.images = world.images.filter(i => !(i.name === repo && i.tag === tag && i.engineId === ENGINE));
      world.images.unshift(
        mkImage(ENGINE, {
          name: repo,
          tag,
          sizeMB: 412,
          ageD: 0,
          base: 'ubi9',
          labels: {
            'ansible-execution-environment': 'true',
            'ansible.core.version': '2.20',
            'org.opencontainers.image.base.name': form.base,
            'io.ansible.collections': cols.map(c => `${c.name}${c.version ? `:${c.version}` : ''}`).join(','),
          },
        }),
      );
    },
  });
}

export function splitTag(ref: string): [string, string] {
  const i = ref.lastIndexOf(':');
  return i > ref.lastIndexOf('/') ? [ref.slice(0, i), ref.slice(i + 1)] : [ref, 'latest'];
}

export function useAsNavigatorEe(ref: string): void {
  store().settings.navigatorEe = ref;
  toast({ type: 'success', title: 'Navigator default EE updated', body: `ansible-navigator.yml › execution-environment.image: ${ref}` });
}

export function useImageAsNavigatorEe(img: { name: string; tag: string }): void {
  useAsNavigatorEe(imageRef(img));
}

/* ------------------------------------------------------------------ */
/* ADT shell                                                           */
/* ------------------------------------------------------------------ */

export function openAdtShell(): void {
  const path = adtTerminalPath();
  if (path) navigate(path);
  else toast({ type: 'warning', title: 'ADT workspace is not running', body: 'Start the adt-workspace container first.' });
}

/* ------------------------------------------------------------------ */
/* EDA                                                                 */
/* ------------------------------------------------------------------ */

const RESTART_RULE = 'Restart unhealthy orders containers';
const ESCALATE_RULE = 'Escalate died containers';

function pushEvent(e: Omit<EdaEvent, 'id' | 'time'>): EdaEvent {
  const { events } = store();
  events.unshift({ id: uid('eda'), time: Date.now(), ...e });
  return events[0];
}

function setStatus(id: string, status: EdaEvent['status']): void {
  const ev = store().events.find(e => e.id === id);
  if (ev) ev.status = status;
}

export function activationRunning(): boolean {
  return findContainer('eda-podman-health')?.state === 'RUNNING';
}

export function simulateUnhealthy(): void {
  later(500, () => {
    const ev = pushEvent({ action: 'health_status: unhealthy', container: 'orders-db', matchedRule: RESTART_RULE, ruleAction: 'run_playbook restart-orders.yml', status: 'running' });
    restartContainer('orders-db');
    later(1800, () => {
      setStatus(ev.id, 'successful');
      toast({ type: 'success', title: 'EDA: restart-orders.yml finished', body: 'orders-db restarted by rulebook podman-health.yml' });
    });
  });
  later(2600, () => {
    pushEvent({ action: 'health_status: unhealthy', container: 'orders-db', matchedRule: RESTART_RULE, ruleAction: 'run_playbook restart-orders.yml', status: 'throttled' });
  });
}

export function simulateDied(): void {
  later(500, () => {
    const c = findContainer('orders-api');
    if (c?.state === 'RUNNING') stopContainer(c.id);
    const hasAap = aapEnabled();
    const ev = pushEvent({
      action: 'died (exitCode 137)',
      container: 'orders-api',
      matchedRule: ESCALATE_RULE,
      ruleAction: 'run_job_template Remediate orders',
      status: 'running',
      jobId: 4821,
    });
    later(1500, () => {
      setStatus(ev.id, 'successful');
      toast({
        type: 'info',
        title: 'EDA: AAP job 4821 launched',
        body: 'Job template "Remediate orders" on acme-prod',
        action: hasAap ? { label: 'Open job', href: `/c/${AAP_CONN}/aap-jobs?job=4821` } : undefined,
      });
    });
  });
}
