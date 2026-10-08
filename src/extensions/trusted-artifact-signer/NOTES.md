# Trusted Artifact Signer (`redhat.trusted-artifact-signer`)

- **Objects:** RHTAS 1.4.3 (Fulcio + Rekor + TUF), cosign 3.1.3 (sigstore bundle v0.3 as OCI 1.1 referrers). `cosign sign -y img@digest` (browser OIDC, realm `trusted-artifact-signer`), `cosign verify --certificate-identity … --certificate-oidc-issuer …` → `{critical, optional{Issuer, Subject, Bundle{logIndex…}}}`; Rekor `GET /api/v1/log/entries?logIndex=N` with inclusion proof.
- **Contributes:** image checker "Signature (RHTAS)" (ruleId `signature.verified|missing|identity-mismatch`, mismatch = critical → blocks deploy), image badge (✓ signed / unsigned / ✗ identity mismatch / ✓ Red Hat), menus "Sign & push…" (dialog: registry, sign after push, attach SBOM attestation) and "Sign image", account, cliTools cosign/gitsign/rekor-cli, settings (TUF, issuer, format).
- **Journeys:** sign on push of orders-api:2.3 (Rekor ~48213377); verify payments-api (CI workflow + bob.ops, Rekor 48190021 / 48190555); ledger-worker identity mismatch.
- **P#:** P5, P6, P14, P16, P17. Source: redhat.trusted-artifact-signer.md.
