/**
 * redhat.openscap-checker – OpenSCAP compliance of container images (P5,
 * `ruleId`): `oscap-podman <image> xccdf eval --profile … ssg-rhel9-ds.xml`.
 * "Generate remediation" rebuilds the image with the bash fix (71.4% → 88%).
 */
import { mkImage } from '#lib/ext/helpers.ts';
import type { CheckerDef, Finding, MockExtension, Severity } from '#lib/ext/types.ts';
import { type ContainerImage, runTask, world } from '#lib/world.svelte.ts';

const PROFILE = 'xccdf_org.ssgproject.content_profile_cis_server_l1';

interface Rule {
  idref: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  result: 'pass' | 'fail' | 'notapplicable' | 'notchecked';
  ident: string;
}

const RULES: Rule[] = [
  { idref: 'rpm_verify_permissions', title: 'Verify and Correct File Permissions with RPM', severity: 'high', result: 'fail', ident: 'CCE-90840-2' },
  { idref: 'configure_crypto_policy', title: 'Configure System Cryptography Policy', severity: 'high', result: 'fail', ident: 'CCE-83450-9' },
  { idref: 'package_aide_installed', title: 'Install AIDE', severity: 'medium', result: 'fail', ident: 'CCE-90843-6' },
  { idref: 'accounts_password_minlen_login_defs', title: 'Set Password Minimum Length in login.defs', severity: 'medium', result: 'fail', ident: 'CCE-83433-5' },
  { idref: 'file_permissions_etc_shadow', title: 'Verify Permissions on /etc/shadow', severity: 'medium', result: 'pass', ident: 'CCE-83615-7' },
  { idref: 'no_empty_passwords', title: 'Prevent Login to Accounts With Empty Password', severity: 'high', result: 'pass', ident: 'CCE-83611-6' },
];

const SEV: Record<Rule['severity'], Severity> = { high: 'high', medium: 'medium', low: 'low' };
const isRhel = (i: ContainerImage): boolean => /^(ubi|rhel)/.test(i.base ?? '');
const fixed = (i: ContainerImage): boolean => i.labels?.['org.open-scap.remediation'] === 'cis_server_l1';

function remediate(i: ContainerImage): void {
  const tag = '2.4';
  runTask({
    name: `Apply CIS L1 remediation to ${i.name.split('/').pop()}`,
    ext: 'redhat.openscap-checker',
    steps: [
      { label: 'oscap xccdf generate fix --fix-type bash', ms: 900, log: [`$ oscap xccdf generate fix --fix-type bash --profile ${PROFILE} --result-id … arf.xml > cis-fix.sh`, 'Wrote 14 remediations to cis-fix.sh'] },
      { label: 'Append RUN cis-fix.sh to Containerfile', ms: 500 },
      { label: `podman build -t ${i.name}:${tag} .`, ms: 2600 },
      { label: 'oscap-podman re-scan', ms: 1500, log: ['Score: 88.0 (127 pass / 3 fail / 63 notapplicable)'] },
    ],
    onDone: () => world.images.push(mkImage(i.engineId, { name: i.name, tag, sizeMB: Math.round(i.size / 1048576) + 4, ageD: 0, base: i.base, labels: { ...i.labels, 'org.open-scap.remediation': 'cis_server_l1' } })),
    action: { label: 'Open images', href: `/c/${i.engineId}/images` },
  });
}

function check(i: ContainerImage): Finding[] {
  const rules = fixed(i) ? RULES.map(r => (r.idref === 'rpm_verify_permissions' || r.idref === 'configure_crypto_policy' ? r : { ...r, result: 'pass' as const })) : RULES;
  const failing = i.name.includes('acme') ? rules.filter(r => r.result === 'fail') : rules.filter(r => r.result === 'fail').slice(0, 1);
  return failing.map(r => ({
    id: r.idref,
    ruleId: `xccdf_org.ssgproject.content_rule_${r.idref}`,
    title: `${r.title} (${r.ident})`,
    severity: SEV[r.severity],
    advisoryUrl: `https://static.open-scap.org/ssg-guides/ssg-rhel9-guide-cis_server_l1.html#xccdf_org.ssgproject.content_rule_${r.idref}`,
    actions: !fixed(i) && i.name.includes('orders-api') && r.idref === 'rpm_verify_permissions' ? [{ label: 'Generate remediation', run: remediate }] : undefined,
  }));
}

const checker: CheckerDef = {
  id: 'cis-l1',
  label: 'OpenSCAP Compliance',
  description: 'Profile: CIS Red Hat Enterprise Linux 9 Benchmark Level 1 – Server (SSG 0.1.78, ssg-rhel9-ds.xml).',
  durationMs: 2600,
  when: isRhel,
  check,
  summary: i => (fixed(i) ? 'CIS L1 server: 88.0% · 127 pass · 3 fail · 63 not applicable' : i.name.includes('acme') ? 'CIS L1 server: 71.4% · 112 pass · 18 fail · 63 not applicable' : 'CIS L1 server: 93.5% · 58 pass · 1 fail · 71 not applicable'),
};

const extension: MockExtension = {
  id: 'redhat.openscap-checker',
  displayName: 'OpenSCAP Compliance',
  publisher: 'redhat',
  description: 'Scan container images against CIS, STIG, OSPP and PCI-DSS profiles from SCAP Security Guide.',
  version: '0.1.0',
  icon: 'icons/redhat.openscap-checker.png',
  tags: ['rhel'],
  pApis: ['P5', 'P17'],
  contributes: {
    imageCheckers: [checker],
    cliTools: [{ id: 'oscap-podman', name: 'oscap-podman', displayName: 'OpenSCAP', description: 'Evaluate SCAP content on container images.', version: '1.4.2', latest: '1.4.3', path: '/usr/bin/oscap-podman' }],
    settings: [{ id: 'openscap', title: 'OpenSCAP', properties: [{ id: 'openscap.profile', title: 'Default profile', type: 'enum', default: 'cis_server_l1', enum: ['cis_server_l1', 'cis', 'stig', 'ospp', 'pci-dss', 'e8', 'hipaa'] }] }],
  },
};

export default extension;
