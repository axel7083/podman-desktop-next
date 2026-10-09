# ModelCar (model as OCI image)

## 1. Identity
- Display name: ModelCar Builder
- Extension id: `redhat.modelcar` (proposed; no real extension exists). Could equally ship inside `redhat.ai-lab` as a "Package as ModelCar" action on downloaded models; the mockup models it as a separate small extension that depends on AI Lab models + the Kubernetes/OpenShift AI connection.
- Icon: `../ext-ai-lab/packages/backend/icon.png` (reuse AI Lab icon; no official ModelCar logo exists)
- Description: Package model weights as an OCI "ModelCar" image, push to a registry, and deploy it on KServe / OpenShift AI with `storageUri: oci://...`.

## 2. Real objects / fields / enums
- **ModelCar layout**: any OCI image whose files live under `/models` (KServe mounts it as a sidecar and the runtime reads `/mnt/models`). Red Hat's reference Containerfile (Red Hat Developer article, modelcar-catalog):
  ```
  FROM registry.access.redhat.com/ubi9/python-311:latest AS base
  RUN pip install huggingface-hub
  COPY download_model.py .
  RUN python download_model.py      # writes /tmp/models
  FROM registry.access.redhat.com/ubi9/ubi-micro:9.4
  COPY --from=base --chown=1001:0 /tmp/models /models
  USER 1001
  ```
  KServe upstream docs use `FROM busybox` + `COPY ... /models` (busybox gives `/bin/sh` for the sidecar).
- **KServe**: `InferenceService` (`serving.kserve.io/v1beta1`) `spec.predictor.model.storageUri: oci://<registry>/<repo>:<tag>`; ModelCar enabled via `storage-initializer` config `enableModelcar: true` (default on in RHOAI 2.16+/3.x).
- **Red Hat ModelCar images** (validated, registry.redhat.io, need pull secret): `registry.redhat.io/rhelai1/modelcar-granite-3-1-8b-instruct:1.5`, `.../modelcar-granite-3-1-8b-instruct-quantized-w4a16:1.5`, `.../modelcar-granite-3-1-8b-instruct-quantized-w8a8:1.5`, `.../modelcar-llama-3-3-70b-instruct:1.5`, `.../modelcar-gpt-oss-20b:1.5`, `.../modelcar-qwen2-5-7b-instruct:1.5`, `registry.redhat.io/rhai/modelcar-granite-embedding-english-r2`, `registry.redhat.io/rhai/modelcar-all-minilm-l6-v2`.
- **Community catalog**: `quay.io/redhat-ai-services/modelcar-catalog:<tag>` (one repo, tag per model, e.g. `granite-4.0-h-small`, `qwen3-8b`, `gemma-4-31b-it-nvfp4`, `llama-3.2-3b-instruct`, timestamped aliases `qwen3-8b-20260812t1633z`).
- **Alternatives**: `podman artifact add/push/pull/ls/inspect` (Podman 5.4+, P7) stores model files as OCI artifacts (not runnable images; KServe ModelCar needs an image today, unverified for artifact support); CNCF ModelPack spec (`application/vnd.cncf.model.manifest.v1+json`); KitOps ModelKits (`kit pack`, Kitfile); Podman OCI image volume mounts `podman run --mount type=image,source=quay.io/...:tag,destination=/models` to test locally.
- Build/push CLI: `podman build -t quay.io/acme/modelcar-granite-3.3-8b-instruct:1.0 -f Containerfile .`, `podman push ...` (multi-GB layer; use `--compression-format zstd` optional).

## 3. Placement in the mockup
- **menus**: AI Lab model row and Image row kebab: "Package as ModelCar"; Image row (when image has `/models` + label `org.opencontainers.image.title`) "Deploy to OpenShift AI".
- **tabs** (P14): "ModelCar" tab on image detail: model files list (config.json, *.safetensors), size, source HF repo, generated InferenceService YAML.
- **connectionFactories** none; uses **registries** (quay.io, registry.redhat.io via Red Hat account P16).
- **tools** (P3): "ModelCar catalog" page listing Red Hat validated modelcar images (pull / deploy).
- **Tasks API** (P15) for build, push, deploy; **P7** OCI artifacts as alternative "Push as artifact" option.
- Deploy target: kube connection `rhoai-dev` (namespace `sam-ai`), uses P4 CRD API to create InferenceService.

