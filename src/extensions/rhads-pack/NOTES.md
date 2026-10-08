# Red Hat Advanced Developer Suite pack (`redhat.rhads-pack`)

- **Real shape:** extension pack like `ext-redhat-pack` (`"extensionPack": [...]`) → mock `packOf`. Members: redhat-authentication, dependency-analytics, trusted-artifact-signer, trusted-profile-analyzer, conforma, preflight, rhdh-local, konflux (unknown ids on this branch are skipped by the registry).
- **Shared instance:** one "RHADS instance acme-rhads" account (RHTAS 1.4.3, TPA 2.2, RHDH) fans out to members (P16).
- **Contributes:** image tab **Supply chain** (signature + attestations, SBOM/VEX, Conforma, certification readiness, deploy gate), dashboard card **Supply chain posture** (signed / SBOM / policy %), account, command. `supply-chain.ts` holds the per-image chain state (`world.ext['acme.supply-chain']`) used by every member; `actions.ts` the tasks (sign & push, syft, TPA upload, ec validate, preflight, rebuild).
- **Journeys:** _platform-scenario.md J1 (payments-api card → rebuild → policy passes), J2/J3 (orders-api SBOM → preflight 6/8 → fix → 8/8 → sign & push → policy), J5 (ledger-worker identity mismatch blocks deploy, override with audit note).
- **P#:** P5, P6, P14, P16, P17. Sources: redhat.rhads-pack.md, _platform-scenario.md.
