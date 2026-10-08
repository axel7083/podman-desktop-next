/**
 * redhat.rhel-lifecycle-checker – RHEL and Application Stream lifecycle
 * (Lightspeed Planning API `/api/roadmap/v1/lifecycle/…`) for images (P5).
 */
import type { CheckerDef, Finding, MockExtension } from '#lib/ext/types.ts';
import type { ContainerImage } from '#lib/world.svelte.ts';

function check(i: ContainerImage): Finding[] {
  const b = i.base ?? '';
  if (b.startsWith('ubi8/nodejs-18')) {
    return [
      { id: 'nodejs-18', ruleId: 'app-stream nodejs:18', title: 'Node.js 18 (ubi8) – Retired on 2025-04-30 · use ubi9/nodejs-22 (supported until 2027-04-30)', severity: 'critical' },
      { id: 'rhel-8.10', ruleId: 'RHEL 8.10', title: 'RHEL 8.10 – Supported until 2029-05-31 (maintenance)', severity: 'info' },
    ];
  }
  if (b.startsWith('ubi9/python-311')) {
    return [
      { id: 'python3.11', ruleId: 'app-stream python3.11', title: 'Python 3.11 – Near retirement (ends 2026-10-31) · move to python3.12', severity: 'medium' },
      { id: 'rhel-9.5', ruleId: 'RHEL 9.5', title: 'RHEL 9.5 base – minor release retired · RHEL 9.8 supported until 2028-05-31', severity: 'low' },
    ];
  }
  if (b.includes('9.7')) return [{ id: 'rhel-9.7', ruleId: 'RHEL 9.7', title: 'RHEL 9.7 – Near retirement (2026-11-30) · 9.8 available', severity: 'medium' }];
  if (b.includes('10.1')) return [{ id: 'rhel-10.1', ruleId: 'RHEL 10.1', title: 'RHEL 10.1 – Near retirement (2026-11-30) · 10.2 available', severity: 'medium' }];
  return [];
}

const checker: CheckerDef = {
  id: 'lifecycle',
  label: 'RHEL Lifecycle',
  description: 'RHEL minor release and Application Stream support status (Supported, Near retirement, Retired).',
  durationMs: 600,
  when: i => /^(ubi|rhel)/.test(i.base ?? ''),
  check,
  summary: (_i, f) => (f.some(x => x.severity === 'critical') ? 'Retired content in this image' : f.some(x => x.severity === 'medium') ? 'Near retirement' : 'Supported'),
};

const extension: MockExtension = {
  id: 'redhat.rhel-lifecycle-checker',
  displayName: 'RHEL Lifecycle',
  publisher: 'redhat',
  description: 'Flags images and machines on retired or near-retirement RHEL releases and Application Streams.',
  version: '0.1.0',
  icon: 'icons/redhat.rhel-lifecycle-checker.svg',
  dependsOn: ['redhat.redhat-authentication'],
  tags: ['rhel'],
  pApis: ['P5', 'P14'],
  contributes: { imageCheckers: [checker] },
};

export default extension;
