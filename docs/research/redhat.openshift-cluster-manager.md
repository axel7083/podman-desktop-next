# OpenShift Cluster Manager (OCM)

## 1. Identity
- **Display name:** OpenShift Cluster Manager
- **Extension id:** `redhat.openshift-cluster-manager` (proposed)
- **Icon:** https://cdn.simpleicons.org/redhatopenshift (product page: https://www.redhat.com/en/technologies/cloud-computing/openshift)
- **Description:** See your organization's OpenShift, ROSA and OSD clusters and connect to them with one sign-in.

## 2. Real objects & fields
- `GET https://api.openshift.com/api/clusters_mgmt/v1/clusters` → `{kind:"ClusterList", page, size, total, items:[Cluster]}` ([OCM API](https://api.openshift.com/)).
- `Cluster`: `id`, `external_id`, `name`, `display_name`, `state` (`installing`|`ready`|`error`|`hibernating`|`powering_down`|`resuming`|`uninstalling`|`pending`|`validating`|`waiting`|`unknown`), `openshift_version`, `product.id` (`rosa`|`osd`|`ocp`|`osdtrial`|`aro`), `cloud_provider.id` (`aws`|`gcp`|`azure`|`baremetal`), `region.id`, `hypershift.enabled` (HCP), `multi_az`, `console.url`, `api.url`, `api.listening` (`external`|`internal`), `nodes.compute`, `subscription.href`, `creation_timestamp`, `expiration_timestamp`.
- Also: `accounts_mgmt/v1/current_account`, `accounts_mgmt/v1/access_token` (pull secret for crc/minc).
- Connect: `oc login --web --server=<api.url>` (OAuth browser flow, oc ≥ 4.19) → adds kube context `default/api-ocp-prod-...:443/jdoe`.

## 3. Placement
- **connections:** Kubernetes connection type `ocm-cluster` per cluster; "not connected" state until login, then mapped to kubeconfig context (P1).
- **navSections:** "Cluster info" (version, product, region, nodes, upgrade available).
- **menus:** Connect (oc login --web), Open console, Copy API URL, Open in console.redhat.com.
- **accounts:** Red Hat SSO scope `api.ocm` (P16). **dashboardCards:** "3 clusters, 1 upgrade available". P#: **P1, P12, P16, P17**.

## 4. Journeys
1. **Discover & connect.** Signed in → OCM lists 4 clusters → click `ocp-prod` → Connect → browser login simulated → task "oc login --web" → context added → connection turns green, resources visible. Failure: user lacks RBAC (`forbidden: cannot list namespaces`) → limited view banner.
2. **Hibernated cluster.** `ocp-qa` `hibernating` → Connect disabled, tooltip "Resume in console.redhat.com".
3. **Use pull secret.** From OpenShift Local create form → "Pull secret from OCM" → fetched (journey shared with crc).

## 5. Sample data
```json
[
  {"id":"2l8v9q6e4b1c7d0f3a5h8k2m4n6p8r0s","name":"ocp-prod","display_name":"Payments prod","state":"ready","openshift_version":"4.21.9","product":{"id":"rosa"},"hypershift":{"enabled":true},"cloud_provider":{"id":"aws"},"region":{"id":"us-east-1"},"multi_az":true,"nodes":{"compute":9},"console":{"url":"https://console-openshift-console.apps.rosa.ocp-prod.x7k2.p3.openshiftapps.com"},"api":{"url":"https://api.ocp-prod.x7k2.p3.openshiftapps.com:443","listening":"external"},"creation_timestamp":"2026-02-11T14:22:07Z"},
  {"id":"2m1a3c5e7g9i1k3m5o7q9s1u3w5y7a9c","name":"ocp-dev","display_name":"Payments dev","state":"ready","openshift_version":"4.22.3","product":{"id":"ocp"},"cloud_provider":{"id":"baremetal"},"region":{"id":""},"nodes":{"compute":3},"console":{"url":"https://console-openshift-console.apps.ocp-dev.acme.internal"},"api":{"url":"https://api.ocp-dev.acme.internal:6443","listening":"external"},"creation_timestamp":"2026-06-03T09:10:44Z"},
  {"id":"2n4b6d8f0h2j4l6n8p0r2t4v6x8z0b2d","name":"ocp-qa","state":"hibernating","openshift_version":"4.21.9","product":{"id":"osd"},"cloud_provider":{"id":"gcp"},"region":{"id":"europe-west4"},"nodes":{"compute":4},"api":{"url":"https://api.ocp-qa.d4f1.s2.devshift.org:6443"},"creation_timestamp":"2025-11-19T16:45:00Z"},
  {"id":"2p7c9e1g3i5k7m9o1q3s5u7w9y1a3c5e","name":"rosa-sandbox-jd","state":"installing","openshift_version":"4.22.3","product":{"id":"rosa"},"hypershift":{"enabled":true},"cloud_provider":{"id":"aws"},"region":{"id":"eu-west-1"},"nodes":{"compute":2},"creation_timestamp":"2026-10-08T07:58:31Z"}
]
```
