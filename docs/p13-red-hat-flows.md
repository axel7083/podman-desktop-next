# P13: Red Hat flows (products working together)

Eight end-to-end workflows where Red Hat products hand work to each other inside
P13 (`#/`). What each one gets you, in one line:

1. **Red Hat account**: one sign-in configures registry.redhat.io, subscriptions,
   activation keys and the Developer Sandbox for every other flow.
2. **RHEL Podman machine**: a subscribed RHEL 10 machine running Podman, ready as
   your current connection.
3. **RHEL Lightspeed**: a failed command in the terminal is explained and fixed
   with one click.
4. **Image supply chain**: an image is rebased on Hummingbird, scanned, signed,
   pushed to Quay and deployed to OpenShift, with its provenance on its Summary.
5. **bootc end to end**: a bootable container becomes a disk image, then a running
   local VM (macadam) or an OpenShift Virtualization VM.
6. **AI chain**: a local model is served with vLLM, packaged as a ModelCar, pushed
   to Quay and served by OpenShift AI, then compared in the playground.
7. **Local OpenShift**: a local cluster gets the OpenShift console and operators.
8. **Kompose**: a Compose project becomes Kubernetes manifests deployed to a cluster.

**Discover and learn them in the app.** The Dashboard has a collapsible **Demo
workflows** section (`data-testid="rh-workflows"`): one card per flow with its
title, outcome and product chain (e.g. Hummingbird → Grype → Quay → Trusted
Artifact Signer → OpenShift) and a **Start** button. Start launches a guided tour:
a coach mark highlights the next element (tree item, header action, menu item,
modal field) with "Step n of N — why" and Back / Show me / Next / Exit. A step
advances by itself when you do it (click the highlighted element, the tab opens,
the task finishes); **Show me** plays the whole flow for you. Before each step the
tour puts the app in the state it needs (connection, expanded tree, extension
installed, tab open), so it never gets stuck. The same tours are in the command
palette (Ctrl/⌘K or the title-bar search) as **Tour: <flow>** under *Workflows*.
Tours: `src/lib/nav-lab/r3/tours.svelte.ts`; overlay: `r3/TourOverlay.svelte`;
palette: `r3/Palette.svelte`.

Implementation: every flow is declared by extensions and built only from existing
P13 surfaces: the connection switcher, the tree, tabs, header actions, `⋯` /
right-click menus, bottom-panel tasks and sessions, and the Vanilla promotions.
State: `src/lib/nav-lab/r3/flows.svelte.ts` (modal, tasks, runtime connections /
resources, provenance); modals: `r3/modals/*.svelte` hosted by
`ui/FlowModals.svelte`. Smoke test (flows and every tour in Show me mode):
`node loop/p13-smoke.mjs http://localhost:5173/`.

Every task streams its output in the bottom panel (source chip = the resource
it acts on) and its result appears where the user expects it: a new connection
becomes current in the switcher, a new resource appears in the tree and its
list, a timeline step turns done with a deep link.

## 1. Red Hat account (Red Hat Authentication)

Click path: title bar **Accounts** → **Sign in with Red Hat** → modal (browser
SSO simulated, then *registry service account `podman-desktop`*, *registry.redhat.io*,
*subscriptions and activation keys*) → **Done**.

Result: title-bar avatar; Accounts tab = account card, **Subscription status**
(Simple Content Access, used-by chips → connection / Settings), **Activation
keys** and **Subscriptions** tables; **Settings › Registries** row
`registry.redhat.io` "Configured by Red Hat account"; the Developer Sandbox
connection turns running.
Also reachable inline from every flow that needs it (RHEL machine, RHEL
bootc builder, vLLM image, Developer Sandbox target); the modal reopens the
flow afterwards.
Vanilla: "Red Hat content" promotion on RHEL / UBI images (Summary) and on
RHEL connections (Overview) → "Install Red Hat Authentication".

