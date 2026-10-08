# Local registry (zot / distribution)

## 1. Identity
- **Display name:** Local registry · **Extension id:** `podman-desktop.local-registry` (proposed; P13 add-on for kind/minikube/k3d too) · **Icon:** https://github.com/project-zot.png
- **Description:** One-click OCI registry on localhost:5000, wired into Podman and your local clusters.

## 2. Real objects & fields
- **zot v2.1.22** (2026-10-06): `ghcr.io/project-zot/zot:v2.1.22`, config `/etc/zot/config.json` `{storage{rootDirectory:"/var/lib/registry", gc, dedupe}, http{address:"0.0.0.0", port:"5000"}, extensions{search{enable}, ui{enable}, scrub}}`; UI on same port; supports OCI 1.1 referrers (signatures/SBOMs, P6). Alternative `docker.io/library/registry:3` (distribution v3).
- API: `GET /v2/_catalog` → `{repositories:[…]}`, `GET /v2/<repo>/tags/list`, `GET /v2/<repo>/referrers/<digest>`.
- Podman: `/etc/containers/registries.conf.d/50-pd-local.conf` → `[[registry]] location="localhost:5000" insecure=true`. kind: `containerdConfigPatches` + ConfigMap `local-registry-hosting` in `kube-public` (KEP-1755).

## 3. Placement
- **registries:** "localhost:5000 (local)" entry; **connections/service** (P8) with status; **tools:** repo/tag browser; **menus:** image "Push to local registry", cluster "Connect local registry" (P13). Used by preflight. P#: **P6, P8, P13**.

## 4. Journeys
1. Enable → zot container + registries.conf → push `orders-api:2.3` → browser shows tag + cosign referrer.
2. kind-dev → "Connect local registry" → deployment uses `localhost:5000/acme/orders-api:2.3`.

## 5. Sample data
```json
{"service":{"name":"zot","image":"ghcr.io/project-zot/zot:v2.1.22","url":"http://localhost:5000","status":"running"},
 "repositories":[{"name":"acme/orders-api","tags":["2.3","2.2"]},{"name":"acme/payments-api","tags":["1.5.0"]},{"name":"acme/ee-network","tags":["1.0"]},{"name":"charts/orders","tags":["0.4.0"],"artifactType":"application/vnd.cncf.helm.config.v1+json"}],
 "referrers":[{"subject":"acme/orders-api@sha256:7f3c1d9a","artifactType":"application/vnd.dev.sigstore.bundle.v0.3+json"},{"subject":"acme/orders-api@sha256:7f3c1d9a","artifactType":"application/vnd.cyclonedx+json"}]}
```
