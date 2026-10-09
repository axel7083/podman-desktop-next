# Red Hat Advanced Developer Suite pack (R25)

## 1. Identity
- **Display name:** Red Hat Advanced Developer Suite
- **Extension id:** `redhat.rhads-pack` (proposed extension pack, like `../ext-redhat-pack/`)
- **Icon:** `../ext-redhat-pack/icon.png`
- **Description:** Trusted software supply chain on your laptop: dependency analytics, signing, SBOM analysis, policy and Developer Hub.

## 2. Real objects & fields
- **Product:** [RHADS](https://www.redhat.com/en/products/advanced-developer-suite) bundles Red Hat Developer Hub, Trusted Profile Analyzer, Trusted Artifact Signer (+ Dependency Analytics); **Trusted Libraries** tech preview since Feb 2026 ([blog](https://developers.redhat.com/blog/2026/02/27/red-hat-trusted-libraries-trust-and-integrity-your-software-supply-chain)), built on Konflux with SLSA L3 provenance.
- **Pack manifest** (same shape as ext-redhat-pack `package.json`): `"extensionPack": ["redhat.redhat-authentication", "redhat.dependency-analytics", "redhat.trusted-artifact-signer", "redhat.trusted-profile-analyzer", "redhat.conforma", "redhat.rhdh-local", "redhat.konflux"]`.
- Shared config: one **RHADS instance** profile `{ssoIssuer, tufUrl, rekorUrl, fulcioUrl, tpaUrl, rhdhUrl}` discovered from the RHDH `/api/...` or entered once.

## 3. Placement
- Extensions catalog "Packs"; **accounts:** single "RHADS instance" entry fan-out to members (P16). **dashboardCards:** "Supply chain posture" (signed %, SBOM uploaded %, policy pass %). P#: **P5, P6, P16, P17**.

## 4. Journeys
1. **Install pack** → 7 extensions → one SSO sign-in configures TAS/TPA/Conforma.
2. **Image "Supply chain" view:** `payments-api:1.5.0` → Signed ✓, SBOM in TPA ✓, Conforma 1 violation → drill into each extension's tab.

## 5. Sample data
```json
{"instance":{"name":"acme-rhads","ssoIssuer":"https://sso.acme-corp.com/realms/trusted-artifact-signer","tpaUrl":"https://tpa.apps.ocp.acme-corp.com","tufUrl":"https://tuf-trusted-artifact-signer.apps.ocp.acme-corp.com","rhdhUrl":"https://developer-hub.apps.ocp.acme-corp.com"},
 "members":[
  {"id":"redhat.dependency-analytics","state":"active"},
  {"id":"redhat.trusted-artifact-signer","state":"active","version":"0.1.0"},
  {"id":"redhat.trusted-profile-analyzer","state":"active"},
  {"id":"redhat.conforma","state":"active"},
  {"id":"redhat.rhdh-local","state":"inactive"},
  {"id":"redhat.konflux","state":"active"}],
 "posture":{"images":12,"signed":7,"sbomUploaded":5,"policyPassing":3}}
```
