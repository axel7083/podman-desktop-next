# Conforma (`redhat.conforma`)

- **Objects:** `ec validate image --image … --policy … --output json` → `{success, components[{violations, warnings, successes}]}`; results `{msg, metadata{code, title, solution, term}}`; real codes `builtin.image.signature_check`, `attestation_type.known_attestation_type`, `cve.cve_blockers`, `cve.cve_warnings`, `labels.deprecated_labels`, `base_image_registries.base_image_permitted`…
- **Contributes:** checker (violations high, warnings low), image tab **Policy** (grouped, solutions, Validate again), menu "Validate release policy", `ec` CLI, settings (policy source, collection, identity). Report computed from the shared chain state and snapshotted on each run.
- **Journeys:** payments-api 41/2/1 (`cve.cve_blockers` CVE-2026-31790) → rebuild on ubi9 9.8 → success; orders-api signature + attestation violations → sign with SBOM attestation → success.
- **P#:** P5, P6, P14. Source: redhat.conforma.md.
