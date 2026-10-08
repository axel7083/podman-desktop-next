# Konflux — build/test/release status for your components

## 1. Identity
- **Display name:** Konflux
- **Extension id:** `redhat.konflux` (proposed; kind B under a Kubernetes connection pointing at a Konflux tenant)
- **Icon:** https://github.com/konflux-ci.png
- **Description:** See your Konflux applications, component builds, snapshots and releases next to the images you build locally.

## 2. Real objects & fields ([konflux-ci.dev/docs](https://konflux-ci.dev/docs/))
- Konflux is a Kubernetes API; tenant namespace e.g. `acme-tenant`. CRDs: `Application`, `Component`, `Snapshot` (`appstudio.redhat.com/v1alpha1`, application-api), `IntegrationTestScenario` (integration-service), `ReleasePlan`, `ReleasePlanAdmission`, `Release` (release-service).
- **Component** `spec{componentName, application, source.git{url, revision, context, dockerfileUrl}, containerImage}`, annotation `build.appstudio.openshift.io/request: configure-pac`, `status.lastPromotedImage`.
- **PipelineRun** (Tekton, Pipelines-as-Code) labels `appstudio.openshift.io/application`, `appstudio.openshift.io/component`, `pipelines.appstudio.openshift.io/type: build|test|release`, `pipelinesascode.tekton.dev/event-type: push|pull_request`, `pipelinesascode.tekton.dev/sha`; `status.conditions[type=Succeeded]` status `True|False|Unknown`, reason `Succeeded|Failed|Running|PipelineRunPending|Cancelled`; results `IMAGE_URL`, `IMAGE_DIGEST`, `CHAINS-GIT_URL`.
- **Snapshot** `spec{application, components[{name, containerImage, source.git{url, revision}}]}`, condition `AppStudioTestSucceeded`.
- **Release** `spec{snapshot, releasePlan}`, conditions `Validated`, `ManagedPipelineProcessed`, `Released` (reason `Succeeded|Failed|Progressing`); ReleasePlan `spec{application, target}`.
- Builds are signed by Tekton Chains and gated by Conforma; Red Hat Trusted Libraries (TP Feb 2026) are built on Konflux.

## 3. Placement
- **navSections** under a Kubernetes connection whose context has `kube.hasCRD('components.appstudio.redhat.com')` (P2, P4): Applications → Components → PipelineRuns / Snapshots / Releases. **tabs:** image "Konflux" (which build produced this digest). **menus:** Component "Pull latest image", "Run locally", Snapshot "Validate with Conforma". **dashboardCards:** latest build status. P#: **P1, P2, P4, P14**.

## 4. Journeys
1. **Why did my build fail?** Connection `konflux-acme` → Applications › payments → Component `payments-api` → PipelineRun `payments-api-on-push-7k2xq` Failed at task `sast-snyk-check` → logs → fix locally.
2. **Run what CI built.** Snapshot `payments-20261008-0912` (tests succeeded) → "Run locally" pulls both component images into a pod on `podman-machine-default`.
3. **Release.** Release `payments-1-5-0-rel-x8wp` → `Released: Succeeded` → target `quay.io/acme/payments-api:1.5.0` → verify signature (RHTAS).

## 5. Sample data
```json
{
  "applications":[{"name":"payments","namespace":"acme-tenant","displayName":"Payments"},{"name":"orders","namespace":"acme-tenant"}],
  "components":[
    {"name":"payments-api","application":"payments","git":"https://github.com/acme/payments","revision":"main","containerImage":"quay.io/redhat-user-workloads/acme-tenant/payments-api","lastPromotedImage":"quay.io/redhat-user-workloads/acme-tenant/payments-api@sha256:2a9e4c7b"},
    {"name":"payments-worker","application":"payments","git":"https://github.com/acme/payments","context":"worker"},
    {"name":"orders-api","application":"orders","git":"https://github.com/acme/orders","dockerfileUrl":"Containerfile"}
  ],
  "pipelineRuns":[
    {"name":"payments-api-on-push-7k2xq","component":"payments-api","type":"build","event":"push","sha":"e41c9a0","status":"False","reason":"Failed","failedTask":"sast-snyk-check","startTime":"2026-10-08T08:41:02Z"},
    {"name":"payments-api-on-push-r9d4m","component":"payments-api","type":"build","event":"push","sha":"b77f210","status":"True","reason":"Succeeded","IMAGE_DIGEST":"sha256:2a9e4c7b"},
    {"name":"payments-api-on-pull-request-h2v8n","component":"payments-api","type":"build","event":"pull_request","status":"Unknown","reason":"Running"},
    {"name":"payments-enterprise-contract-5tq2z","type":"test","status":"True","reason":"Succeeded"}
  ],
  "snapshots":[{"name":"payments-20261008-0912","application":"payments","components":[{"name":"payments-api","containerImage":"quay.io/redhat-user-workloads/acme-tenant/payments-api@sha256:2a9e4c7b"},{"name":"payments-worker","containerImage":"quay.io/redhat-user-workloads/acme-tenant/payments-worker@sha256:5d1e0aa3"}],"AppStudioTestSucceeded":"True"}],
  "releases":[{"name":"payments-1-5-0-rel-x8wp","snapshot":"payments-20261008-0912","releasePlan":"payments-to-quay","Released":"Succeeded","target":"quay.io/acme/payments-api:1.5.0"}]
}
```
