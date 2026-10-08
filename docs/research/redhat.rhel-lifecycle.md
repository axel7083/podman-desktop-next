# RHEL lifecycle / EOL checker (Lightspeed Planning API) (R10)

## 1. Identity
- **Display name:** RHEL Lifecycle
- **Extension id:** `redhat.rhel-lifecycle-checker` (new) — dependsOn `redhat.redhat-authentication` (scope `api.console`)
- **Icon:** Red Hat Lightspeed "Planning" icon (console.redhat.com/insights/planning); fallback `ext-redhat-account/icons/redhat-logo.svg`
- **Description:** Flags images and machines on retired or near-retirement RHEL releases and Application Streams.

## 2. Real objects & fields (`https://console.redhat.com/api/roadmap/v1/openapi.json`, verified)
- `GET /api/roadmap/v1/lifecycle/rhel[/{major}[/{minor}]]` → `RHELLifecycle{name, major, minor, display_name, start_date, end_date, end_date_eus, end_date_e4s, end_date_els, support_status}`.
- `GET /api/roadmap/v1/lifecycle/app-streams/{major_version}` → `AppStreamEntity{name, display_name, stream, impl ("dnf_module"|"package"|"scl"|"stream"), start_date, end_date, support_status, rolling (bool), os_major, os_minor}`.
- **support_status enum:** `Supported | Near retirement | Retired | Not installed | Upcoming release | Unknown`.
- Image side: `/etc/redhat-release` + `rpm -q nodejs python3.x postgresql…` / UBI language image label `com.redhat.component`.

## 3. Placement
- **imageCheckers** (P5) row "Base RHEL 8.10 — Supported until 2029-05-31 (Maintenance)"/"nodejs:18 Retired 2025-04-30". **tabs/badges** on RHEL VM & machine connections ("RHEL 9.7 EUS ends 2027-05-31"). **dashboardCards:** "2 images on retired streams". P#: **P5, P14, P16, P17**.

## 4. Journeys
1. **Retired stream.** Images > `legacy-portal:1.9` (ubi8/nodejs-18) → Checks: "nodejs 18 Retired (2025-04-30)" → suggest `ubi9/nodejs-22` (Pyxis) → "Rebase" action.
2. **Near retirement machine.** RHEL VM `rhel9-db` (9.7) → badge "Near retirement" → planning detail timeline (minor EOL vs major EOL) → "Upgrade to 9.8 (dnf --releasever)" link.
3. **Failure:** not signed in → checker row "Sign in to Red Hat to check lifecycle"; unknown stream → `Unknown`.

## 5. Sample data
```json
{"rhel":[
  {"name":"RHEL","major":8,"minor":10,"display_name":"RHEL 8.10","start_date":"2024-05-22","end_date":"2029-05-31","end_date_els":"2032-05-31","support_status":"Supported"},
  {"name":"RHEL","major":9,"minor":6,"display_name":"RHEL 9.6","start_date":"2025-05-20","end_date":"2027-05-31","end_date_eus":"2027-05-31","support_status":"Supported"},
  {"name":"RHEL","major":9,"minor":7,"display_name":"RHEL 9.7","start_date":"2025-11-12","end_date":"2026-11-30","support_status":"Near retirement"},
  {"name":"RHEL","major":9,"minor":8,"display_name":"RHEL 9.8","start_date":"2026-05-13","end_date":"2028-05-31","end_date_eus":"2028-05-31","support_status":"Supported"},
  {"name":"RHEL","major":10,"minor":1,"display_name":"RHEL 10.1","start_date":"2025-11-12","end_date":"2026-11-30","support_status":"Near retirement"},
  {"name":"RHEL","major":10,"minor":2,"display_name":"RHEL 10.2","start_date":"2026-05-13","end_date":"2027-05-31","support_status":"Supported"},
  {"name":"RHEL","major":7,"minor":9,"display_name":"RHEL 7.9","start_date":"2020-09-29","end_date":"2024-06-30","end_date_els":"2028-06-30","support_status":"Retired"}],
 "appStreams":[
  {"name":"nodejs","display_name":"Node.js 18","stream":"18","impl":"dnf_module","os_major":8,"start_date":"2022-11-15","end_date":"2025-04-30","support_status":"Retired","rolling":false},
  {"name":"nodejs","display_name":"Node.js 22","stream":"22","impl":"dnf_module","os_major":9,"start_date":"2024-11-12","end_date":"2027-04-30","support_status":"Supported","rolling":false},
  {"name":"python3.11","display_name":"Python 3.11","stream":"3.11","impl":"package","os_major":9,"start_date":"2023-05-10","end_date":"2026-10-31","support_status":"Near retirement","rolling":false},
  {"name":"postgresql","display_name":"PostgreSQL 16","stream":"16","impl":"dnf_module","os_major":9,"start_date":"2024-05-22","end_date":"2029-11-30","support_status":"Supported","rolling":false}],
 "findings":[{"image":"quay.io/acme/legacy-portal:1.9","item":"nodejs:18 (ubi8)","support_status":"Retired","end_date":"2025-04-30","suggestion":"registry.access.redhat.com/ubi9/nodejs-22"},{"image":"quay.io/acme/orders-api:2.3","item":"python3.11","support_status":"Near retirement","end_date":"2026-10-31","suggestion":"python3.12"}]}
```
Note: minor-release dates above are plausible placeholders except 8.10 / 7.9 (public lifecycle page); verify via the API before demoing.
