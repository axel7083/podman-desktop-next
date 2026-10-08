# Assets

All extension icons are copied unchanged from the local clones under
`~/github/podman-desktop/` (Apache-2.0 repositories unless noted in the
upstream repo). File name = real extension id (`publisher.name` from the
extension's `package.json`).

| File (`static/icons/`) | Source (relative to `~/github/podman-desktop/`) |
|---|---|
| `redhat.ai-lab.png` | `ext-ai-lab/packages/backend/icon.png` |
| `redhat.apple-container.png` | `ext-apple-container/icon.png` |
| `redhat.bootc.png` | `ext-bootc/packages/backend/icon.png` |
| `redhat.openshift-local.png` | `ext-crc/icon.png` |
| `podman-desktop.github-account.png` | `ext-github/icon.png` |
| `podman-desktop.grype.png` | `ext-grype/packages/backend/icon.png` |
| `redhat.hummingbird.png` | `ext-hummingbird/packages/extension/icon.png` |
| `redhat.ibmcloud-account.png` | `ext-ibmcloud-account/icon.png` |
| `redhat.openshift-checker.png` | `ext-image-checker-openshift/podman-desktop-extension/icon.png` |
| `podman-desktop.kind-ext.png` | `ext-kind/icon.png` |
| `podman-desktop.kreate.png` | `ext-kreate/packages/backend/icon.png` |
| `podman-desktop.kubernetes-contexts.png` | `ext-kubernetes-contexts/packages/extension/icon.png` |
| `podman-desktop.kubernetes-dashboard.png` | `ext-kubernetes-dashboard/packages/extension/icon.png` |
| `podman-desktop.layers-explorer.png` | `ext-layers-explorer/icon.png` |
| `minc-org.minc.png` | `ext-minc/icon.png` |
| `minc-org.minc-logo.png` | `ext-minc/logo.png` |
| `minc-org.minc-logo-dark.png` | `ext-minc/logo-dark.png` |
| `podman-desktop.minikube.png` | `ext-minikube/icon.png` |
| `podman-desktop.minikube-logo-dark.png` | `ext-minikube/logo-dark.png` |
| `podman-desktop.minikube-logo-light.png` | `ext-minikube/logo-light.png` |
| `podman-desktop.kubernetes-pack.png` | `ext-pack-kubernetes/icon.png` |
| `podman-desktop.quadlet.png` | `ext-podman-quadlet/packages/backend/icon.png` |
| `podman-desktop.postgresql.png` | `ext-postgresql/packages/backend/icon.png` |
| `redhat.redhat-authentication.png` | `ext-redhat-account/icon.png` |
| `redhat.rhel-lightspeed.png` | `ext-redhat-lightspeed/packages/extension/icon.png` |
| `redhat.redhat-pack.png` | `ext-redhat-pack/icon.png` |
| `redhat.rhel-vms.png` | `ext-rhel/icon.png` |
| `redhat.redhat-sandbox.png` | `ext-sandbox/icon.png` |
| `podman-desktop.podman.png` | `podman-desktop/extensions/podman/packages/extension/icon.png` |
| `podman-desktop.podman-logo.png` | `podman-desktop/extensions/podman/packages/extension/logo.png` |
| `podman-desktop.docker.png` | `podman-desktop/extensions/docker/packages/extension/icon.png` |
| `podman-desktop.docker-logo.png` | `podman-desktop/extensions/docker/packages/extension/logo.png` |
| `podman-desktop.compose.png` | `podman-desktop/extensions/compose/icon.png` |
| `podman-desktop.kind.png` | `podman-desktop/extensions/kind/icon.png` |
| `podman-desktop.kind-logo-dark.png` | `podman-desktop/extensions/kind/logo-dark.png` |
| `podman-desktop.kind-logo-light.png` | `podman-desktop/extensions/kind/logo-light.png` |
| `podman-desktop.kube-context.png` | `podman-desktop/extensions/kube-context/icon.png` |
| `podman-desktop.kubectl-cli.png` | `podman-desktop/extensions/kubectl-cli/icon.png` |
| `podman-desktop.lima.png` | `podman-desktop/extensions/lima/icon.png` |
| `podman-desktop.podman-docker-context.png` | `podman-desktop/extensions/podman-docker-context/icon.png` |
| `podman-desktop.registries.png` | `podman-desktop/extensions/registries/icon.png` |
| `podman-desktop.skills.png` | `podman-desktop/extensions/skills/builtin/skills.cdix/icon.png` |
| `podman-desktop.svg` | `podman-desktop/buildResources/icon.svg` |

Added by wave **rhel** (dossier icon URLs returned 404, so GitHub org avatars of the
upstream project are used where they are a real logo; Red Hat logo otherwise):

| File (`static/icons/`) | Source |
|---|---|
| `redhat.rhel-registration.png` | `ext-redhat-account/icon.png` |
| `redhat.image-builder.png` | `https://github.com/osbuild.png` (osbuild / Image Builder project avatar) |
| `redhat.lightspeed-insights.png` | `https://github.com/RedHatInsights.png` |
| `redhat.security-data-checker.png` | `https://github.com/RedHatProductSecurity.png` |
| `redhat.dependency-analytics.png` | `https://github.com/trustification.png` (Trustify, RHDA backend) |
| `redhat.openscap-checker.png` | `https://github.com/OpenSCAP.png` |
| `redhat.satellite.svg`, `redhat.edge-manager.svg`, `redhat.catalog-checker.svg`, `redhat.rhel-lifecycle-checker.svg` | `ext-redhat-account/icons/redhat-logo.svg` (fallback named in the dossiers; flightctl/catalog have no published logo) |

Other assets:

| File | Source | Licence |
|---|---|---|
| `src/lib/images/*.svelte` (nav SVG icons) | `podman-desktop/packages/renderer/src/lib/images/` | Apache-2.0 |
| `src/lib/images/logo.png` (title-bar logo) | `podman-desktop/packages/renderer/src/lib/images/logo.png` | Apache-2.0 |
| `src/lib/images/welcome-bg.png` | `podman-desktop/packages/renderer/src/lib/welcome/background.png` | Apache-2.0 |
| `src/lib/theme/themes.css` | generated by `podman-desktop/scripts/generate-stylesheet.ts` | Apache-2.0 |
| `references/*.png` | `podman-desktop/website/` (static/img, blog/img, docs/img) | Apache-2.0 |
| FontAwesome icons | `@fortawesome/free-*-svg-icons` 7.x | CC BY 4.0 / MIT |

Note: `ext-kind/icon.png` (standalone extension) is stored as
`podman-desktop.kind-ext.png` because it shares the id of the built-in Kind extension.

Reference screenshots (`references/`):

| File | Source |
|---|---|
| `containers-list.png` | `website/static/img/features/containers.png` |
| `containers-multi-{dark,light}.png` | `website/blog/img/podman-desktop-release-1.24/containers-multiple-connections-*.png` |
| `dashboard-{dark,light}.png` | `website/blog/img/podman-desktop-release-1.23/DashboardSections-*.png` |
| `statusbar-provider-{dark,light}.png` | `website/blog/img/podman-desktop-release-1.18/statusbar-provider-*.png` |
| `settings-resources.png` | `website/docs/img/settings.png` |
| `extensions-catalog.png` | `website/docs/extensions/img/browse-catalog.png` |
| `navigation-menu-{dark,light}.png` | `website/blog/img/podman-desktop-release-1.27/navigation-menu-*.png` |
