/** Quay API (`/api/v1/repository`, tags, robots, manifest security) shaped data. */
import type { Finding } from '#lib/ext/types.ts';
import { type ContainerImage, extData, world } from '#lib/world.svelte.ts';

export const QUAY_ID = 'redhat.quay';

export const REPOSITORIES = [
  { namespace: 'acme', name: 'payments-api', is_public: false, state: 'NORMAL', last_modified: '2026-10-07T16:19:31Z', popularity: 42, tags: 18 },
  { namespace: 'acme', name: 'payments-edge', is_public: false, state: 'NORMAL', last_modified: '2026-10-06T08:00:00Z', popularity: 9, tags: 4 },
  { namespace: 'acme', name: 'payments-edge-disk', is_public: false, state: 'NORMAL', last_modified: '2026-10-08T07:20:00Z', popularity: 3, tags: 2 },
  { namespace: 'acme', name: 'ledger-worker', is_public: false, state: 'MIRROR', last_modified: '2026-09-30T08:00:00Z', popularity: 27, tags: 11 },
  { namespace: 'acme', name: 'ledger-api', is_public: false, state: 'NORMAL', last_modified: '2026-10-07T12:30:00Z', popularity: 19, tags: 9 },
];

export const ROBOTS = [
  { name: 'acme+ci_push', description: 'Tekton push', created: '2026-02-03', last_accessed: '2026-10-08T08:55:00Z', repositories: 5 },
  { name: 'acme+argocd_pull', description: 'GitOps pull', created: '2026-02-03', last_accessed: '2026-10-08T09:10:00Z', repositories: 5 },
];

/** Image ids pushed to quay.io (by digest) – per world. */
export function pushedDigests(): string[] {
  return extData<string[]>(QUAY_ID, 'pushed', []);
}

export function isPushed(image: ContainerImage): boolean {
  // read-only (safe inside templates/derived): never creates the store
  const pushed = (world.ext[QUAY_ID]?.pushed as string[] | undefined) ?? [];
  return !!image.digest && pushed.includes(image.digest);
}

/** Clair report (`manifest/{digest}/security?vulnerabilities=true`) → P5 findings. */
export function clairFindings(image: ContainerImage): Finding[] {
  if (!isPushed(image)) {
    return [{ id: 'not-scanned', ruleId: 'Not scanned', title: 'Not scanned yet: push the image to quay.io to get a Clair report (status: unsupported until pushed).', severity: 'info' }];
  }
  const ssl = image.packages?.find(p => p.name === 'openssl-libs')?.version ?? '';
  const out: Finding[] = [];
  if (ssl.endsWith('el9_5')) {
    out.push({ id: 'RHSA-2026:4412', title: 'RHSA-2026:4412 · openssl security update', cve: 'CVE-2026-31790', severity: 'high', package: 'openssl-libs', installed: ssl, fixedIn: '1:3.2.2-6.el9_6', vexStatus: 'affected', advisoryUrl: 'https://access.redhat.com/errata/RHSA-2026:4412' });
  }
  out.push(
    { id: 'CVE-2026-0915', title: 'glibc: stack overflow in getaddrinfo', cve: 'CVE-2026-0915', severity: 'medium', package: 'glibc', installed: '2.34-168.el9_6', fixedIn: '2.34-168.el9_6.4', vexStatus: 'affected', advisoryUrl: 'https://access.redhat.com/security/cve/CVE-2026-0915' },
    { id: 'CVE-2026-1299', title: 'python3: email header injection', cve: 'CVE-2026-1299', severity: 'medium', package: 'python3', installed: '3.9.21-2.el9', vexStatus: 'under_investigation', advisoryUrl: 'https://access.redhat.com/security/cve/CVE-2026-1299' },
    { id: 'CVE-2026-2241', title: 'curl: cookie leak on cross-origin redirect', cve: 'CVE-2026-2241', severity: 'low', package: 'curl-minimal', installed: '7.76.1-31.el9', fixedIn: '7.76.1-31.el9_6.1', vexStatus: 'affected', advisoryUrl: 'https://access.redhat.com/security/cve/CVE-2026-2241' },
  );
  return out;
}
