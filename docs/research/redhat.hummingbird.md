# Red Hat Hardened Images (Project Hummingbird) — rebase suggestions (R23)

## 1. Identity
- **Display name:** Hummingbird (product: Red Hat Hardened Images, GA 2026)
- **Extension id:** `redhat.hummingbird` (real; `ext-hummingbird/packages/extension/package.json`)
- **Icon:** `../ext-hummingbird/packages/extension/icon.png`
- **Description:** Catalog of minimal hardened images; detects local images/containers with a hardened alternative and clones them onto it.

## 2. Real objects & fields (`ext-hummingbird/packages/extension/src/lib`)
- API `https://api-hummingbird.hummingbird-project.io` (generated client `generated/hummingbird-project.ts`): `ImageSummary{name, description, application_category, architectures[], latest_tag, deprecated_streams?, oldest_created?}`, `ImageResponse` (+ tags, SBOM per arch `ArchSbom`), `VulnerabilitiesSummary{critical, high, medium, low, negligible, total}`, `CatalogVulnerabilitiesSummary{critical, high, low, images_scanned, images_with_cves}`.
- Local models: `LocalImage{id, engineId, name, tag, size, architecture, containers[]}`, `LocalImageAlternative{localImage, alternative: ImageSummary}`, `OptimisationReport{image:{inspect, sbom{count,packages}, vulnerabilities, containers}, alternative:{image, sbom, tags, vulnerabilities}}`, `clone.ts` (container config → new image).
- Registries: upstream `quay.io/hummingbird/<name>` (validated in `image-service.ts:39`); productized in Red Hat catalog namespace `hi/` (e.g. `catalog.redhat.com/…/hi/go`, `hi/git`, `hi/static`), >45 images / 150 variants. Pairs with Grype for CVE compare.

## 3. Placement
- **imageCheckers** (P5) "Hardened alternative available: hi/python 3.12 — 0 CVEs vs 23, −68% size". **tools:** Hummingbird catalog page (D). **menus:** container kebab "Clone onto hardened image"; image kebab "Compare with alternative". P#: **P5, P3, P10**.

## 4. Journeys
1. **Rebase suggestion.** Images > `orders-api:2.3` (FROM ubi9/python-311) → Checks: alternative `hummingbird/python:3.12` → Compare (size 412 MB → 131 MB; CVEs 27 → 0) → "Show Containerfile diff" (`FROM quay.io/hummingbird/python:3.12` + multi-stage builder).
2. **Clone container.** Containers > `orders-api` → Clone onto hardened image → pick tag → new container `orders-api-hb` running side by side.
3. **Failure:** distroless alternative lacks shell → clone warns "Entrypoint uses /bin/sh; not present in hardened image"; arch mismatch (arm64 only) → disabled.

## 5. Sample data
```json
[
  {"name":"python","description":"Minimal Python runtime","application_category":"language-runtime","architectures":["amd64","arm64"],"latest_tag":"3.12","deprecated_streams":["3.9"],"vulnerabilities":{"critical":0,"high":0,"medium":0,"low":0,"negligible":1,"total":1},"size":137363456},
  {"name":"nodejs","description":"Minimal Node.js runtime","application_category":"language-runtime","architectures":["amd64","arm64"],"latest_tag":"22","vulnerabilities":{"critical":0,"high":0,"medium":0,"low":0,"negligible":0,"total":0},"size":121634816},
  {"name":"openjdk","description":"OpenJDK runtime","application_category":"language-runtime","architectures":["amd64","arm64"],"latest_tag":"21","vulnerabilities":{"critical":0,"high":0,"medium":1,"low":0,"negligible":2,"total":3},"size":189792256},
  {"name":"nginx","description":"Hardened NGINX web server","application_category":"web-server","architectures":["amd64","arm64"],"latest_tag":"1.28","vulnerabilities":{"critical":0,"high":0,"medium":0,"low":0,"negligible":0,"total":0},"size":38797312},
  {"name":"postgresql","description":"Hardened PostgreSQL","application_category":"database","architectures":["amd64"],"latest_tag":"17","vulnerabilities":{"critical":0,"high":0,"medium":0,"low":1,"negligible":0,"total":1},"size":152043520},
  {"name":"go","description":"Go toolchain builder","application_category":"builder","architectures":["amd64","arm64"],"latest_tag":"1.25","vulnerabilities":{"total":0},"size":284164096},
  {"name":"static","description":"Minimal base for static binaries","application_category":"base","architectures":["amd64","arm64"],"latest_tag":"latest","vulnerabilities":{"total":0},"size":3145728},
  {"alternativeReport":{"localImage":{"id":"sha256:4b9e…","engineId":"podman.podman-machine-default","name":"quay.io/acme/orders-api","tag":"2.3","size":431996928,"architecture":"amd64","containers":[{"id":"c1a2…","name":"orders-api","state":"running"}]},"localVulns":{"critical":1,"high":6,"medium":12,"low":8,"total":27},"alternative":"quay.io/hummingbird/python:3.12"}}
]
```
