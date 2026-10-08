# Red Hat AI Model Catalog

## 1. Identity
- Display name: Red Hat AI Model Catalog
- Extension id: `redhat.ai-model-catalog` (proposed). Feeds a unified catalog (R54) that merges AI Lab's `ai.json`, Hugging Face `RedHatAI` org, Red Hat validated ModelCar images and the OpenShift AI (AI hub / model registry) catalog of a connected cluster.
- Icon: https://huggingface.co/front/assets/huggingface_logo-noborder.svg (verified 200 image/svg+xml). RedHatAI org avatar is only webp (`https://cdn-avatars.huggingface.co/v1/production/uploads/60466e4b4f40b01b66151416/cdABRow21BL0sl1vSVTPk.png`, served as image/webp); Red Hat logo alternative `/home/astefani/github/podman-desktop/ext-redhat-account/icons/redhat-logo.svg`.
- Description: Browse Red Hat-optimized, quantized and validated open models and pull them for local (AI Lab / vLLM) or cluster (OpenShift AI) serving.

## 2. Real objects / fields / enums
- **Hugging Face API**: `GET https://huggingface.co/api/models?author=RedHatAI&sort=downloads&limit=40` -> `id`, `downloads` (30-day), `likes`, `pipeline_tag` (`text-generation`, `image-text-to-text`, `automatic-speech-recognition`, `any-to-any`), `createdAt`, `tags` (e.g. `w4a16`, `int4`, `vllm`, `compressed-tensors`, `base_model:quantized:ibm-granite/granite-3.1-8b-instruct`, `license:apache-2.0`).
- **Quantization schemes** (from model-name suffixes / LLM Compressor): `quantized.w4a16` (INT4 weights, 16-bit activations; GPTQ/AWQ), `quantized.w8a8` (INT8 W+A, SmoothQuant), `FP8-dynamic` (FP8 weights, dynamic per-token activations; Hopper/Ada), `FP8-block`, `FP8` (static), `NVFP4` (Blackwell FP4), `INT4`; plus `speculator.eagle3` draft models for speculative decoding. Format: `compressed-tensors` safetensors, loaded natively by vLLM / RHAII.
- **Real top RedHatAI models (HF API, Oct 2026)**: `RedHatAI/Qwen3.6-35B-A3B-NVFP4` (1.07M dl), `RedHatAI/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-FP8`, `RedHatAI/gemma-4-26B-A4B-it-FP8-dynamic`, `RedHatAI/Qwen3.8-27B-INT4`, `RedHatAI/Llama-3.2-3B-Instruct-FP8-dynamic`, `RedHatAI/Qwen3-32B-NVFP4`, `RedHatAI/gemma-3-27b-it-quantized.w4a16`, `RedHatAI/Qwen3-Coder-Next-FP8-dynamic`, `RedHatAI/Llama-3.3-70B-Instruct-FP8-dynamic`, `RedHatAI/whisper-large-v3-FP8-dynamic`, `RedHatAI/Mistral-Small-3.1-24B-Instruct-2503-FP8-dynamic`, `RedHatAI/gpt-oss-20b`, `RedHatAI/gpt-oss-120b`. Granite: `RedHatAI/granite-3.1-8b-instruct-quantized.w4a16`, `...-quantized.w8a8`, `...-FP8-dynamic`, `RedHatAI/granite-3.1-2b-instruct-quantized.w4a16`, `RedHatAI/granite-4.0-h-tiny-FP8-dynamic`, `RedHatAI/granite-4.1-8b-fp8`, `RedHatAI/granite-4.2-3b`.
- **Validated models** (Red Hat AI 3 docs): a matrix of model, ModelCar URI (`oci://registry.redhat.io/rhelai1/modelcar-...:1.5`), min vLLM version, min RHOAI version, vRAM requirement (e.g. granite-3.1-8b-instruct: vLLM 0.8.4, RHOAI 2.21, 19 GB) and tested accelerators.
- **OpenShift AI model catalog** (Kubeflow Model Registry catalog API, served by AI hub): `GET /api/model_catalog/v1alpha1/sources` (`id`, `name`, `enabled`), `GET /api/model_catalog/v1alpha1/models?source=...` -> `name`, `provider`, `description`, `readme`, `language[]`, `license`, `licenseLink`, `libraryName`, `tasks[]`, `maturity`, `createTimeSinceEpoch`, `lastUpdateTimeSinceEpoch`, `customProperties` (labels like `validated`, `featured`, `lab-teacher`), artifacts with `uri` (`oci://...`). Default sources "Red Hat AI models" and "Red Hat AI validated models" (field names partly unverified).

## 3. Placement in the mockup
- **tools** (P3): "Model Catalog" page (unified R54): source facets (AI Lab, Hugging Face RedHatAI, Red Hat validated, cluster `rhoai-dev` catalog), filters (task, quantization, fits-my-GPU by vRAM vs 24 GB, license), sort by downloads.
- **navSections** (P2) under kube connection `rhoai-dev` (when `kube.hasCRD('datascienceclusters')`): "Model catalog" showing that cluster's catalog sources.
- **menus**: model row actions "Run locally (AI Lab llama.cpp)" for GGUF, "Serve with vLLM" (-> redhat.ai-inference-server), "Package as ModelCar" (-> redhat.modelcar), "Deploy to OpenShift AI" (validated ModelCar URI), "Register in Model Registry".
- **accounts/registries** (P16): Red Hat login for registry.redhat.io modelcars; optional HF token setting.
- **dashboardCards** (P17): "Recommended for your GPU" (models that fit 24 GB).

