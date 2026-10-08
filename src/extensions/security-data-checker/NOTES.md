# Red Hat Security Data VEX (`redhat.security-data-checker`)

## Real objects / API
`/hydra/rest/securitydata/cve/{CVE}.json` `package_state[].fix_state` (Affected, Not affected, Will not fix, Fix deferred, Out of support scope, Under investigation), `affected_release[].advisory` RHSA.

## Auth
Anonymous.

## Journeys
1. orders-api:2.3 → Security → "27 scanner matches → 6 actionable after Red Hat VEX".
2. RHSA links per finding.
3. Hardened rebuild → no unfixed CVEs.

## Placement
imageCheckers (P5).

## Sources
docs/research/redhat.security-data-vex.md
