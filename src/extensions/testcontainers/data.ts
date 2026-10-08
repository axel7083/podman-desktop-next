/**
 * Testcontainers marker labels (DockerClientFactory.markerLabels()) and
 * ~/.testcontainers.properties keys.
 */
import { mkContainer } from '#lib/ext/helpers.ts';
import type { Container } from '#lib/world.svelte.ts';
import { world } from '#lib/world.svelte.ts';

export const TC_EXT = 'podman-desktop.testcontainers';
export const ENGINE = 'podman-machine-default';
export const SESSION = 'org.testcontainers.sessionId';
export const RYUK = 'org.testcontainers.ryuk';

export interface SessionMeta {
  sessionId: string;
  lang: string;
  version: string;
  project: string;
  command: string;
}

export const SESSIONS: SessionMeta[] = [
  { sessionId: 'e4b19f27-5c3a-4d0e-9a61-2f8d7c3b1a90', lang: 'java', version: '2.0.5', project: '~/dev/acme-orders', command: './mvnw verify' },
  { sessionId: '7c1d0e55-03aa-4b2e-8f19-6e4a2b9d0c31', lang: 'java', version: '2.0.5', project: '~/dev/inventory-service', command: './mvnw verify' },
  { sessionId: 'a3f0c9e2-1b44-4c8e-b7a1-90d2e6f3c5aa', lang: 'java', version: '2.0.5', project: '~/dev/acme-orders', command: 'quarkus dev' },
];

export function sessionMeta(id: string): SessionMeta | undefined {
  return SESSIONS.find(s => s.sessionId === id);
}

export function tcContainer(sessionId: string | undefined, seed: { name: string; image: string; state?: Container['state']; ports?: (number | [number, number])[]; ryuk?: boolean; hash?: string; upM?: number; ageH?: number }): Container {
  return mkContainer(ENGINE, {
    name: seed.name,
    image: seed.image,
    state: seed.state,
    ports: seed.ports,
    upM: seed.upM ?? 6,
    ageH: seed.ageH ?? 0,
    labels: {
      'org.testcontainers': 'true',
      'org.testcontainers.lang': 'java',
      'org.testcontainers.version': '2.0.5',
      ...(sessionId ? { [SESSION]: sessionId } : {}),
      ...(seed.ryuk ? { [RYUK]: 'true' } : {}),
      ...(seed.hash ? { 'org.testcontainers.hash': seed.hash, 'org.testcontainers.copied_files.hash': '0' } : {}),
    },
  });
}

export interface SessionView {
  sessionId: string;
  meta?: SessionMeta;
  containers: Container[];
  ryukAlive: boolean;
  /** `ended`: a Quarkus Dev Services session whose containers are all stopped. */
  state: 'active' | 'leaked' | 'ended';
}

/** Sessions currently visible on the engine (Quarkus Dev Services sessions included). */
export function sessions(): SessionView[] {
  const byId = new Map<string, Container[]>();
  for (const c of world.containers) {
    const id = c.labels[SESSION];
    if (!id) continue;
    byId.set(id, [...(byId.get(id) ?? []), c]);
  }
  return [...byId.entries()].map(([sessionId, containers]) => {
    const ryuk = containers.find(c => c.labels[RYUK]);
    const quarkus = containers.some(c => c.labels['io.quarkus.devservice']);
    // Dev Services sessions have no Ryuk container: Quarkus owns them, so
    // their state follows the containers (all stopped → ended, not leaked).
    const quarkusRunning = quarkus && containers.some(c => c.state === 'RUNNING');
    const ryukAlive = ryuk?.state === 'RUNNING' || quarkusRunning;
    const state: SessionView['state'] = ryukAlive ? 'active' : quarkus ? 'ended' : 'leaked';
    return { sessionId, meta: sessionMeta(sessionId), containers, ryukAlive, state };
  });
}

export function reusable(): Container[] {
  return world.containers.filter(c => c.labels['org.testcontainers.hash']);
}

export interface EnvCheck {
  id: string;
  label: string;
  detail: string;
  ok: boolean;
  fix?: string;
}

export function envChecks(): EnvCheck[] {
  const state = (world.ext[TC_EXT]?.fixed as string[] | undefined) ?? [];
  return [
    { id: 'socket', label: 'Podman API socket is active', detail: 'systemctl --user is-active podman.socket → active · _ping → OK (API 5.7.0)', ok: true },
    { id: 'docker-host', label: 'DOCKER_HOST points to Podman', detail: 'DOCKER_HOST=unix:///run/user/1000/podman/podman.sock', ok: true },
    {
      id: 'override',
      label: 'Ryuk can mount the Podman socket',
      detail: state.includes('override') ? 'TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/run/user/1000/podman/podman.sock' : 'TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE is not set: Ryuk mounts /var/run/docker.sock, which does not exist on this host.',
      ok: state.includes('override'),
      fix: 'Set TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE',
    },
    { id: 'reuse', label: 'Container reuse enabled', detail: 'testcontainers.reuse.enable=true in ~/.testcontainers.properties', ok: true },
  ];
}

export function markFixed(id: string): void {
  world.ext[TC_EXT] ??= {};
  const store = world.ext[TC_EXT];
  store.fixed = [...((store.fixed as string[] | undefined) ?? []), id];
}