## 4. Journeys
1. Package: AI Lab > Models > (non-GGUF) `RedHatAI/granite-3.1-8b-instruct-quantized.w4a16` > Package as ModelCar > tag `quay.io/sam/modelcar-granite-3.1-8b-instruct-w4a16:1.0`, base `ubi9/ubi-micro`. Task "Building ModelCar image" (steps: download 5 safetensors shards from HF, write Containerfile, `podman build`, layer 4.9 GB; ~45 s). World: new image in Images list with ModelCar tab.
2. Push: Image kebab > Push > quay.io/sam. Task "Pushing quay.io/sam/modelcar-granite-...:1.0" (blob progress, ~30 s). World: digest `sha256:7f3a...` shown; registry entry.
3. Deploy: Image kebab > Deploy to OpenShift AI > context `rhoai-dev`, project `sam-ai`, runtime `vllm-cuda-runtime`, 1 GPU. Preview YAML below, Apply. Task "Deploying InferenceService granite-31-8b-w4a16" (create ISVC, wait for predictor pod pull, Ready=True; ~90 s). World: InferenceService appears under OpenShift AI > Deployed models with `status.url`.

Generated InferenceService:
```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: granite-31-8b-w4a16
  namespace: sam-ai
  annotations:
    openshift.io/display-name: granite-3.1-8b-instruct w4a16
    serving.kserve.io/deploymentMode: RawDeployment
  labels:
    opendatahub.io/dashboard: "true"
spec:
  predictor:
    model:
      modelFormat: { name: vLLM }
      runtime: vllm-cuda-runtime
      storageUri: oci://quay.io/sam/modelcar-granite-3.1-8b-instruct-w4a16:1.0
      args: ["--max-model-len=16384"]
      resources:
        requests: { cpu: "4", memory: 16Gi, nvidia.com/gpu: "1" }
        limits:   { cpu: "8", memory: 24Gi, nvidia.com/gpu: "1" }
```

## 5. Sample data
```json
[
  {"image": "quay.io/sam/modelcar-granite-3.1-8b-instruct-w4a16:1.0", "digest": "sha256:7f3a91c2", "size": 5240000000, "created": "2026-10-06T10:12:00Z", "source": "hf://RedHatAI/granite-3.1-8b-instruct-quantized.w4a16", "base": "registry.access.redhat.com/ubi9/ubi-micro:9.4", "files": ["/models/config.json", "/models/model-00001-of-00002.safetensors", "/models/model-00002-of-00002.safetensors", "/models/tokenizer.json", "/models/recipe.yaml"]},
  {"image": "quay.io/sam/modelcar-granite-3.3-8b-instruct:1.0", "digest": "sha256:c41d08aa", "size": 16400000000, "created": "2026-10-07T08:30:00Z", "source": "hf://ibm-granite/granite-3.3-8b-instruct", "pushed": true},
  {"image": "registry.redhat.io/rhelai1/modelcar-granite-3-1-8b-instruct:1.5", "validated": true, "vram": "19 GB", "minVllm": "0.8.4"},
  {"image": "registry.redhat.io/rhelai1/modelcar-granite-3-1-8b-instruct-quantized-w8a8:1.5", "validated": true},
  {"image": "registry.redhat.io/rhelai1/modelcar-llama-3-3-70b-instruct:1.5", "validated": true},
  {"image": "registry.redhat.io/rhelai1/modelcar-gpt-oss-20b:1.5", "validated": true},
  {"image": "registry.redhat.io/rhai/modelcar-granite-embedding-english-r2", "validated": true, "task": "embedding"},
  {"image": "quay.io/redhat-ai-services/modelcar-catalog:granite-4.0-h-small", "lastModified": "2026-08-07T00:18:27Z"},
  {"image": "quay.io/redhat-ai-services/modelcar-catalog:qwen3-8b", "lastModified": "2026-08-12T16:52:48Z"},
  {"artifact": "quay.io/sam/granite-3.3-8b-gguf:q4", "kind": "podman-artifact", "mediaType": "application/vnd.oci.image.manifest.v1+json", "artifactType": "application/x-gguf", "size": 4939212390}
]
```

Sources:
- https://developers.redhat.com/articles/2025/01/30/build-and-deploy-modelcar-container-openshift-ai
- https://github.com/redhat-ai-services/modelcar-catalog
- https://quay.io/repository/redhat-ai-services/modelcar-catalog
- https://kserve.github.io/website/latest/modelserving/storage/oci/
- https://docs.redhat.com/en/documentation/red_hat_ai/3/html-single/validated_models
- https://docs.podman.io/en/latest/markdown/podman-artifact.1.html
- https://github.com/modelpack/model-spec , https://kitops.org
