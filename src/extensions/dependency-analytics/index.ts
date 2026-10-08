/**
 * redhat.dependency-analytics – RHDA image report (P5): application
 * dependencies (pypi, npm, maven) from the syft SBOM, Trustify/OSV source,
 * with Red Hat trusted-content remediations.
 */
import type { CheckerDef, Finding, MockExtension } from '#lib/ext/types.ts';
import { type ContainerImage, toast } from '#lib/world.svelte.ts';

const ORDERS: Finding[] = [
  { id: 'CVE-2026-11203', cve: 'CVE-2026-11203', title: 'express: open redirect in res.location (CVSS 9.1)', severity: 'critical', package: 'pkg:npm/express', installed: '4.18.2', fixedIn: '4.21.3' },
  { id: 'CVE-2024-56201', cve: 'CVE-2024-56201', title: 'Jinja sandbox breakout via malicious filenames', severity: 'high', package: 'pkg:pypi/jinja2', installed: '3.1.3', fixedIn: '3.1.5', advisoryUrl: 'https://osv.dev/vulnerability/GHSA-gmj6-6f8f-6699' },
  { id: 'CVE-2025-24970', cve: 'CVE-2025-24970', title: 'netty SslHandler native crash · trusted content 4.1.118.Final-redhat-00001', severity: 'high', package: 'pkg:maven/io.netty/netty-codec-http', installed: '4.1.100.Final', fixedIn: '4.1.118.Final-redhat-00001' },
  { id: 'CVE-2024-35195', cve: 'CVE-2024-35195', title: 'requests: Session verify=False persists', severity: 'medium', package: 'pkg:pypi/requests', installed: '2.31.0', fixedIn: '2.32.0' },
  { id: 'CVE-2025-50181', cve: 'CVE-2025-50181', title: 'urllib3: redirects not disabled when retries disabled', severity: 'medium', package: 'pkg:pypi/urllib3', installed: '1.26.18', fixedIn: '2.5.0' },
];

const applies = (i: ContainerImage): boolean => i.name.startsWith('quay.io/acme/');

const checker: CheckerDef = {
  id: 'rhda',
  label: 'Red Hat Dependency Analytics',
  description: 'Application dependencies from the image SBOM (syft), vulnerabilities from Trustify (OSV).',
  durationMs: 2200,
  when: applies,
  check: i => (i.name.endsWith('orders-api') && !i.base?.startsWith('hummingbird') ? ORDERS.map(f => ({ ...f, actions: f.id === 'CVE-2025-24970' ? [{ label: 'Copy Maven coordinates', run: (): void => toast({ type: 'success', title: 'Copied', body: 'io.netty:netty-codec-http:4.1.118.Final-redhat-00001' }) }] : undefined })) : []),
  summary: (_i, f) => (f.length ? `${f.length} vulnerable dependencies (${f.filter(x => x.severity === 'critical').length} critical) · 214 scanned (31 direct, 183 transitive)` : '214 dependencies scanned · no known vulnerabilities'),
};

const extension: MockExtension = {
  id: 'redhat.dependency-analytics',
  displayName: 'Red Hat Dependency Analytics',
  publisher: 'redhat',
  description: 'Application-dependency vulnerability report (npm, Maven, pip, Go) for images, with Red Hat trusted-content remediations.',
  version: '0.1.0',
  icon: 'icons/redhat.dependency-analytics.png',
  tags: ['rhel', 'platform'],
  pApis: ['P5', 'P15'],
  contributes: { imageCheckers: [checker] },
};

export default extension;
