# Red Hat Trusted Artifact Signer (RHTAS) — sign on push, verify badge (R20)

## 1. Identity
- **Display name:** Trusted Artifact Signer
- **Extension id:** `redhat.trusted-artifact-signer` (proposed; RHADS)
- **Icon:** https://github.com/sigstore.png (Sigstore); fallback `/home/astefani/github/podman-desktop/ext-redhat-account/icon.png`
- **Description:** Keyless-sign images with your org's RHTAS (Fulcio + Rekor + TUF) on push, and show who signed what on every image.

## 2. Real objects & fields
- **Product:** RHTAS **1.4** (1.4.3 released 2026-08-05; HA services + Sigstore Policy Controller; operator on OCP 4.17–4.22) — [release notes](https://docs.redhat.com/en/documentation/red_hat_trusted_artifact_signer/1.4/html/release_notes/introduction). Upstream `cosign` **v3.1.3** (2026-08-06; v3 defaults to the new Sigstore bundle format, stored as OCI 1.1 referrers).
- **Client setup:** binaries from the RHTAS `cli-server` route (`/clients/linux/cosign-amd64.gz`, `gitsign`, `rekor-cli`, `ec`); `cosign initialize --mirror=$TUF_URL --root=$TUF_URL/root.json`. Env: `COSIGN_FULCIO_URL`, `COSIGN_REKOR_URL`, `COSIGN_MIRROR`, `COSIGN_ROOT`, `COSIGN_OIDC_ISSUER`, `COSIGN_OIDC_CLIENT_ID=trusted-artifact-signer`, `COSIGN_CERTIFICATE_IDENTITY`, `COSIGN_CERTIFICATE_OIDC_ISSUER`.
- **Sign:** `cosign sign -y quay.io/acme/orders-api@sha256:…` (browser OIDC to RHBK/Keycloak realm `trusted-artifact-signer`; Fulcio issues a ~10 min cert, SAN = email, ext `1.3.6.1.4.1.57264.1.8` = issuer).
- **Verify:** `cosign verify --certificate-identity=alice.dev@acme-corp.com --certificate-oidc-issuer=https://sso.acme-corp.com/realms/trusted-artifact-signer <img>` → JSON `[{critical:{identity:{"docker-reference"}, image:{"docker-manifest-digest"}, type:"cosign container image signature"}, optional:{Issuer, Subject, Bundle:{SignedEntryTimestamp, Payload:{body, integratedTime, logIndex, logID}}}}]`.
- **Rekor entry:** `GET $REKOR/api/v1/log/entries?logIndex=N` → `{<uuid>:{body(base64 hashedrekord|dsse), integratedTime, logID, logIndex, verification:{inclusionProof:{checkpoint, hashes, logIndex, rootHash, treeSize}, signedEntryTimestamp}}}`.

## 3. Placement
- **accounts:** "RHTAS instance" (TUF URL + OIDC issuer; reuses Keycloak session, P16). **cliTools:** cosign / gitsign / rekor-cli from cli-server.
- **imageCheckers:** "Signature" (P5+P6: `ruleId: signature.verified|missing|identity-mismatch`). **tabs:** image "Signatures & attestations" (P6, P14). **columns:** shield badge in image list. **menus:** image "Sign", push dialog "Sign after push". P#: **P5, P6, P14, P16, P17**.

## 4. Journeys
1. **Sign on push.** Push `orders-api:2.3` to quay.io/acme with "Sign after push" → browser SSO → task: push → Fulcio cert → Rekor `logIndex 48213377` → badge "Signed by alice.dev@acme-corp.com".
2. **Verify a pulled image.** Pull `quay.io/acme/payments-api:1.5.0` → Signatures tab: 2 signatures (CI `https://github.com/acme/payments/.github/workflows/release.yml@refs/tags/v1.5.0` issuer `https://token.actions.githubusercontent.com`; human) → open Rekor entry → inclusion proof OK.
3. **Failure:** `legacy-portal:1.9` → "No signature"; identity mismatch on a tampered tag → error check blocks "Deploy to Kubernetes".

## 5. Sample data
```json
{
  "instance":{"tufUrl":"https://tuf-trusted-artifact-signer.apps.ocp.acme-corp.com","fulcioUrl":"https://fulcio-server-trusted-artifact-signer.apps.ocp.acme-corp.com","rekorUrl":"https://rekor-server-trusted-artifact-signer.apps.ocp.acme-corp.com","oidcIssuer":"https://sso.acme-corp.com/realms/trusted-artifact-signer","version":"1.4.3"},
  "signatures":[
    {"image":"quay.io/acme/orders-api@sha256:7f3c1d9a5e2b48c0","subject":"alice.dev@acme-corp.com","issuer":"https://sso.acme-corp.com/realms/trusted-artifact-signer","logIndex":48213377,"integratedTime":1791450123,"bundleFormat":"sigstore-bundle-v0.3","verified":true},
    {"image":"quay.io/acme/payments-api@sha256:2a9e4c7b1d3f5a8c","subject":"https://github.com/acme/payments/.github/workflows/release.yml@refs/tags/v1.5.0","issuer":"https://token.actions.githubusercontent.com","logIndex":48190021,"integratedTime":1791371312,"verified":true},
    {"image":"quay.io/acme/payments-api@sha256:2a9e4c7b1d3f5a8c","subject":"bob.ops@acme-corp.com","issuer":"https://sso.acme-corp.com/realms/trusted-artifact-signer","logIndex":48190555,"integratedTime":1791372001,"verified":true},
    {"image":"quay.io/acme/ledger-worker@sha256:9c0de1f2a3b4c5d6","subject":"ci-bot@acme-corp.com","issuer":"https://sso.acme-corp.com/realms/trusted-artifact-signer","logIndex":47002310,"verified":false,"error":"certificate identity mismatch: expected release@acme-corp.com"},
    {"image":"quay.io/acme/legacy-portal:1.9","verified":false,"error":"no signatures found"}
  ],
  "attestations":[
    {"image":"quay.io/acme/payments-api@sha256:2a9e4c7b1d3f5a8c","predicateType":"https://slsa.dev/provenance/v1","logIndex":48190022},
    {"image":"quay.io/acme/payments-api@sha256:2a9e4c7b1d3f5a8c","predicateType":"https://cyclonedx.org/bom","logIndex":48190023}
  ]
}
```
