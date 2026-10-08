# Red Hat OpenShift AI

## 1. Identity
- Display name: Red Hat OpenShift AI
- Extension id: `redhat.openshift-ai` (proposed; no real Podman Desktop extension)
- Icon: https://raw.githubusercontent.com/opendatahub-io/odh-dashboard/main/frontend/src/images/rhoai-logo.svg (verified 200 image/svg+xml)
- Description: See and act on an OpenShift AI cluster from Podman Desktop: data science projects, workbenches, deployed models (KServe / llm-d), model registry.

## 2. Real objects / fields / enums
- **Version**: RHOAI Self-Managed 3.5 is current (Oct 2026; 3.3/3.4/3.5 supported). 3.0 removed ModelMesh (multi-model serving) and KServe Serverless mode; serving is KServe RawDeployment or llm-d (`LLMInferenceService`); Routes replaced by Gateway API; Models-as-a-Service (MaaS) added.
- **DataScienceCluster** `datasciencecluster.opendatahub.io/v2` (RHOAI 3.0-3.x; upstream main also serves `v3`), name `default-dsc`. `spec.components.<name>.managementState`: `Managed` | `Removed` (`Unmanaged` for some). v2 components: `dashboard`, `workbenches`, `aipipelines`, `kserve` (`rawDeploymentServiceConfig: Headless|Headed`, `nim`), `kueue`, `ray`, `trustyai`, `modelregistry` (`registriesNamespace: rhoai-model-registries`), `trainingoperator`, `trainer`, `feastoperator`, `llamastackoperator`, `ogx`, `mlflowoperator`, `sparkoperator`, `aigateway` (MaaS + batch gateway), `mcplifecycleoperator`. Upstream v3 folds `modelregistry` into `aiHub` and `feastoperator` into `data.featureStore`. Status: `status.phase` (`Ready`), `status.components.<name>.managementState`, `status.conditions`, `status.release {name, version}`.
- **DSCInitialization** `dscinitialization.opendatahub.io/v2` `default-dsci`: `spec.applicationsNamespace: redhat-ods-applications`, `spec.monitoring`, `spec.trustedCABundle`.
- **Data science project**: a Namespace/Project with label `opendatahub.io/dashboard: "true"` (annotations `openshift.io/display-name`, `openshift.io/description`).
- **Workbench**: `Notebook` `kubeflow.org/v1` (`spec.template.spec.containers[0].image` e.g. `image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/s2i-generic-data-science-notebook:2025.2`; annotations `notebooks.opendatahub.io/last-image-selection`, `kubeflow-resource-stopped` when stopped; label `opendatahub.io/dashboard`).
- **InferenceService** `serving.kserve.io/v1beta1`: `spec.predictor.model.modelFormat.name` (`vLLM`), `.runtime`, `.storageUri` (`oci://`, `s3://`, `hf://`, `pvc://`), `.resources` (`nvidia.com/gpu`), `minReplicas`; annotation `serving.kserve.io/deploymentMode: RawDeployment`; `status.url`, `status.address.url`, `status.conditions[]` (`PredictorReady`, `IngressReady`, `Ready`), `status.modelStatus.states.activeModelState` (`Loaded`, `Pending`, `FailedToLoad`).
- **LLMInferenceService** `serving.kserve.io/v1alpha1` (llm-d): `spec.model.uri`, `spec.model.name`, `spec.replicas`, `spec.router {gateway, route, scheduler}` (KV-cache-aware EPP), `spec.prefill` (disaggregated), `spec.template.containers`.
- **ServingRuntime** `serving.kserve.io/v1alpha1`: from templates in `redhat-ods-applications` (`vllm-cuda-runtime-template`, `vllm-rocm-runtime-template`, `vllm-cpu-runtime-template`, `vllm-spyre-...`); `spec.supportedModelFormats[{name: vLLM, autoSelect: true}]`, `spec.containers[0].image` (RHAII vLLM image), `args: ["--port=8080","--model=/mnt/models","--served-model-name={{.Name}}"]`, annotation `opendatahub.io/recommended-accelerators: '["nvidia.com/gpu"]'`.
- **Model Registry**: `ModelRegistry` `modelregistry.opendatahub.io/v1beta1` in `rhoai-model-registries`; REST `/api/model_registry/v1alpha3/registered_models`, `/model_versions`, `/model_artifacts`. RegisteredModel `{id, name, owner, state: LIVE|ARCHIVED}`; ModelVersion `{id, name, registeredModelId, author, state}`; ModelArtifact `{uri, modelFormatName, modelFormatVersion, storageKey, storagePath}`.
- **LlamaStackDistribution** `llamastack.io/v1alpha1` (Llama Stack operator; `ogx` appears to be its successor, unverified).

