/**
 * P13 RHEL Lightspeed (command-line assistant) in the bottom panel: one chat
 * session collects every "Ask Lightspeed" (log line, selection, failed
 * command, failed task). Answers are fake, chosen by pattern on the context,
 * grounded on RHEL docs (sources on docs.redhat.com), streamed word by word,
 * and propose a command that "Run in terminal" replays in a terminal session.
 */
import { conn as findConn, type PanelSession } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { installExt, isInstalled } from './exts.ts';

export const LS_ICON = 'icons/redhat.rhel-lightspeed.png';

/** Lines Lightspeed offers to explain (inline button, always visible). */
export const ERROR_LINE = /\b(ERROR|Error|failed|FAILED|CrashLoopBackOff|denied)\b|\berror:|"level":"error"/;

/** A shell prompt line (`$ cmd`, `sh-5.2$ cmd`, `[core@rhel-10 ~]$ cmd`). */
export const PROMPT = /^(?:\S*\$|\[[^\]]*\]\$|~ \$) ?/;

export interface LsSource {
  title: string;
  url: string;
}

export interface LsPart {
  t: string;
  /** Monospace quote of the context. */
  quote?: boolean;
}

export interface LsAnswer {
  topic: string;
  parts: LsPart[];
  /** Suggested command(s), one per line. */
  cmd: string[];
  /** Plausible successful output, per command. */
  out: string[][];
  sources: LsSource[];
}

export interface LsMessage {
  id: number;
  role: 'user' | 'assistant';
  /** User: question text. */
  text?: string;
  /** User: quoted context (log line, selection, failed command). */
  context?: string;
  /** User: where the context comes from (session / resource name). */
  source?: string;
  connId: string;
  answer?: LsAnswer;
  /** Assistant: words streamed so far. */
  shown: number;
  /** Assistant: total words to stream. */
  total: number;
}

class LightspeedState {
  /** Messages per chat session id. */
  chats = $state<Record<string, LsMessage[]>>({});
  /** The open chat session (repeated asks append to it). */
  current = $state<PanelSession | undefined>(undefined);
}

export const lightspeed = new LightspeedState();

let seq = 0;

const DOCS = 'https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html';

