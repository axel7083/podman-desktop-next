# Trivy image checker — pinned (O8)

## 1. Identity
- **Display name:** Trivy · **Extension id:** `podman-desktop.trivy` (proposed; sibling of `../ext-grype/`) · **Icon:** https://github.com/aquasecurity.png
- **Description:** Vulnerability, misconfig and secret scan of local images with a digest-pinned Trivy.

## 2. Real objects & fields
- **Why "pinned":** 2026-03-19 supply-chain compromise — malicious **Trivy v0.69.4** binary, 76/77 `trivy-action` tags force-pushed, malicious Docker Hub images **v0.69.5/0.69.6** (2026-03-22); **CVE-2026-33634**, on CISA KEV ([Aqua](https://www.aquasec.com/blog/trivy-supply-chain-attack-what-you-need-to-know)). Pin **v0.75.0** (2026-10-01) by sha256 + cosign-verify the release; refuse 0.69.4–0.69.6.
- `trivy image --format json --scanners vuln,secret --image-src podman quay.io/acme/orders-api:2.3` → `{SchemaVersion:2, ArtifactName, ArtifactType:"container_image", Metadata{OS{Family, Name}}, Results[{Target, Class:"os-pkgs"|"lang-pkgs"|"secret", Type, Vulnerabilities[{VulnerabilityID, PkgName, PkgIdentifier{PURL}, InstalledVersion, FixedVersion, Status:"fixed"|"affected"|"will_not_fix"|"fix_deferred"|"end_of_life", Severity, Title, PrimaryURL}]}]}`. Supports Red Hat VEX via `--vex repo`.

## 3. Placement
- **imageCheckers** (P5 `cve`, `package`, `fixedIn`, `vexStatus`); **cliTools:** trivy with pinned version + integrity badge. P#: **P5, P17**.

## 4. Journeys
1. Install → cliTools shows "trivy 0.75.0 ✓ verified" → scan `orders-api:2.3` → 19 vulns (2 High).
2. User points at a system trivy 0.69.4 → blocked: "Known compromised release (CVE-2026-33634)".

## 5. Sample data
```json
{"tool":{"name":"trivy","version":"0.75.0","verified":true},"ArtifactName":"quay.io/acme/orders-api:2.3","Results":[
 {"Target":"quay.io/acme/orders-api:2.3 (redhat 9.5)","Class":"os-pkgs","Type":"redhat","Vulnerabilities":[
  {"VulnerabilityID":"CVE-2026-31790","PkgName":"openssl-libs","InstalledVersion":"1:3.2.2-6.el9_5","FixedVersion":"1:3.2.2-6.el9_6","Status":"fixed","Severity":"HIGH"},
  {"VulnerabilityID":"CVE-2026-0915","PkgName":"glibc","InstalledVersion":"2.34-168.el9_6","Status":"affected","Severity":"MEDIUM"},
  {"VulnerabilityID":"CVE-2026-1299","PkgName":"python3","InstalledVersion":"3.9.21-2.el9","Status":"will_not_fix","Severity":"MEDIUM"}]},
 {"Target":"app/requirements.txt","Class":"lang-pkgs","Type":"pip","Vulnerabilities":[
  {"VulnerabilityID":"CVE-2026-2241","PkgName":"urllib3","PkgIdentifier":{"PURL":"pkg:pypi/urllib3@1.26.18"},"InstalledVersion":"1.26.18","FixedVersion":"2.5.1","Status":"fixed","Severity":"HIGH"}]}]}
```
