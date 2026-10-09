/**
 * P13 Hummingbird (Red Hat Hardened Images) dataset, shaped like the real
 * extension (redhat-developer/podman-desktop-hummingbird-ext): `ImageSummary`
 * of the catalog API (name, description, category, architectures, tags) and
 * `LocalImageAlternative` (local image → hardened alternative, CVE / size
 * reduction). Pure data: no imports from lab state (used by trees.ts).
 */

export interface HardenedImage {
  /** Repository name under `quay.io/hummingbird/`. */
  name: string;
  description: string;
  category: 'Runtime' | 'Web & database' | 'Base & builder';
  /** Latest tag first. */
  tags: string[];
  /** Streams / flavours (`-builder`, `-fips`…). */
  variants: string[];
  arch: string[];
  sizeMB: number;
  updated: string;
}

const H = (name: string, description: string, category: HardenedImage['category'], tags: string[], variants: string[], sizeMB: number, updated: string, arch = ['amd64', 'arm64']): HardenedImage => ({
  name,
  description,
  category,
  tags,
  variants,
  arch,
  sizeMB,
  updated,
});

export const HB_CATALOG: HardenedImage[] = [
  H('python', 'Minimal Python runtime', 'Runtime', ['3.12', '3.13', '3.11'], ['default', 'builder', 'fips'], 131, '2 days ago'),
  H('nodejs', 'Minimal Node.js runtime', 'Runtime', ['22', '24', '20'], ['default', 'builder'], 116, '1 day ago'),
  H('openjdk', 'OpenJDK runtime (Temurin-compatible)', 'Runtime', ['21', '25', '17'], ['default', 'builder', 'jre'], 181, '3 days ago'),
  H('go', 'Go toolchain builder', 'Base & builder', ['1.25', '1.24'], ['builder'], 271, '5 days ago'),
  H('rust', 'Rust toolchain builder', 'Base & builder', ['1.90', '1.89'], ['builder'], 512, '1 week ago'),
  H('dotnet-runtime', '.NET runtime', 'Runtime', ['9.0', '8.0'], ['default', 'aspnet'], 98, '4 days ago'),
  H('nginx', 'Hardened NGINX web server', 'Web & database', ['1.28', '1.26'], ['default', 'fips'], 37, '1 day ago'),
  H('httpd', 'Hardened Apache HTTP Server', 'Web & database', ['2.4'], ['default'], 52, '6 days ago'),
  H('postgresql', 'Hardened PostgreSQL', 'Web & database', ['17', '16'], ['default'], 145, '2 days ago', ['amd64']),
  H('valkey', 'Hardened Valkey key-value store', 'Web & database', ['8.1', '8.0'], ['default'], 29, '3 days ago'),
  H('core-runtime', 'Minimal glibc base (no shell, no package manager)', 'Base & builder', ['latest'], ['default', 'fips'], 9, '1 day ago'),
  H('static', 'Minimal base for static binaries', 'Base & builder', ['latest'], ['default'], 3, '1 day ago'),
  H('git', 'Git client for CI steps', 'Base & builder', ['2.51'], ['default'], 41, '2 weeks ago'),
];

export function hbImage(name: string | undefined): HardenedImage | undefined {
  return HB_CATALOG.find(h => h.name === name);
}

export const hbRef = (h: HardenedImage, tag = h.tags[0]): string => `quay.io/hummingbird/${h.name}:${tag}`;

export interface HbAlternative {
  /** Local image (repo:tag) on podman-machine-default. */
  local: string;
  /** Base image of the local image. */
  base: string;
  /** Catalog image name. */
  hb: string;
  cves: { critical: number; high: number; medium: number; low: number };
  sizeMB: number;
  packages: number;
}

const A = (local: string, base: string, hb: string, cves: [number, number, number, number], sizeMB: number, packages: number): HbAlternative => ({
  local,
  base,
  hb,
  cves: { critical: cves[0], high: cves[1], medium: cves[2], low: cves[3] },
  sizeMB,
  packages,
});

/** Local images with a hardened alternative (the extension's Alternatives page). */
export const HB_ALTS: HbAlternative[] = [
  A('quay.io/acme/orders-api:1.4', 'registry.access.redhat.com/ubi9/openjdk-21-runtime', 'openjdk', [0, 4, 15, 12], 412, 238),
  A('quay.io/acme/orders-ui:1.4', 'registry.access.redhat.com/ubi9/nodejs-22', 'nodejs', [1, 7, 19, 14], 486, 311),
  A('registry.access.redhat.com/ubi9/python-312:latest', 'registry.access.redhat.com/ubi9/ubi', 'python', [0, 3, 11, 9], 389, 264),
  A('docker.io/library/python:3.12', 'debian:bookworm', 'python', [2, 18, 47, 45], 1020, 431),
  A('registry.redhat.io/ubi10/nginx-126:latest', 'registry.redhat.io/ubi10/ubi', 'nginx', [0, 1, 4, 4], 214, 142),
  A('registry.redhat.io/rhel10/postgresql-16:latest', 'registry.redhat.io/rhel10/rhel', 'postgresql', [0, 2, 6, 6], 356, 187),
  A('docker.io/library/postgres:17', 'debian:bookworm-slim', 'postgresql', [1, 6, 16, 15], 438, 152),
  A('docker.io/valkey/valkey:8', 'debian:bookworm-slim', 'valkey', [0, 3, 5, 4], 118, 96),
];

export function altFor(local: string | undefined): HbAlternative | undefined {
  return HB_ALTS.find(a => a.local === local);
}

export const cveTotal = (a: HbAlternative): number => a.cves.critical + a.cves.high + a.cves.medium + a.cves.low;

/** Size of a size in MB, PD style. */
export const mb = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(2)} GB` : `${n} MB`);

/** Connection the Hummingbird tree is contributed to (alternatives are computed on its images). */
export const HB_CONN = 'podman-machine-default';

/** Tree node ids (see `trees.ts` withIds): root / Catalog / Alternatives children. */
export const hbNodeId = (connId: string, ...path: string[]): string => [`hummingbird@${connId}`, ...path].join('/');
