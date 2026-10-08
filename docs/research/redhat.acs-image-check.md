# Advanced Cluster Security: roxctl image check

## 1. Identity
- **Display name:** Red Hat Advanced Cluster Security policy check
- **Extension id:** `redhat.acs-image-check` (proposed)
- **Icon:** https://github.com/stackrox.png
- **Description:** Check images against your organization's ACS build-time policies before you push.

## 2. Real objects & fields ([roxctl image check](https://docs.redhat.com/en/documentation/red_hat_advanced_cluster_security_for_kubernetes/4.9/html/roxctl_cli/))
- Auth: `ROX_ENDPOINT=central-stackrox.apps.ocp-prod...:443`, `ROX_API_TOKEN` (role `Continuous Integration`).
- `roxctl image check --image <ref> -o json` → `{results:[{metadata:{id, additionalInfo:{name, type:"image"}}, summary:{CRITICAL, HIGH, MEDIUM, LOW, TOTAL}, violatedPolicies:[{name, severity:"CRITICAL"|"HIGH"|"MEDIUM"|"LOW", description, violation:[string], remediation, failingCheck:bool}]}], summary:{CRITICAL, HIGH, MEDIUM, LOW, TOTAL}}`. Exit code non-zero when any `failingCheck` (policy `enforcementActions: FAIL_BUILD_ENFORCEMENT`).
- Policy model (API `/v1/policies`): `severity` `LOW_SEVERITY|MEDIUM_SEVERITY|HIGH_SEVERITY|CRITICAL_SEVERITY`, `lifecycleStages` `BUILD|DEPLOY|RUNTIME`, `categories`.
- Checks by reference: image must be in a registry Central can reach (P5 "check by reference").

## 3. Placement
- **imageCheckers:** provider "ACS (Central: acme-prod)" in image Check tab; maps `failingCheck` → `status: failed`, severity → `critical|high|medium|low`.
- **menus:** pre-push hook "Block push on failing policy" (P5). **accounts:** Central API token credential. P#: **P5, P16**.

## 4. Journeys
1. **Pre-push gate.** Push `payments-api:1.5.0` → ACS check runs → 1 failing policy "Fixable Severity at least Important" → push blocked with remediation; "Push anyway" disabled. 
2. **Clean check.** After rebuild on ubi9 9.6-1760 → 0 failing, 2 informational → push proceeds.
3. **Token expired.** 401 from Central → "Re-enter API token".

## 5. Sample data
```json
{
  "results":[{
    "metadata":{"id":"sha256:7f3c1d9a5e2b48c06a1f9e7d3b5c8a2e4f6d0b1c3a5e7f9d2b4c6e8a0f1d3b5c","additionalInfo":{"name":"quay.io/acme/payments-api:1.5.0","type":"image"}},
    "summary":{"CRITICAL":0,"HIGH":2,"MEDIUM":1,"LOW":1,"TOTAL":4},
    "violatedPolicies":[
      {"name":"Fixable Severity at least Important","severity":"HIGH","description":"Alert on deployments with fixable vulnerabilities with a Severity Rating at least Important","violation":["Fixable CVE-2026-31790 (CVSS 7.5) (severity Important) found in component 'openssl-libs' (version 1:3.2.2-6.el9_5) in container 'payments-api', resolved by version 1:3.2.2-6.el9_6"],"remediation":"Use your package manager to update to a fixed version in future builds or speak with your security team to mitigate the vulnerabilities.","failingCheck":true},
      {"name":"Red Hat Package Manager in Image","severity":"LOW","description":"Alert on deployments with components of the Red Hat/Fedora/CentOS package management system.","violation":["Image includes component 'dnf' (version 4.14.0-25.el9)"],"remediation":"Run `rpm -e $(rpm -qa *dnf*)` in the image build for production containers.","failingCheck":false},
      {"name":"Latest tag","severity":"MEDIUM","description":"Alert on deployments with images using tag 'latest'","violation":["Base image 'registry.access.redhat.com/ubi9/ubi:latest'"],"remediation":"Pin base image by digest or version tag.","failingCheck":false},
      {"name":"Docker CIS 4.1: Ensure That a User for the Container Has Been Created","severity":"HIGH","description":"Containers should run as a non-root user","violation":["Container 'payments-api' has USER root"],"remediation":"Add USER 1001 to the Containerfile.","failingCheck":true}
    ]}],
  "summary":{"CRITICAL":0,"HIGH":2,"MEDIUM":1,"LOW":1,"TOTAL":4},
  "central":{"endpoint":"central-stackrox.apps.rosa.ocp-prod.x7k2.p3.openshiftapps.com:443","version":"4.10.0","checkedAt":"2026-10-08T09:04:37Z"}
}
```
