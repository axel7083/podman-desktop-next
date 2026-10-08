# Red Hat Lightspeed (`redhat.lightspeed-insights`)

## Real objects / API
Advisor `/api/insights/v1/system/{uuid}/reports/` (`rule_id, total_risk 1–4, likelihood, impact, category, reboot_required, playbook_count`); Vulnerability `/api/vulnerability/v1/systems/{id}/cves` (`synopsis, impact, cvss3_score, known_exploit, advisories_list, status_name`). Host-based only.

## Auth
SSO scope `api.console`; system joined by subscription-manager consumer UUID.

## Journeys
1. rhel10-dev › Advisor → SSHD_SECURE → Fix in terminal → Re-check → hit cleared; Explain with RHEL Lightspeed.
2. Vulnerabilities → Apply RHSA-2026:1188 → Resolved.
3. Unregistered rhel9-db → Register CTA; new machine → "Waiting for first check-in".

## Placement
tabs Advisor/Vulnerabilities (P14), dashboard card (P17).

## Sources
docs/research/redhat.lightspeed-insights.md
