# Scenario: Platform engineer / supply chain

## Story
**Priya Nair**, platform engineer at ACME Corp, owns the "golden path" for container images. ACME bought **Red Hat Advanced Developer Suite**: RHTAS + TPA + Developer Hub on OpenShift, builds in **Konflux** (tenant `acme-tenant`), release gate = **Conforma** `@redhat`. Some images are also shipped to customers, so they must pass **preflight** certification. She wants Podman Desktop to show, per image, "signed? SBOM'd? policy-clean? certifiable?" before anything reaches Quay.

## Fixtures (world seed)
- **Accounts:** Red Hat SSO `priya@acme-corp.com`; RHADS instance `acme-rhads` (RHTAS 1.4.3, TPA 2.2, RHDH); Quay org `acme`; Konflux kube context `konflux-acme` (namespace `acme-tenant`).
- **Connections:** `podman-machine-default`, `kind-dev` (local registry connected), `konflux-acme` (navSections Applications/Components/PipelineRuns/Snapshots/Releases).
- **Local registry:** zot `localhost:5000`.
- **Images:** `quay.io/acme/payments-api:1.5.0` (Konflux-built, CI-signed + SLSA provenance, Conforma 1 violation `cve.cve_blockers`), `quay.io/acme/orders-api:2.3` (local build, unsigned, preflight 6/8: HasLicense + RunAsNonRoot fail), `quay.io/acme/ledger-worker` (identity mismatch), `quay.io/acme/legacy-portal:1.9` (no signature, not UBI).
- **Konflux:** application `payments` (2 components), failed run `payments-api-on-push-7k2xq`, snapshot `payments-20261008-0912`, release `payments-1-5-0-rel-x8wp`.
- **Tools:** cosign 3.1.3, ec, preflight 1.21.1, syft, trivy 0.75.0 (pinned). Data: `redhat.trusted-artifact-signer.md`, `redhat.trusted-profile-analyzer.md`, `redhat.conforma.md`, `redhat.preflight.md`, `redhat.konflux.md`.

## 5 most impressive journeys
1. **Image supply-chain card.** Images › `payments-api:1.5.0` → "Supply chain" tab: Signed by CI workflow (Rekor 48190021 ✓), SLSA provenance ✓, SBOM in TPA ✓, Conforma 41/2/1 → click violation → CVE-2026-31790 fixed in RHSA-2026:4412.
2. **Make a local image release-ready.** `orders-api:2.3` → Generate SBOM → upload to TPA (6 affected after VEX) → fix → rebuild → push with "Sign after push" (browser SSO) → Conforma re-run → `success: true`.
3. **Certification readiness.** `orders-api:2.3` → Run certification checks (auto push to zot) → HasLicense/RunAsNonRoot suggestions → one-click Containerfile patch → 8/8 + certification hash → Submit.
4. **From Konflux failure to local fix.** `konflux-acme` › payments › PipelineRun failed at `sast-snyk-check` → logs → open repo → fix → push → new run `Running → Succeeded` → Snapshot → Release `Succeeded`.
5. **Verify before you run.** Pull `ledger-worker` → Signature check error "identity mismatch" → Deploy to `kind-dev` blocked by error-severity check (P5) with override audit note.
