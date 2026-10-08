/**
 * Small helpers for extension seeds (realistic ids, containers, images).
 */
import type { Container, ContainerImage, ContainerState, Port } from '#lib/world.svelte.ts';
import { ago, hexId, MB } from '#lib/world.svelte.ts';

export interface ContainerSeed {
  name: string;
  image: string;
  state?: ContainerState;
  ports?: (number | [number, number])[];
  labels?: Record<string, string>;
  command?: string;
  env?: string[];
  podId?: string;
  /** Age in hours. */
  ageH?: number;
  /** Uptime in minutes when running. */
  upM?: number;
  logs?: string[];
}

export function mkContainer(engineId: string, s: ContainerSeed): Container {
  const state = s.state ?? 'RUNNING';
  const ports: Port[] = (s.ports ?? []).map(p => (Array.isArray(p) ? { host: p[0], container: p[1] } : { host: p, container: p }));
  return {
    id: hexId(64),
    name: s.name,
    image: s.image,
    engineId,
    state,
    created: ago({ h: s.ageH ?? 30 }),
    startedAt: state === 'RUNNING' ? ago({ m: s.upM ?? 95 }) : undefined,
    ports,
    labels: s.labels ?? {},
    command: s.command,
    env: s.env,
    podId: s.podId,
    logs: s.logs,
  };
}

export interface ImageSeed {
  name: string;
  tag: string;
  sizeMB: number;
  ageD: number;
  base?: string;
  labels?: Record<string, string>;
  packages?: { name: string; version: string }[];
}

export function mkImage(engineId: string, s: ImageSeed): ContainerImage {
  return {
    id: hexId(64),
    name: s.name,
    tag: s.tag,
    engineId,
    size: Math.round(s.sizeMB * MB),
    created: ago({ d: s.ageD }),
    digest: `sha256:${hexId(64)}`,
    base: s.base,
    labels: s.labels,
    packages: s.packages,
    os: 'linux',
    arch: 'amd64',
  };
}
