# OpenSCAP Compliance (`redhat.openscap-checker`)

## Real objects / API
`oscap-podman <image> xccdf eval --profile xccdf_org.ssgproject.content_profile_cis_server_l1 … ssg-rhel9-ds.xml`; rule-result `pass|fail|notapplicable…`, CCE idents, score.

## Auth
Offline; oscap-podman CLI (Settings › CLI Tools).

## Journeys
1. orders-api → CIS L1 71.4% (18 fail) → Generate remediation → orders-api:2.4 at 88%.
2. Default profile in Settings › OpenSCAP.

## Placement
imageCheckers (P5), cliTools + settings (P17).

## Sources
docs/research/redhat.openscap.md