## 2. RHEL Podman machine (RHEL VMs + Red Hat account)

Click path: connection switcher → **Add connection** → **RHEL Podman machine**
→ wizard: name, release **RHEL 10.2 / 9.8**, source **Official image / Image
Builder compose**, provider **WSL / Hyper-V / applehv** (Hyper-V + official shows
the real `provider hyperv is not supported` error with fixes *Use WSL instead* /
*Use an Image Builder compose*), CPUs / memory / disk, register with an
activation key → **Create**.

Task: download → verify sha256 → `podman machine init --image …` → `podman
machine start` → `subscription-manager register --activationkey … --org …`.
Result: the machine (`rhel-10-2`) is added to the switcher (Engines) and
becomes the current connection; the key's "Used by" lists it.

## 3. RHEL Lightspeed in the bottom panel

Click path: bottom panel → terminal `rhel-10` (failed `dnf install`, system not
registered) → inline **Command failed · Ask Lightspeed** (also: inline button
on error lines of logs / terminals, right-click → *Ask Lightspeed about
selection / this line / Explain last failed command*).

Result: a **Lightspeed** session tab in the panel: the question quotes the
context, the answer streams, cites docs.redhat.com, and suggests a command with
**Run in terminal** (opens a terminal on the same connection and runs it) and
**Copy**; follow-up input. Vanilla: the menu item reads "(install RHEL
Lightspeed)" and installs it.

## 4. Image supply chain (Hummingbird → checks → Quay + RHTAS → Deploy)

Click path: any image (tree / Images list) → Summary **Provenance** timeline
*built → scanned → signed → pushed → deployed*; each missing step has its
action, the same actions are in the header (Rebase on Hummingbird when an
alternative exists, Scan, Push to Quay, Deploy to…), `⋯` and right-click
(Check image, Push to Quay, Deploy to…).

- **Hummingbird rebase**: Find hardened alternative → Rebuild on hardened image
  (task) → new `…-hummingbird` image whose timeline starts with "Rebuilt on
  Hummingbird · 0 CVEs".
- **Check**: image Check view = Image checker for OpenShift + Hummingbird +
  Grype; Scan opens the Grype tab and marks *scanned*.
- **Push to Quay** modal: repository, tag, **Sign with Trusted Artifact
  Signer**, gate chips (Grype, OpenShift checks: pass / warn / fail) → task
  (`podman push`, `cosign sign` → Fulcio → Rekor index) → *signed* (Rekor link)
  and *pushed* (quay.io link).
- **Deploy to…** modal: Developer Sandbox (sign-in inline), OpenShift Local,
  minc, kind; generated Deployment / Service / Route (Ingress on kind) → task
  (`oc|kubectl apply`, rollout) → Deployment, Pod, Service, Route added to that
  cluster (namespace added to the selection) → *deployed* links to the
  Deployment tab (cluster › Compute › Deployments).

## 5. bootc end-to-end

Click path: Podman › EXTENSIONS › **Bootable containers** → Images → **Build
disk image** (row action, header primary or image `⋯`) → modal (image, types
qcow2 / raw / anaconda-iso / ami / vmdk / vhd, arch, filesystem, output folder,
user + SSH key; RHEL bases need the Red Hat account) → task
(`bootc-image-builder`) → row in **Disk Images** (Building → Success).

Then on a qcow2 / raw disk image:
- **Run in a VM** → modal (name, CPUs, memory) → task (`macadam init/start`)
  (local VM provider) → new **VM** connection in the switcher (Other), made current, and its
  serial console session in the panel;
- **Run on OpenShift Virtualization** → modal (OpenShift Local or minc) → task
  (`virtctl image-upload`, VirtualMachine, `virtctl start`) → VirtualMachine
  under the cluster's EXTENSIONS ▸ **Virtualization**, `virtctl console` in the
  panel.

