# Konflux (`redhat.konflux`)

- **Objects:** tenant namespace `acme-tenant`; `Application`, `Component`, `Snapshot`, `ReleasePlan`, `Release` (`appstudio.redhat.com/v1alpha1`), Tekton `PipelineRun` labelled `appstudio.openshift.io/component`, `pipelines.appstudio.openshift.io/type`, `pipelinesascode.tekton.dev/event-type|sha`; condition `Succeeded` True/False/Unknown; results IMAGE_URL / IMAGE_DIGEST.
- **Contributes:** kubernetes connection `konflux-acme` (capability `kube.crd:components.appstudio.redhat.com`), nav sections Applications / Components / PipelineRuns (task timeline, sast-snyk-check logs, "Push fix and re-run" → Running → Succeeded → Snapshot → Release Succeeded) / Snapshots (Validate with Conforma, Run locally) / Releases, image tab **Konflux** for payments-api, command.
- **Journeys:** J4 of _platform-scenario.md.
- **P#:** P1, P2, P4, P14. Source: redhat.konflux.md.
