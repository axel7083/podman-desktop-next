/**
 * Small helpers for extension seeds (realistic ids, containers, images).
 */
import type { Container, ContainerImage, ContainerState, Port } from '#lib/world.svelte.ts';
import { ago, MB, world } from '#lib/world.svelte.ts';

/** FNV-1a 32-bit hash of a string. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic, random-looking hex id derived from a seed string (same in every run/theme). */
export function seededHexId(seed: string, length = 64): string {
  let out = '';
  for (let i = 0; out.length < length; i++) out += fnv1a(`${seed}#${i}`).toString(16).padStart(8, '0');
  return out.slice(0, length);
}

/** Seeded id that is still unique in the current world (rebuilds of the same name:tag get a salted id). */
function uniqueId(seed: string, taken: (id: string) => boolean): string {
  let id = seededHexId(seed);
  for (let n = 1; taken(id); n++) id = seededHexId(`${seed}~${n}`);
  return id;
}

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
    id: uniqueId(`container:${engineId}/${s.name}`, id => world.containers.some(c => c.id === id)),
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
  const id = uniqueId(`image:${engineId}/${s.name}:${s.tag}`, x => world.images.some(i => i.id === x));
  return {
    id,
    name: s.name,
    tag: s.tag,
    engineId,
    size: Math.round(s.sizeMB * MB),
    created: ago({ d: s.ageD }),
    digest: `sha256:${seededHexId(`digest:${id}`)}`,
    base: s.base,
    labels: s.labels,
    packages: s.packages,
    os: 'linux',
    arch: 'amd64',
  };
}
