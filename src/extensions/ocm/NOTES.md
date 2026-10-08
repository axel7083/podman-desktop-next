# redhat.openshift-cluster-manager (proposed)

**Real objects / API.** OCM `clusters_mgmt/v1/clusters` (state, product, cloud_provider, region, hypershift, api.url, console.url); `oc login --web` adds kube context `default/api-…/jdoe`.

**Placement.** Ready clusters = remote Kubernetes connections (ConnectionDef.remote, start handler = Connect, P1/P12); TOOLS › OpenShift clusters lists all 4 (hibernating/installing not connectable); Cluster tab (P14); Open console / Copy login command (details menus); dashboard card.

**Journeys.** ocp-dev Connect → offer to update oc 4.20 → 4.22 (CLI pack) → oc login --web task → CRDs discovered → Pipelines/GitOps/VMs/Operators/Service network sections appear (P2 `when` on CRDs).

**Notes.** Depends on redhat-authentication and openshift-cli-pack (imports its data.ts).

**Sources.** docs/research/redhat.openshift-cluster-manager.md
