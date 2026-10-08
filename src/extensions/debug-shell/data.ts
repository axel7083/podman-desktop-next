/**
 * Debug shell sessions: a toolbox container joined to the target's pid, net
 * and ipc namespaces (`podman run --pid=container:<t> --network=container:<t>
 * --ipc=container:<t> --cap-add SYS_PTRACE <toolbox> bash`), labelled
 * `io.podman-desktop.debug-target=<target id>` for grouping and cleanup.
 */
import { mkContainer } from '#lib/ext/helpers.ts';
import type { Container } from '#lib/world.svelte.ts';
import { extData, runTask, toast, world } from '#lib/world.svelte.ts';

export const DEBUG_EXT = 'podman-desktop.debug-shell';
export const DEBUG_LABEL = 'io.podman-desktop.debug-target';

export const DEBUG_IMAGES = [
  { value: 'registry.fedoraproject.org/fedora-toolbox:43', label: 'Fedora toolbox 43 (registry.fedoraproject.org)', sizeMB: 812 },
  { value: 'registry.access.redhat.com/ubi9/toolbox:9.8', label: 'UBI 9 toolbox 9.8 (registry.access.redhat.com)', sizeMB: 498 },
  { value: 'docker.io/nicolaka/netshoot:latest', label: 'netshoot – network troubleshooting (docker.io)', sizeMB: 196 },
];

export interface DebugSession {
  targetId: string;
  target: string;
  debugContainerId: string;
  debugImage: string;
  namespaces: ('pid' | 'net' | 'ipc')[];
  started: number;
}

type Sessions = Record<string, DebugSession>;

/* Read accessors (pure) */

export function sessionOf(targetId: string): DebugSession | undefined {
  const s = (world.ext[DEBUG_EXT]?.sessions as Sessions | undefined)?.[targetId];
  return s && world.containers.some(c => c.id === s.debugContainerId) ? s : undefined;
}

export function isDebugContainer(c: Container): boolean {
  return !!c.labels[DEBUG_LABEL];
}

export function debugCommand(target: Container, image: string): string {
  const n = target.name;
  return `podman run -it --rm --name debug-${n} --pid=container:${n} --network=container:${n} --ipc=container:${n} --cap-add SYS_PTRACE --label ${DEBUG_LABEL}=${target.id.slice(0, 12)} ${image} bash`;
}

export function promptOf(image: string): string {
  if (image.includes('netshoot')) return 'netshoot:~# ';
  if (image.includes('ubi9')) return '[root@toolbox /]# ';
  return '[root@fedora-toolbox /]# ';
}

function isJava(c: Container): boolean {
  return /quarkus|acme|openjdk|java|eap/i.test(c.image);
}

/** Process line of PID 1 in the target. */
function mainProcess(c: Container): string {
  if (isJava(c)) return 'java -Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager -jar /deployments/quarkus-run.jar';
  return c.command ?? `/usr/bin/${c.image.split('/').pop()?.split(':')[0] ?? 'app'}`;
}

