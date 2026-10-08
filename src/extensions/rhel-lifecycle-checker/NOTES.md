# RHEL Lifecycle (`redhat.rhel-lifecycle-checker`)

## Real objects / API
Planning API `/api/roadmap/v1/lifecycle/rhel/{major}/{minor}` and `/app-streams/{major}` (`support_status Supported|Near retirement|Retired`, `end_date`).

## Auth
SSO scope `api.console`.

## Journeys
1. legacy-portal → Node.js 18 Retired.
2. orders-api → python3.11 Near retirement.
3. rhel-9 / rhel9-db details show "Near retirement (2026-11-30)".

## Placement
imageCheckers (P5).

## Sources
docs/research/redhat.rhel-lifecycle.md
