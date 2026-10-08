# OLM v1 / OperatorHub

## 1. Identity
- **Display name:** Operators (OLM)
- **Extension id:** `redhat.olm` (proposed; absorbs feloy/podman-desktop-extension-kubernetes-olm)
- **Icon:** https://github.com/operator-framework.png
- **Description:** Browse catalogs and install operators on any connected cluster with OLM v1.

## 2. Real objects & fields ([OLM v1 docs](https://operator-framework.github.io/operator-controller/))
- `ClusterCatalog` (`olm.operatorframework.io/v1`): `spec.source.type: Image`, `spec.source.image.ref`, `spec.source.image.pollIntervalMinutes`, `spec.priority`, `spec.availabilityMode` (`Available`|`Unavailable`); `status.conditions[Serving|Progressing]`, `status.resolvedSource.image.ref`, `status.urls.base`, `status.lastUnpacked`.
- `ClusterExtension`: `spec.namespace`, `spec.serviceAccount.name`, `spec.source.sourceType: Catalog`, `spec.source.catalog.{packageName, version (range), channels[], selector, upgradeConstraintPolicy: CatalogProvided|SelfCertified}`; `status.install.bundle.{name,version}`, `status.conditions[Installed|Progressing]` with reasons `Succeeded|Failed|Retrying|Blocked`.
- Default OpenShift catalogs: `openshift-redhat-operators`, `openshift-certified-operators`, `openshift-community-operators`, `openshift-redhat-marketplace` (image `registry.redhat.io/redhat/redhat-operator-index:v4.22`). Local clusters: `operatorhubio` (`quay.io/operatorhubio/catalog:latest`).
- Package metadata via catalogd `/api/v1/all` (FBC `olm.package`, `olm.channel`, `olm.bundle`).

## 3. Placement
- **navSections:** "Operators" under Kubernetes connections `when kube.hasCRD('clusterextensions.olm.operatorframework.io')`, sub-tabs Catalog / Installed / Catalogs.
- **addons:** on kind/minc connections "OLM v1" add-on (installs operator-controller) (P13).
- **menus:** Installed row: Upgrade, Uninstall, View YAML. P#: **P2, P4, P13**.

## 4. Journeys
1. **Install cert-manager on ocp-dev.** Operators → search "cert-manager" → pick `openshift-cert-manager-operator` channel `stable-v1` → create SA + ClusterExtension → Progressing → Installed `v1.18.0`. Failure: SA lacks permissions → `Installed=False reason=Failed` "pre-authorization failed" with fix "Create RBAC".
2. **Add OperatorHub.io catalog to minc.** Catalogs tab → Add `operatorhubio` → Serving after unpack.
3. **Upgrade blocked.** Installed list shows `amq-streams` upgrade 2.9 → 3.1 → `Blocked` (no upgrade edge) → offer `SelfCertified`.

## 5. Sample data
```json
{
  "catalogs":[
    {"name":"openshift-redhat-operators","ref":"registry.redhat.io/redhat/redhat-operator-index:v4.22","priority":-100,"serving":true,"lastUnpacked":"2026-10-08T06:00:12Z"},
    {"name":"openshift-certified-operators","ref":"registry.redhat.io/redhat/certified-operator-index:v4.22","priority":-200,"serving":true,"lastUnpacked":"2026-10-08T06:02:40Z"},
    {"name":"operatorhubio","ref":"quay.io/operatorhubio/catalog:latest","priority":0,"serving":true,"lastUnpacked":"2026-10-07T22:15:03Z"}
  ],
  "packages":[
    {"packageName":"openshift-cert-manager-operator","catalog":"openshift-redhat-operators","defaultChannel":"stable-v1","latest":"1.18.0","provider":"Red Hat"},
    {"packageName":"openshift-gitops-operator","catalog":"openshift-redhat-operators","defaultChannel":"latest","latest":"1.19.1","provider":"Red Hat"},
    {"packageName":"openshift-pipelines-operator-rh","catalog":"openshift-redhat-operators","defaultChannel":"latest","latest":"1.21.0","provider":"Red Hat"},
    {"packageName":"kubevirt-hyperconverged","catalog":"openshift-redhat-operators","defaultChannel":"stable","latest":"4.22.1","provider":"Red Hat"},
    {"packageName":"amq-streams","catalog":"openshift-redhat-operators","defaultChannel":"stable","latest":"3.1.0","provider":"Red Hat"},
    {"packageName":"skupper-operator","catalog":"openshift-redhat-operators","defaultChannel":"stable-2","latest":"2.2.0","provider":"Red Hat"},
    {"packageName":"prometheus","catalog":"operatorhubio","defaultChannel":"beta","latest":"0.86.0","provider":"Community"}
  ],
  "clusterExtensions":[
    {"name":"cert-manager","namespace":"cert-manager-operator","packageName":"openshift-cert-manager-operator","channels":["stable-v1"],"bundle":"cert-manager-operator.v1.18.0","installed":"True","reason":"Succeeded","created":"2026-09-02T10:11:00Z"},
    {"name":"amq-streams","namespace":"kafka","packageName":"amq-streams","version":">=2.9.0 <4.0.0","bundle":"amqstreams.v2.9.1","installed":"True","progressing":"True","progressingReason":"Blocked","message":"no upgrade edge from 2.9.1 to 3.1.0"}
  ]
}
```
