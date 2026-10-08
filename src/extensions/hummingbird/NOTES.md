# Hummingbird (`redhat.hummingbird`)

## Real objects / API
api-hummingbird `ImageSummary{name, latest_tag, architectures, vulnerabilities}`; local image → alternative (`quay.io/hummingbird/python:3.12`).

## Auth
Anonymous.

## Journeys
1. orders-api → Hardened alternative 27 → 0 CVEs, −68% → Rebuild on hardened image → `orders-api-hb` running next to `orders-api`.
2. Tools › Hardened images catalog + suggestions; image kebab menu.

## Placement
imageCheckers (P5), tools (P3), image kebab (P14).

## Sources
docs/research/redhat.hummingbird.md, ext-hummingbird
