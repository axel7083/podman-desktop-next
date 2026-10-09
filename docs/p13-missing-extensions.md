# P13: missing extensions audit

Compares the extensions present in the P13 app (`src/lib/nav-lab/r3/exts.ts` `EXTENSIONS`,
`r3/trees.ts` tree providers, `data.ts` connections / sections / `TOOLS`) with (a) the v1 mockup
extensions (`src/extensions/*`) and (b) the real Podman Desktop extensions.

Legend for **In P13**:
- **yes**: an `EXTENSIONS` entry with real surfaces (tree, connection, views, menus, promotion);
- **tool**: only a generic page in `TOOLS` (placeholder `ToolView`), no registry entry, no promotion;
- **partial**: hard-coded surface without an extension entry (cannot be installed / missing in Vanilla);
- **no**: absent.

## A. Real Podman Desktop extensions

| Extension | In v1 | In P13 | Where it would live in P13 |
| --- | --- | --- | --- |
| Hummingbird (`redhat.hummingbird`) | yes | **yes** (this change) | Tree EXTENSIONS: Overview / Catalog / Alternatives; image ⋮ + header "Find hardened alternative"; image Check section; Podman overview + Images promo |
| Bootable containers (`redhat.bootc`) | yes | yes | Tree EXTENSIONS (Overview, Images, Disk Images, Examples); image ⋮ "Build disk image"; Podman promo |
| Podman Quadlet | no | yes | Tree EXTENSIONS (Quadlets); container ⋮ "Generate Quadlet"; Podman promo |
| AI Lab | yes | yes | Tree EXTENSIONS (Models, Services, Playgrounds) + tool page; Podman / Docker promo |
| OpenShift Local (CRC) | yes | yes | Connection type (Kubernetes); create connection |
| Developer Sandbox | yes | yes | Connection type (Kubernetes); Accounts card |
| MicroShift in a container (minc) | yes | yes | Connection type (Kubernetes) |
| Apple container | yes | yes | Connection type (Engines) |
| RHEL VMs | yes | yes | Connection type (VMs & services) |
| Grype | no | yes | Image / container ⋮ "Scan vulnerabilities" → Scan tab; image Check card |
| Layers explorer | no | yes | Image details view "Layers" |
| Kubernetes dashboard | no | partial (entry, promo and menu only) | Kubernetes connection views: Workloads / Events / Metrics (tree EXTENSIONS or Overview cards) |
| Kreate | no | tool | Kubernetes resource ⋮ "Create from…", tool page with YAML templates; Kubernetes connection promo |
| RHEL Lightspeed | yes | tool | Bottom panel tool window (chat), "Ask Lightspeed" on errors / logs; RHEL connection promo |
| Image checker for OpenShift | yes (`openshift-checker`) | partial (Check section always shown) | Image Check view checker section (installed only); Vanilla: Check promo |
| Red Hat extension pack | no | tool (as "Services catalog" icon) | Extensions catalog pack card (installs its members) |
| Kubernetes contexts | yes (`kube-context`) | no | Settings › Kubernetes (contexts table) + connection switcher actions (rename, set current, delete) |
| Minikube | no | no | Connection type (Kubernetes) + create connection; Kubernetes promo |
| Lima | no | no | Connection type (Engines / Kubernetes, macOS) + create connection |
| PostgreSQL | yes | no | Connection type (VMs & services) with Databases / Roles; Podman promo |
| Red Hat authentication (SSO) | yes | no | Accounts (sign in), status bar account; gates RHEL / sandbox / registries |
| GitHub account | no | no | Accounts (sign in); MCP github server, ghcr.io registry credentials |
| IBM Cloud account | no | no | Accounts (sign in); IBM Cloud registry / clusters as connections |
| Skills (agent skills) | no | no | Tree EXTENSIONS next to MCP (skills per agent) or tool page; AI promo |

## B. v1 mockup extensions not (or only partly) in P13

| Extension (v1 folder) | In P13 | Where it would live in P13 |
| --- | --- | --- |
| `kube-context` | no | Settings › Kubernetes, connection switcher |
| `postgresql` | no | Connection type (VMs & services) |
| `redhat-authentication` | no | Accounts |
| `openshift-checker` | partial | Image Check checker section |
| `security-data-checker` | no | Image Check checker section (Red Hat security data) |
| `rhel-lifecycle-checker` | no | Image Check checker section (RHEL lifecycle) |
| `openscap-checker` | no | Image Check checker section (compliance) |
| `catalog-checker` | no | Image Check checker section (Red Hat catalog freshness) |
| `dependency-analytics` | no | Image Check section + container details (app dependencies) |
| `trivy` | no | Image ⋮ scan provider (alternative to Grype), Scan tab |
| `acs` | no | Image Check section (ACS policy) |
| `preflight` | no | Image Check section (certification) |
| `conforma` | tool | Image Check section (policy) |
| `rhel-lightspeed`, `openshift-lightspeed` | tool / no | Bottom panel assistant tool window |
| `local-registry` | no | Connection type (VMs & services: registry) + image ⋮ "Push to local registry" |
| `registries` | yes (built-in, no surface) | Settings › Registries |
| `debug-shell` | no | Container / pod ⋮ "Debug shell" → terminal session |
| `devcontainers` | tool | Container ⋮, tool page |
| `testcontainers` | no | Containers group rows (session / Ryuk) |
| `k3d` | no | Connection type (Kubernetes) |
| `ocm` | no | Settings › Accounts (OpenShift Cluster Manager) + clusters as connections |
| `openshift-cli-pack` | no | Settings › CLI tools |
| `rhads-pack` | no | Extensions catalog pack card |
| `quay` | tool + image ⋮ "Push to Quay" | Registry connection + image ⋮ |
| `amq-broker`, `datagrid`, `jboss-eap` | no | Connection types (VMs & services) |
| `kaiden`, `wslc` | wslc yes; kaiden no | Connection type (Engines) |
| `ai-inference-server`, `maas`, `modelcar`, `ansible`, `apicurio-registry`, `debezium`, `edge-manager`, `image-builder`, `kaoto`, `konflux`, `mta`, `quarkus`, `rhdh-local`, `satellite`, `services`, `trusted-artifact-signer`, `trusted-profile-analyzer`, `cryostat` | tool | Tool pages only (generic placeholder); each needs its own view, connection or image / container action |

Present in both with real surfaces: podman, docker, compose, kind, kubectl-cli, bootc, ai-lab, mcp,
helm, openshift-local, sandbox, minc, apple-container, wslc, rhel-registration, rhel-vms,
lightspeed-insights, pipelines-gitops, openshift-virtualization, olm, service-interconnect,
openshift-ai, streams-kafka, keycloak, aap, hummingbird.

## Priority

1. **High** (real, shipped, visible gap): Kubernetes contexts, Minikube, Red Hat authentication,
   Image checker for OpenShift (as an installable checker), RHEL Lightspeed (real surface), PostgreSQL.
2. **Medium**: Kubernetes dashboard (real views), Kreate, Lima, GitHub account, Red Hat extension pack.
3. **Low**: IBM Cloud account, Skills, and the v1-only checkers / tool pages of section B.
