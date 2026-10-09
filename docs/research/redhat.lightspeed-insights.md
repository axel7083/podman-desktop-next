# Red Hat Lightspeed (formerly Insights) — Advisor & Vulnerability for registered systems

## 1. Identity
- **Display name:** Red Hat Lightspeed
- **Extension id:** `redhat.lightspeed-insights` (new; logically part of `redhat.redhat-authentication` registration, R6/R8) — dependsOn `redhat.redhat-authentication` (scope `api.console`)
- **Icon:** Red Hat Lightspeed product icon (console.redhat.com/insights); fallback `../ext-redhat-account/icons/redhat-logo.svg`
- **Description:** Advisor recommendations and CVE exposure for your registered RHEL VMs and RHEL Podman machines.

## 2. Real objects & fields
- **Inventory host** (`/api/inventory/v1/hosts`): `id, insights_id, subscription_manager_id, display_name, fqdn, os_release, updated, stale_timestamp, reporter`. Joins to a PD connection by `subscription_manager_id` = consumer UUID.
- **Advisor rule** (`/api/insights/v1/rule/`, `/system/{uuid}/reports/`): `rule_id ("module|ERROR_KEY")`, `description`, `total_risk` 1–4 (Low/Moderate/Important/Critical), `likelihood` 1–4, `impact` 1–4, `category` 1–4 (Availability/Security/Stability/Performance), `impacted_systems_count`, `reboot_required`, `playbook_count`, `publish_date`, `tags`.
- **Vulnerability CVE** (`/api/vulnerability/v1/systems/{id}/cves`): `synopsis (CVE id), public_date, impact ("Low"|"Moderate"|"Important"|"Critical"), cvss3_score, known_exploit, advisory_available, advisories_list[], remediation (0 none|1 manual|2 playbook), status_name ("Not reviewed"|"In review"|"On-hold"|"Scheduled for patch"|"Resolved"|"No action - risk accepted"|"Resolved via mitigation"), business_risk`.
- Lightspeed APIs are **host-based**: they do not scan container images (A.3 R8).

## 3. Placement
- **tabs** on RHEL VM and RHEL Podman machine connection detail: "Advisor" and "Vulnerabilities" (P14). **columns/badges:** connection list badge "3 recommendations · 1 critical CVE" (P14/P10). **dashboardCards:** "Fleet health: 3 systems, 5 hits". **menus:** "Open in console.redhat.com", "Remediate (dnf update …)" runs in Terminal. P#: **P14, P16, P17**.

## 4. Journeys
1. **See risk on a VM.** RHEL VMs > `rhel10-dev` → badge "Advisor 3" → tab lists hits sorted by total_risk → expand "sshd PermitRootLogin" → "Fix in terminal" opens Terminal with `sudo sed …; sudo systemctl restart sshd` → "Re-check" (insights-client --check-results) → hit disappears.
2. **CVE triage.** `rhel-9` machine → Vulnerabilities → filter Important+ → CVE-2026-xxxx `advisory_available: true` → "Apply RHSA-2026:7712" → task `dnf upgrade --advisory RHSA-2026:7712` → status Resolved.
3. **Failure:** VM registered < 5 min ago → "Waiting for first check-in (insights-client)"; host stale (`stale_timestamp` past) → "System hasn't reported for 9 days — start it"; token lacks scope → "Re-sign in to grant console access".

## 5. Sample data
```json
{
  "hosts":[
    {"id":"0b7a9c1e-2d3f-4a5b-8c6d-9e0f1a2b3c4d","display_name":"rhel10-dev","subscription_manager_id":"c0ffee00-1234-4abc-9def-00aa11bb22cc","os_release":"10.1","updated":"2026-10-08T07:58:12Z","stale_timestamp":"2026-10-09T12:58:12Z"},
    {"id":"1c8b0d2f-3e4a-4b6c-9d7e-0f1a2b3c4d5e","display_name":"rhel-9","subscription_manager_id":"a83b51f0-77c2-4f0e-8e11-6e2f4a9b0c21","os_release":"9.7","updated":"2026-10-08T06:40:00Z","stale_timestamp":"2026-10-09T11:40:00Z"},
    {"id":"2d9c1e3a-4f5b-4c7d-8e8f-1a2b3c4d5e6f","display_name":"podman-machine-default","subscription_manager_id":"6f1c2e7a-0b9d-4f6e-9d3c-1a2b3c4d5e6f","os_release":"Fedora CoreOS 42","updated":"2026-09-29T10:00:00Z","stale_timestamp":"2026-09-30T15:00:00Z"}
  ],
  "advisor":[
    {"host":"rhel10-dev","rule_id":"sshd_secure|SSHD_SECURE","description":"Decreased security in OpenSSH server when insecure options are configured","total_risk":3,"likelihood":3,"impact":3,"category":2,"reboot_required":false,"playbook_count":1,"publish_date":"2024-03-11T00:00:00Z"},
    {"host":"rhel10-dev","rule_id":"selinux_disabled|SELINUX_DISABLED_ERROR","description":"Decreased security when SELinux is disabled","total_risk":2,"likelihood":2,"impact":2,"category":2,"reboot_required":true,"playbook_count":1,"publish_date":"2023-06-01T00:00:00Z"},
    {"host":"rhel10-dev","rule_id":"tuned_ondemand|TUNED_PROFILE_NOT_OPTIMAL","description":"Performance degradation when tuned profile does not match the virtual guest role","total_risk":1,"likelihood":2,"impact":1,"category":4,"reboot_required":false,"playbook_count":1,"publish_date":"2025-01-20T00:00:00Z"},
    {"host":"rhel-9","rule_id":"kernel_lockdown|KERNEL_OUT_OF_DATE","description":"System is running a kernel older than the latest 9.7 z-stream with known security fixes","total_risk":3,"likelihood":3,"impact":3,"category":2,"reboot_required":true,"playbook_count":1,"publish_date":"2026-08-04T00:00:00Z"},
    {"host":"rhel-9","rule_id":"wsl_clock_skew|CHRONY_NOT_SYNCED","description":"Time drift after host sleep causes TLS failures on WSL guests","total_risk":2,"likelihood":3,"impact":2,"category":1,"reboot_required":false,"playbook_count":0,"publish_date":"2026-05-14T00:00:00Z"}
  ],
  "cves":[
    {"host":"rhel-9","synopsis":"CVE-2026-31480","public_date":"2026-09-16T00:00:00Z","impact":"Important","cvss3_score":"7.8","known_exploit":false,"advisory_available":true,"advisories_list":["RHSA-2026:7712"],"remediation":2,"status_name":"Not reviewed","package":"kernel"},
    {"host":"rhel-9","synopsis":"CVE-2026-22014","public_date":"2026-07-08T00:00:00Z","impact":"Moderate","cvss3_score":"5.9","known_exploit":false,"advisory_available":true,"advisories_list":["RHSA-2026:5120"],"remediation":2,"status_name":"Scheduled for patch","package":"openssl"},
    {"host":"rhel10-dev","synopsis":"CVE-2026-0471","public_date":"2026-02-03T00:00:00Z","impact":"Critical","cvss3_score":"9.8","known_exploit":true,"advisory_available":true,"advisories_list":["RHSA-2026:1188"],"remediation":2,"status_name":"Not reviewed","package":"glibc"},
    {"host":"rhel10-dev","synopsis":"CVE-2025-48964","public_date":"2025-06-10T00:00:00Z","impact":"Low","cvss3_score":"3.3","known_exploit":false,"advisory_available":false,"advisories_list":[],"remediation":0,"status_name":"No action - risk accepted","package":"iputils"}
  ]
}
```
