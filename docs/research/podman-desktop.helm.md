# Helm (O7)

## 1. Identity
- **Display name:** Helm · **Extension id:** `podman-desktop.helm` (proposed) · **Icon:** https://github.com/helm.png
- **Description:** Browse Artifact Hub, install charts into your Kubernetes contexts and manage releases.

## 2. Real objects & fields
- **Helm v4.3.0** (2026-09-09; Helm 4 line). `helm list -A -o json` → `[{name, namespace, revision (string), updated, status, chart, app_version}]`; `helm history <r> -o json`; `helm install|upgrade|rollback|uninstall`; OCI charts `helm install x oci://quay.io/acme/charts/orders --version 0.4.0`.
- **Release status enum:** `unknown|deployed|uninstalled|superseded|failed|uninstalling|pending-install|pending-upgrade|pending-rollback`. Storage: Secrets `sh.helm.release.v1.<name>.v<rev>` (label `owner=helm`).
- **Artifact Hub:** `GET https://artifacthub.io/api/v1/packages/search?ts_query_web=valkey&kind=0&limit=20` → `{packages:[{package_id, name, version, app_version, description, stars, repository:{name, url, verified_publisher, official, organization_name}}]}`; also `https://charts.openshift.io`.

## 3. Placement
- **navSections** under each Kubernetes connection: "Helm releases" (P2, P4); **tools:** "Chart catalog" (Artifact Hub search); **menus:** release Upgrade/Rollback/Uninstall, "Values diff". OCI charts appear as artifacts (P7). P#: **P2, P4, P7**.

## 4. Journeys
1. kind-dev › Helm releases → Install `bitnami/valkey`… from catalog → values form → `pending-install → deployed`.
2. `orders` rev 4 `failed` → history → Rollback to 3 → rev 5 `deployed`, rev 4 `superseded`.

## 5. Sample data
```json
[{"name":"orders","namespace":"orders","revision":"5","updated":"2026-10-08 09:14:02.1 +0000 UTC","status":"deployed","chart":"orders-0.4.0","app_version":"2.3"},
 {"name":"orders","namespace":"orders","revision":"4","status":"superseded","chart":"orders-0.4.0","app_version":"2.3"},
 {"name":"ingress-nginx","namespace":"ingress-nginx","revision":"1","status":"deployed","chart":"ingress-nginx-4.13.3","app_version":"1.13.3"},
 {"name":"kube-prometheus-stack","namespace":"monitoring","revision":"2","status":"pending-upgrade","chart":"kube-prometheus-stack-78.2.1","app_version":"v0.86.0"},
 {"name":"cert-manager","namespace":"cert-manager","revision":"3","status":"failed","chart":"cert-manager-v1.19.1","app_version":"v1.19.1"},
 {"name":"valkey","namespace":"cache","revision":"1","status":"pending-install","chart":"valkey-3.0.31","app_version":"9.1.2"}]
```
