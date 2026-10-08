# Trusted Profile Analyzer (`redhat.trusted-profile-analyzer`)

- **Objects:** TPA 2.2 / Trustify `/api/v2`: `POST /sbom` → `{id, document_id}`, `GET /sbom/{id}/advisory`, `POST /vulnerability/analyze`, `POST /purl/recommend`; `PurlStatus{vulnerability, advisory, status: affected|fixed|not_affected|under_investigation, fixed_versions}`. SBOM from `syft scan podman:<img> -o cyclonedx-json`.
- **Contributes:** image tab **SBOM** (generate → upload → findings by purl with VEX filter + Recommend), checker "TPA (SBOM + VEX)" (only once uploaded), menus Generate / Upload, tool **Trusted Profile Analyzer** (org SBOMs, purl search `pkg:rpm/redhat/openssl-libs` → 7 SBOMs), account, syft CLI, settings.
- **Journeys:** orders-api:2.3 → 412 packages → 14 vulns, 6 affected / 8 not affected; purl search.
- **P#:** P5, P6, P14, P16. Source: redhat.trusted-profile-analyzer.md.
