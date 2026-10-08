# Scenario: OpenShift customer

**Persona.** Jane Doe, platform-minded backend developer at Acme Bank (payments team). Fedora 44 laptop, x86_64, 32 GB RAM. Ships `payments-api` and `ledger-worker` to OpenShift via Tekton + Argo CD; images live on `quay.io/acme`; security gate is ACS on the prod hub.

**Environment fixture (state at app launch, 2026-10-08 09:00Z).**
- Accounts: `redhat.redhat-authentication` signed in as `jdoe@acme-bank.com` (org 18833012, scopes `api.ocm`, `api.console`).
- Podman: machine `podman-machine-default` running (Podman 5.7), containers `postgres`, `payments-api`, Skupper site `laptop-podman` (Not yet linked).
- Kubernetes connections: **OpenShift Local** `openshift-local` (preset openshift, 4.22.3, Running); **minc** (MicroShift 4.19, Running, OpenShift Console add-on *not installed*); **ocp-prod** (ROSA HCP, us-east-1, 4.21.9, connected; ACS Central, GitOps, no Lightspeed); **ocp-dev** (OCP 4.22.3, bare metal, *not connected* until `oc login --web`; has Pipelines, GitOps, Virtualization, Lightspeed, Skupper); **Developer Sandbox** (`dev-sandbox-context`, 14 days left); OCM also lists `ocp-qa` (hibernating) and `rosa-sandbox-jd` (installing).
- CLI tools: `oc 4.20.12` (outdated), `tkn`, `rosa`, `roxctl 4.9.2`; `virtctl`, `kn` missing.
- Registries: `quay.io` (robot `acme+ci_push`).

**Top 5 click-through journeys.**
1. **"Connect to my real clusters"** — OCM list → ocp-dev "Connect" → prompt to update `oc` 4.20 → 4.22 (CLI pack) → `oc login --web` task → ocp-dev turns green, Pipelines/GitOps/VMs/Operators nav items appear because the CRDs exist (P1, P2, P4, P12, P16, P17).
2. **"Ship safely"** — build `payments-api:1.5.0` → Push and scan → ACS pre-push check blocks (openssl High, USER root) → Quay Clair tab confirms FixedBy → rebuild on ubi9 → ACS clean → push → ocp-dev PipelineRun succeeds → GitOps `payments-prod` OutOfSync → Sync → Healthy (P5, P14).
3. **"OpenShift Console on my laptop"** — minc → Add-ons → OpenShift Console → auth-disabled warning → 4-step task (pull image, apply 16 objects, rollout, route) → Open `https://console-openshift-console.apps.127.0.0.1.nip.io` (P13). Bonus: Operators → add operatorhubio catalog on minc.
4. **"Laptop ↔ cluster hybrid dev"** — Podman → Service network → Link to ocp-dev (AccessGrant/Token) → container `postgres` → "Expose to cluster" → ocp-dev `ledger-worker` crashes → Ask Lightspeed with logs attached → answer points to rotated Secret → fix → Listener shows `hasMatchingConnector` and pod Running (P2, P4, P9, P14).
5. **"Edge image as a VM"** — bootc image `quay.io/acme/payments-edge:9.6` → "Run as VM on OpenShift" (ocp-dev) → qcow2 → containerDisk push → `VirtualMachine` Starting → Running → serial Console tab login prompt; then start kubernetes-mcp-server (read-only) for ocp-dev and copy agent config (P4, P9, P14, P15).

Supporting journeys: OpenShift Local create with OCM pull secret; Developer Sandbox provisioning with phone verification.
