/**
 * Red Hat Lightspeed (formerly Insights) mock data, shaped like
 * `/api/insights/v1/system/{uuid}/reports/` and
 * `/api/vulnerability/v1/systems/{id}/cves`. `host` = PD connection id
 * (joined by subscription_manager_id in the real product).
 */
import { world } from '#lib/world.svelte.ts';

export const LS_EXT = 'redhat.lightspeed-insights';

export interface AdvisorHit {
  host: string;
  rule_id: string;
  description: string;
  /** 1 Low · 2 Moderate · 3 Important · 4 Critical */
  total_risk: 1 | 2 | 3 | 4;
  likelihood: number;
  impact: number;
  /** 1 Availability · 2 Security · 3 Stability · 4 Performance */
  category: 1 | 2 | 3 | 4;
  reboot_required: boolean;
  playbook_count: number;
  publish_date: string;
  summary: string;
  remediation: string[];
  state?: 'remediated';
}

export interface SystemCve {
  host: string;
  synopsis: string;
  public_date: string;
  impact: 'Low' | 'Moderate' | 'Important' | 'Critical';
  cvss3_score: string;
  known_exploit: boolean;
  advisory_available: boolean;
  advisories_list: string[];
  remediation: 0 | 1 | 2;
  status_name: 'Not reviewed' | 'In review' | 'On-hold' | 'Scheduled for patch' | 'Resolved' | 'No action - risk accepted' | 'Resolved via mitigation';
  package: string;
}

export const RISK = ['', 'Low', 'Moderate', 'Important', 'Critical'] as const;
export const CATEGORY = ['', 'Availability', 'Security', 'Stability', 'Performance'] as const;

export const ADVISOR: AdvisorHit[] = [
  {
    host: 'rhel10-dev',
    rule_id: 'sshd_secure|SSHD_SECURE',
    description: 'Decreased security in OpenSSH server when insecure options are configured',
    total_risk: 3,
    likelihood: 3,
    impact: 3,
    category: 2,
    reboot_required: false,
    playbook_count: 1,
    publish_date: '2024-03-11',
    summary: 'PermitRootLogin is set to "yes" in /etc/ssh/sshd_config.d/01-permitrootlogin.conf. Remote attackers can brute-force the root password.',
    remediation: ["sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config.d/01-permitrootlogin.conf", 'sudo systemctl restart sshd'],
  },
  {
    host: 'rhel10-dev',
    rule_id: 'selinux_disabled|SELINUX_DISABLED_ERROR',
    description: 'Decreased security when SELinux is disabled',
    total_risk: 2,
    likelihood: 2,
    impact: 2,
    category: 2,
    reboot_required: true,
    playbook_count: 1,
    publish_date: '2023-06-01',
    summary: 'SELinux is set to permissive in /etc/selinux/config. Container isolation relies on SELinux labels.',
    remediation: ["sudo sed -i 's/^SELINUX=permissive/SELINUX=enforcing/' /etc/selinux/config", 'sudo touch /.autorelabel', 'sudo systemctl reboot'],
  },
  {
    host: 'rhel10-dev',
    rule_id: 'tuned_ondemand|TUNED_PROFILE_NOT_OPTIMAL',
    description: 'Performance degradation when tuned profile does not match the virtual guest role',
    total_risk: 1,
    likelihood: 2,
    impact: 1,
    category: 4,
    reboot_required: false,
    playbook_count: 1,
    publish_date: '2025-01-20',
    summary: 'Active profile "balanced"; recommended profile for a VM guest is "virtual-guest".',
    remediation: ['sudo tuned-adm profile virtual-guest'],
  },
  {
    host: 'rhel-9',
    rule_id: 'kernel_lockdown|KERNEL_OUT_OF_DATE',
    description: 'System is running a kernel older than the latest 9.7 z-stream with known security fixes',
    total_risk: 3,
    likelihood: 3,
    impact: 3,
    category: 2,
    reboot_required: true,
    playbook_count: 1,
    publish_date: '2026-08-04',
    summary: 'Running 5.14.0-611.5.1.el9_7; 5.14.0-611.16.1.el9_7 fixes CVE-2026-31480.',
    remediation: ['sudo dnf upgrade -y kernel', 'podman machine stop rhel-9 && podman machine start rhel-9'],
  },
  {
    host: 'rhel-9',
    rule_id: 'wsl_clock_skew|CHRONY_NOT_SYNCED',
    description: 'Time drift after host sleep causes TLS failures on WSL guests',
    total_risk: 2,
    likelihood: 3,
    impact: 2,
    category: 1,
    reboot_required: false,
    playbook_count: 0,
    publish_date: '2026-05-14',
    summary: 'Clock offset 41 s after resume; registry pulls fail with "x509: certificate has expired or is not yet valid".',
    remediation: ['sudo systemctl enable --now chronyd', 'sudo chronyc makestep'],
  },
];

export const CVES: SystemCve[] = [
  { host: 'rhel-9', synopsis: 'CVE-2026-31480', public_date: '2026-09-16', impact: 'Important', cvss3_score: '7.8', known_exploit: false, advisory_available: true, advisories_list: ['RHSA-2026:7712'], remediation: 2, status_name: 'Not reviewed', package: 'kernel' },
  { host: 'rhel-9', synopsis: 'CVE-2026-22014', public_date: '2026-07-08', impact: 'Moderate', cvss3_score: '5.9', known_exploit: false, advisory_available: true, advisories_list: ['RHSA-2026:5120'], remediation: 2, status_name: 'Scheduled for patch', package: 'openssl' },
  { host: 'rhel10-dev', synopsis: 'CVE-2026-0471', public_date: '2026-02-03', impact: 'Critical', cvss3_score: '9.8', known_exploit: true, advisory_available: true, advisories_list: ['RHSA-2026:1188'], remediation: 2, status_name: 'Not reviewed', package: 'glibc' },
  { host: 'rhel10-dev', synopsis: 'CVE-2025-48964', public_date: '2025-06-10', impact: 'Low', cvss3_score: '3.3', known_exploit: false, advisory_available: false, advisories_list: [], remediation: 0, status_name: 'No action - risk accepted', package: 'iputils' },
];

/** First check-in results for a freshly registered system. */
export function freshHost(host: string): { advisor: AdvisorHit[]; cves: SystemCve[] } {
  return {
    advisor: [{ ...ADVISOR[2], host }],
    cves: [{ host, synopsis: 'CVE-2026-1937', public_date: '2026-09-30', impact: 'Moderate', cvss3_score: '6.5', known_exploit: false, advisory_available: true, advisories_list: ['RHSA-2026:8034'], remediation: 2, status_name: 'Not reviewed', package: 'curl' }],
  };
}

interface Store {
  advisor: AdvisorHit[];
  cves: SystemCve[];
  checkedIn: string[];
}

export function lsStore(): Store {
  return (world.ext[LS_EXT] ?? { advisor: [], cves: [], checkedIn: [] }) as unknown as Store;
}

export function mutableStore(): Store {
  world.ext[LS_EXT] ??= { advisor: [], cves: [], checkedIn: [] };
  return world.ext[LS_EXT] as unknown as Store;
}
