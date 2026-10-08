# redhat.openshift-ai – Red Hat OpenShift AI (proposed)

- **Real objects**: `DataScienceCluster` v2 `default-dsc` (components managementState), Namespaces labelled `opendatahub.io/dashboard`, `Notebook` (kubeflow.org/v1, `kubeflow-resource-stopped`), `InferenceService` (serving.kserve.io/v1beta1: runtime, storageUri, conditions, modelStatus.activeModelState), `ServingRuntime`, Model Registry RegisteredModel/ModelVersion/ModelArtifact.
- **Placement**: fixture cluster `rhoai-dev` (RHOAI 3.5); nav sections (P2, `when` capability `kube.crd:datascienceclusters`): OpenShift AI, Projects, Workbenches, Model serving, Model registry; InferenceService › Endpoint tab with "Try in playground" (port-forward task → playground provider).
- **Journeys**: overview → start workbench → Model serving → granite-8b → Endpoint → Try in playground; registry → Deploy version.
- **Sources**: docs/research/redhat.openshift-ai.md.