## 4. Journeys
1. Find a model that fits: Tools > Model Catalog > filter task "text-generation", quantization w4a16, "Fits my GPU" -> `RedHatAI/granite-3.1-8b-instruct-quantized.w4a16` (est. 5.4 GB VRAM, badge "validated"). Click -> detail with model card, quantization explanation, eval recovery %.
2. Serve locally: Detail > Serve with vLLM. Task "Pull weights from Hugging Face" (5 files, 5.4 GB, ~25 s) then hands off to "Starting Red Hat AI Inference". World: running service + InferenceProviderConnection.
3. Deploy validated model to cluster: Filter source "Red Hat validated" > `modelcar-granite-3-1-8b-instruct-quantized-w8a8:1.5` > Deploy to OpenShift AI > `rhoai-dev`/`sam-ai`. Task "Creating InferenceService" (~60 s). World: ISVC in OpenShift AI > Deployments.

## 5. Sample data
```json
[
  {"id": "RedHatAI/granite-3.1-8b-instruct-quantized.w4a16", "source": "huggingface", "pipeline_tag": "text-generation", "downloads": 1372, "quantization": "w4a16", "baseModel": "ibm-granite/granite-3.1-8b-instruct", "license": "apache-2.0", "validated": true, "modelcar": "oci://registry.redhat.io/rhelai1/modelcar-granite-3-1-8b-instruct-quantized-w4a16:1.5", "estVramGB": 5.4, "lastModified": "2026-08-05T19:49:07Z"},
  {"id": "RedHatAI/granite-3.1-8b-instruct-quantized.w8a8", "source": "huggingface", "pipeline_tag": "text-generation", "downloads": 307, "quantization": "w8a8", "validated": true, "modelcar": "oci://registry.redhat.io/rhelai1/modelcar-granite-3-1-8b-instruct-quantized-w8a8:1.5", "estVramGB": 9.1},
  {"id": "RedHatAI/granite-4.0-h-tiny-FP8-dynamic", "source": "huggingface", "pipeline_tag": "text-generation", "downloads": 648, "quantization": "FP8-dynamic", "estVramGB": 7.2},
  {"id": "RedHatAI/Llama-3.3-70B-Instruct-quantized.w4a16", "source": "huggingface", "downloads": 7082, "quantization": "w4a16", "estVramGB": 40, "fitsLocalGpu": false},
  {"id": "RedHatAI/Llama-3.3-70B-Instruct-FP8-dynamic", "source": "huggingface", "downloads": 120316, "quantization": "FP8-dynamic", "estVramGB": 72, "fitsLocalGpu": false},
  {"id": "RedHatAI/Mistral-Small-3.1-24B-Instruct-2503-FP8-dynamic", "source": "huggingface", "pipeline_tag": "image-text-to-text", "downloads": 13464, "quantization": "FP8-dynamic", "estVramGB": 26, "fitsLocalGpu": false},
  {"id": "RedHatAI/Qwen3.8-27B-INT4", "source": "huggingface", "pipeline_tag": "image-text-to-text", "downloads": 574213, "likes": 54, "quantization": "INT4", "createdAt": "2026-08-17", "estVramGB": 16},
  {"id": "RedHatAI/Qwen3.6-35B-A3B-NVFP4", "source": "huggingface", "pipeline_tag": "image-text-to-text", "downloads": 1071756, "likes": 177, "quantization": "NVFP4", "note": "Blackwell-only FP4; RTX 4090 (Ada) unsupported"},
  {"id": "RedHatAI/gpt-oss-20b", "source": "huggingface", "downloads": 3449, "speculator": "RedHatAI/gpt-oss-20b-speculator.eagle3", "validated": true, "modelcar": "oci://registry.redhat.io/rhelai1/modelcar-gpt-oss-20b:1.5"},
  {"id": "RedHatAI/whisper-large-v3-FP8-dynamic", "source": "huggingface", "pipeline_tag": "automatic-speech-recognition", "downloads": 86688, "quantization": "FP8-dynamic"},
  {"id": "hf.ibm-granite.granite-3.3-8b-instruct-GGUF", "source": "ai-lab", "backend": "llama-cpp", "quantization": "Q4_K_M", "memory": 4939212390},
  {"name": "granite-3.1-8b-instruct", "source": "rhoai-dev/Red Hat AI validated models", "provider": "IBM", "tasks": ["text-generation"], "license": "apache-2.0", "maturity": "Generally Available", "customProperties": {"validated": {"string_value": ""}}, "artifacts": [{"uri": "oci://registry.redhat.io/rhelai1/modelcar-granite-3-1-8b-instruct:1.5"}]}
]
```

Sources:
- https://huggingface.co/RedHatAI
- https://huggingface.co/api/models?author=RedHatAI&sort=downloads&limit=40
- https://huggingface.co/RedHatAI/granite-3.1-8b-instruct-quantized.w4a16
- https://docs.redhat.com/en/documentation/red_hat_ai/3/html-single/validated_models
- https://github.com/vllm-project/llm-compressor
- https://github.com/kubeflow/model-registry/tree/main/catalog
