# Trivy (`podman-desktop.trivy`)

- **Objects:** `trivy image --format json --scanners vuln,secret --image-src podman <img>` → `Results[{Target, Class, Vulnerabilities[{VulnerabilityID, PkgName, InstalledVersion, FixedVersion, Status, Severity}]}]`.
- **Pinned:** v0.75.0 by sha256 + cosign-verified; 0.69.4–0.69.6 refused (March 2026 supply-chain compromise, CVE-2026-33634).
- **Contributes:** image checker, CLI tool row "Trivy (pinned v0.75.0 · verified ✓)" with the refusal note, settings (binary, scanners, VEX).
- **P#:** P5, P17. Source: podman-desktop.trivy.md.
