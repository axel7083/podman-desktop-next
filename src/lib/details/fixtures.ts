/** Canned logs and terminal answers, picked from the container image. */
import type { Container } from '#lib/world.svelte.ts';

function family(c: Container): 'nginx' | 'postgres' | 'httpd' | 'redis' | 'node' | 'java' | 'kind' | 'generic' {
  const i = c.image.toLowerCase();
  if (i.includes('nginx')) return 'nginx';
  if (i.includes('postgres')) return 'postgres';
  if (i.includes('httpd')) return 'httpd';
  if (i.includes('redis')) return 'redis';
  if (i.includes('kindest')) return 'kind';
  if (i.includes('productpage') || i.includes('node')) return 'node';
  if (i.includes('reviews') || i.includes('java') || i.includes('quarkus') || i.includes('openjdk')) return 'java';
  return 'generic';
}

export function defaultLogs(c: Container): string[] {
  switch (family(c)) {
    case 'nginx':
      return [
        '/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration',
        '/docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh',
        '/docker-entrypoint.sh: Configuration complete; ready for start up',
        '2026/10/08 07:58:12 [notice] 1#1: nginx/1.27.2',
        '2026/10/08 07:58:12 [notice] 1#1: start worker processes',
      ];
    case 'postgres':
      return [
        'PostgreSQL Database directory appears to contain a database; Skipping initialization',
        '2026-10-08 07:58:10.112 UTC [1] LOG:  starting PostgreSQL 16.4 on x86_64-pc-linux-gnu',
        '2026-10-08 07:58:10.113 UTC [1] LOG:  listening on IPv4 address "0.0.0.0", port 5432',
        '2026-10-08 07:58:10.121 UTC [1] LOG:  database system is ready to accept connections',
      ];
    case 'httpd':
      return [
        '=> sourcing 10-set-mpm.sh ...',
        '=> sourcing 20-copy-config.sh ...',
        'AH00558: httpd: Could not reliably determine the server\'s fully qualified domain name',
        '[Wed Oct 08 07:58:12.000000 2026] [core:notice] [pid 1:tid 1] AH00094: Command line: \'httpd -D FOREGROUND\'',
      ];
    case 'redis':
      return ['1:C 08 Oct 2026 07:58:12.000 * Redis version=7.2.5, bits=64', '1:M 08 Oct 2026 07:58:12.001 * Ready to accept connections tcp'];
    case 'java':
      return [
        '__  ____  __  _____   ___  __ ____  ______',
        ' --/ __ \\/ / / / _ | / _ \\/ //_/ / / / __/',
        ' -/ /_/ / /_/ / __ |/ , _/ ,< / /_/ /\\ \\',
        '--\\___\\_\\____/_/ |_/_/|_/_/|_|\\____/___/',
        'INFO  [io.quarkus] (main) reviews 1.0.0 on JVM (powered by Quarkus 3.27.0) started in 1.204s. Listening on: http://0.0.0.0:9080',
        'INFO  [io.quarkus] (main) Installed features: [cdi, rest, smallrye-health]',
      ];
    case 'node':
      return ['> productpage@1.20.2 start', '> node server.js', 'Server listening on http://0.0.0.0:9080'];
    case 'kind':
      return ['INFO: ensuring we can execute mount/umount even with userns-remap', 'INFO: detected cgroup v2', 'Welcome to Debian GNU/Linux 12 (bookworm)!'];
    default:
      return ['!... Hello Podman World ...!', '', '         .--"--.', '       / -     - \\', '      / (O)   (O) \\', '   ~~~| -=(,Y,)=- |'];
  }
}

export function logTail(c: Container): string[] {
  switch (family(c)) {
    case 'nginx':
      return ['10.88.0.1 - - [{ts}] "GET / HTTP/1.1" 200 615 "-" "Mozilla/5.0"', '10.88.0.1 - - [{ts}] "GET /favicon.ico HTTP/1.1" 404 153 "-" "Mozilla/5.0"'];
    case 'postgres':
      return ['{ts} UTC [61] LOG:  checkpoint starting: time', '{ts} UTC [61] LOG:  checkpoint complete: wrote 3 buffers (0.0%)'];
    case 'httpd':
      return ['10.88.0.1 - - [{ts}] "GET /index.html HTTP/1.1" 200 45'];
    case 'java':
      return ['{ts} INFO  [org.acm.ReviewsResource] (executor-thread-1) GET /reviews/0 200 4ms'];
    case 'node':
      return ['{ts} GET /productpage 200 38ms'];
    default:
      return [];
  }
}

const OS_RELEASE: Record<string, string> = {
  alpine: 'NAME="Alpine Linux"\nID=alpine\nVERSION_ID=3.20.3\nPRETTY_NAME="Alpine Linux v3.20"\nHOME_URL="https://alpinelinux.org/"',
  debian: 'PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"\nNAME="Debian GNU/Linux"\nVERSION_ID="12"\nVERSION="12 (bookworm)"\nID=debian',
  ubi9: 'NAME="Red Hat Enterprise Linux"\nVERSION="9.6 (Plow)"\nID="rhel"\nID_LIKE="fedora"\nVERSION_ID="9.6"\nPLATFORM_ID="platform:el9"\nPRETTY_NAME="Red Hat Enterprise Linux 9.6 (Plow)"',
};

export function containerAnswers(c: Container): Record<string, string> {
  const i = c.image.toLowerCase();
  const os = i.includes('alpine') ? 'alpine' : i.includes('ubi') || i.includes('redhat') || i.includes('sclorg') ? 'ubi9' : 'debian';
  const proc = family(c) === 'nginx' ? 'nginx: master process nginx -g daemon off;' : family(c) === 'postgres' ? 'postgres' : (c.command ?? '/bin/sh');
  return {
    ls: 'bin   dev  home  lib64  mnt  proc  run   srv  tmp  var\nboot  etc  lib   media  opt  root  sbin  sys  usr',
    'ls /': 'bin   dev  home  lib64  mnt  proc  run   srv  tmp  var\nboot  etc  lib   media  opt  root  sbin  sys  usr',
    ps: `PID   USER     TIME  COMMAND\n    1 root      0:00 ${proc}\n   29 root      0:00 /bin/sh\n   35 root      0:00 ps`,
    'ps aux': `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1  12044  7364 ?        Ss   07:58   0:00 ${proc}\nroot        29  0.0  0.0   2592  1824 pts/0    Ss   08:02   0:00 /bin/sh`,
    'cat /etc/os-release': OS_RELEASE[os],
    whoami: 'root',
    hostname: c.id.slice(0, 12),
    pwd: '/',
    env: (c.env ?? ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin']).join('\n') + `\nHOSTNAME=${c.id.slice(0, 12)}`,
    'uname -a': `Linux ${c.id.slice(0, 12)} 6.12.9-200.fc41.x86_64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`,
    help: 'Try: ls, ps, cat /etc/os-release, whoami, hostname, env, uname -a, clear',
  };
}

export function toKubeYaml(c: Container): string {
  const ports = c.ports.map(p => `        - containerPort: ${p.container}\n          hostPort: ${p.host}`).join('\n');
  return `# Save the output of this file and use kubectl create -f to import it into Kubernetes.
#
# Created with podman-5.6.2
apiVersion: v1
kind: Pod
metadata:
  annotations:
    io.podman.annotations.ulimit: nofile=524288:524288
  labels:
    app: ${c.name}-pod
  name: ${c.name}-pod
spec:
  containers:
    - image: ${c.image}
      name: ${c.name}${ports ? `\n      ports:\n${ports}` : ''}
`;
}
