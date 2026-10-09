# From engine to Kubernetes: Kompose, generate kube and a v3 "Deploy to Kubernetes" flow

Research date: 2026-10-09. Scope: how Podman Desktop (PD) can move a local workload (container, pod, Compose
project, Quadlet) onto a Kubernetes cluster, which generator to use, and how this fits P13 (connection
switcher + tree, tabs, bottom panel, ModernTable; see `docs/p13-design-rules.md`).

---

## 1. Kompose

### 1.1 What it is
- Converts a Compose file (Compose Spec, via `compose-go/v2` v2.10.0 in `go.mod`) into Kubernetes or
  OpenShift manifests. Repo: [kubernetes/kompose](https://github.com/kubernetes/kompose). It lives in the
  `kubernetes` GitHub org, so it is a Kubernetes sub-project rather than a standalone CNCF project.
  License: **Apache-2.0**. About 10.6k stars, not archived, last push 2026-10-05.
- **Latest release: v1.38.0 (2026-01-15).** Cadence is roughly 2 to 3 releases a year: v1.35.0 (2024-12), v1.36.0
  (2025-05: `--no-interpolate`, `.env` loaded by default, `env_file` fixes), v1.37.0 (2025-08), v1.38.0
  (2026-01: dependency bumps only). The project is mature and in maintenance mode. Most recent releases bump
  dependencies, and few add features. ([releases](https://github.com/kubernetes/kompose/releases))
- **CLI surface today: `kompose convert`, `completion`, `version` only.** `kompose up` / `kompose down`
  were **removed in 2020** ([PR #1297](https://github.com/kubernetes/kompose/pull/1297), merged
  2020-08-01). Many blogs still mention them, but deploying is now the caller's job (`kubectl apply`, or PD's own apply).

### 1.2 `kompose convert` flags (from [`cmd/convert.go`](https://github.com/kubernetes/kompose/blob/main/cmd/convert.go))
| Area | Flags |
|---|---|
| Provider | `--provider kubernetes|openshift` (global) |
| Controller | `--controller deployment|daemonSet|replicationController` (statefulset only via label) |
| Output | `-o/--out <file|dir>`, `--stdout`, `-j/--json`, `--indent`, `-c/--chart` (Helm chart, **hidden flag**) |
| Namespace / replicas | `-n/--namespace`, `--replicas` (default 1) |
| Volumes | `--volumes persistentVolumeClaim|emptyDir|hostPath|configMap`, `--pvc-request-size` |
| Build | `--build none|local|build-config` (build-config = OpenShift BuildConfig), `--build-command`, `--push-command`, `--push-image`, `--push-image-registry`, hidden `--build-repo`, `--build-branch`, `--insecure-repository` |
| Misc | `--generate-network-policies`, `--with-kompose-annotation` (default true), `--no-interpolate`, `--profile` (repeatable), `--service-group-mode label|volume`, `--service-group-name`, `--secrets-as-files` |

Kustomize output is **not** a Kompose feature. Some third-party posts claim a `-k` flag, but no such flag
exists in `convert.go`.

### 1.3 `kompose.*` labels (per service, in the Compose file) ([user guide](https://kompose.io/user-guide/))
- Workload: `kompose.controller.type` (deployment|daemonset|replicationcontroller|statefulset),
  `kompose.service.group` (several services in one pod), `kompose.init.containers.{name,image,command}`,
  `kompose.cronjob.{schedule,concurrency_policy,backoff_limit}`, `kompose.hpa.{cpu,memory,replicas.min,replicas.max}`.
- Networking: `kompose.service.type` (nodeport|clusterip|loadbalancer|headless), `kompose.service.nodeport.port`,
  `kompose.service.expose` (`true` or a hostname, which gives an Ingress on Kubernetes and a Route on OpenShift),
  `kompose.service.expose.ingress-class-name`, `kompose.service.expose.tls-secret`,
  `kompose.service.external-traffic-policy`, `kompose.controller.port.expose` (hostPort, discouraged).
- Storage: `kompose.volume.size`, `kompose.volume.storage-class-name`, `kompose.volume.type`
  (configMap|persistentVolumeClaim|emptyDir|hostPath), `kompose.volume.subpath`.
- Images / security: `kompose.image-pull-policy`, `kompose.image-pull-secret`, `kompose.security-context.fsgroup`.
- Probes: `kompose.service.healthcheck.{liveness,readiness}.*` (http_get_path/port, tcp_port, test, interval,
  timeout, retries, start_period, readiness.disable). A Compose `healthcheck` is converted to a liveness probe.

### 1.4 Mapping and gaps ([conversion matrix](https://kompose.io/conversion/))
| Compose | Kubernetes result | Notes |
|---|---|---|
| service | Deployment (default) + Service if `ports` | One Deployment per service. **This fixes PD's "one pod with N containers" problem.** |
| `ports` / `expose` | Service (ClusterIP by default) | Service name equals the Compose service name, so in-cluster DNS (`redis-master`) works as in Compose |
| named volume | PVC (+ Deployment strategy `Recreate`) | Needs a default StorageClass. Size from label or `--pvc-request-size` |
| bind mount | hostPath (only with `--volumes hostPath`) or PVC | A host path almost never exists on a remote cluster |
| `environment` / `env_file` | env / ConfigMap | `.env` interpolated unless `--no-interpolate` |
| `secrets` / `configs` | Secret / ConfigMap | External secrets are not supported |
| `deploy.replicas/resources` | replicas, limits | Only CPU and memory limits |
| `restart: no|on-failure` | bare Pod / Job instead of a controller | |
| `build` | `--build local` + `--push-image`, or OpenShift BuildConfig | build `args` and `cache_from` are not implemented |
| `depends_on`, `links`, `network_mode`, network aliases, `dns`, `devices`, `logging`, `security_opt`, `ulimits`, `sysctls`, `extra_hosts` | **dropped** | `depends_on` needs init containers or app retry logic |
| `networks` | NetworkPolicy only with `--generate-network-policies` | Otherwise flat cluster network |

OpenShift provider: emits DeploymentConfig (hidden `--deployment-config`, default true; DeploymentConfig itself
is deprecated in OpenShift 4.14+), ImageStream, Route for `expose`, and BuildConfig with `--build build-config`
(builds from a git repo/branch on the cluster).

### 1.5 Embedding in an Electron app
- **Go library:** `github.com/kubernetes/kompose/client` exposes `Kompose.Convert(ConvertOptions) ([]runtime.Object, error)`
  (`client/convert.go`). PD is Node, so this only helps if wrapped (a sidecar binary or WASM).
- **Binary (recommended):** static per-OS/arch binaries on GitHub releases (linux/darwin/windows,
  amd64/arm64). Download them the same way the compose extension does (`extensions/compose/src/download.ts`,
  `compose-github-releases.ts`) and run `kompose convert -f … --stdout`.
- **Container image:** there is **no official image** on Quay or GHCR. The repo has a `Dockerfile` that
  downloads the release binary into alpine, and community images exist (`femtopixel/kompose`). Running it in a
  container works when an engine is present (mount the project dir and read stdout). This is a reasonable fallback.
- **WASM:** no upstream build. It is technically possible with `GOOS=wasip1`, but convert shells out for build/push, so it is not worth it.
- **Integrations:** no maintained VS Code extension. Docker's
  [Compose Bridge](https://docs.docker.com/compose/bridge/) shows how to wrap Kompose as a custom transformation image.
  **Portainer removed its Kompose-based deploy in 2.17**, citing unresolved CVEs in the dependency tree, slow
  maintenance, and output that needed hand edits ([summary](https://oneuptime.com/blog/post/2026-03-20-portainer-kompose-deployments-removed/markdown)).
  Lesson for PD: always show the YAML before applying, and ship Kompose as an opt-in extension, not in core.

---

## 2. What PD has today (code read on `podman-desktop` main, 2026-10)

| Capability | Where | Behaviour |
|---|---|---|
| Generate Kube (Kube tab) | `renderer/src/lib/{pod/PodDetailsKube,container/ContainerDetailsKube,compose/ComposeDetailsKube}.svelte` | Calls `window.generatePodmanKube(engineId, ids)`, which is `podman kube generate`. Compose gives **one Pod holding every container** |
| Deploy to Kubernetes | `renderer/src/lib/pod/DeployPodToKube.svelte` (661 lines). Routes `/deploy-to-kube/:id/:engine` (PodActions) and `/compose/deploy-to-kube/:name/:engine` (ComposeActions) | Form: pod name, "Use Services" (strips `hostPort`, creates one Service per hostPort), "Restricted security context", "Create Ingress" (single port), "Create OpenShift routes". Uses current context + namespace. Sets `imagePullPolicy: IfNotPresent`, **deletes all `volumes` and `volumeMounts`**, then `kubernetesCreatePod`, `kubernetesCreateService`, `openshiftCreateRoute`, `kubernetesCreateIngress`. Detects ImagePullBackOff and suggests the image is unreachable |
| Kubernetes generator registry | `main/src/plugin/kubernetes/kube-generator-registry.ts`. API `kubernetes.registerKubernetesGenerator({name, types: 'Compose'|'Pod'|'Container' (array ok), generate(args[]) → {yaml}})` in `packages/extension-api` | The default provider is podman kube generate (`main/src/plugin/index.ts:646`). IPC `kubernetes-generator-registry:generateKube` and `kube-generator-registry:getKubeGeneratorsInfos` exist and are exposed in preload. **No renderer code calls them** (the Kube tabs and Deploy use the legacy `generatePodmanKube`), so extension generators are never shown to users. Arguments only carry `engineId` + ids. There is **no compose file path / project dir**, which Kompose needs |
| Play Kubernetes YAML | `renderer/src/lib/kube/KubePlayYAML.svelte` | `podman kube play` (file or pasted YAML, `--build`, `--replace`) on an engine, not on a cluster. Became a task in [#15173](https://github.com/podman-desktop/podman-desktop/issues/15173) |
| Apply YAML to cluster | `kube/KubeApplyYAMLButton.svelte`, `KubeEditYAML.svelte`; ext API `kubernetes.createResources(context, manifests)` | Generic apply. Not connected to the generate flow |
| Image to local cluster | kind: "Push image to Kind cluster" (`extensions/kind/package.json`); minikube: "Push image to minikube cluster" | Image context-menu action, separate from Deploy |
| Kreate (`ext-kreate`, 0.4.0-next) | form → `kubectl create … --dry-run=client -o yaml` → editable YAML with "explain" docs → apply | Good YAML editor/explain UX that could be reused. No engine-to-kube conversion |

### Pain points (code plus issues)
1. **Compose becomes one Pod** with every container: no per-service Deployment/Service, and services can't
   resolve each other by name ([#4725](https://github.com/podman-desktop/podman-desktop/issues/4725),
   [#3961 "creating kompose extension"](https://github.com/podman-desktop/podman-desktop/issues/3961), open since 2023).
2. **A bare Pod, not a Deployment**: no replicas, no rollout, and it is not recreated. `podman kube generate --type deployment`
   exists ([containers/podman#17712](https://github.com/containers/podman/issues/17712)), but PD never passes it.
3. **Volumes silently dropped**. There is no PVC, no size or StorageClass choice, and no warning.
4. **Images are not moved**: local-only images give ImagePullBackOff. The kind/minikube push is a separate action, and
   nothing pushes to a registry.
5. **No preview/diff and no dry-run**. The YAML is edited in a textarea, with no server-side validation.
6. **No redeploy/undeploy or provenance**: created objects carry no label linking them to the source,
   and service-name mismatches have been reported ([#12438](https://github.com/podman-desktop/podman-desktop/issues/12438)).
7. **Context confusion**: the flow uses the *current* kube context
   ([#2836](https://github.com/podman-desktop/podman-desktop/issues/2836), [#6649](https://github.com/podman-desktop/podman-desktop/issues/6649)).
8. **Single Ingress port**. Routes have no TLS option ([#5767](https://github.com/podman-desktop/podman-desktop/issues/5767), closed).
9. **Generator registry not surfaced** (see table). Kompose/Score extensions have no UI hook.
10. Related: [#19324](https://github.com/podman-desktop/podman-desktop/issues/19324) (open, 2026-09) proposes an AI
    *skill* for Compose-to-Kubernetes migration that explains each mapping and warns on lossy keys. That shows demand for
    explanations, not only YAML.

---

## 3. Alternatives and complements

| Tool | Status (2026-10) | Role for PD |
|---|---|---|
| `podman kube generate` | Podman v6.1.x (upstream repo moved to `podman-container-tools/podman`) | Pod/container to `pod|deployment|daemonset|job` (`--type`), `--service` (NodePort, random port), `--replicas`. Named volume becomes a PVC with the volume name, bind mount becomes hostPath ([docs](https://docs.podman.io/en/latest/markdown/podman-kube-generate.1.html)). Faithful to *running* state (resolved env, image digests). Weak for multi-service apps |
| Kompose | v1.38.0 | Compose *file* to idiomatic multi-workload manifests. Uses design intent (labels, healthchecks, replicas). Better for Compose |
| `podman kube play` / Quadlet `.kube` | stable | Round-trip: the same YAML runs locally (pod) and as a systemd service (`[Kube] Yaml=`). Useful as a "test locally before cluster" step |
| Docker Compose Bridge | Docker Desktop 4.43+, templated transformations as images | Compose to manifests + Kustomize overlay (`out/overlays/desktop`). Proprietary to Docker Desktop. Good model for a "transformation = container image" plug-in |
| Compose on Kubernetes (Docker) | **archived 2022-02-14**, removed from docker CLI ([repo](https://github.com/docker/compose-on-kubernetes)) | Shows that running Compose natively on a cluster failed. Convert-then-own-YAML works |
| Score | CNCF Sandbox (2024-07). `score-compose` 0.47.0 (2026-09), `score-k8s` 0.20.0 (2026-10) | Platform-neutral `score.yaml` workload spec that renders to Compose *and* Kubernetes. Fits as a third generator for teams that adopt it |
| Move2Kube (Konveyor) | v0.3.15 (2025-03). No push since 2025-03, effectively dormant | Skip |
| odo / devfile | `redhat-developer/odo` **archived** | Skip |
| Skaffold v2.25 / Tilt v0.37 / DevSpace v6.3 | active | Inner-loop build+deploy+sync. PD should not reimplement this. A generated `skaffold.yaml` export is a possible later step |
| Kustomize v5.8.3 / Helm (v4) | active | **Export targets** (base + overlays per cluster; chart with values). Kompose `--chart` makes a basic chart |
| OpenShift `oc new-app`, BuildConfig, Shipwright | | Build on the cluster from git, which avoids image transfer. Use for OpenShift targets |
| Image transfer | kind `load`, minikube `image load`, `podman save | ctr import` for minc, local registry extension | Needed by any local-cluster deploy. PD already has kind and minikube actions |

---

## 4. Design proposal for PD v3 (mockable)

### 4.1 Entry points (P13)
| Source | Where | Action |
|---|---|---|
| Compose project | Compose details header: secondary **"Deploy to Kubernetes"** (primary stays Start/Stop). Also the tree/table row `⋯` menu | Opens a **Deploy tab** |
| Pod / container | details header `⋯`, table row `⋯`, tree context menu | Same tab, preselected generator *Podman* |
| Quadlet (`.kube` / `.container` / `.pod`) | Quadlets table row `⋯` | Same tab. A `.kube` unit's YAML is used directly |
| Kubernetes connection | connection overview header `⋯`: "Deploy from engine…" | Picker of local sources, then the same tab |
| Kube tab of any source | toolbar: Generator dropdown, Copy, Save, **Deploy…** | Shares the generator selector |

The Deploy tab is an editor tab (`ui/Tab.svelte`, kind icon = rocket/kube, provider badge = source engine).
Title "Deploy `orders` → kind-dev". Header (`r3/Head.svelte`): `[kube icon] Deploy orders · Draft pill · podman-machine-default → kind-dev chip …… [Export ▾] [Dry run] [Deploy]` (primary last, per rule D11).

### 4.2 Tab layout: left options, right YAML (Summary / YAML / Diff segmented control)
1. **Target**: cluster (Kubernetes connections from the switcher, not "current context") and namespace
   (combobox, or create a new one). An OpenShift badge appears when the `route.openshift.io` group is supported.
2. **Generator**: segmented `Podman | Kompose | Score`. The list comes from `getKubeGeneratorsInfos(type)`.
   Uninstalled generators appear as "Install…" ghost entries that link to the catalog.
3. **Workloads** (ModernTable, one row per service/container): name · kind (Deployment/StatefulSet/DaemonSet/Job)
   · replicas · image · image source (`Registry ✓` / `Local only ⚠`) · ports.
4. **Networking** (per port row): Service type (ClusterIP/NodePort/LoadBalancer), Expose (none / Ingress host /
   Route with TLS edge). Ingress class is detected.
5. **Storage** (per volume row): keep as PVC (size, StorageClass from the cluster's list, default marked) / emptyDir /
   ConfigMap (small bind mounts) / drop. Bind mounts default to emptyDir with a ⚠ chip.
6. **Images**: for each local-only image choose *Load into cluster* (kind/minikube/minc, detected from the connection
   provider) or *Push to registry* (registry picker from Settings › Registries, then rewrite `image:`), or *Build on cluster*
   (OpenShift BuildConfig/Shipwright, later).
7. **Security**: "Restricted Pod Security profile" (on by default for OpenShift), runAsNonRoot warnings per image (USER 0).
8. **Lossy keys panel** (read-only ModernTable, severity dots): `depends_on dropped`, `network aliases ignored`,
   `bind mount ./data → emptyDir`, `build args not supported`. Each row has a "why / what to do" tooltip. This is
   the deterministic version of what [#19324](https://github.com/podman-desktop/podman-desktop/issues/19324) asks an AI skill to explain.

Options are written back into the generator call. For Kompose they become `kompose.*` labels or flags, so the
YAML pane updates live. Manual YAML edits switch the options pane to "edited, regenerate to discard".
The **Diff** view compares the generated YAML with the live objects when the deployment already exists.

### 4.3 Run
- **Dry run** runs a server-side apply with `dryRun=All` and lists per-object results (created/configured/unchanged/error) in the
  bottom panel tab "Deploy orders".
- **Deploy** is one task with steps (load/push images → create namespace → apply in order: ConfigMap/Secret/PVC →
  Service → workloads → Ingress/Route → wait for rollout). It streams in a bottom-panel tab and also appears in the task manager.
- Every object gets the labels `app.kubernetes.io/managed-by=podman-desktop`, `app.kubernetes.io/part-of=<project>`,
  and the annotations `io.podman-desktop/source=compose:orders@podman-machine-default`, `…/generator=kompose@1.38.0`.
  These give provenance and drive redeploy/undeploy.
- **Result**: the success state lists the created resources (ModernTable linking into the cluster tree; the namespace node expands
  and highlights the new rows), Route/Ingress URLs, and a port-forward quick action for ClusterIP services.

### 4.4 After deploy
- The Compose/pod Summary gets a "Deployments" card: `kind-dev / orders · 4 workloads · Synced` (or `Drifted` when
  the local source changed, comparing the generated YAML hash with the annotation). Actions: **Redeploy** (opens the tab with Diff),
  **Undeploy** (delete by `part-of` label, PVCs opt-in), **Open in cluster**.
- On the cluster side, a namespace or workload with the provenance annotation shows an "Deployed from orders (Compose)" chip
  that links back to the source.

### 4.5 Export
`Export ▾`: Save YAML (single file or one file per object) · **Kustomize** (base + `overlays/<context>` holding the
namespace, image, and replica patches; PD writes this itself) · **Helm chart** (Kompose `--chart`, or a PD template with
`values.yaml` exposing image/replicas/service type) · Quadlet `.kube` (round-trip to systemd) · `skaffold.yaml` (later).

### 4.6 Ownership
| Piece | Owner |
|---|---|
| Deploy tab, apply/dry-run/undeploy, provenance labels, image transfer orchestration | **core** (Kubernetes) |
| Podman generator (`--type deployment --service`, plus a post-processor that splits a compose pod into Deployments by `com.docker.compose.service` label) | core default generator |
| Kompose generator | new **`podman-desktop.kompose` extension**: downloads the binary from GitHub releases (like the compose extension), calls `registerKubernetesGenerator({name:'Kompose', types:['Compose']})` |
| Score generator | optional `score` extension (`score-k8s generate`) |
| Image load into cluster | kind / minikube / minc extensions, through a new provider capability `loadImage(connection, image)` instead of a context menu |
| Registry push | core registries |

**API changes needed** (`packages/extension-api`):
1. `KubernetesGeneratorArgument` gains `composeFiles?: string[]`, `projectDir?: string`, `profiles?: string[]`
   (Kompose needs the file, not the container ids; the compose extension knows them via the `com.docker.compose.project.config_files` label).
2. `generate(args, options?: KubernetesGeneratorOptions)`, where the options are `{namespace, controller, replicas, serviceType, expose, volumes:{name→{type,size,storageClass}}, restricted}`. Each generator declares
   `supportedOptions` so that unsupported controls are disabled.
3. `GenerateKubeResult` gains `warnings?: {severity, source, message}[]` (feeds the lossy-keys panel) and `files?: {path, content}[]` (Helm/Kustomize export).
4. The renderer must actually call `generateKube` / `getKubeGeneratorsInfos` (dead plumbing today).

### 4.7 Sample data for the mockup
```json
{
  "source": {"kind": "compose", "name": "orders", "engine": "podman-machine-default", "files": ["~/src/orders/compose.yaml"]},
  "target": {"connection": "kind-dev", "namespace": "orders", "openshift": false, "storageClasses": ["standard (default)"], "ingressClass": "nginx"},
  "generator": {"id": "kompose", "version": "1.38.0"},
  "workloads": [
    {"name": "web", "kind": "Deployment", "replicas": 2, "image": "localhost/orders-web:dev", "imageSource": "local", "ports": [{"port": 8080, "service": "ClusterIP", "expose": "ingress:orders.127.0.0.1.nip.io"}]},
    {"name": "api", "kind": "Deployment", "replicas": 1, "image": "quay.io/acme/orders-api:2.3", "imageSource": "registry", "ports": [{"port": 3000, "service": "ClusterIP"}]},
    {"name": "db", "kind": "StatefulSet", "replicas": 1, "image": "docker.io/library/postgres:17", "imageSource": "registry", "ports": [{"port": 5432, "service": "ClusterIP"}]},
    {"name": "cache", "kind": "Deployment", "replicas": 1, "image": "docker.io/valkey/valkey:9", "imageSource": "registry", "ports": [{"port": 6379, "service": "ClusterIP"}]}
  ],
  "volumes": [
    {"name": "pgdata", "from": "named volume", "as": "PVC", "size": "5Gi", "storageClass": "standard"},
    {"name": "./web/static", "from": "bind mount", "as": "emptyDir", "warning": "host path not available on cluster"}
  ],
  "warnings": [
    {"severity": "warning", "source": "api.depends_on", "message": "depends_on: db dropped – add an initContainer or retry logic"},
    {"severity": "info", "source": "networks.backend", "message": "Compose networks ignored (flat cluster network); enable NetworkPolicies to restrict"},
    {"severity": "warning", "source": "web.image", "message": "localhost/orders-web:dev only exists locally – will be loaded into kind-dev"},
    {"severity": "info", "source": "db.user", "message": "postgres runs as UID 999: OK for restricted profile"}
  ],
  "result": [
    {"kind": "Namespace", "name": "orders", "status": "created"},
    {"kind": "PersistentVolumeClaim", "name": "pgdata", "status": "created"},
    {"kind": "Service", "name": "web", "status": "created"},
    {"kind": "Deployment", "name": "web", "status": "rolling out 1/2"},
    {"kind": "StatefulSet", "name": "db", "status": "ready 1/1"},
    {"kind": "Ingress", "name": "web", "status": "created", "url": "http://orders.127.0.0.1.nip.io"}
  ]
}
```

---

## 5. Risks and limitations
- **Lossy conversion** (depends_on, network aliases, devices, sysctls, logging, extra_hosts, build args): always preview, and list
  dropped keys. Never offer one-click deploy without showing the YAML (Portainer's lesson).
- **Build contexts**: Kompose `--build local` shells out to `docker build`/`docker push` and reads Docker credential files
  (macOS `osxkeychain` breaks push). PD should build with its own engine and push/load itself, passing `--build none` to Kompose.
- **Local images on remote clusters**: a registry push is mandatory for non-local clusters. Rewriting `image:` must be visible in the diff.
- **Secrets**: Compose `secrets` from files become Secret objects whose values sit in the YAML preview. Mask them in the UI, never persist
  them in exports by default, and offer "reference existing Secret". External secrets are unsupported.
- **Storage**: PVCs need a default StorageClass (kind/minikube have one, bare clusters may not). Bind mounts don't translate, and
  `Recreate` strategy plus RWO volumes limit replicas to 1.
- **OpenShift**: restricted-v2 SCC uses random UIDs, so images running as root or binding to ports below 1024 fail. Kompose's OpenShift provider
  emits deprecated DeploymentConfig, so PD should prefer `--provider kubernetes` plus Route post-processing.
- **Kompose maintenance**: the release cadence is slow, and it carries a dependency CVE surface (k8s, openshift/api pinned to 2023). Ship it as an opt-in extension with a
  pinned and verified binary download. Podman generate stays the default.
- **Drift and ownership**: redeploying over hand-edited cluster objects. Use server-side apply with field manager `podman-desktop`
  and show conflicts in the Diff view.
- **Scope creep**: inner-loop sync/hot-reload belongs to Skaffold/Tilt/DevSpace. PD should stop at deploy/redeploy/undeploy.

## Sources
- Kompose: [repo](https://github.com/kubernetes/kompose), [releases](https://github.com/kubernetes/kompose/releases), [user guide](https://kompose.io/user-guide/), [conversion matrix](https://kompose.io/conversion/), [installation](https://kompose.io/installation/), [convert.go](https://github.com/kubernetes/kompose/blob/main/cmd/convert.go), [PR #1297 remove up/down](https://github.com/kubernetes/kompose/pull/1297)
- Podman: [podman kube generate](https://docs.podman.io/en/latest/markdown/podman-kube-generate.1.html), [containers/podman#17712](https://github.com/containers/podman/issues/17712)
- PD issues: [#3961](https://github.com/podman-desktop/podman-desktop/issues/3961), [#4725](https://github.com/podman-desktop/podman-desktop/issues/4725), [#19324](https://github.com/podman-desktop/podman-desktop/issues/19324), [#12438](https://github.com/podman-desktop/podman-desktop/issues/12438), [#2836](https://github.com/podman-desktop/podman-desktop/issues/2836), [#6649](https://github.com/podman-desktop/podman-desktop/issues/6649), [#5767](https://github.com/podman-desktop/podman-desktop/issues/5767), [#15173](https://github.com/podman-desktop/podman-desktop/issues/15173)
- Docker: [Compose Bridge](https://docs.docker.com/compose/bridge/), [customize](https://docs.docker.com/compose/bridge/customize/), [compose-on-kubernetes (archived)](https://github.com/docker/compose-on-kubernetes/blob/master/README.md)
- Portainer Kompose removal: [oneuptime summary](https://oneuptime.com/blog/post/2026-03-20-portainer-kompose-deployments-removed/markdown)
- Score: [docs](https://docs.score.dev/docs), [CNCF sandbox announcement](https://humanitec.com/blog/score-accepted-as-a-cncf-sandbox-project); versions via GitHub API (score-compose 0.47.0, score-k8s 0.20.0)
- Others: GitHub API on 2026-10-09 for konveyor/move2kube, redhat-developer/odo (archived), skaffold, tilt, devspace, kustomize
- PD code: `packages/renderer/src/lib/pod/DeployPodToKube.svelte`, `packages/main/src/plugin/kubernetes/kube-generator-registry.ts`, `packages/main/src/plugin/index.ts` (L646, L1108-1134, L1971), `packages/extension-api/src/extension-api.d.ts` (L2465-2517), `extensions/kind/package.json`, `ext-kreate/README.md`
