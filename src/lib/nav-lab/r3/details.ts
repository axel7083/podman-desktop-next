/** P13: deterministic fake details for the compact Summary / Inspect views. */
import { type LabResource, resourcesOf } from '../data.ts';

export function hash(s: string): number {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export const KUBE = ['kpods', 'deployments', 'services', 'routes', 'pvcs', 'config', 'jobs', 'cronjobs', 'nodes', 'pipelines', 'gitops', 'operators', 'helm', 'inference', 'workbenches', 'dspipelines', 'vms', 'servicenet'];

export function isKube(sectionId: string): boolean {
  return KUBE.includes(sectionId);
}

export interface ContainerInfo {
  image: string;
  ports: number[];
  command: string;
  env: string[];
  mounts: string[];
  networks: string[];
  restart: string;
  labels: [string, string][];
  cpu: number[];
  mem: number;
}

export function containerInfo(r: LabResource): ContainerInfo {
  const h = hash(r.name);
  const base = 8000 + (h % 90) * 10;
  const ports = h % 4 === 3 ? [] : h % 3 === 0 ? [base, base + 443 - (base % 443)] : [base];
  return {
    image: r.sub,
    ports,
    command: ['/usr/bin/run-app', 'java -jar /deployments/quarkus-run.jar', 'docker-entrypoint.sh postgres', 'nginx -g daemon off;', 'valkey-server --save 60 1'][h % 5],
    env: ['PATH', 'HOME', 'TZ', 'APP_PROFILE', 'DB_URL', 'KAFKA_BOOTSTRAP', 'LOG_LEVEL'].slice(0, 3 + (h % 5)),
    mounts: [`${r.name}-data:/var/lib/data`, '/home/dev/config:/config:ro', 'tmpfs:/tmp'].slice(0, 1 + (h % 3)),
    networks: r.group ? [`${r.group}_default`] : ['podman'],
    restart: ['no', 'always', 'unless-stopped', 'on-failure'][h % 4],
    labels: [
      ['io.podman.compose.project', r.group ?? '—'],
      ['org.opencontainers.image.source', `https://github.com/acme/${r.name}`],
      ['org.opencontainers.image.version', `1.${h % 9}.0`],
      ['maintainer', 'platform@acme.com'],
      ['io.k8s.display-name', r.name],
    ],
    cpu: Array.from({ length: 24 }, (_, i) => 6 + ((h >> (i % 16)) % 40)),
    mem: 40 + (h % 900),
  };
}

export function imageInfo(r: LabResource): { size: string; layers: { id: string; size: string; cmd: string }[]; tags: string[]; digest: string; usedBy: LabResource[]; arch: string } {
  const h = hash(r.name);
  const n = 4 + (h % 8);
  const repo = r.name.split(':')[0];
  return {
    size: r.sub.endsWith('MB') ? r.sub : `${(h % 900) + 80} MB`,
    layers: Array.from({ length: n }, (_, i) => ({
      id: ((h >> i) * 2654435761).toString(16).slice(0, 12).padEnd(12, 'a'),
      size: `${((h >> i) % 90) + 1}.${i} MB`,
      cmd: ['FROM ubi10-minimal', 'RUN microdnf install -y java-21', 'COPY target/lib /deployments/lib', 'COPY target/*.jar /deployments/', 'ENV LANG=C.UTF-8', 'USER 185', 'EXPOSE 8080', 'ENTRYPOINT ["/opt/jboss/run-java.sh"]'][i % 8],
    })),
    tags: [r.name, `${repo}:latest`].filter((x, i, a) => a.indexOf(x) === i),
    digest: `sha256:${(h * 97).toString(16).padEnd(16, '0')}…`,
    usedBy: resourcesOf(r.connId, 'containers').filter(c => c.sub === r.name || r.name.startsWith(c.sub)),
    arch: h % 5 === 0 ? 'arm64' : 'amd64',
  };
}

export function kubeConditions(status: string): [string, string, string][] {
  const ok = status === 'running' || status === 'ready';
  return [
    ['Available', ok ? 'True' : 'False', ok ? 'MinimumReplicasAvailable' : 'MinimumReplicasUnavailable'],
    ['Progressing', 'True', 'NewReplicaSetAvailable'],
    ['Ready', ok ? 'True' : 'False', ok ? '' : 'ContainersNotReady'],
  ];
}

export function kubeEvents(r: LabResource): [string, string, string, string][] {
  const degraded = r.status === 'degraded';
  return [
    ['Normal', 'Scheduled', `Successfully assigned ${r.name} to ${r.connId}-worker-1`, '3m'],
    ['Normal', 'Pulled', 'Container image already present on machine', '3m'],
    ['Normal', 'Started', 'Started container app', '3m'],
    ...(degraded ? ([['Warning', 'BackOff', 'Back-off restarting failed container app', '40s']] as [string, string, string, string][]) : []),
  ];
}

export function relatedPods(r: LabResource): LabResource[] {
  return resourcesOf(r.connId, 'kpods').filter(p => p.name.startsWith(`${r.name}-`));
}

export function inspectText(r: LabResource, sectionLabel: string): string {
  const h = hash(r.name);
  if (isKube(r.sectionId)) {
    const kind = sectionLabel.replace(/s$/, '').replace(/ /g, '');
    return [
      `apiVersion: ${r.sectionId === 'kpods' || r.sectionId === 'services' ? 'v1' : 'apps/v1'}`,
      `kind: ${r.sectionId === 'kpods' ? 'Pod' : kind}`,
      'metadata:',
      `  name: ${r.name}`,
      `  namespace: ${r.connId.includes('ocp') ? 'checkout' : 'default'}`,
      `  uid: ${(h * 7919).toString(16)}-${(h % 9999).toString(16)}-4c1e-9a2b-${(h * 31).toString(16).slice(0, 12)}`,
      '  labels:',
      `    app: ${r.name.split('-')[0]}`,
      'spec:',
      ...(r.sectionId === 'deployments' ? ['  replicas: ' + ((h % 4) + 1), '  selector:', '    matchLabels:', `      app: ${r.name}`] : []),
      '  containers:',
      `    - name: app`,
      `      image: quay.io/acme/${r.name.split('-')[0]}:2.3`,
      '      ports:',
      '        - containerPort: 8080',
      'status:',
      `  phase: ${r.status === 'running' ? 'Running' : r.status === 'degraded' ? 'CrashLoopBackOff' : 'Succeeded'}`,
    ].join('\n');
  }
  return JSON.stringify(
    {
      Id: `${(h * 2654435761).toString(16)}${(h * 97).toString(16)}`.padEnd(64, '0').slice(0, 64),
      Name: r.name,
      Created: '2026-10-09T07:12:01.512Z',
      State: { Status: r.status, Running: r.status === 'running', Pid: r.status === 'running' ? 1000 + (h % 9000) : 0, StartedAt: '2026-10-09T07:12:02Z' },
      Config: { Image: r.sub, Labels: { 'io.podman.compose.project': r.group ?? null } },
      HostConfig: { RestartPolicy: { Name: 'no' }, NetworkMode: 'bridge' },
    },
    null,
    2,
  );
}
