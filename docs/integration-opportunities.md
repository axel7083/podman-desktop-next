# Integration opportunities (Appendix A of the mockup plan)

## A.0 Context

**Inputs:**
- [[Epic] H2CY26 - Q1CY27 roadmap #19491](https://github.com/podman-desktop/podman-desktop/issues/19491)
- [[feature request] being able to install the openshift console #577](https://github.com/minc-org/minc-extension/issues/577)
- the planned **provider-first UI**: the primary nav lists connections (Podman machine 1/2, Docker context, Kubernetes cluster) and the secondary nav lists that connection's resources

**Goal:** list what Podman Desktop (PD) could integrate as extensions, with emphasis on the **Red Hat portfolio**, and the PD API and UI changes needed to make those integrations good.

**Deliverable:** copied into the mockup repo as `docs/integration-opportunities.md`, the source list for the dossiers in §3. The research-pass tables (about 150 rows) seed the dossiers.

**Sources:**
- the 25 local `ext-*` clones, the 10 built-in extensions and the catalog (23 entries)
- `packages/extension-api/src/extension-api.d.ts` and `packages/api/src/menu-context.ts`
- the navigation registry
- `gh` searches across GitHub organizations
- web research as of 2026-10

Items marked (unconfirmed) still need verification.

---

## A.1 Organizing principle: four kinds of integration

| Kind | Place in the provider-first UI | Examples today |
|---|---|---|
| **A. Provider**: an engine, cluster or VM | A primary-nav entry per connection | podman, docker, kind, minikube, crc, minc, apple-container, rhel-vms |
| **B. Resource contributor**: adds a resource type to *some* connections | A secondary-nav item under matching connections | quadlet (podman), kubernetes-dashboard, bootc |
| **C. Cross-cutting**: checker, auth, registry, CLI, menu | Image/details tabs, Accounts, Registries | grype, hummingbird, openshift-checker, redhat-account |
| **D. Standalone workspace** | A "Tools" group in the primary nav (not a provider) | AI Lab, layers-explorer |

Today only **A** and **D** have an API. **B** is what most Red Hat integrations need, for example "Skupper site under the Podman connection", "OpenShift AI under the OpenShift context" or "VirtualMachines under the OpenShift context". There is no API for it: the `'submenu'` mechanism exists, but only Kubernetes uses it, and it is hard-coded.

---

## A.2 Platform changes (core / extension API)

Ordered by how many integrations each one unblocks. The "Unblocks" column refers to the **R#** Red Hat items in §3 and the **O#** non-Red Hat items in §4.

| # | Change | Unblocks | Today | Related issues |
|---|---|---|---|---|
| **P1** | **Canonical connection key and connection-scoped context.** Map Kubernetes provider connections to kubeconfig contexts | The provider-first UI; P2 | engineId, socketPath and apiURL are separate identities (`container-registry.ts:381`, `contexts-manager*.ts`) | [Global navigation UX #16794](https://github.com/podman-desktop/podman-desktop/issues/16794), [feat(navigation): prototype global navigation, tabs, and view splitting #18065](https://github.com/podman-desktop/podman-desktop/issues/18065) |
| **P2** | **Secondary-nav contributions** with `when` clauses on connection type, provider or capability (e.g. `kube.hasCRD('datascienceclusters')`) | Every kind-B item | Webviews are forced to the top level (`navigation-registry-extension.svelte.ts`) | [[Proposal][draft] allow an extension to register nav bar and allow other extensions to contribute to it WIP #19376](https://github.com/podman-desktop/podman-desktop/issues/19376) |
| **P3** | **Webview placement options:** hidden, primary, secondary or tools; order; badge; connection parameter | Same as P2 | `WebviewOptions` = `localResourceRoots` | [Extensions UX redesign: Sidebar target resolution for extensions without a dedicated nav item #18949](https://github.com/podman-desktop/podman-desktop/issues/18949) |
| **P4** | **Kubernetes API for extensions:** list/watch any kind (including CRDs) on the shared informers (`contexts-informers-registry.ts`), plus `MenuContext` entries for Kubernetes contexts and resources | OpenShift AI, OpenShift Virtualization, Skupper, Kuadrant, Strimzi, OLM, ACM, Tekton, KServe, console | `kubernetes` = kubeconfig + `createResources` + generator; no Kubernetes menus | [Move Kubernetes related UI to a Kubernetes extension #11123](https://github.com/podman-desktop/podman-desktop/issues/11123) |
| **P5** | **Structured `ImageCheck`:** optional `cve`, `package`, `fixedIn`, `vexStatus`, `advisoryUrl`, `ruleId`; plus **check by reference** and a pre-push hook | Security Data VEX, Pyxis, RHDA, TPA, ACS roxctl, preflight, Quay/Clair, OpenSCAP, Conforma | `{name,status,severity?,markdownDescription?}`, local `ImageInfo` only | — |
| **P6** | **Signature, SBOM and attestation model on images** (OCI referrers) | RHTAS/cosign, model signing, Conforma, TPA SBOM upload | none | — |
| **P7** | **OCI artifacts** (`podman artifact` list/pull/push) as a first-class resource | ModelCar/ModelPack/KitOps models, Helm OCI charts, RHDH dynamic plugins | none | — |
| **P8** | **Service connection type** (`ServiceProviderConnection`) plus a **shared registry of local services** so extensions can find each other (e.g. Kafka ↔ Apicurio ↔ Debezium) | MCP gateway, Kafka, Keycloak, Data Grid, AMQ, RHDH Local, Cryostat | Extensions fake a `VmProviderConnection` | [Add a generic/service provider connection type #18956](https://github.com/podman-desktop/podman-desktop/issues/18956) |
| **P9** | **Upstream Kaiden's `InferenceProviderConnection` and `MCPManager` into the PD API** so AI Lab, Kaiden and others share them | Inference (vLLM), MaaS, OpenShift AI endpoints, MCP catalog, roadmap MCP item | Kaiden-only | [[Epic] refactor for rebase of Kaiden from Podman Desktop #19144](https://github.com/podman-desktop/podman-desktop/issues/19144) |
| **P10** | **Container grouping and decoration:** group or badge by label beyond the compose label; "managed by" ownership | Quarkus Dev Services (`io.quarkus.devservice`), Testcontainers, kantra provider containers, AI Lab, Ansible EEs | Only the `com.docker.compose.project` label is grouped | — |
| **P11** | **Engine type and WSL APIs:** open `ContainerProviderConnection.type`; a WSL-distro API for extensions | WSL.C (roadmap), RHEL for WSL, Apple Containers | `type: 'docker' \| 'podman'`; WSL is core-only | [Adding support of WSLC on Windows #18348](https://github.com/podman-desktop/podman-desktop/issues/18348) |
| **P12** | **Async remote cluster factory:** long-running create (30–45 min), a second cloud credential, cost/region choices, remote delete | OCM, ROSA HCP, Assisted Installer and Single Node OpenShift (SNO), IBM Cloud Red Hat OpenShift (ROKS) | Factories assume a local engine | — |
| **P13** | **Cluster add-on contract** on Kubernetes connections (install, uninstall, status, endpoints) | minc console (#577), OLM, Skupper, Kuadrant, OpenShift AI-lite, local registry | Each extension adds its own setting | [[feature request] being able to install the openshift console #577](https://github.com/minc-org/minc-extension/issues/577) |
| **P14** | **Details tabs and list contributions** (container, pod, image, connection pages; toolbar, columns, badges) | Debug shell, SBOM/signature tab, JFR (Cryostat), Dev UI links, Advisor badge on RHEL VMs | Only the image "Files" tab | — |
| **P15** | **Tasks API** for long-running CLI jobs (progress, logs, cancel), plus a **project/workspace** concept (folder → detected stack → linked containers) | kantra/MTA, wildfly-glow, ansible-builder, Image Builder, `kn func`, Quarkus, devfile | `process.exec` + `withProgress` | — |
| **P16** | **Red Hat SSO scopes:** per-API audience, offline tokens and service accounts shared through the redhat-account extension | Every console.redhat.com, OCM, Image Builder and Lightspeed API | Single session (unconfirmed per API) | — |
| **P17** | **Shared plumbing:** typed webview RPC, CLI lifecycle helpers, deep links, search providers, dashboard cards | Every new extension | Each extension rolls its own | [Investigation on consistent message/proxy communication in extensions. #17077](https://github.com/podman-desktop/podman-desktop/issues/17077), [epic(extension-api): CLI binary lifecycle helpers #18971](https://github.com/podman-desktop/podman-desktop/issues/18971), [feat: make ${product.urlProtocol}:// protocol handler extensible by extensions #17014](https://github.com/podman-desktop/podman-desktop/issues/17014), [Searchbar: register dynamic search result providers for extension resources #18119](https://github.com/podman-desktop/podman-desktop/issues/18119), [Dashboard Redesign - System Overview, Resources, Authentication, Layout #17991](https://github.com/podman-desktop/podman-desktop/issues/17991) |

| **P18** | **Programmatic Podman machine creation:** the podman extension exports `createMachine(opts)` (image path or URL, provider, resources), or the core supports prefilled factory params | R4 (RHEL Podman machine), other OS-flavoured machines (bootc, Hummingbird, MicroShift) | Only `exec` is exported (`podman-extension-api.d.ts:25-27`) | — |

**Minimum set for the provider-first UI:** P1–P4. **Quickest Red Hat value:** P5 (structured checks). **AI and roadmap alignment:** P7 + P9.

---

## A.3 Red Hat portfolio integrations

These are grouped by business unit. Value is H (high), M (medium) or L (low). Kind is A–D from §1. The ★ items in each unit are the ones to build first.

### 3.1 Prototypes that already exist: productize them first
| # | Prototype | State | Action |
|---|---|---|---|
| R1 ★ | [kadel/podman-desktop-extension-rhdh-local](https://github.com/kadel/podman-desktop-extension-rhdh-local): Developer Hub Local (start/stop, config, tray) | Last push 2025-08 | Productize. Add a "build and load dynamic plugin" image flow (P7) and run software templates locally (D, H) |
| R2 | [RedHatOfficial/aap-demo-podman-desktop-extension](https://github.com/RedHatOfficial/aap-demo-podman-desktop-extension): AAP demo on OpenShift Local | Pushed 2026-10-07 | Use as the template for "product demo on OpenShift Local" extensions (D, M) |
| R3 | feloy/…-kubernetes-olm, feloy/…-image-checker-clair, feloy/…-kubernetes-iam | Prototypes | Fold into R30 (OLM), R24 (Quay/Clair) and the Kubernetes pack |

### 3.2 RHEL and Red Hat Lightspeed (formerly Insights)
| # | Integration | Kind | Needs | Value |
|---|---|---|---|---|
| R4 ★ | **RHEL Podman machine on WSL**: a one-click "Create RHEL Podman machine" (see §3.2a) | A (Podman connection) | P18, P16 | H: Windows is the biggest audience; pairs with WSL.C |
| R5 ★ | **Lightspeed Image Builder (hosted)** page: blueprints that compose qcow2, ISO, AMI or WSL images with OpenSCAP and repo snapshots; feeds rhel-vms and R4 | D | P15, P16 | H |
| R6 | **Registration and subscriptions:** list or create activation keys, auto-register RHEL VMs and WSL distros, show developer-subscription expiry | C (in redhat-account) | P16 | H |
| R7 | **bootc deepening:** `bootc container lint` as a checker, image-builder-cli migration, presets for Fedora Hummingbird, MicroShift-on-bootc and **RHEL AI 3** | C/B (bootc) | P5 | H |
| R8 | **Lightspeed Advisor and Vulnerability badges on registered RHEL VMs** (these APIs are host-based and don't scan images) | B (VM) | P14, P16 | M |
| R9 | **OpenSCAP image checker** (`oscap-podman` with CIS/STIG profiles; offline) | C | P5 | H |
| R10 | **RHEL lifecycle and EOL checker** (Lightspeed Planning API): flags EOL ubi8 or AppStreams | C | P5 | M |
| R11 | **Red Hat Edge Manager (flightctl) dev loop:** build a bootc image with the agent, boot it as a local "device", push a fleet update | D/B | P14, P15 | M (GA status unconfirmed) |
| R12 | Satellite registry and registration target (disconnected enterprises) | C | P16 | M |
| R13 | RHEL system roles / `containers.podman` export: generate a playbook or quadlet tasks from selected containers | C (generator) | Non-Kubernetes generator | M |
| R14 | Lightspeed MCP (`insights-mcp`) as a managed container exposed to agents | C | P9 | M |

### 3.2a Deep dive on R4: a RHEL Podman machine on WSL

**Already in the workspace:**

| Step | Owner today | Evidence |
|---|---|---|
| Red Hat SSO (scopes `api.rhsm`, `api.console`, …) and the `podman-desktop` activation key | ext-redhat-account | `src/authentication-service.ts:410`, `extension.ts:130-155` |
| Download the official RHEL for WSL `.tar.gz` (9.7 / 10.1) by SHA through `api.access.redhat.com/management/v1/images/{sha}/download` | **ext-rhel** | `src/images.ts:23-56`, `src/rh-api/rh-api-sm.ts:42-53`, `src/cache.ts:28-34` |
| Create a WSL **VM** from it (macadam) and register it | ext-rhel | `extension.ts:512-580, 606-668`. Result is a VM connection, **not** a Podman engine |
| `podman machine init --image <local tar>` with the WSL provider | built-in podman extension | `extensions/podman/.../extension.ts:2258-2295`; UI field "Image Path". Only `exec` is exported, so there's no API for it |
| Register a running Podman machine (`podman machine ssh … subscription-manager register`) | ext-redhat-account | `src/podman-cli.ts:24-43`. Falls back to `rpm-ostree install`, which fails on RHEL, and picks the first running machine |

**Prior art:** [Using RHEL WSL as a Podman machine (2024 blog)](https://podman-desktop.io/blog/2024/08/01/using-rhel-wsl-podman-machine). It's manual:
1. Build a **custom** Image Builder WSL compose on RHEL 9 with podman, podman-docker, openssh-server, sudo, procps-ng, iproute, dhcp-client, net-tools and `systemd-networkd` (from EPEL), plus an activation key.
2. Pick the downloaded tarball in the "Image Path" field.
3. RHEL 10 didn't work because the WSL kernel lacked nftables.

**Answer to "can the redhat-account extension do it automatically?":** not on its own. The download code and SHAs live in ext-rhel, and machine creation lives in the podman extension. The design below splits the work across the three, with one user-facing button.

**Key unknown:** whether the stock RHEL for WSL tarball (no podman or sshd preinstalled?) works with `podman machine init`. That decides between two paths:
- **Path 1:** the stock tarball from the RHSM images API, plus provisioning after init (`dnf install podman openssh-server …` over WSL exec).
- **Path 2:** a custom Image Builder compose through the console.redhat.com Image Builder API, with the packages and activation key baked in. This takes several minutes, but the image is reproducible.

**Proposed design:**
- **P18 (new platform item):** the podman extension exports `createMachine({ image, provider, rootful, cpus, memory, name })`. Alternatively, the core supports prefilled connection-factory params so another extension can open the create form with Image Path filled in.
- **ext-rhel:** add a "Create RHEL Podman machine" action that reuses its download and cache code, adds a SHA256 integrity check, and calls P18. It also fixes the missing `hyperv` image entry, which today throws "provider hyperv is not supported".
- **ext-redhat-account:** registration targets a specific connection rather than the first running machine. Add a `dnf` branch next to the `rpm-ostree` one.
- **Spike before committing to the design:**
  1. `podman machine init --image rhel9.tar.gz` and `rhel10.tar.gz` (stock) on WSL.
  2. Record what fails: missing podman or sshd, user setup, networking, nftables on the 2026 WSL kernel.
  3. Pick Path 1 or Path 2 from the results.

### 3.3 Content, security and supply chain (Advanced Developer Suite, RHADS)
| # | Integration | Kind | Needs | Value |
|---|---|---|---|---|
| R15 ★ | **Red Hat Security Data API (CSAF/VEX) checker:** match the image rpmdb against Red Hat VEX ("not affected / fixed in RHSA-…"); no auth | C | P5 | H: authoritative for RH content |
| R16 ★ | **Red Hat Dependency Analytics (RHDA 1.0) checker** through the npm client; free, Trustify-backed | C | works today; better with P5 | H: lowest effort |
| R17 ★ | **Ecosystem Catalog (Pyxis):** health grade, CVEs, "newer tag" for RH images, plus a certified-image browser and UBI/Hardened rebase suggestions | C + D | P5 | H |
| R18 | **Preflight "certification readiness" checker:** push to an ephemeral local registry, run `preflight check container`, optionally submit to Partner Connect | C | P5 (by reference) | M/H |
| R19 | **ACS (StackRox) `roxctl image check`:** the org's policy verdicts before push | C | P5, P16 | M/H |
| R20 | **Trusted Artifact Signer (RHTAS):** keyless sign on push (Red Hat SSO/Keycloak OIDC), verify badge, model signing | C | P6, P14 | M/H |
| R21 | **Trusted Profile Analyzer (Trustify):** SBOM (syft) upload and analysis against the org's TPA | C | P5, P6 | M |
| R22 | Conforma `ec validate image`: pre-release policy | C | P5, P6 | L/M |
| R23 | UBI / Hardened Images (Hummingbird) / OpenJDK, Node.js, .NET image templates and "rebase on UBI" quick fix | C | P5 | H (extends hummingbird) |
| R24 | **Quay.io / Red Hat Quay:** robot accounts, repo browser, Clair results, "push and scan" | C + D | P5 | H |
| R25 | **RHADS extension pack** bundling R1, R16, R20, R21, R44 | pack | — | M |

### 3.4 OpenShift family
| # | Integration | Kind | Needs | Value |
|---|---|---|---|---|
| R26 ★ | **OpenShift CLI pack:** oc, openshift-install, ocm, rosa, virtctl, roxctl, tkn, kn, opm, operator-sdk, oc-mirror, shp, with install and update. Plus `oc login --web` that adds a kube context. The IntelliJ connector is archived and odo is deprecated, so nothing else covers this | C | P17 (CLI helpers) | H |
| R27 ★ | **OpenShift Cluster Manager (OCM):** one sign-in lists the org's OCP, ROSA and OSD clusters as Kubernetes connections; provides the pull secret to crc, minc and Assisted | A | P12, P16 | H |
| R28 | **Assisted Installer → SNO in a local VM** (discovery ISO via the API, boot with macadam) | A (factory) | P12, P11 | M/H |
| R29 | **ROSA HCP / IBM Cloud ROKS** (through the existing ibmcloud-account extension) cluster factories | A | P12 | M |
| R30 | **OLM v1 / OperatorHub on local clusters** (absorbs the feloy prototype); `operator-sdk run bundle` for operator developers | B | P4, P13 | M |
| R31 ★ | **OpenShift Console on local clusters** (#577 generalized): minc first, then kind and crc-microshift; console-plugin dev loop (`origin-console` + plugin dev server) | B (add-on) | **P13**, P4 | M/H (amd64-only image today) |
| R32 | **OpenShift Virtualization:** "run my bootc image as a VM on OpenShift" (qcow2 → containerDisk → `VirtualMachine`), VM list, virtctl console | B | P4, P14 | M/H |
| R33 | Builds for OpenShift (Shipwright): "Build on cluster" next to Build Image, useful for x86 images on Apple Silicon | C/D | P15 | M |
| R34 | OpenShift Serverless `kn func` run locally → deploy; Serverless Logic `kn workflow` | D | P4, P15 | M |
| R35 | Pipelines (Tekton) and GitOps (Argo) status for the current context; Argo App generator | B | P4 | L/M |
| R36 | ACM: "import this kind/minc cluster into my hub"; policy status | B/C | P4 | L/M |
| R37 | OpenShift Lightspeed chat scoped to the active context, plus kubernetes-mcp-server / openshift-mcp-server bound to the PD kube context | C/D | P9 | M |
| R38 | Developer Sandbox / OpenShift Local improvements: preset picker, OCM pull secret | (existing) | P16 | M |

### 3.5 Application platform, middleware and runtimes
| # | Integration | Kind | Needs | Value |
|---|---|---|---|---|
| R39 ★ | **Quarkus:** group Dev Services containers (`io.quarkus.devservice` label), "Open Dev UI", stop all; Testcontainers readiness check; `quarkus` CLI; project wizard (code.quarkus.redhat.com); reuse `target/kubernetes` | C + D | **P10**, P15 | H |
| R40 ★ | **Service Interconnect (Skupper v2)**, which already supports Podman sites: make a Podman connection a site, "expose container to cluster X", list Sites/Links/Listeners | **B** | P4, P2 | H: the only RH product that bridges laptop and cluster natively |
| R41 ★ | **Streams for Apache Kafka:** one-click KRaft Kafka + **Kafka Console** (streamshub) + **Apicurio Registry**; Strimzi resources under Kubernetes contexts | D + B | P8, P4 | H |
| R42 | **Red Hat build of Keycloak:** local IdP with realm import, plus a generic OIDC auth provider (also the issuer for RHTAS) | D + C | P8 | H |
| R43 | **Debezium:** "CDC from this DB container" (pairs with the postgresql extension) | C + D | P8, P14 | M |
| R44 ★ | **Migration Toolkit for Applications (kantra uses Podman by default):** analyze a folder or binary, show the report in a webview; Kai fixes using an AI Lab local model | D | P15, P10 | H |
| R45 | **JBoss EAP 8.1:** "containerize this WAR" (wildfly-glow → trimmed image) | D | P15 | M |
| R46 | **Cryostat:** local JFR profiling of Java containers; "Record JFR" menu | B + C | P8, P14 | M |
| R47 | Kaoto (visual Camel designer) webview + Camel JBang run/export | D | P15 | M |
| R48 | Connectivity Link (Kuadrant) on local clusters: `kuadrantctl` OpenAPI → routes and policies | B + C | P4, P13 | M |
| R49 | Data Grid, AMQ Broker: local service templates with console webviews | D | P8 | M |
| R50 | Dev Spaces / devfile "run locally on Podman" (replaces odo) | D | P15 | M |
| R51 | Image checkers for EOL products (RH-SSO 7, Fuse 7, PAM/DM, OpenJDK EOL) pointing to migration guides | C | P5 | L/M (cheap) |

### 3.6 Red Hat AI
Placement: **AI Lab** = local model lifecycle; **new "OpenShift AI" extension** = kind-B work under Kubernetes contexts; **Kaiden** = agents, MCP and governed endpoints.

| # | Integration | Where | Needs | Value |
|---|---|---|---|---|
| R52 ★ | **ModelCar workflow:** package a local model as an OCI image → push to Quay → generate a KServe `InferenceService` (`oci://`); pull Red Hat ModelCars | AI Lab + C | P7, P4 | H: native fit for Podman |
| R53 ★ | **Red Hat AI Inference (vLLM) backend** on GPU (Linux/WSL CUDA, ROCm) via registry.redhat.io; RamaLama as the default backend | AI Lab | P9, GPU detection | H |
| R54 ★ | **Unified model catalog:** RedHatAI on Hugging Face (validated and quantized) + RHOAI Model Catalog/Registry feeding AI Lab; Granite defaults | AI Lab | P9 | H |
| R55 ★ | **OpenShift AI extension:** detect `DataScienceCluster` on a context; projects, InferenceServices with port-forward-to-playground; generators for `InferenceService`, `LLMInferenceService`, `TrainJob`/`RayCluster`, MCPServer | B | P2, P4 | H |
| R56 | **MaaS / AI Gateway** endpoints as remote inference providers (governed company models for the playground and agents) | Kaiden (+ AI Lab) | P9, P16 | H |
| R57 | **MCP catalog / gateway / lifecycle operator:** run catalog MCP servers locally, then generate the MCPServer CR; bundle kubernetes-mcp-server, AAP MCP, linux-mcp and insights-mcp | Kaiden + PD MCP roadmap item | P9 | H |
| R58 | AI Lab tools: GuideLLM benchmark, Garak scan, EvalHub eval, LLM Compressor quantize, Training Hub/SDG fine-tune, Docling RAG, RHOAI workbench images, local MLflow | AI Lab | GPU detection | M |
| R59 | Rossoctl (formerly Kagenti) / OpenShell: local agent platform on kind; Kaiden sandboxes → OpenShift | Kaiden | P4 | M (naming in flux) |
| R60 | Red Hat agent skills repository → install into agents (roadmap AI Skills) | `skills` built-in | — | H if public (repo URL not found) |

### 3.7 Ansible Automation Platform
| # | Integration | Kind | Needs | Value |
|---|---|---|---|---|
| R61 ★ | **Ansible extension:** ADT workspace container (molecule with nested Podman), execution and decision environment builder (form-based) with image badges, `ansible-navigator` run in EE with artifact replay | D + C | P10, P15 | H: Podman is ADT's default runtime |
| R62 | **"Export as Ansible":** `containers.podman` / system-role tasks or quadlets from selected containers and pods | C | Non-Kubernetes generator | M/H |
| R63 | Event-Driven Ansible: rulebook in a DE fed by Podman events (webhook bridge) | D | — | M |
| R64 | AAP controller connection (SSO): list and launch job templates, stream output; AAP MCP server for agents | A (service)/K | P8, P9, P16 | M |

### Red Hat items to skip (deprecated or EOL)
- **Tooling:** odo, InstructLab / `ilab` / RHEL AI 1.x, the Kagenti ADK (archived).
- **OpenShift AI 3.5 removals:** ModelMesh and KServe Serverless, TGIS/Caikit, CodeFlare/AppWrapper, Training Operator v1, FMS Guardrails, LMEvalJob.
- **Middleware past end of life or support:** RH-SSO 7.6, Fuse 7, PAM/DM 7.13, OptaPlanner 8.
- **Products ending soon:** 3scale (EOL 2027-06), MTC (EOL 2026-12).
- **Legacy edge and managed services:** ROSA Classic (no new clusters), RHEL for Edge rpm-ostree targets, RHOSAK-era console APIs.
- **Naming:** use "Red Hat Lightspeed" instead of "Insights", "OGX" instead of "Llama Stack" and "Rossoctl" instead of "Kagenti".

---

## A.4 Non-Red Hat candidates (condensed from the first pass)

| # | Candidate | Kind | Needs | Value |
|---|---|---|---|---|
| O1 | **MCP Servers hub** (registry.modelcontextprotocol.io, ToolHive or docker/mcp-gateway): the answer to Docker MCP Toolkit; merges with R57 | D + B | P8, P9 | H |
| O2 | **WSL.C provider** (roadmap) | A | P11 | H |
| O3 | Container debug shell (Docker Debug / OrbStack parity) | C | P14 | H |
| O4 | Dev Containers (devcontainers CLI), Testcontainers helper | B/C | P10, P15 | H |
| O5 | Ollama / LM Studio endpoint detection in AI Lab | AI Lab | P9 | M |
| O6 | Cloud accounts: AWS, Azure, GCP (auth, registry tokens, EKS/AKS/GKE contexts) | C/A | P1, P12 | M |
| O7 | Helm 4 + Artifact Hub (plus charts.openshift.io) | B | P4, P7 | M |
| O8 | Syft, cosign, Trivy (pinned), Kubescape | C | P5, P6 | M |
| O9 | k3d / vind, Telepresence / mirrord, Tilt / Skaffold, Toolbx / Distrobox, local domains + TLS | A/B | various | M/L |
| O10 | Generic services catalog (Valkey, Grafana otel-lgtm, Garage S3, MySQL, MongoDB); generalizes the postgresql extension and R41/R42/R49 | B | P8, P10 | M |

**Gaps in existing extensions:**
- `ext-compose/` is an empty directory.
- `ibmcloud-account` and `kind` aren't in the catalog.
- `registerKubernetesGenerator`, `createCustomPick` and provider `registerLifecycle` have no users. R52, R55 and R62 would exercise the generator.
- AI Lab's last release was 2026-02, so the AI roadmap needs an owner decision between AI Lab and Kaiden.

---

## A.5 Sequencing (product and platform roadmap, not the mockup build)

```
Q4 2026                                              Q1 2027
P5 structured checks ──► R15 VEX, R16 RHDA, R17 Pyxis, R9 OpenSCAP ──► R18 preflight, R19 ACS (by-ref)
P16 SSO scopes ────────► R6 registration, R27 OCM, R5 Image Builder
P11 engine/WSL API ────► O2 WSL.C
R4 spike (stock RHEL WSL tar as podman machine) ──► P18 createMachine ──► R4 RHEL Podman machine
P13 add-on contract ───► R31 console on minc (#577) ──► R30 OLM, R48 Kuadrant
P10 grouping ──────────► R39 Quarkus Dev Services, O4 Testcontainers, R61 Ansible EEs
P1→P2/P3/P4 provider-first nav ─────────► R40 Skupper, R55 OpenShift AI, R32 OCP Virt, R41 Strimzi
P7 OCI artifacts + P9 inference/MCP ────► R52 ModelCar, R53 vLLM, R57/O1 MCP hub
Productize: R1 RHDH Local, R26 OpenShift CLI pack, R44 MTA (no platform dependency)
```

---

## A.6 Claims still unconfirmed (to settle in the dossiers)
- Edge Manager GA
- RHOAI EUS versions
- whether RHOAI includes Rossoctl (formerly Kagenti)
- the Red Hat skills repo URL
- Spring Boot 3.x support
- whether PD bundles `oc`
- whether the stock RHEL for WSL tar works as a Podman machine (R4 spike)

A separate follow-up, only with explicit confirmation: draft GitHub issues for the P# platform items.