function words(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

/** The line of the context the answer quotes (first error line, else the first line). */
function keyLine(ctx: string): string {
  const lines = ctx.split('\n').map(l => l.trim()).filter(Boolean);
  const l = lines.find(x => ERROR_LINE.test(x) || /not registered|denied|in use|timed? ?out|OOMKilled/i.test(x)) ?? lines[0] ?? ctx;
  return l.length > 160 ? `${l.slice(0, 157)}…` : l;
}

function host(connId: string): string {
  return findConn(connId)?.name ?? connId;
}

/** Answer for a question (and its context), by pattern. */
function answerFor(q: string, ctx: string, connId: string, prev?: LsAnswer): LsAnswer {
  const all = `${q}\n${ctx}`;
  const quote = keyLine(ctx || q);
  if (q && prev?.topic === 'register' && /verify|check|confirm|status|work/i.test(q)) {
    return {
      topic: 'register',
      parts: [{ t: 'Check the registration status and the repositories it enabled. You should see Overall Status: Registered and the BaseOS and AppStream repositories.' }],
      cmd: ['sudo subscription-manager status', 'dnf repolist'],
      out: [
        ['+-------------------------------------------+', '   System Status Details', '+-------------------------------------------+', 'Overall Status: Registered'],
        ['repo id                                      repo name', 'rhel-10-for-x86_64-appstream-rpms            Red Hat Enterprise Linux 10 for x86_64 - AppStream (RPMs)', 'rhel-10-for-x86_64-baseos-rpms               Red Hat Enterprise Linux 10 for x86_64 - BaseOS (RPMs)'],
      ],
      sources: [{ title: 'Getting started with RHEL system registration', url: 'https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/index' }],
    };
  }
  if (/not registered|no enabled repositories|subscription|entitlement|consumer identity/i.test(all)) {
    return {
      topic: 'register',
      parts: [
        { t: 'The output says:' },
        { t: quote, quote: true },
        {
          t: `${host(connId)} is not registered with Red Hat Subscription Management, so dnf has no enabled RHEL repositories (BaseOS, AppStream) to install packages from. Register the system with an activation key, which enables the repositories automatically, then retry the installation.`,
        },
      ],
      cmd: ['sudo subscription-manager register --activationkey=pd-developer --org=12345678', 'sudo dnf install -y container-tools'],
      out: [
        ['The system has been registered with ID: 4f1c2a9e-7b3d-4e8a-9c21-5d6f0a8b3e17', `The registered system name is: ${host(connId)}`],
        [
          'Updating Subscription Management repositories.',
          'Red Hat Enterprise Linux 10 for x86_64 - BaseOS (RPMs)       14 MB/s |  48 MB     00:03',
          'Red Hat Enterprise Linux 10 for x86_64 - AppStream (RPMs)    16 MB/s |  61 MB     00:03',
          'Dependencies resolved.',
          'Installing: podman, buildah, skopeo, crun, netavark, toolbox (34 packages)',
          'Total download size: 52 M',
          'Complete!',
        ],
      ],
      sources: [
        { title: 'Getting started with RHEL system registration', url: 'https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/index' },
        { title: 'RHEL 10 · Building, running, and managing containers', url: `${DOCS}/building_running_and_managing_containers/index` },
      ],
    };
  }
  if (/CrashLoopBackOff|OOMKilled|out of memory|oom/i.test(all)) {
    return {
      topic: 'memory',
      parts: [
        { t: 'The workload reports:' },
        { t: quote, quote: true },
        {
          t: 'The container keeps restarting because it is killed when it exceeds its memory limit (exit code 137, reason OOMKilled). Check the last termination reason, then raise the memory limit or lower the heap size of the application.',
        },
      ],
      cmd: ['kubectl describe pod -l app=checkout | grep -A3 "Last State"', 'kubectl set resources deployment/checkout --limits=memory=512Mi --requests=memory=256Mi'],
      out: [
        ['    Last State:     Terminated', '      Reason:       OOMKilled', '      Exit Code:    137'],
        ['deployment.apps/checkout resource requirements updated'],
      ],
      sources: [
        { title: 'RHEL 10 · Managing, monitoring, and updating the kernel: limiting memory with cgroups', url: `${DOCS}/managing_monitoring_and_updating_the_kernel/index` },
        { title: 'OpenShift · Nodes: configuring memory limits for pods', url: 'https://docs.redhat.com/en/documentation/openshift_container_platform/4.19/html/nodes/index' },
      ],
    };
  }
  if (/permission denied|selinux|avc:|denied/i.test(all)) {
    return {
      topic: 'selinux',
      parts: [
        { t: 'The error is:' },
        { t: quote, quote: true },
        {
          t: 'On RHEL, SELinux blocks a container from accessing a host directory that is not labelled container_file_t. Check the label of the directory, then relabel it (or mount the volume with the :Z suffix so Podman relabels it for you).',
        },
      ],
      cmd: ['ls -Zd ./data', 'sudo restorecon -Rv ./data'],
      out: [['unconfined_u:object_r:user_home_t:s0 ./data'], ["Relabeled /home/core/data from unconfined_u:object_r:user_home_t:s0 to unconfined_u:object_r:container_file_t:s0"]],
      sources: [
        { title: 'RHEL 10 · Using SELinux: troubleshooting problems related to SELinux', url: `${DOCS}/using_selinux/index` },
        { title: 'RHEL 10 · Building, running, and managing containers: SELinux and volumes', url: `${DOCS}/building_running_and_managing_containers/index` },
      ],
    };
  }
  if (/address already in use|port .*(in use|allocated)|bind:/i.test(all)) {
    const port = /:(\d{2,5})\b/.exec(all)?.[1] ?? '8080';
    return {
      topic: 'port',
      parts: [
        { t: 'The bind failed:' },
        { t: quote, quote: true },
        { t: `Another process already listens on port ${port}. Find which one, then stop it or publish the container on another host port (for example -p ${Number(port) + 1}:${port}).` },
      ],
      cmd: [`sudo ss -ltnp 'sport = :${port}'`],
      out: [['State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process', `LISTEN 0      4096         0.0.0.0:${port}      0.0.0.0:*     users:(("conmon",pid=4410,fd=5))`]],
      sources: [{ title: 'RHEL 10 · Configuring and managing networking', url: `${DOCS}/configuring_and_managing_networking/index` }],
    };
  }
  if (/time ?out|timed out|no such host|name resolution|unreachable/i.test(all)) {
    return {
      topic: 'network',
      parts: [
        { t: 'The request did not complete:' },
        { t: quote, quote: true },
        { t: 'A timeout usually means the remote host is unreachable or its name does not resolve from this system. Check DNS resolution first, then connectivity to the endpoint with a short timeout.' },
      ],
      cmd: ['getent hosts registry.redhat.io', 'curl -sv --max-time 5 https://registry.redhat.io/v2/ -o /dev/null'],
      out: [['23.45.67.89     registry.redhat.io'], ['* Connected to registry.redhat.io (23.45.67.89) port 443', '< HTTP/2 401']],
      sources: [
        { title: 'RHEL 10 · Configuring and managing networking: configuring DNS', url: `${DOCS}/configuring_and_managing_networking/index` },
        { title: 'RHEL 10 · Configuring firewalls and packet filters', url: `${DOCS}/configuring_firewalls_and_packet_filters/index` },
      ],
    };
  }
  return {
    topic: 'generic',
    parts: [
      ...(ctx ? [{ t: 'Looking at:' }, { t: quote, quote: true }] : []),
      { t: 'The message alone does not identify a single cause. The system journal around the time of the failure usually shows the underlying error; start there and narrow down to the failing unit or container.' },
    ],
    cmd: ['journalctl -p err -b --no-pager | tail -20'],
    out: [[`Oct 09 09:14:23 ${host(connId)} podman[4410]: time="2026-10-09T09:14:23Z" level=error msg="exit status 1"`]],
    sources: [{ title: 'RHEL 10 · Configuring basic system settings: troubleshooting with the journal', url: `${DOCS}/configuring_basic_system_settings/index` }],
  };
}

function totalWords(a: LsAnswer): number {
  return a.parts.reduce((n, p) => n + words(p.t), 0) + a.cmd.length + a.sources.length;
}

/** Stream an assistant message word by word (~30ms per word). */
function stream(m: LsMessage): void {
  const timer = setInterval(() => {
    m.shown++;
    if (m.shown >= m.total) clearInterval(timer);
  }, 30);
}

function reply(chatId: string, q: string, ctx: string, connId: string): void {
  const list = lightspeed.chats[chatId];
  const prev = list.findLast(x => x.role === 'assistant')?.answer;
  const answer = answerFor(q, ctx, connId, prev);
  list.push({ id: ++seq, role: 'assistant', connId, answer, shown: 0, total: totalWords(answer) });
  // Stream the proxied message (the store is deeply reactive).
  stream(list[list.length - 1]);
}

/** Label of an "Ask Lightspeed" menu item (mentions the install in Vanilla). */
export function askLabel(base = 'Ask Lightspeed'): string {
  return isInstalled('lightspeed') ? base : `${base} (install RHEL Lightspeed)`;
}

/**
 * Ask RHEL Lightspeed about `context` (log line, selection, failed command,
 * failed task output). Installs the extension when missing, opens (or
 * focuses) the Lightspeed chat session in the bottom panel and appends the
 * question with a streamed answer.
 */
export function askLightspeed(context: string, connId: string, source?: string): void {
  if (!isInstalled('lightspeed')) installExt('lightspeed');
  let s = lightspeed.current;
  if (!s) {
    s = { id: `lightspeed-${++seq}`, kind: 'chat', title: 'Lightspeed', label: 'RHEL Lightspeed', connId, lines: [], context, icon: LS_ICON };
    lightspeed.current = s;
  }
  const id = s.id;
  lightspeed.chats[id] ??= [];
  lightspeed.chats[id].push({ id: ++seq, role: 'user', text: 'Explain this error and how to fix it.', context, source, connId, shown: 0, total: 0 });
  reply(id, '', context, connId);
  lab.addSession(s);
}

/** Follow-up question typed in the chat. */
export function followUp(chatId: string, text: string, connId: string): void {
  lightspeed.chats[chatId] ??= [];
  const list = lightspeed.chats[chatId];
  list.push({ id: ++seq, role: 'user', text, connId, shown: 0, total: 0 });
  const ctx = list.findLast(x => x.role === 'user' && x.context)?.context ?? '';
  // Only reuse the earlier context when the follow-up has no topic of its own.
  const own = answerFor(text, '', connId);
  reply(chatId, text, own.topic === 'generic' ? ctx : '', connId);
}

/** A chat session added elsewhere with a `context` but no messages yet. */
export function ensureChat(s: PanelSession): void {
  if (lightspeed.chats[s.id]?.length) return;
  lightspeed.chats[s.id] = [];
  lightspeed.current ??= s;
  if (s.context) {
    lightspeed.chats[s.id].push({ id: ++seq, role: 'user', text: 'Explain this error and how to fix it.', context: s.context, connId: s.connId, shown: 0, total: 0 });
    reply(s.id, '', s.context, s.connId);
  }
}

/** The chat tab was closed: the next ask opens a new chat. */
export function chatClosed(id: string): void {
  if (lightspeed.current?.id === id) lightspeed.current = undefined;
}

/** Clear the messages of a chat. */
export function clearChat(id: string): void {
  lightspeed.chats[id] = [];
}

/** Shell prompt of a connection (RHEL-like hosts get the `[core@host ~]$` form). */
export function promptFor(connId: string): string {
  const c = findConn(connId);
  return c && c.group !== 'Kubernetes' && /rhel|fedora|machine|wsl/i.test(`${c.id} ${c.product ?? ''}`) ? `[core@${c.name} ~]$ ` : '$ ';
}

/** Run the suggested command in a new terminal session on the same connection. */
export function runSuggested(a: LsAnswer, connId: string): void {
  const p = promptFor(connId);
  const script: string[] = [];
  a.cmd.forEach((c, i) => {
    if (i > 0) script.push(`${p}${c}`);
    script.push(...(a.out[i] ?? []));
  });
  script.push(p);
  lab.addSession({ id: `ls-run-${++seq}`, kind: 'terminal', title: host(connId), label: 'terminal', connId, lines: [`${p}${a.cmd[0]}`], script, stream: true, target: { kind: 'connection', connId }, icon: findConn(connId)?.icon });
}

/** Words of a text, the first `n` only (streaming). */
export function take(t: string, n: number): string {
  if (n <= 0) return '';
  const w = t.split(/(\s+)/);
  let count = 0;
  let out = '';
  for (const tok of w) {
    if (/\S/.test(tok)) {
      if (count >= n) break;
      count++;
    }
    out += tok;
  }
  return out;
}

/** Last failed command block of a terminal (prompt line + output with an error), or undefined. */
export function lastFailed(lines: string[]): string | undefined {
  const blocks = failedBlocks(lines);
  const b = blocks.at(-1);
  return b ? lines.slice(b.start, b.end + 1).join('\n') : undefined;
}

/** Failed command blocks: index of the prompt line and of the last output line. */
export function failedBlocks(lines: string[]): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let start = -1;
  const close = (end: number): void => {
    if (start >= 0 && end > start && lines.slice(start + 1, end + 1).some(l => ERROR_LINE.test(l) || /not registered|command not found|No such file/i.test(l))) out.push({ start, end });
  };
  lines.forEach((l, i) => {
    if (PROMPT.test(l) && l.replace(PROMPT, '').trim()) {
      close(i - 1);
      start = i;
    } else if (PROMPT.test(l)) {
      close(i - 1);
      start = -1;
    }
  });
  close(lines.length - 1);
  return out;
}
