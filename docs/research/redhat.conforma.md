# Conforma (Enterprise Contract) — `ec validate image` policy gate (R22)

## 1. Identity
- **Display name:** Conforma policy check
- **Extension id:** `redhat.conforma` (proposed; `ec` CLI ships with RHTAS cli-server)
- **Icon:** https://github.com/conforma.png
- **Description:** Validate an image's signature, SLSA provenance and attestations against your release policy before you ship it.

## 2. Real objects & fields
- **CLI** ([ec validate image](https://conforma.dev/docs/cli/ec_validate_image.html)): `ec validate image --image quay.io/acme/payments-api@sha256:… --policy ./policy.yaml --certificate-identity … --certificate-oidc-issuer … [--public-key k8s://acme-tenant/cosign-pub] --output json --info --show-successes`. `--images snapshot.json` accepts a Konflux Snapshot spec. Output formats: `json, yaml, text, appstudio, summary, summary-markdown, junit, attestation, policy-input, vsa`. Upstream [conforma/cli](https://github.com/conforma/cli) publishes rolling `snapshot` releases (no semver tag in 2026).
- **Policy** (`EnterpriseContractPolicy` CR or YAML): `sources[{name, policy:["github.com/conforma/policy//policy/lib","github.com/conforma/policy//policy/release"], data:["github.com/release-engineering/rhtap-ec-policy//data"], config:{include:["@redhat"|"@minimal"|"@slsa3"], exclude:[…]}}]`, `publicKey`, `identity{subject, issuer}`.
- **Report JSON:** `{success, "ec-version", "effective-time", key, policy, components:[{name, containerImage, source, success, signatures[{keyid, sig}], attestations[{type, predicateType, signatures}], violations[], warnings[], successes[]}]}`; each result `{msg, metadata:{code, title, description, solution, collections[], term?, effective_on?}}`.
- **Real rule codes:** `builtin.image.signature_check`, `builtin.attestation.signature_check`, `builtin.attestation.syntax_check`, `attestation_type.known_attestation_type`, `slsa_provenance_available.attestation_predicate_type_accepted`, `trusted_task.trusted`, `tasks.required_tasks_found`, `test.test_results_found`, `cve.cve_blockers`, `cve.cve_warnings`, `labels.required_labels`, `base_image_registries.base_image_permitted`.

## 3. Placement
- **imageCheckers** (P5 `ruleId`=code, severity from violation/warning, by reference; P6 needs attestations). **tabs:** image "Policy" tab (grouped successes / warnings / violations, solution text). **menus:** "Validate release policy" on image and on Konflux Snapshot. **settings:** policy source (git URL / k8s ref). P#: **P5, P6, P14**.

## 4. Journeys
1. **Pre-release gate.** `payments-api:1.5.0` (signed in CI) → Validate with `@redhat` → 41 successes, 2 warnings, 1 violation `cve.cve_blockers` (CVE-2026-31790) → solution "rebuild on ubi9 9.8" → rebuild → re-run → `success: true`.
2. **Locally built image.** `orders-api:2.3` (no provenance) → `builtin.image.signature_check` + `attestation_type.known_attestation_type` violations → CTA "Sign with RHTAS" / "Build in Konflux".
3. **Snapshot validation.** Konflux Snapshot `payments-20261008-0912` → validate both components → junit view.

## 5. Sample data
```json
{"success":false,"ec-version":"v0.8.71","effective-time":"2026-10-08T09:30:00Z","components":[
 {"name":"payments-api","containerImage":"quay.io/acme/payments-api@sha256:2a9e4c7b1d3f5a8c0e2b4d6f8a1c3e5b7d9f0a2c4e6b8d1f3a5c7e9b0d2f4a6c","success":false,
  "violations":[
   {"msg":"Found \"CVE-2026-31790\" vulnerability of high security level","metadata":{"code":"cve.cve_blockers","title":"Blocking CVE check","collections":["minimal","redhat"],"term":"CVE-2026-31790","solution":"Make sure to address any CVE's categorized as 'critical' or 'high'."}}],
  "warnings":[
   {"msg":"Found \"CVE-2026-0915\" vulnerability of medium security level","metadata":{"code":"cve.cve_warnings","term":"CVE-2026-0915"}},
   {"msg":"The \"maintainer\" label is deprecated, use \"vendor\"","metadata":{"code":"labels.deprecated_labels","term":"maintainer"}}],
  "successes":[
   {"msg":"Pass","metadata":{"code":"builtin.image.signature_check"}},
   {"msg":"Pass","metadata":{"code":"builtin.attestation.signature_check"}},
   {"msg":"Pass","metadata":{"code":"attestation_type.known_attestation_type"}},
   {"msg":"Pass","metadata":{"code":"trusted_task.trusted"}},
   {"msg":"Pass","metadata":{"code":"tasks.required_tasks_found"}},
   {"msg":"Pass","metadata":{"code":"labels.required_labels"}}]},
 {"name":"orders-api","containerImage":"quay.io/acme/orders-api@sha256:7f3c1d9a5e2b48c0","success":false,
  "violations":[
   {"msg":"No image signatures found matching the given public key or identity","metadata":{"code":"builtin.image.signature_check"}},
   {"msg":"Missing attestation of known type","metadata":{"code":"attestation_type.known_attestation_type"}}],
  "warnings":[],"successes":[]}]}
```