## 3. Placement in the mockup
- **navSections** (P2) under kube connection `rhoai-dev`, `when: kube.hasCRD('datascienceclusters')`: "OpenShift AI" group with Overview (DSC components & versions), Projects, Workbenches, Deployments (InferenceService + LLMInferenceService), Serving runtimes, Model registry, Model catalog (from redhat.ai-model-catalog).
- **P4** CRD list/watch for all CRs above.
- **columns**: Namespaces list gets "Data science project" badge (label `opendatahub.io/dashboard`).
- **tabs** (P14): kube connection detail "OpenShift AI" tab (DSC component table with Managed/Removed toggles, read-only unless admin); ISVC detail tabs "Endpoint" (curl to `status.url/v1/chat/completions`), "Logs", "YAML".
- **menus**: Workbench row Start/Stop (toggle `kubeflow-resource-stopped`), Open (route URL); ISVC row "Use as inference provider" -> InferenceProviderConnection (P9) with remote endpoint + token; Model version row "Deploy".
- **dashboardCards** (P17): "rhoai-dev: 2 models Ready, 1 workbench running, 3/8 GPUs used". **addons** (P13) not applicable (operator-managed).

## 4. Journeys
1. Inspect cluster: Kubernetes > `rhoai-dev` > OpenShift AI > Overview -> RHOAI 3.5.0, DSC `Ready`, kserve/workbenches/modelregistry/llamastackoperator Managed, ray/trainer Removed.
2. Start workbench: Workbenches > `acme-rag-notebook` (Stopped) > Start. Task "Starting workbench" (patch annotation, pod Pending -> Running, ~40 s). World: status Running, "Open" link to `https://acme-rag-notebook-sam-ai.apps.rhoai-dev...`.
3. Deploy & consume: Deployments > Deploy model > source Model registry `acme-support-granite` v3 (uri `oci://quay.io/sam/modelcar-granite-3.1-8b-instruct-w4a16:1.0`), runtime `vllm-cuda-runtime`, 1 GPU. Task "Deploying granite-31-8b-w4a16" (create ISVC, PredictorReady, Ready; ~90 s). World: Ready with URL; "Use as inference provider" adds a remote provider used by the AI Lab playground.

