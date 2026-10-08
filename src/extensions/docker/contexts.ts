/**
 * Docker contexts (`docker context ls --format json` shape, sample from
 * docs/research/podman-desktop.docker-contexts.md). Each live context maps to
 * a connection; disguised Podman sockets are skipped (shown as the Podman
 * connection instead); remote SSH contexts connect over SSH (preview).
 */
import { toast, world } from '#lib/world.svelte.ts';

export const DOCKER_ID = 'podman-desktop.docker';

export interface DockerContext {
  Name: string;
  Description: string;
  DockerEndpoint: string;
  /** Connection id when the context is shown as a connection. */
  connectionId?: string;
  /** Why the context is not a connection of its own (or a caveat). */
  note?: string;
  skipped?: boolean;
}

export const WINDOWS_CONTEXTS: DockerContext[] = [
  { Name: 'default', Description: 'Current DOCKER_HOST based configuration', DockerEndpoint: 'npipe:////./pipe/docker_engine', connectionId: 'docker-default' },
  { Name: 'desktop-linux', Description: 'Docker Desktop', DockerEndpoint: 'npipe:////./pipe/dockerDesktopLinuxEngine', connectionId: 'docker-desktop' },
  {
    Name: 'podman',
    Description: 'Podman machine podman-machine-default',
    DockerEndpoint: 'npipe:////./pipe/podman-machine-default',
    connectionId: 'podman-machine-default',
    skipped: true,
    note: 'Podman socket in disguise — shown as podman-machine-default',
  },
  { Name: 'rancher-desktop', Description: 'Rancher Desktop moby context', DockerEndpoint: 'npipe:////./pipe/docker_engine_rd', connectionId: 'docker-rancher' },
  {
    Name: 'prod-ssh',
    Description: 'Build host',
    DockerEndpoint: 'ssh://ops@build01.acme.internal',
    connectionId: 'docker-prod-ssh',
    note: 'Remote SSH context (preview): connects over SSH when started',
  },
];

export const UNIX_CONTEXTS: DockerContext[] = [
  { Name: 'desktop-linux', Description: 'Docker Desktop', DockerEndpoint: 'unix:///home/user/.docker/run/docker.sock', connectionId: 'docker-desktop' },
  {
    Name: 'podman',
    Description: 'Podman machine podman-machine-default',
    DockerEndpoint: 'unix:///run/user/1000/podman/podman-machine-default-api.sock',
    connectionId: 'podman-machine-default',
    skipped: true,
    note: 'Podman socket in disguise — shown as podman-machine-default',
  },
];

interface DockerStore {
  currentContext?: string;
  createdContexts?: DockerContext[];
}

function store(): DockerStore {
  return (world.ext[DOCKER_ID] ?? {}) as DockerStore;
}

/** Read-only (safe inside `$derived`, e.g. the connections function). */
export function currentContext(): string {
  return store().currentContext ?? 'desktop-linux';
}

export function contextsFor(windows: boolean): DockerContext[] {
  return [...(windows ? WINDOWS_CONTEXTS : UNIX_CONTEXTS), ...(store().createdContexts ?? [])];
}

function writable(): DockerStore {
  world.ext[DOCKER_ID] ??= {};
  return world.ext[DOCKER_ID] as DockerStore;
}

export function setCurrentContext(name: string): void {
  writable().currentContext = name;
}

/** `docker context create <machine> --docker host=<endpoint>` for a Podman machine. */
export function createPodmanContext(machine: string, endpoint: string): DockerContext {
  const s = writable();
  const ctx: DockerContext = {
    Name: machine,
    Description: `Podman machine ${machine} (created by Podman Desktop)`,
    DockerEndpoint: endpoint,
    connectionId: machine,
    skipped: true,
    note: `Podman socket — shown as ${machine}`,
  };
  s.createdContexts = [...(s.createdContexts ?? []).filter(c => c.Name !== machine), ctx];
  return ctx;
}

/** Context name of a connection (docker connection → its context; podman → machine name). */
export function contextNameOf(connId: string, windows: boolean): string | undefined {
  return contextsFor(windows).find(c => c.connectionId === connId && !c.skipped)?.Name;
}

/** "Make current Docker context" for a Docker or Podman connection. */
export function makeCurrent(conn: { id: string; name: string; endpoint: string; engineType?: string }, windows: boolean): void {
  let name = contextNameOf(conn.id, windows);
  let created = false;
  if (!name && conn.engineType === 'podman') {
    name = conn.name;
    if (!contextsFor(windows).some(c => c.Name === name)) {
      createPodmanContext(conn.name, conn.endpoint);
      created = true;
    }
  }
  name ??= conn.name;
  setCurrentContext(name);
  toast({
    type: 'success',
    title: `docker CLI now targets ${conn.name}`,
    body: `${created ? `docker context create ${name} --docker host=${conn.endpoint}\n` : ''}docker context use ${name}`,
  });
}
