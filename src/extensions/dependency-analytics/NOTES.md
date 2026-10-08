# Red Hat Dependency Analytics (`redhat.dependency-analytics`)

## Real objects / API
Trustify DA `imageAnalysis()` report: `scanned{total,direct,transitive}`, dependencies (purl) with issues `{id, severity, cvssScore, remediation{fixedIn, trustedContent}}`.

## Auth
None (OSV source).

## Journeys
1. orders-api → 5 vulnerable dependencies (express CRITICAL).
2. netty → trusted content `4.1.118.Final-redhat-00001` → Copy Maven coordinates.

## Placement
imageCheckers (P5).

## Sources
docs/research/redhat.dependency-analytics.md
