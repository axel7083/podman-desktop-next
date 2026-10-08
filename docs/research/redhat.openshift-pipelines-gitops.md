# OpenShift Pipelines (Tekton) & OpenShift GitOps (Argo CD)

## 1. Identity
- **Display name:** Pipelines & GitOps
- **Extension id:** `redhat.openshift-pipelines-gitops` (proposed)
- **Icons:** https://cdn.simpleicons.org/tekton , https://cdn.simpleicons.org/argo
- **Description:** See PipelineRuns and Argo CD application sync/health for the active cluster; rerun and sync from the desktop.

## 2. Real objects & fields
- `PipelineRun` (`tekton.dev/v1`, [docs](https://tekton.dev/docs/pipelines/pipelineruns/)): `spec.pipelineRef.name`, `spec.params[]`, `spec.workspaces[]`, `spec.timeouts.pipeline`; `status.conditions[type=Succeeded].{status:"True"|"False"|"Unknown", reason:"Succeeded"|"Failed"|"Running"|"Started"|"Cancelled"|"PipelineRunTimeout"|"Completed"}`, `status.startTime`, `status.completionTime`, `status.childReferences[].{name,pipelineTaskName,kind:"TaskRun"}`, `status.results[]`. Labels `tekton.dev/pipeline`, `pipelinesascode.tekton.dev/sha`.
- `Application` (`argoproj.io/v1alpha1`, [docs](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)): `spec.project`, `spec.source.{repoURL,path,targetRevision}`, `spec.destination.{server,namespace}`, `spec.syncPolicy.automated.{prune,selfHeal}`; `status.sync.status` (`Synced`|`OutOfSync`|`Unknown`), `status.sync.revision`, `status.health.status` (`Healthy`|`Progressing`|`Degraded`|`Suspended`|`Missing`|`Unknown`), `status.operationState.phase` (`Running`|`Succeeded`|`Failed`|`Error`|`Terminating`), `status.resources[]`.
- GitOps default instance: ns `openshift-gitops`, route `openshift-gitops-server-openshift-gitops.apps.<domain>`.

## 3. Placement
- **navSections:** "Pipelines" `when kube.hasCRD('pipelineruns.tekton.dev')`, "GitOps" `when kube.hasCRD('applications.argoproj.io')` under Kubernetes connections.
- **tabs:** PipelineRun details: Tasks (timeline), Logs, YAML. **menus:** Rerun, Cancel; Application: Sync, Refresh, Open in Argo CD.
- **dashboardCards:** "ocp-prod: 1 app OutOfSync, last pipeline failed". **generators:** "Generate Argo Application" from a deployed workload. P#: **P2, P4, P17**.

## 4. Journeys
1. **Failed pipeline triage.** Dashboard card → ocp-dev Pipelines → `payments-api-build-x7k2p` Failed at `acs-image-check` → Logs tab shows roxctl failing policy → link to local ACS check.
2. **Sync OutOfSync app.** GitOps → `payments-prod` OutOfSync/Healthy → Sync → `Running` → Synced/Progressing → Healthy. Failure: `Failed` "one or more objects failed to apply: admission webhook denied" → message.
3. **Rerun.** PipelineRun kebab → Rerun with same params → new run Running with live task timeline.

## 5. Sample data
```json
{
  "pipelineRuns":[
    {"name":"payments-api-build-x7k2p","namespace":"payments-ci","pipeline":"build-and-push","status":"False","reason":"Failed","startTime":"2026-10-08T08:41:03Z","completionTime":"2026-10-08T08:47:55Z","tasks":[{"name":"git-clone","reason":"Succeeded"},{"name":"buildah","reason":"Succeeded"},{"name":"acs-image-check","reason":"Failed"},{"name":"push","reason":"Skipped"}],"sha":"9f2c1e7"},
    {"name":"payments-api-build-r4m9q","namespace":"payments-ci","pipeline":"build-and-push","status":"True","reason":"Succeeded","startTime":"2026-10-07T16:12:00Z","completionTime":"2026-10-07T16:19:31Z","sha":"4ab7d03"},
    {"name":"ledger-worker-build-z8t1c","namespace":"payments-ci","pipeline":"build-and-push","status":"Unknown","reason":"Running","startTime":"2026-10-08T09:18:44Z"},
    {"name":"e2e-nightly-k3v7w","namespace":"payments-ci","pipeline":"e2e","status":"False","reason":"PipelineRunTimeout","startTime":"2026-10-08T01:00:00Z","completionTime":"2026-10-08T02:00:00Z"}
  ],
  "applications":[
    {"name":"payments-prod","project":"payments","repoURL":"https://github.com/acme/payments-gitops.git","path":"envs/prod","targetRevision":"main","destination":"ocp-prod/payments","sync":"OutOfSync","health":"Healthy","revision":"c81d2fa","operationPhase":null,"automated":false},
    {"name":"payments-dev","project":"payments","path":"envs/dev","targetRevision":"main","destination":"ocp-dev/payments","sync":"Synced","health":"Healthy","revision":"c81d2fa","automated":true},
    {"name":"ledger-dev","project":"payments","path":"ledger/dev","targetRevision":"main","destination":"ocp-dev/ledger","sync":"Synced","health":"Progressing","revision":"77e0b19"},
    {"name":"observability","project":"platform","path":"platform/obs","targetRevision":"v2.3.0","destination":"ocp-prod/openshift-monitoring","sync":"Synced","health":"Degraded","revision":"v2.3.0"}
  ]
}
```