/** Scripted terminal answers for a debug session on the target. */
export function answersFor(target: Container, image: string): Record<string, string> {
  const main = mainProcess(target);
  const java = isJava(target);
  const ports = target.ports.length ? target.ports.map(p => p.container) : [8080];
  const ps = [
    'USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
    `${java ? '185 ' : 'root'}           1  2.4  6.1 4512340 498212 ?     Ssl  08:12   1:42 ${main}`,
    'root          58  0.0  0.0  12092  4320 pts/0    Ss   10:41   0:00 bash',
    'root          71  0.0  0.0  14420  3600 pts/0    R+   10:41   0:00 ps aux',
  ].join('\n');
  const ls = java
    ? 'app  config  lib  quarkus  quarkus-app-dependencies.txt  quarkus-run.jar'
    : 'ls: cannot access /proc/1/root/deployments: No such file or directory';
  const props = java
    ? [
        'quarkus.application.name=acme-orders',
        'quarkus.http.port=8080',
        'quarkus.datasource.db-kind=postgresql',
        'quarkus.datasource.jdbc.url=jdbc:postgresql://host.containers.internal:5432/orders',
        'mp.messaging.outgoing.orders-created.connector=smallrye-kafka',
        'mp.messaging.outgoing.orders-created.topic=orders.created',
        'kafka.bootstrap.servers=host.containers.internal:9092',
        'mp.messaging.connector.smallrye-kafka.apicurio.registry.url=http://host.containers.internal:8080/apis/registry/v3',
        'quarkus.oidc.auth-server-url=http://host.containers.internal:8180/realms/acme',
        'quarkus.oidc.client-id=acme-orders',
      ].join('\n')
    : 'cat: /proc/1/root/deployments/config/application.properties: No such file or directory';
  const ss = [
    'State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process',
    ...ports.map(p => `LISTEN 0      4096         0.0.0.0:${p}        0.0.0.0:*     users:(("${java ? 'java' : 'app'}",pid=1,fd=${p === 8080 ? 112 : 118}))`),
    ...(target.labels['io.cryostat.jmxPort'] ? [`LISTEN 0      50           0.0.0.0:${target.labels['io.cryostat.jmxPort']}        0.0.0.0:*     users:(("java",pid=1,fd=17))`] : []),
  ].join('\n');
  const health = java
    ? '{"status":"UP","checks":[{"name":"Database connections health check","status":"UP","data":{"<default>":"UP"}},{"name":"SmallRye Reactive Messaging - readiness check","status":"UP","data":{"orders-created":"[OK]"}}]}'
    : 'curl: (7) Failed to connect to localhost port 8080 after 0 ms: Couldn\'t connect to server';
  const env = [
    `HOSTNAME=${target.id.slice(0, 12)}`,
    'TERM=xterm',
    `container=oci`,
    'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin',
    `DEBUG_TARGET=${target.name}`,
    `DEBUG_IMAGE=${image}`,
    'HOME=/root',
  ].join('\n');
  return {
    'ps aux': ps,
    'ls /proc/1/root/deployments': ls,
    'cat /proc/1/root/deployments/config/application.properties': props,
    'ss -ltnp': ss,
    'curl -s localhost:8080/q/health': health,
    env,
    'cat /proc/1/environ | tr "\\0" "\\n"': (target.env ?? []).join('\n') || 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin',
    'ls /proc/1/root': 'bin  deployments  dev  etc  home  lib  lib64  proc  root  run  sys  tmp  usr  var',
    whoami: 'root',
    help: 'Try: ps aux · ls /proc/1/root/deployments · cat /proc/1/root/deployments/config/application.properties · ss -ltnp · curl -s localhost:8080/q/health · env',
  };
}

export function bannerFor(target: Container, image: string): string {
  return [
    `Debug shell attached to ${target.name} (${image.split('/').pop()})`,
    'Joined namespaces: pid, net, ipc · capability SYS_PTRACE',
    'The target filesystem is mounted at /proc/1/root. Your changes do not alter the image.',
    "Type 'help' for suggestions.",
  ].join('\n');
}

/* Actions (writes) */

export function startDebugShell(target: Container, image: string): string {
  const targetId = target.id;
  const name = `debug-${target.name}`;
  const size = DEBUG_IMAGES.find(i => i.value === image)?.sizeMB ?? 400;
  const pulled = world.images.some(i => `${i.name}:${i.tag}` === image);
  return runTask({
    name: `Start debug shell for ${target.name}`,
    ext: DEBUG_EXT,
    steps: [
      pulled
        ? { label: `Using ${image}`, ms: 300, log: [`${image} already present`] }
        : { label: `Pulling ${image}`, ms: 1300, log: [`Trying to pull ${image}...`, `Copying blob sha256:7d3f1c2b9a0e done | ${size} MB`, 'Writing manifest to image destination'] },
      { label: `Attaching to ${target.name}`, ms: 700, log: [debugCommand(target, image), 'Joined pid, net and ipc namespaces'] },
    ],
    onDone: (): void => {
      const t = world.containers.find(c => c.id === targetId);
      if (!t) return;
      world.containers = world.containers.filter(c => c.labels[DEBUG_LABEL] !== targetId);
      const debug = mkContainer(t.engineId, {
        name,
        image,
        labels: { [DEBUG_LABEL]: targetId, 'io.podman-desktop.debug-target.name': t.name },
        command: 'bash',
        upM: 0,
        ageH: 0,
      });
      world.containers.push(debug);
      const sessions = extData<Sessions>(DEBUG_EXT, 'sessions', {});
      sessions[targetId] = { targetId, target: t.name, debugContainerId: debug.id, debugImage: image, namespaces: ['pid', 'net', 'ipc'], started: Date.now() };
    },
  });
}

export function endDebugShell(targetId: string): void {
  const sessions = extData<Sessions>(DEBUG_EXT, 'sessions', {});
  const s = sessions[targetId];
  world.containers = world.containers.filter(c => c.labels[DEBUG_LABEL] !== targetId);
  delete sessions[targetId];
  if (s) toast({ type: 'success', title: `Debug session ended`, body: `Container debug-${s.target} removed (--rm)` });
}
