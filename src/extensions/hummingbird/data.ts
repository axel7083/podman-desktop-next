/** Hummingbird (Red Hat Hardened Images) catalog, shaped like ImageSummary of api-hummingbird.hummingbird-project.io. */
export interface HardenedImage {
  name: string;
  description: string;
  application_category: string;
  architectures: string[];
  latest_tag: string;
  vulnerabilities: { critical: number; high: number; medium: number; low: number; total: number };
  sizeMB: number;
}

export const CATALOG: HardenedImage[] = [
  { name: 'python', description: 'Minimal Python runtime', application_category: 'language-runtime', architectures: ['amd64', 'arm64'], latest_tag: '3.12', vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0, total: 0 }, sizeMB: 131 },
  { name: 'nodejs', description: 'Minimal Node.js runtime', application_category: 'language-runtime', architectures: ['amd64', 'arm64'], latest_tag: '22', vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0, total: 0 }, sizeMB: 116 },
  { name: 'openjdk', description: 'OpenJDK runtime', application_category: 'language-runtime', architectures: ['amd64', 'arm64'], latest_tag: '21', vulnerabilities: { critical: 0, high: 0, medium: 1, low: 0, total: 3 }, sizeMB: 181 },
  { name: 'nginx', description: 'Hardened NGINX web server', application_category: 'web-server', architectures: ['amd64', 'arm64'], latest_tag: '1.28', vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0, total: 0 }, sizeMB: 37 },
  { name: 'postgresql', description: 'Hardened PostgreSQL', application_category: 'database', architectures: ['amd64'], latest_tag: '17', vulnerabilities: { critical: 0, high: 0, medium: 0, low: 1, total: 1 }, sizeMB: 145 },
  { name: 'go', description: 'Go toolchain builder', application_category: 'builder', architectures: ['amd64', 'arm64'], latest_tag: '1.25', vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0, total: 0 }, sizeMB: 271 },
  { name: 'static', description: 'Minimal base for static binaries', application_category: 'base', architectures: ['amd64', 'arm64'], latest_tag: 'latest', vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0, total: 0 }, sizeMB: 3 },
];

/** Local base → hardened alternative. */
export function alternativeFor(base: string | undefined, name: string): { image: HardenedImage; localCves: number } | undefined {
  const b = base ?? '';
  const pick = (n: string): HardenedImage | undefined => CATALOG.find(c => c.name === n);
  if (b.includes('python')) return { image: pick('python')!, localCves: 27 };
  if (b.includes('nodejs')) return { image: pick('nodejs')!, localCves: 41 };
  if (name.endsWith('/nginx')) return { image: pick('nginx')!, localCves: 9 };
  if (name.endsWith('/postgres')) return { image: pick('postgresql')!, localCves: 14 };
  return undefined;
}