## 5. Sample data
```json
{
  "dsc": {"apiVersion": "datasciencecluster.opendatahub.io/v2", "kind": "DataScienceCluster", "metadata": {"name": "default-dsc"}, "spec": {"components": {"dashboard": {"managementState": "Managed"}, "workbenches": {"managementState": "Managed"}, "aipipelines": {"managementState": "Managed"}, "kserve": {"managementState": "Managed", "rawDeploymentServiceConfig": "Headless"}, "modelregistry": {"managementState": "Managed", "registriesNamespace": "rhoai-model-registries"}, "llamastackoperator": {"managementState": "Managed"}, "trustyai": {"managementState": "Managed"}, "kueue": {"managementState": "Removed"}, "ray": {"managementState": "Removed"}, "trainer": {"managementState": "Removed"}, "feastoperator": {"managementState": "Removed"}}}, "status": {"phase": "Ready", "release": {"name": "OpenShift AI Self-Managed", "version": "3.5.0"}}},
  "projects": [
    {"name": "sam-ai", "displayName": "Sam AI sandbox", "labels": {"opendatahub.io/dashboard": "true"}, "created": "2026-06-12T09:00:00Z"},
    {"name": "acme-support", "displayName": "Acme support assistant", "labels": {"opendatahub.io/dashboard": "true"}, "created": "2026-09-01T13:20:00Z"}
  ],
  "notebooks": [
    {"name": "acme-rag-notebook", "namespace": "sam-ai", "image": "s2i-generic-data-science-notebook:2025.2", "status": "Stopped", "annotations": {"kubeflow-resource-stopped": "2026-10-07T18:02:00Z"}},
    {"name": "embeddings-eval", "namespace": "sam-ai", "image": "pytorch-cuda:2025.2", "status": "Running", "gpu": 1}
  ],
  "inferenceServices": [
    {"name": "granite-31-8b-w4a16", "namespace": "sam-ai", "runtime": "vllm-cuda-runtime", "modelFormat": "vLLM", "storageUri": "oci://quay.io/sam/modelcar-granite-3.1-8b-instruct-w4a16:1.0", "gpu": 1, "status": {"url": "https://granite-31-8b-w4a16-sam-ai.apps.rhoai-dev.acme.lab", "conditions": [{"type": "PredictorReady", "status": "True"}, {"type": "Ready", "status": "True", "lastTransitionTime": "2026-10-07T11:05:31Z"}], "modelStatus": {"states": {"activeModelState": "Loaded"}}}},
    {"name": "granite-embedding-r2", "namespace": "acme-support", "runtime": "vllm-cuda-runtime", "storageUri": "oci://registry.redhat.io/rhai/modelcar-granite-embedding-english-r2", "status": {"conditions": [{"type": "Ready", "status": "False", "reason": "ImagePullBackOff"}], "modelStatus": {"states": {"activeModelState": "Pending"}}}}
  ],
  "llmInferenceServices": [
    {"apiVersion": "serving.kserve.io/v1alpha1", "name": "gpt-oss-20b-llmd", "namespace": "acme-support", "model": {"uri": "oci://registry.redhat.io/rhelai1/modelcar-gpt-oss-20b:1.5", "name": "gpt-oss-20b"}, "replicas": 2, "status": {"url": "https://inference-gateway.apps.rhoai-dev.acme.lab/acme-support/gpt-oss-20b-llmd", "conditions": [{"type": "Ready", "status": "True"}]}}
  ],
  "servingRuntimes": [{"name": "vllm-cuda-runtime", "namespace": "sam-ai", "template": "vllm-cuda-runtime-template", "supportedModelFormats": [{"name": "vLLM", "autoSelect": true}], "image": "registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1"}],
  "modelRegistry": {
    "registeredModels": [{"id": "1", "name": "acme-support-granite", "owner": "sam", "state": "LIVE", "createTimeSinceEpoch": "1790150400000"}],
    "modelVersions": [{"id": "3", "name": "v3", "registeredModelId": "1", "author": "sam", "state": "LIVE"}],
    "modelArtifacts": [{"id": "5", "uri": "oci://quay.io/sam/modelcar-granite-3.1-8b-instruct-w4a16:1.0", "modelFormatName": "vLLM", "modelFormatVersion": "1"}]
  }
}
```

Sources:
- https://github.com/opendatahub-io/opendatahub-operator/blob/main/api/datasciencecluster/v2/datasciencecluster_types.go
- https://github.com/opendatahub-io/opendatahub-operator/tree/main/api/components/v1alpha1
- https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.5/html/release_notes/index
- https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.0/html/release_notes/support-removals_relnotes
- https://kserve.github.io/website/latest/reference/api/
- https://github.com/kubeflow/model-registry
- https://github.com/opendatahub-io/odh-dashboard
