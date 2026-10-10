/**
 * Layers explorer (podman-desktop.layers-explorer) mock data: per image, the
 * layers (size, created-by, digest) and the files each layer adds, modifies
 * or removes relative to the previous one. Deterministic per image name.
 */
import type { LabResource } from '../data.ts';
import { hash, imageInfo } from './details.ts';

export type Change = 'added' | 'modified' | 'removed';

export interface LayerFile {
  path: string;
  size: number;
  perm: string;
  change: Change;
  link?: string;
}

export interface Layer {
  index: number;
  id: string;
  digest: string;
  size: number;
  cmd: string;
  files: LayerFile[];
  added: number;
  modified: number;
  removed: number;
}

const BASE: [string, number, string?][] = [
  ['bin', 0, 'usr/bin'],
  ['lib64', 0, 'usr/lib64'],
  ['etc/os-release', 512],
  ['etc/passwd', 1210],
  ['etc/group', 640],
  ['etc/hosts', 158],
  ['etc/pki/tls/cert.pem', 221_000],
  ['etc/yum.repos.d/ubi.repo', 1840],
  ['usr/bin/bash', 1_390_000],
  ['usr/bin/ls', 141_000],
  ['usr/bin/cat', 37_000],
  ['usr/bin/sh', 0, 'bash'],
  ['usr/bin/microdnf', 78_000],
  ['usr/lib64/libc.so.6', 2_390_000],
  ['usr/lib64/libssl.so.3', 690_000],
  ['usr/lib64/libcrypto.so.3', 4_800_000],
  ['usr/lib64/libz.so.1', 0, 'libz.so.1.3.1'],
  ['usr/lib64/libz.so.1.3.1', 98_000],
  ['usr/share/zoneinfo/UTC', 114],
  ['var/lib/rpm/rpmdb.sqlite', 6_400_000],
  ['var/cache/dnf/metadata.solv', 3_100_000],
];

const BY_CMD: Record<string, [string, number, Change, string?][]> = {
  RUN: [
    ['usr/lib/jvm/java-21/bin/java', 12_000, 'added'],
    ['usr/lib/jvm/java-21/lib/modules', 138_000_000, 'added'],
    ['usr/lib/jvm/java-21/lib/libjvm.so', 22_000_000, 'added'],
    ['usr/bin/java', 0, 'added', '/usr/lib/jvm/java-21/bin/java'],
    ['var/lib/rpm/rpmdb.sqlite', 7_100_000, 'modified'],
    ['var/cache/dnf/metadata.solv', 0, 'removed'],
    ['etc/alternatives/java', 0, 'added', '/usr/lib/jvm/java-21/bin/java'],
  ],
  COPY: [
    ['deployments/lib/quarkus-core-3.15.jar', 1_900_000, 'added'],
    ['deployments/lib/vertx-core-4.5.jar', 1_600_000, 'added'],
    ['deployments/lib/jackson-databind-2.17.jar', 1_700_000, 'added'],
    ['deployments/app.jar', 420_000, 'added'],
    ['deployments/config/application.properties', 2_100, 'added'],
  ],
  USER: [['etc/passwd', 1_260, 'modified']],
  ENV: [],
  EXPOSE: [],
  ENTRYPOINT: [['opt/jboss/run-java.sh', 18_000, 'added']],
};

export function fmtSize(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${Math.round(b / 1e3)} kB`;
  return `${b} B`;
}

export function layersOf(r: LabResource): Layer[] {
  const h = hash(r.name);
  return imageInfo(r).layers.map((l, i) => {
    const verb = l.cmd.split(' ')[0];
    let files: LayerFile[];
    if (i === 0)
      files = BASE.map(([path, size, link]) => ({ path, size: link ? 0 : size, perm: link ? 'lrwxrwxrwx' : path.startsWith('usr/bin') ? '-rwxr-xr-x' : '-rw-r--r--', change: 'added', link }));
    else
      files = (BY_CMD[verb] ?? []).map(([path, size, change, link], j) => ({
        // Second COPY / RUN layers get distinct paths so every layer has its own content.
        path: i > 3 && change === 'added' && !link ? path.replace(/(\.[a-z]+)$/, `-${i}$1`) : path,
        size: change === 'removed' || link ? 0 : size + ((h >>> (i + j)) % 9000),
        perm: link ? 'lrwxrwxrwx' : /bin\/|\.sh$/.test(path) ? '-rwxr-xr-x' : '-rw-r--r--',
        change,
        link,
      }));
    const size = files.reduce((n, f) => n + f.size, 0);
    return {
      index: i,
      id: l.id,
      digest: `sha256:${l.id}`,
      size,
      cmd: i === 0 ? `/bin/sh -c #(nop) ADD file:${l.id.slice(0, 8)} in /` : `/bin/sh -c ${l.cmd}`,
      files,
      added: files.filter(f => f.change === 'added').length,
      modified: files.filter(f => f.change === 'modified').length,
      removed: files.filter(f => f.change === 'removed').length,
    };
  });
}

/** Filesystem after `upto` (inclusive); each entry carries the change made by layer `upto` (or undefined). */
export function filesystemAt(layers: Layer[], upto: number): (LayerFile & { mark?: Change })[] {
  const fs = new Map<string, LayerFile & { mark?: Change }>();
  for (const l of layers.slice(0, upto + 1)) {
    const last = l.index === upto;
    for (const f of l.files) {
      if (f.change === 'removed') {
        const prev = fs.get(f.path);
        if (last && prev) fs.set(f.path, { ...prev, mark: 'removed' });
        else fs.delete(f.path);
      } else fs.set(f.path, { ...f, mark: last ? f.change : undefined });
    }
  }
  return [...fs.values()];
}

/** Bytes shipped in a layer and overwritten or removed by a later one. */
export function wastedBytes(layers: Layer[]): number {
  const owner = new Map<string, number>();
  let waste = 0;
  for (const l of layers)
    for (const f of l.files) {
      const prev = owner.get(f.path);
      if (prev !== undefined && f.change !== 'added') waste += prev;
      owner.set(f.path, f.change === 'removed' ? 0 : f.size);
    }
  return waste;
}
