# MicroShift (minc) + OpenShift Console add-on

## 1. Identity
- **Display name:** MicroShift (minc); add-on "OpenShift Console"
- **Extension id:** `minc-org.minc` (real; `ext-minc/package.json`, v0.5.0-next)
- **Icon:** `/home/astefani/github/podman-desktop/ext-minc/icon.png` (also `logo.png`, `logo-dark.png`); console add-on: https://cdn.simpleicons.org/redhatopenshift
- **Description:** MicroShift in a single Podman container; optional upstream OpenShift Console add-on.

## 2. Real objects & fields
- minc v0.2.0: `minc create --http-port 80 --https-port 443 [--allow-rootless]`; image `quay.io/minc-org/minc:4.19.0-okd-scos.17-<arch>`; MicroShift 4.19 / Kubernetes v1.32.8 / CRI-O 1.32.8; `dns.baseDomain: 127.0.0.1.nip.io`; CNI kindnet; built-in manifests `000-microshift-kindnet`, `000-microshift-kube-proxy`, `001-microshift-olm`.
- Extension settings (real): `microshift.cluster.creation.http.port` 80, `.https.port` 443, `.allow.rootless` false. Proposed: `microshift.cluster.creation.console` boolean.
- APIs present: `route.openshift.io/v1 Route`, `security.openshift.io/v1 SecurityContextConstraints`, `operators.coreos.com/*` (OLM v0, no packageserver). Absent: `config.openshift.io`, `oauth.openshift.io`, `project.openshift.io`, `console.openshift.io`.
- **Console add-on** ([minc-extension#577](https://github.com/minc-org/minc-extension/issues/577)): image `quay.io/openshift/origin-console:4.19` (**amd64 only**, ~470 MB); 16 objects via kustomize (`deploy/base`): ns `openshift-console`, `openshift-console-user-settings`, SA `console` + `console-user` (cluster-admin), ConsoleConfig `auth.authType: disabled`, env `BRIDGE_BASE_ADDRESS`, Service with `service.beta.openshift.io/serving-cert-secret-name`, reencrypt Route `console-openshift-console.apps.127.0.0.1.nip.io`. Rollout ~2 min. Frontend reports `authDisabled: true`, `branding: okd`.
- Working pages: Overview, Pods, Deployments, Nodes, Routes, CRDs, Topology, logs. Empty/404: OperatorHub, Projects, Cluster Settings, Observe, Helm.

## 3. Placement
- **connections:** Kubernetes connection type `minc` (status from container state).
- **addons (P13):** on the minc connection "Add-ons" tab: `OpenShift Console` (install/uninstall/status/endpoint), `OLM catalog` (see OLM dossier). Add-on card shows **warning "Authentication disabled — every visitor is cluster-admin. Local use only."** and on arm64 hosts **"Not available: origin-console is amd64-only"** (disabled install).
- **menus:** connection kebab "Open OpenShift Console" when add-on Ready. P#: **P1, P2, P13, P4**.

## 4. Journeys
1. **Create minc with console.** Create MicroShift → ports 80/443 → check "Install OpenShift Console" (auth warning inline) → task: "Pulling minc image (1.1 GB)" → "Starting MicroShift" → "Applying console (16 objects)" → "Waiting for rollout" → Ready → "Open console" button. Failure: port 443 in use → suggest 9443 (overlay `https-9443`, URL gets `:9443`).
2. **Install add-on later.** minc connection → Add-ons tab → OpenShift Console → Install → confirm auth warning → progress → endpoint link. Failure: rollout timeout (`ImagePullBackOff`) → "View pod events".
3. **arm64 Mac.** Add-ons tab shows console disabled with amd64-only explanation and link to build multi-arch image.

## 5. Sample data
```json
{
  "connection":{"name":"minc","type":"minc","status":"started","container":"microshift","image":"quay.io/minc-org/minc:4.19.0-okd-scos.17-amd64","microshiftVersion":"4.19.0","kubernetesVersion":"v1.32.8","apiUrl":"https://127.0.0.1:6443","httpPort":80,"httpsPort":443,"rootless":false,"createdAt":"2026-10-06T07:41:18Z"},
  "addons":[
    {"id":"openshift-console","displayName":"OpenShift Console","status":"Ready","version":"4.19","image":"quay.io/openshift/origin-console:4.19","endpoint":"https://console-openshift-console.apps.127.0.0.1.nip.io","objects":16,"warnings":["Authentication disabled: every visitor acts as system:serviceaccount:openshift-console:console-user (cluster-admin). Local use only."],"arch":["amd64"],"installedAt":"2026-10-06T07:49:02Z"},
    {"id":"olm-catalog","displayName":"OperatorHub catalog","status":"NotInstalled"}
  ],
  "pods":[
    {"namespace":"openshift-console","name":"console-7d9c6b8f5d-x2lqv","phase":"Running","ready":"1/1","restarts":0},
    {"namespace":"openshift-ingress","name":"router-default-6f8d9c7b44-kp8mz","phase":"Running","ready":"1/1","restarts":0},
    {"namespace":"openshift-service-ca","name":"service-ca-5b7f4d9c8-qw4tn","phase":"Running","ready":"1/1","restarts":0},
    {"namespace":"kube-system","name":"kube-proxy-r9t2c","phase":"Running","ready":"1/1","restarts":0},
    {"namespace":"openshift-operator-lifecycle-manager","name":"olm-operator-5c9d8b7f6-mz7hd","phase":"Running","ready":"1/1","restarts":1}
  ]
}
```
