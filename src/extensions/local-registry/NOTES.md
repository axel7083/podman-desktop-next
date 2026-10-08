# Local registry (`podman-desktop.local-registry`)

- **Objects:** zot v2.1.22 `ghcr.io/project-zot/zot:v2.1.22` on :5000; `GET /v2/_catalog`, `/v2/<repo>/tags/list`, `/v2/<repo>/referrers/<digest>`; Podman `registries.conf.d/50-pd-local.conf` insecure; kind `containerdConfigPatches` + ConfigMap `local-registry-hosting` (KEP-1755).
- **Contributes:** service connection `zot (localhost:5000)` with **Repositories** section (tags, OCI referrers: signatures, SBOMs, Helm charts), registry entry, image menu "Push to local registry" (task), kind add-on "Local registry", zot container seed. Used by preflight.
- **P#:** P6, P8, P13. Source: podman-desktop.local-registry.md.
