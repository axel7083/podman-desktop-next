# Red Hat Trusted Profile Analyzer (TPA / Trustify) — SBOM upload & analysis (R21)

## 1. Identity
- **Display name:** Trusted Profile Analyzer
- **Extension id:** `redhat.trusted-profile-analyzer` (proposed; RHADS)
- **Icon:** https://github.com/guacsec.png (Trustify upstream); fallback `../ext-redhat-account/icon.png`
- **Description:** Generate an SBOM for any local image, upload it to your organization's TPA and see vulnerabilities, VEX status and remediation per package URL.

## 2. Real objects & fields
- **Product:** TPA **2.2** (SBOM delete, SBOM generation from Quay images, new purl recommendation/remediation endpoint) — [2.2 release notes](https://docs.redhat.com/en/documentation/red_hat_trusted_profile_analyzer/2.2/html-single/release_notes/index). Upstream [guacsec/trustify](https://github.com/guacsec/trustify) v0.6.3 (2026-10-06) has moved most routes to `/api/v3`; TPA 2.x exposes `/api/v2` — mock both shapes the same.
- **Endpoints ([openapi.yaml](https://raw.githubusercontent.com/guacsec/trustify/main/openapi.yaml)):** `POST /api/v2/sbom` (body SPDX/CycloneDX JSON, optional `?labels.source=podman-desktop`) → `{id, document_id}`; `GET /api/v2/sbom?q=name~orders-api`; `GET /api/v2/sbom/{id}/advisory`; `GET /api/v2/sbom/{id}/packages`; `POST /api/v2/vulnerability/analyze {purls:[…]}`; `POST /api/v2/purl/recommend {purls:[…]}`.
- **Schemas:** `SbomHead{id, document_id, name, published, authors, suppliers, labels, number_of_packages}`, `SbomPackage{id, name, version, purl[], cpe[], licenses}`, `VulnerabilityHead{identifier, title, base_score, published, cwes}`, `PurlStatus{vulnerability, advisory, status, version_range, fixed_versions, scores}`, `Severity` enum `none|low|medium|high|critical`. VEX `status`: `affected|fixed|not_affected|under_investigation`.
- **SBOM generation:** `syft scan podman:quay.io/acme/orders-api:2.3 -o cyclonedx-json` (or SPDX 2.3). Auth: OIDC client credentials against RHBK (`cli` client).

## 3. Placement
- **accounts:** "TPA instance" (URL + OIDC). **imageCheckers:** "TPA" (P5: `cve`, `package`=purl, `fixedIn`, `vexStatus`, `advisoryUrl`). **tabs:** image "SBOM" tab (packages, licenses, upload state, P6/P14). **menus:** image "Generate SBOM", "Upload SBOM to TPA". **tools:** "Trusted Profile Analyzer" page (uploaded SBOMs, search by purl). P#: **P5, P6, P14, P16**.

## 4. Journeys
1. **SBOM → TPA.** `orders-api:2.3` → Generate SBOM (syft task, 412 packages) → Upload → TPA id `urn:uuid:019a…` → Checks: 14 vulns, 6 `affected`, 8 `not_affected` via Red Hat VEX.
2. **Remediate by purl.** `pkg:pypi/urllib3@1.26.18` affected by CVE-2026-2241 → recommend → `2.5.1` → "Open requirements.txt".
3. **Org view.** Tools > TPA → search `pkg:rpm/redhat/openssl-libs` → 7 SBOMs contain it → which local images match.

## 5. Sample data
```json
{
  "sboms":[
    {"id":"urn:uuid:019a5c2e-71f0-7c3a-9d11-5b0e2f1a7c41","document_id":"https://acme-corp.com/sbom/orders-api-2.3","name":"quay.io/acme/orders-api:2.3","published":"2026-10-08T09:12:44Z","number_of_packages":412,"labels":{"source":"podman-desktop","type":"cyclonedx"}},
    {"id":"urn:uuid:019a4f10-2b33-7aa1-8e02-1f7c3d9e0b55","name":"quay.io/acme/payments-api:1.5.0","published":"2026-10-06T16:02:10Z","number_of_packages":287,"labels":{"source":"konflux","type":"spdx"}},
    {"id":"urn:uuid:019a2210-9c01-7b0e-b1aa-77d2e4f0c321","name":"registry.access.redhat.com/ubi9/ubi-minimal:9.8","published":"2026-10-06T07:40:35Z","number_of_packages":104,"labels":{"source":"redhat"}}
  ],
  "findings":[
    {"purl":"pkg:rpm/redhat/openssl-libs@3.2.2-6.el9_5?arch=x86_64","vulnerability":"CVE-2026-31790","advisory":"RHSA-2026:4412","status":"fixed","fixed_versions":["3.2.2-6.el9_6"],"severity":"high","score":7.5},
    {"purl":"pkg:rpm/redhat/glibc@2.34-168.el9_6?arch=x86_64","vulnerability":"CVE-2026-0915","status":"affected","severity":"medium","score":5.9},
    {"purl":"pkg:rpm/redhat/python3@3.9.21-2.el9","vulnerability":"CVE-2026-1299","status":"not_affected","justification":"vulnerable_code_not_in_execute_path","severity":"medium"},
    {"purl":"pkg:pypi/urllib3@1.26.18","vulnerability":"CVE-2026-2241","status":"affected","fixed_versions":["2.5.1"],"severity":"medium","score":6.1},
    {"purl":"pkg:pypi/jinja2@3.1.4","vulnerability":"CVE-2025-27516","status":"affected","fixed_versions":["3.1.6"],"severity":"medium"},
    {"purl":"pkg:rpm/redhat/curl-minimal@7.76.1-31.el9","vulnerability":"CVE-2026-2241","status":"under_investigation","severity":"low"},
    {"purl":"pkg:rpm/redhat/libxml2@2.9.13-9.el9","vulnerability":"CVE-2026-0990","status":"not_affected","severity":"low"}
  ]
}
```
