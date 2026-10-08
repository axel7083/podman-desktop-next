# OpenShift CLI pack

## 1. Identity
- **Display name:** OpenShift CLI Tools
- **Extension id:** `redhat.openshift-cli-pack` (proposed)
- **Icon:** https://cdn.simpleicons.org/redhatopenshift
- **Description:** Install, update and put on PATH the OpenShift command-line tools, matched to your clusters.

## 2. Real objects & fields
- PD API `cli.createCliTool({name, displayName, markdownDescription, images, version, path, installationSource: 'extension'|'external'})` + `CliToolInstaller`/`CliToolUpdater` (P17).
- Sources: `https://mirror.openshift.com/pub/openshift-v4/clients/ocp/<ver>/` (oc, openshift-install, opm, oc-mirror), `https://developers.redhat.com/content-gateway/rest/mirror/pub/openshift-v4/clients/...` (rosa, tkn, kn, helm, odo-free), GitHub releases (ocm-cli, operator-sdk, shipwright cli, kubevirt), `roxctl` from Central `/api/cli/download/roxctl-linux`.
- Versions below are Oct 2026 estimates (OCP 4.22 GA, Kubernetes 1.35, per [4.22 release notes](https://docs.redhat.com/en/documentation/openshift_container_platform/4.22/html/release_notes/ocp-4-22-release-notes)); verify before shipping.

## 3. Placement
- **cliTools:** one row per tool in Settings → CLI Tools (installed / update available / not installed).
- **tools:** "OpenShift CLI pack" page with matrix "tool × cluster version skew" (e.g. oc 4.20 vs ocp-dev 4.22 → warning).
- **menus:** on Kubernetes connections "Copy login command", "Open terminal with oc". P#: **P17**.

## 4. Journeys
1. **Install pack.** Tools → OpenShift CLI → "Install recommended (6)" → parallel tasks with download % → all green, PATH snippet shown. Failure: checksum mismatch on `rosa` → retry.
2. **Version skew fix.** Banner "oc 4.20.12 is 2 minors behind ocp-dev (4.22.3)" → Update → done.
3. **`oc login --web`.** From OCM connection → requires oc ≥ 4.19 → if missing, inline "Install oc" then continue.

## 5. Sample data
```json
[
  {"name":"oc","displayName":"OpenShift CLI","installed":"4.20.12","latest":"4.22.3","source":"mirror.openshift.com","path":"~/.local/share/containers/podman-desktop/extensions-storage/redhat.openshift-cli-pack/bin/oc"},
  {"name":"openshift-install","installed":null,"latest":"4.22.3"},
  {"name":"ocm","displayName":"OCM CLI","installed":"1.0.9","latest":"1.0.9"},
  {"name":"rosa","displayName":"ROSA CLI","installed":"1.2.57","latest":"1.2.59"},
  {"name":"virtctl","installed":null,"latest":"1.7.1"},
  {"name":"roxctl","displayName":"ACS CLI","installed":"4.9.2","latest":"4.10.0"},
  {"name":"tkn","displayName":"Tekton CLI","installed":"0.43.0","latest":"0.43.0"},
  {"name":"kn","displayName":"Knative CLI","installed":null,"latest":"1.38.0"},
  {"name":"opm","installed":null,"latest":"1.62.0"},
  {"name":"operator-sdk","installed":"1.41.1","latest":"1.42.0"},
  {"name":"oc-mirror","installed":null,"latest":"4.22.3"},
  {"name":"shp","displayName":"Shipwright CLI","installed":null,"latest":"0.17.0"},
  {"name":"helm","installed":"3.19.2","latest":"4.0.4","note":"Helm 4 major; offer 3.19.x stream too"}
]
```
