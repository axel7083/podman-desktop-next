/**
 * redhat.security-data-checker – Red Hat Security Data (CSAF/VEX) image
 * checker (P5): matches the image RPM database against Red Hat's CVE pages
 * (`/hydra/rest/securitydata/cve/{CVE}.json`, `package_state[].fix_state`).
 */
import type { CheckerDef, Finding, MockExtension } from '#lib/ext/types.ts';
import type { ContainerImage } from '#lib/world.svelte.ts';

const ref = (i: ContainerImage): string => `${i.name}:${i.tag}`;
const isRedHat = (i: ContainerImage): boolean => /^(ubi|rhel|hummingbird)/.test(i.base ?? '') || i.labels?.vendor === 'Red Hat, Inc.';
const RHSA = (id: string): string => `https://access.redhat.com/errata/${id}`;

/** fix_state → Finding.vexStatus */
const ORDERS: Finding[] = [
  { id: 'CVE-2026-0471', cve: 'CVE-2026-0471', title: 'glibc: buffer overflow in getaddrinfo (CVSS 9.8)', severity: 'critical', package: 'glibc', installed: '2.34-168.el9_6.14', fixedIn: '2.34-168.el9_6.23', vexStatus: 'affected', advisoryUrl: RHSA('RHSA-2026:1188') },
  { id: 'CVE-2026-31480', cve: 'CVE-2026-31480', title: 'openssl: X.509 policy check bypass (RHSA-2026:7712)', severity: 'high', package: 'openssl-libs', installed: '3.2.2-6.el9_5.1', fixedIn: '3.5.1-4.el9_7', vexStatus: 'affected', advisoryUrl: RHSA('RHSA-2026:7712') },
  { id: 'CVE-2026-22014', cve: 'CVE-2026-22014', title: 'python: tarfile path traversal (RHSA-2026:5120)', severity: 'medium', package: 'python3.12', installed: '3.12.9-1.el9', fixedIn: '3.12.11-2.el9_7', vexStatus: 'affected', advisoryUrl: RHSA('RHSA-2026:5120') },
  { id: 'CVE-2025-6020', cve: 'CVE-2025-6020', title: 'pam: pam_namespace path traversal – fix deferred', severity: 'high', package: 'pam', installed: '1.5.1-23.el9', vexStatus: 'fix_deferred', advisoryUrl: 'https://access.redhat.com/security/cve/CVE-2025-6020' },
  { id: 'CVE-2026-1937', cve: 'CVE-2026-1937', title: 'curl: cookie leak on redirect', severity: 'medium', package: 'curl-minimal', installed: '7.76.1-31.el9', vexStatus: 'under_investigation' },
  { id: 'CVE-2025-23395', cve: 'CVE-2025-23395', title: 'expat: stack overflow in XML_ResumeParser', severity: 'medium', package: 'expat', installed: '2.5.0-3.el9_5', fixedIn: '2.5.0-5.el9_7', vexStatus: 'affected', advisoryUrl: RHSA('RHSA-2026:6230') },
  { id: 'CVE-2024-6387', cve: 'CVE-2024-6387', title: 'openssh: regreSSHion – openssh-server not installed in UBI', severity: 'high', package: 'openssh', installed: '8.7p1-38.el9', vexStatus: 'not_affected' },
  { id: 'CVE-2025-4802', cve: 'CVE-2025-4802', title: 'systemd: not exploitable in container context', severity: 'low', package: 'systemd-libs', installed: '252-51.el9', vexStatus: 'will_not_fix' },
];

const LEGACY: Finding[] = [
  { id: 'CVE-2025-27210', cve: 'CVE-2025-27210', title: 'nodejs: path traversal on Windows device names – out of support', severity: 'high', package: 'nodejs', installed: '18.20.4-1.module+el8.10.0', vexStatus: 'out_of_support_scope' },
  { id: 'CVE-2026-0471', cve: 'CVE-2026-0471', title: 'glibc: buffer overflow in getaddrinfo', severity: 'critical', package: 'glibc', installed: '2.28-251.el8_10.5', fixedIn: '2.28-251.el8_10.22', vexStatus: 'affected', advisoryUrl: RHSA('RHSA-2026:1190') },
];

const RAW: Record<string, number> = { 'quay.io/acme/orders-api:2.3': 27, 'quay.io/acme/legacy-portal:1.9': 41 };

function check(i: ContainerImage): Finding[] {
  if (ref(i) === 'quay.io/acme/orders-api:2.3' || ref(i) === 'quay.io/acme/orders-api:2.4') return ORDERS;
  if (ref(i) === 'quay.io/acme/legacy-portal:1.9') return LEGACY;
  if (i.base?.startsWith('hummingbird')) return [];
  return [{ id: 'CVE-2026-0471', cve: 'CVE-2026-0471', title: 'glibc: fixed in this image', severity: 'info', package: 'glibc', installed: '2.34-168.el9_6.23', vexStatus: 'fixed', advisoryUrl: RHSA('RHSA-2026:1188') }];
}

const actionable = (f: Finding): boolean => ['affected', 'under_investigation', 'fix_deferred'].includes(f.vexStatus ?? '');

const checker: CheckerDef = {
  id: 'vex',
  label: 'Red Hat Security Data (VEX)',
  description: 'Matches the RPM database against Red Hat CSAF/VEX: "Not affected" and "Will not fix" are filtered out of the actionable list.',
  durationMs: 1400,
  when: isRedHat,
  check,
  summary: (i, f) => {
    const n = f.filter(actionable).length;
    const raw = RAW[ref(i)];
    return raw ? `${raw} scanner matches → ${n} actionable after Red Hat VEX` : n ? `${n} actionable` : 'No unfixed Red Hat CVEs';
  },
};

const extension: MockExtension = {
  id: 'redhat.security-data-checker',
  displayName: 'Red Hat Security Data (VEX)',
  publisher: 'redhat',
  description: "Matches an image's RPM database against Red Hat's authoritative CVE/VEX data (Not affected, Fixed in RHSA-…).",
  version: '0.1.0',
  icon: 'icons/redhat.security-data-checker.png',
  tags: ['rhel', 'platform'],
  pApis: ['P5', 'P14'],
  contributes: { imageCheckers: [checker] },
};

export default extension;
