# Red Hat Security Data (CSAF/VEX) image checker (R15)

## 1. Identity
- **Display name:** Red Hat Security Data (VEX)
- **Extension id:** `redhat.security-data-checker` (new) — no auth needed
- **Icon:** Red Hat Product Security shield (https://access.redhat.com/security); fallback `../ext-redhat-account/icons/redhat-logo.svg`
- **Description:** Matches an image's RPM database against Red Hat's authoritative CVE/VEX data ("Not affected", "Fixed in RHSA-…").

## 2. Real objects & fields
- `GET https://access.redhat.com/hydra/rest/securitydata/cve/{CVE}.json` (verified on CVE-2024-6387): `name, threat_severity ("Low"|"Moderate"|"Important"|"Critical"), public_date, bugzilla{id,description,url}, cvss3{cvss3_base_score, cvss3_scoring_vector, status}, cwe, details[], statement, mitigation, affected_release[{product_name, release_date, advisory "RHSA-YYYY:NNNN", cpe, package "name-epoch:ver-rel"}], package_state[{product_name, fix_state, package_name, cpe}]`.
- **fix_state values:** `Affected`, `Not affected`, `Will not fix`, `Fix deferred`, `Out of support scope`, `Under investigation`.
- CSAF VEX files: `https://security.access.redhat.com/data/csaf/v2/vex/2026/cve-2026-xxxx.json` (product_status: `known_affected`, `known_not_affected`, `fixed`, `under_investigation`; flags `vulnerable_code_not_present`, `component_not_present`).
- Image side: `rpm -qa` from image layers + `/root/buildinfo/content_manifests/*.json` (content sets, e.g. `rhel-9-for-x86_64-baseos-rpms`).

## 3. Placement
- **imageCheckers** → image detail "Checks" tab, structured rows (P5: `cve, package, fixedIn, vexStatus, advisoryUrl`); image list "Security" column badge (P14). Merges with Grype results: Grype raw count vs "after VEX" count ("27 → 6 actionable"). P#: **P5, P14**.

## 4. Journeys
1. **Noise reduction.** Images > `quay.io/acme/orders-api:2.3` (ubi9) → Checks → "6 actionable of 27" → toggle "Show Not affected / Will not fix" → each row links RHSA → "Rebuild with `dnf update --advisory RHSA-2026:7712`" hint in Containerfile.
2. **Pre-push gate.** Push dialog runs checker by reference (P5) → 1 Critical `Affected` with fix → "Push anyway / Rebuild".
3. **Failure:** non-RHEL image (alpine) → "No Red Hat content detected — checker skipped"; API timeout → "Cached results from 2026-10-07".

## 5. Sample data
```json
[
  {"image":"quay.io/acme/orders-api:2.3","cve":"CVE-2026-0471","package":"glibc-2.34-168.el9_6.14","threat_severity":"Critical","cvss3":"9.8","vexStatus":"Affected","fixedIn":"glibc-2.34-168.el9_6.23","advisory":"RHSA-2026:1188","advisoryUrl":"https://access.redhat.com/errata/RHSA-2026:1188"},
  {"image":"quay.io/acme/orders-api:2.3","cve":"CVE-2026-31480","package":"openssl-libs-3.2.2-6.el9_5.1","threat_severity":"Important","cvss3":"7.5","vexStatus":"Affected","fixedIn":"openssl-libs-3.5.1-4.el9_7","advisory":"RHSA-2026:7712","advisoryUrl":"https://access.redhat.com/errata/RHSA-2026:7712"},
  {"image":"quay.io/acme/orders-api:2.3","cve":"CVE-2026-22014","package":"python3.12-3.12.9-1.el9","threat_severity":"Moderate","cvss3":"5.9","vexStatus":"Affected","fixedIn":"python3.12-3.12.11-2.el9_7","advisory":"RHSA-2026:5120"},
  {"image":"quay.io/acme/orders-api:2.3","cve":"CVE-2025-6020","package":"pam-1.5.1-23.el9","threat_severity":"Important","cvss3":"7.8","vexStatus":"Fix deferred","fixedIn":null,"advisory":null},
  {"image":"quay.io/acme/orders-api:2.3","cve":"CVE-2024-6387","package":"openssh-8.7p1-38.el9","threat_severity":"Important","cvss3":"8.1","vexStatus":"Not affected","note":"openssh-server not installed in UBI"},
  {"image":"quay.io/acme/orders-api:2.3","cve":"CVE-2025-4802","package":"systemd-libs-252-51.el9","threat_severity":"Low","cvss3":"3.3","vexStatus":"Will not fix","statement":"Not exploitable in container context"},
  {"image":"quay.io/acme/orders-api:2.3","cve":"CVE-2026-1937","package":"curl-minimal-7.76.1-31.el9","threat_severity":"Moderate","cvss3":"6.5","vexStatus":"Under investigation"},
  {"image":"registry.access.redhat.com/ubi9/ubi-minimal:9.8","cve":"CVE-2026-0471","package":"glibc-2.34-168.el9_6.23","vexStatus":"Fixed","advisory":"RHSA-2026:1188"}
]
```
