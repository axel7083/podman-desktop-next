# Red Hat Satellite (`redhat.satellite`)

## Real objects / API
Katello: content views (`name, latest_version, environments`), activation keys (`content_view, environment, max_hosts, usage_count`), registry paths `<org>/<env>/<cv>/<product>/<repo>`.

## Auth
Satellite user + Personal Access Token (own account, not SSO).

## Journeys
1. Settings › Satellite → content views, keys, Pull from Satellite registry.
2. RHEL machine/VM wizard and Subscription tab: "Register with Satellite" + key rhel10-dev (wrong key → 422 inline error with fix).

## Placement
registries + accounts (P16), settings (P17).

## Sources
docs/research/redhat.satellite.md
