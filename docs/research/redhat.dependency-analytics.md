# Red Hat Dependency Analytics (RHDA) image checker (R16)

## 1. Identity
- **Display name:** Red Hat Dependency Analytics
- **Extension id:** `redhat.dependency-analytics` (new for PD; reuses `@trustify-da/trustify-da-javascript-client`, formerly `@rhecosystemappeng/exhort-javascript-api`)
- **Icon:** RHDA icon from the VS Code extension `redhat.fabric8-analytics` (marketplace asset); fallback `../ext-redhat-account/icons/redhat-logo.svg`
- **Description:** Application-dependency vulnerability report (npm, Maven, pip, Go) for images and projects, with Red Hat trusted-content remediations.

## 2. Real objects & fields
- Client: `imageAnalysis(['quay.io/acme/orders-api:2.3'])` / `stackAnalysis('package.json')` → JSON report: `scanned{total, direct, transitive}`, `providers{<name>{status{ok, code, message}, sources{<src>{summary{direct, transitive, total, dependencies, critical, high, medium, low, remediations, recommendations, unscanned}, dependencies[{ref (purl), issues[{id, title, source, cvssScore, severity (CRITICAL|HIGH|MEDIUM|LOW), cves[], unique, remediation{fixedIn[], trustedContent{ref (purl …redhat), status, justification}}}], highestVulnerability, transitive[]}]}}}}`.
- Sources: `osv` (Trustify, free), Snyk optional token. Image analysis uses syft SBOM.

## 3. Placement
- **imageCheckers** (P5) "Dependencies" group in Checks tab; summary chip "4 vulnerable deps (1 critical)". **menus:** "Open full report" (HTML report webview). Project-level later via P15 workspace. P#: **P5, P15**.

## 4. Journeys
1. **Image report.** Image `orders-api:2.3` → Checks → RHDA rows: `pkg:pypi/jinja2@3.1.3` HIGH CVE-2024-56201 fixedIn 3.1.5 → "Open full report".
2. **Trusted content.** `pkg:maven/io.netty/netty-codec-http@4.1.100.Final` → remediation trustedContent `4.1.118.Final-redhat-00001` → "Copy Maven coordinates".
3. **Failure:** syft missing → "Installing syft CLI (cliTools)" task; provider `osv` status `{ok:false, code:503}` → partial-report banner.

## 5. Sample data
```json
{"scanned":{"total":214,"direct":31,"transitive":183},"providers":{"trustify":{"status":{"ok":true,"code":200,"message":"OK"},"sources":{"osv":{"summary":{"direct":2,"transitive":3,"total":7,"dependencies":5,"critical":1,"high":3,"medium":2,"low":1,"remediations":4,"recommendations":2,"unscanned":0},
"dependencies":[
 {"ref":"pkg:pypi/jinja2@3.1.3","issues":[{"id":"CVE-2024-56201","title":"Jinja sandbox breakout via malicious filenames","source":"osv","cvssScore":8.8,"severity":"HIGH","cves":["CVE-2024-56201"],"remediation":{"fixedIn":["3.1.5"]}}]},
 {"ref":"pkg:pypi/requests@2.31.0","issues":[{"id":"CVE-2024-35195","title":"Session verify=False persists","source":"osv","cvssScore":5.6,"severity":"MEDIUM","cves":["CVE-2024-35195"],"remediation":{"fixedIn":["2.32.0"]}}]},
 {"ref":"pkg:pypi/urllib3@1.26.18","issues":[{"id":"CVE-2025-50181","title":"Redirects not disabled when retries disabled","source":"osv","cvssScore":5.3,"severity":"MEDIUM","cves":["CVE-2025-50181"],"remediation":{"fixedIn":["2.5.0"]}}]},
 {"ref":"pkg:maven/io.netty/netty-codec-http@4.1.100.Final","issues":[{"id":"CVE-2025-24970","title":"SslHandler native crash","source":"osv","cvssScore":7.5,"severity":"HIGH","cves":["CVE-2025-24970"],"remediation":{"fixedIn":["4.1.118.Final"],"trustedContent":{"ref":"pkg:maven/io.netty/netty-codec-http@4.1.118.Final-redhat-00001?repository_url=https://maven.repository.redhat.com/ga/","status":"Fixed"}}}]},
 {"ref":"pkg:npm/express@4.18.2","issues":[{"id":"CVE-2026-11203","title":"Open redirect in res.location","source":"osv","cvssScore":9.1,"severity":"CRITICAL","cves":["CVE-2026-11203"],"remediation":{"fixedIn":["4.21.3"]}}]}
]}}}}}
```