## 6. AI chain (AI Lab → AI Inference Server → ModelCar → Quay → OpenShift AI)

Click path: Podman › EXTENSIONS › **AI Lab** › Models › `granite-3.3-8b-instruct`
→ Summary **AI chain** timeline (downloaded → served → ModelCar → pushed →
OpenShift AI → playground):
1. **Serve with Red Hat AI Inference** (header primary) → GPU check (CDI
   device, VRAM vs BF16 / FP8) → task (`podman run … vllm-cuda-rhel9`) →
   service `granite-3.3-8b vLLM :8000` under AI Lab › Services, container
   `rhaiis-granite-3.3-8b`;
2. **Package as ModelCar** → task (`podman build`, files under `/models`) →
   image `quay.io/acme/modelcar-granite-3.3-8b-instruct:1.0` in Images;
3. **Push to Quay** (same modal as flow 4);
4. **Deploy to OpenShift AI** → InferenceService on `rhoai-dev`
   (`storageUri: oci://…`) under EXTENSIONS ▸ OpenShift AI › Inference services,
   status Pending → Loaded;
5. **Use in playground** → AI Lab playground with the provider picker listing
   the local AI Lab service, the vLLM endpoint and the OpenShift AI endpoint.

## 7. Local OpenShift (OpenShift Local, minc, Developer Sandbox)

- **Console add-on**: minc / kind › EXTENSIONS › **OpenShift Console** →
  **Install console** (task: console Deployment, port-forward 9000) → warning
  "Authentication is disabled…" → **Open console**. Built into OpenShift Local.
- **Operators (OLM)**: OpenShift Local / minc › EXTENSIONS › **Operators** →
  segmented *Installed | Catalog* → **Install** (task: ClusterExtension) →
  Installed.
- **Developer Sandbox** as a deploy target (flow 4), signed in through the
  Red Hat account.

## 8. Kompose: engine to Kubernetes

Research: [research/kompose-engine-to-kube.md](research/kompose-engine-to-kube.md).
Extension `kompose` (modelled like Grype: its own tab, Vanilla promotion).

Click path: compose project details → header secondary **Convert to Kubernetes**
(also `⋯` / right-click on compose groups, pods, containers, quadlets, and the
bulk bar when several containers are selected) → tab **Kompose · <source>**:
- header: segmented **Manifests | Warnings**, **Export ▾** (Helm chart,
  Kustomize, raw YAML, Quadlet `.kube`), **Dry run**, primary **Deploy**;
- **Target** bar (second row): cluster / namespace and generator (Kompose,
  `podman generate kube`, Score). The kompose binary and its version are
  managed in Settings › CLI Tools (Kompose card);
- **Manifests** (default): generated files grouped per compose service
  (`io.kompose.service`); the group row summarizes the service (controller ×
  replicas · Service type :port · Route / Ingress host · PVC · image strategy)
  and its **Options** menu edits controller, replicas, Service type, expose,
  PVC size and image strategy (keep, push to Quay, load into kind / minc);
  children are its files (Deployment, Service, Ingress / Route, PVC) with a
  diff state vs the cluster (New / Modified / Unchanged); YAML on the right (Ctrl+F);
- **Warnings**: dropped / lossy compose features (depends_on, networks, build
  contexts, healthcheck → livenessProbe, PVC on the default StorageClass).

Deploy: task (load / push images → apply PVCs, Services, workloads, Routes /
Ingresses → rollout status) → resources highlighted in the cluster tree
(Compute ▸ Deployments expanded), and the source Summary gets a
**Deployments** table (cluster / namespace, Synced / Drifted after an edit,
Redeploy with diff, Undeploy). Vanilla: "Convert to Kubernetes (install
Kompose)" opens the tab with the install promotion.

Every Red Hat extension lists its product / docs / repository links in a
**Resources** card (extension Overview tabs, extension pages) and on the
Extensions page cards (`r3/ext-links.ts`).
