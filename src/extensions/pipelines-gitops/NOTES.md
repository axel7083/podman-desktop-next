# redhat.openshift-pipelines-gitops (proposed)

**Real objects / API.** Tekton PipelineRun (Succeeded condition reasons, childReferences) and Argo CD Application (sync/health/operationState).

**Placement.** Pipelines / GitOps sections on clusters with the CRDs (P2), Rerun / Sync row actions (P4), Tasks and Sync tabs (P14), dashboard card (P17).

**Journeys.** Failed payments-api build at acs-image-check → log → Rerun → Succeeded; payments-prod OutOfSync → Sync → Healthy.

**Sources.** docs/research/redhat.openshift-pipelines-gitops.md
