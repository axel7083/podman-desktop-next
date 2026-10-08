# Helm (`podman-desktop.helm`, proposed)

## Real objects & fields
- Helm v4.3.0. `helm list -A -o json` → `{name, namespace, revision, updated, status, chart, app_version}`; `helm history <r> -o json`.
- Status enum: unknown, deployed, uninstalled, superseded, failed, uninstalling, pending-install, pending-upgrade, pending-rollback.
- Storage: Secrets `sh.helm.release.v1.<name>.v<rev>` (label `owner=helm`).
- Artifact Hub `GET /api/v1/packages/search?ts_query_web=…&kind=0` → `{packages: [{package_id, name, version, app_version, description, stars, repository{name, url, verified_publisher, official, organization_name}}]}`. OCI charts: `helm install x oci://quay.io/acme/charts/orders --version 0.4.0`.

## Mock
- Data in `world.ext['podman-desktop.helm'].revisions[<connId>]` (history rows); the release list is the latest revision per release.
- Nav section "Helm releases" under every Kubernetes connection (counter); kind-dev seeded (orders rev 4 failed, ingress-nginx, kube-prometheus-stack pending-upgrade, cert-manager failed, valkey pending-install); others show an empty state with "Browse charts".
- Release details (`?release=<ns>/<name>`): summary, history table, "Rollback to revision N" (task → new revision deployed, previous superseded), "Uninstall release" (confirmation → task).
- Tool "Helm charts": Artifact Hub search with stars / Official / Verified publisher / OCI badges; Install dialog (cluster, release name, namespace, values YAML) → task `pending-install → deployed`.
- CLI tool helm 4.3.0, command "Helm: Install chart".

## Journeys
1. kind-dev › Helm releases → `orders` failed rev 4 → Rollback to 3 → rev 5 deployed.
2. Helm charts → search "valkey" → Install → kind-dev › Helm releases shows it deployed.

## Placement + P#
navSections (**P2**), release actions on a contributed resource (**P4**), OCI charts as artifacts (**P7**), tool (P3).

## Sources
`docs/research/podman-desktop.helm.md`.
