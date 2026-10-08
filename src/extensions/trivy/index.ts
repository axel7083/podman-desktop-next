/**
 * podman-desktop.trivy – digest-pinned Trivy v0.75.0 image checker (O8).
 * Refuses the compromised 0.69.4–0.69.6 releases (CVE-2026-33634).
 */
import type { Finding, MockExtension } from '#lib/ext/types.ts';
import type { ContainerImage } from '#lib/world.svelte.ts';

function scan(image: ContainerImage): Finding[] {
  const out: Finding[] = [];
  const rh = image.base?.startsWith('ubi');
  if (rh) {
    out.push(
      { id: 'tv-1', cve: 'CVE-2026-31790', title: 'openssl: X.509 policy bypass', severity: image.name.includes('payments') || image.name.includes('orders') ? 'high' : 'medium', package: 'openssl-libs', installed: '1:3.2.2-6.el9_5', fixedIn: '1:3.2.2-6.el9_6', vexStatus: 'fixed', advisoryUrl: 'https://access.redhat.com/errata/RHSA-2026:4412' },
      { id: 'tv-2', cve: 'CVE-2026-0915', title: 'glibc: stack overflow in getaddrinfo', severity: 'medium', package: 'glibc', installed: '2.34-168.el9_6', vexStatus: 'affected' },
      { id: 'tv-3', cve: 'CVE-2026-1299', title: 'python3: email header injection', severity: 'medium', package: 'python3', installed: '3.9.21-2.el9', vexStatus: 'not_affected' },
    );
    if (image.name.includes('orders')) {
      out.push({ id: 'tv-4', cve: 'CVE-2026-2241', title: 'urllib3: proxy-authorization leak (app/requirements.txt)', severity: 'high', package: 'pkg:pypi/urllib3', installed: '1.26.18', fixedIn: '2.5.1', vexStatus: 'affected' });
    }
  } else if (image.base) {
    out.push(
      { id: 'tv-d1', cve: 'CVE-2025-4802', title: 'glibc: static setuid LD_LIBRARY_PATH', severity: 'high', package: 'libc6', installed: '2.36-9+deb12u10', fixedIn: '2.36-9+deb12u11', vexStatus: 'affected' },
      { id: 'tv-d2', cve: 'CVE-2025-6020', title: 'pam: directory traversal in pam_namespace', severity: 'medium', package: 'libpam0g', installed: '1.5.2-6+deb12u1', vexStatus: 'affected' },
    );
  }
  return out;
}

const extension: MockExtension = {
  id: 'podman-desktop.trivy',
  displayName: 'Trivy',
  publisher: 'podman-desktop',
  category: 'Security & supply chain',
  description: 'Vulnerability, misconfiguration and secret scan of local images with a digest-pinned Trivy.',
  version: '0.1.0',
  icon: 'icons/podman-desktop.trivy.png',
  tags: ['community', 'platform'],
  pApis: ['P5', 'P17'],
  contributes: {
    imageCheckers: [
      {
        id: 'trivy',
        label: 'Trivy 0.75.0 (pinned)',
        description: 'trivy image --scanners vuln,secret --image-src podman · binary sha256-pinned and cosign-verified.',
        durationMs: 1700,
        check: scan,
      },
    ],
    cliTools: [
      {
        id: 'trivy',
        name: 'trivy',
        displayName: 'Trivy (pinned v0.75.0 · verified ✓)',
        description: 'Pinned by sha256 and cosign-verified. Releases 0.69.4–0.69.6 are refused: known compromised (CVE-2026-33634, March 2026 supply-chain attack).',
        version: '0.75.0',
        latest: '0.75.0',
        path: '~/.local/share/containers/podman-desktop/extensions-storage/podman-desktop.trivy/trivy',
      },
    ],
    settings: [
      {
        id: 'trivy',
        title: 'Trivy',
        properties: [
          { id: 'trivy.binary', title: 'Trivy binary', type: 'enum', default: 'Pinned v0.75.0 (sha256 4c1f…e92a, verified)', enum: ['Pinned v0.75.0 (sha256 4c1f…e92a, verified)', 'System trivy (refused if 0.69.4–0.69.6)'] },
          { id: 'trivy.scanners', title: 'Scanners', type: 'enum', default: 'vuln,secret', enum: ['vuln', 'vuln,secret', 'vuln,secret,misconfig'] },
          { id: 'trivy.vex', title: 'Use Red Hat VEX (--vex repo)', type: 'boolean', default: true },
        ],
      },
    ],
  },
};

export default extension;
