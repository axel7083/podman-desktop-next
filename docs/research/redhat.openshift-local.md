# Red Hat OpenShift Local (CRC)

## 1. Identity
- **Display name:** Red Hat OpenShift Local
- **Extension id:** `redhat.openshift-local` (real; `ext-crc/package.json`, v2.5.0-next)
- **Icon:** `../ext-crc/icon.png` (fallback: https://cdn.simpleicons.org/redhatopenshift)
- **Description:** Run a single-node OpenShift, MicroShift or OKD cluster in a local VM.

## 2. Real objects & fields
- `crc status -o json` → `{ success, crcStatus: "Running"|"Stopped"|"Starting"|"Stopping"|"No Cluster"|"Need Setup", openshiftStatus: "Running"|"Degraded"|"Starting"|"Stopped"|"Unreachable", openshiftVersion, podmanVersion, diskUsage, diskSize, cacheUsage, cacheDir, ramSize, ramUsage, preset }` ([crc docs](https://crc.dev/docs/))
- `crc config` keys: `preset` (`openshift` | `microshift` | `okd`), `cpus`, `memory` (MiB, openshift min 10752), `disk-size` (GiB), `pull-secret-file`, `consent-telemetry`, `enable-cluster-monitoring`, `kubeadmin-password`.
- Extension settings (real): `crc.factory.preset` enum `openshift|microshift`, `crc.factory.openshift.memory` 11274289152, `crc.factory.microshift.memory` 4294967296, `crc.factory.disksize` 37580963840, `crc.factory.pullsecretfile`, `crc.factory.start.now`.
- Daemon API `GET /api/status`, `/api/start`, `/api/stop`, `/api/webconsoleurl` → `{ClusterConfig:{ClusterType, ClusterCACert, KubeConfig, KubeAdminPass, ClusterAPI, WebConsoleURL, ProxyConfig}}`.
- Credentials: `kubeadmin` / `developer` users; console `https://console-openshift-console.apps-crc.testing`, API `https://api.crc.testing:6443`.

## 3. Placement (provider-first UI)
- **connections:** Kubernetes connection type `openshift-local` (one per preset); status dot from `crcStatus`.
- **navSections under connection:** reuse Kubernetes resources + `Console` link + `Users` (kubeadmin/developer creds copy).
- **menus:** connection kebab: Start / Stop / Delete / Open Console / Copy login command / Change preset.
- **tasks:** `crc setup` (bundle download ~4 GB), `crc start` progress.
- **accounts:** pull secret pulled from Red Hat account via OCM `/api/accounts_mgmt/v1/access_token` (R38). P#: **P1, P12 (factory), P16, P13 (console already there)**.

## 4. Journeys
1. **Create with OCM pull secret.** Create → preset `openshift` → "Use pull secret from my Red Hat account" (prefilled) → task "Downloading bundle 4.22.3 (4.3 GB)" → "Starting OpenShift" → Running. Failure: not enough memory (host 16 GB, needs 10.5 GB) → inline error with "Switch to MicroShift preset".
2. **Switch preset to MicroShift.** Kebab → Change preset → confirm delete of existing cluster → task → new connection `microshift` (4 GB). Failure: VM still running → "Stop first" button.
3. **Open console as developer.** Kebab → Open Console → copy `developer` password toast. Failure: `openshiftStatus: Degraded` → banner listing degraded operators.

## 5. Sample data
```json
[
  {"name":"openshift-local","preset":"openshift","crcStatus":"Running","openshiftStatus":"Running","openshiftVersion":"4.22.3","ramSize":11274289152,"ramUsage":8423112704,"diskSize":37580963840,"diskUsage":21470478336,"cpus":6,"apiUrl":"https://api.crc.testing:6443","consoleUrl":"https://console-openshift-console.apps-crc.testing","crcVersion":"2.58.0","createdAt":"2026-09-30T08:12:44Z"},
  {"name":"microshift-local","preset":"microshift","crcStatus":"Stopped","openshiftStatus":"Stopped","openshiftVersion":"4.22.3","ramSize":4294967296,"diskSize":37580963840,"cpus":4,"apiUrl":"https://api.crc.testing:6443","createdAt":"2026-08-14T15:40:02Z"},
  {"name":"okd-local","preset":"okd","crcStatus":"No Cluster","openshiftVersion":"4.21.0-okd-scos.11"},
  {"bundles":[{"preset":"openshift","version":"4.22.3","size":4617089843,"cached":true},{"preset":"microshift","version":"4.22.3","size":1932735283,"cached":true},{"preset":"okd","version":"4.21.0-okd-scos.11","size":4402341478,"cached":false}]},
  {"users":[{"name":"kubeadmin","password":"vXqhT-2Ks9J-pW7aL-QmZ3c"},{"name":"developer","password":"developer"}]}
]
```
