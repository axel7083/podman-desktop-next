# Podman AI Lab

## 1. Identity
- Display name: Podman AI Lab
- Extension id: `redhat.ai-lab` (real: `publisher: "redhat"`, `name: "ai-lab"`, version `1.10.0-next` in packages/backend/package.json)
- Icon: `/home/astefani/github/podman-desktop/ext-ai-lab/packages/backend/icon.png`
- Description: Run open models locally (llama.cpp / whisper.cpp / OpenVINO), try them in playgrounds, and start AI sample apps ("recipes") as pods.

## 2. Real objects / fields / enums
Source of truth: `packages/backend/src/assets/ai.json` (keys `version`, `recipes`, `models`, `categories`) and `packages/shared/src/models/*`.
- **ModelInfo** (catalog): `id`, `name`, `description` (markdown), `registry` ("Hugging Face"), `license`, `url` (direct .gguf), `memory` (bytes), `properties` (e.g. `{"jinja":"true"}` or `{"chatFormat":"openchat"}`), `sha256`, `backend`. Real ids: `hf.ibm-granite.granite-4.0-micro-GGUF`, `hf.ibm-granite.granite-4.0-tiny-GGUF`, `hf.ibm-granite.granite-3.3-8b-instruct-GGUF` (Q4_K_M, 4939212390 B), `hf.ibm-research.granite-3.2-8b-instruct-GGUF`, `hf.ibm-granite.granite-8b-code-instruct`, `hf.openai.gpt-oss-20b`, `hf.mistralai.mistral-small-3.2-24b-instruct-2506`, `hf.qwen.qwen3-4b-GGUF`, `hf.microsoft.Phi-4-mini-reasoning`, `hf.ggerganov.whisper.cpp`, `hf.facebook.detr-resnet-101`, `OpenVINO/mistral-7B-instruct-v0.2-int4-ov`.
- **Recipe**: `id`, `name`, `description`, `icon`, `categories`, `repository` (https://github.com/containers/ai-lab-recipes), `ref` (`v1.8.0`), `basedir`, `readme`, `recommended` (model ids), `backend`, `languages`, `frameworks`. Real ids: `chatbot`, `chatbot-pydantic-ai`, `agents`, `summarizer`, `codegeneration`, `rag` (python; streamlit, langchain, vectordb), `rag-nodejs`, `chatbot-java-quarkus`, `chatbot-javascript-react`, `function-calling`, `function-calling-nodejs`, `graph-rag`, `audio_to_text`, `object_detection`, `chatbot-llama-stack`.
- **Categories**: `natural-language-processing`, `computer-vision`, `audio`, `multimodal`.
- **InferenceType** enum: `llama-cpp`, `whisper-cpp`, `openvino`, `none` (no `vllm` in the current repo; vLLM would be added via RHAII, see redhat.ai-inference-server.md).
- **InferenceServer**: `models: ModelInfo[]`, `container {engineId, containerId}`, `connection {port}`, `status` (`stopped|running|deleting|stopping|error|starting`), `health {Status, FailingStreak, Log[]}`, `exit?`, `type`, `labels`, `name?`.
- **ApplicationState**: `recipeId`, `modelId`, `pod: PodInfo`, `appPorts[]`, `modelPorts[]`, `health` (`none|starting|healthy|unhealthy`), `backend`, `name?`.
- **PlaygroundV2**: `id`, `name`, `modelId` (+ conversation messages: user/assistant/system, with timings).
- **Inference images** (`inference-images.json`): llamacpp `quay.io/ramalama/ramalama-llama-server@sha256:293f...`, cuda `quay.io/ramalama/cuda-llama-server@sha256:b9ce...`, intel `quay.io/ramalama/intel-gpu-llama-server@sha256:ea2a...`; whispercpp `quay.io/ramalama/ramalama-whisper-server@sha256:2ce4...`; openvino `quay.io/ramalama/openvino@sha256:e026...`.
- **Container labels** set by AI Lab: `ai-lab-inference-server` (JSON array of model ids), `ai-lab-recipe-id`, `ai-lab-model-id`, `ai-lab-model-ports`, `ai-lab-application-ports`, `ai-lab-application-name`, `ai-lab-model-service`, `ai-lab-llama-stack-container`, `ai-lab-llama-stack-api-port`, `ai-lab-llama-stack-playground-port`, `ai-lab-instructlab-container`. Recipe repos carry an `ai-lab.yaml`.
- **Webview routes** (frontend App.svelte): `/` dashboard, `/recipes` (Recipes Catalog), `/recipe/:id`, `/applications` (Running), `/models` (Catalog), `/models/import`, `/model/:id`, `/services` (Model Services), `/service/:id`, `/playgrounds`, `/playground/:id`, `/llamastack` (Llama Stack), `/tune` + `/instructlab` (InstructLab fine-tuning), `/local-server` (AI Lab API on port 10434, Ollama-compatible), `/preferences`.

## 3. Placement in the mockup
- **tools** (P3): "AI Lab" group in Tools with pages Recipes, Running apps, Models, Services, Playgrounds, Llama Stack, Fine-tune.
- **InferenceProviderConnection** (P9): each running inference server registers as an inference provider (`llama-cpp`, endpoint `http://localhost:<port>/v1`) so other features (chat, MCP, Kaiden) consume it.
- **groupers** (P10): group containers by `ai-lab-recipe-id` / `ai-lab-inference-server` ("AI Lab apps" group in Containers list).
- **columns**: "Model" column on Containers from `ai-lab-model-id`.
- **tabs** (P14): "Inference" tab on container detail (model, endpoint, snippets curl/python/quarkus); "Recipe" tab on pod detail.
- **menus**: Image/model row "Start inference server", container kebab "Open in Playground".
- **dashboardCards** (P17): "Local AI" card: models downloaded, servers running, GPU (RTX 4090, CUDA image).
- **statusItems**: GPU indicator; **settings**: `ai-lab.models.path`, `ai-lab.experimentalGPU`, `ai-lab.apiPort` (10434), `ai-lab.inferenceRuntime`, `ai-lab.experimentalTuning`, `ai-lab.modelUploadDisabled` (all real, from package.json).
- **commands**: `ai-lab.navigation.recipe.start`, `ai-lab.navigation.inference.start` (real); internal route command `ai-lab.navigation.inference.create`.
- **project/workspace** (P15): a started recipe clones into `~/.local/share/.../podman-desktop/ai-lab/recipes/<id>` and is a project linked to its pod.

## 4. Journeys
1. Download a model: Tools > AI Lab > Models > `ibm-granite/granite-3.3-8b-instruct-GGUF` > Download. Task "Downloading granite-3.3-8b-instruct-Q4_K_M.gguf" (progress 0-100%, 4.6 GB, ~40 s simulated, sha256 verified). World: model status `downloaded`, file path shown.
2. Start a service: Models row > Start inference server > port 35000, GPU auto (CUDA detected). Task "Creating inference server" (steps: pull `cuda-llama-server`, create container, wait healthy; ~15 s). World: container `granite-3.3-8b-instruct-server` with label `ai-lab-inference-server`, Services list shows `running`, new InferenceProviderConnection; "Open playground" -> chat with system prompt "You are the Acme support assistant".
3. Start RAG recipe for acme-support-assistant: Recipes > RAG Chatbot > Start with recommended Granite 3.3. Task "Starting RAG Chatbot" (checkout `containers/ai-lab-recipes@v1.8.0`, build `rag` image, start model service, create pod `rag`, healthcheck; ~60 s). World: pod `rag` with 3 containers (model service, chromadb, streamlit app on 8501), Running apps entry `healthy`, "Open app" link.

## 5. Sample data
```json
{
  "models": [
    {"id": "hf.ibm-granite.granite-3.3-8b-instruct-GGUF", "name": "ibm-granite/granite-3.3-8b-instruct-GGUF", "registry": "Hugging Face", "license": "Apache-2.0", "memory": 4939212390, "backend": "llama-cpp", "properties": {"jinja": "true"}, "file": {"path": "/home/sam/.local/share/containers/podman-desktop/extensions-storage/redhat.ai-lab/models/hf.ibm-granite.granite-3.3-8b-instruct-GGUF", "file": "granite-3.3-8b-instruct-Q4_K_M.gguf", "size": 4939212390, "creation": "2026-10-02T09:14:00Z"}},
    {"id": "hf.ibm-granite.granite-4.0-tiny-GGUF", "name": "ibm-granite/granite-4.0-tiny-GGUF", "registry": "Hugging Face", "license": "Apache-2.0", "memory": 4224733676, "backend": "llama-cpp"},
    {"id": "hf.ibm-granite.granite-4.0-micro-GGUF", "name": "ibm-granite/granite-4.0-micro-GGUF", "registry": "Hugging Face", "license": "Apache-2.0", "memory": 2100000000, "backend": "llama-cpp", "file": {"file": "granite-4.0-micro-Q4_K_M.gguf", "creation": "2026-09-21T16:40:00Z"}},
    {"id": "hf.openai.gpt-oss-20b", "name": "openai/gpt-oss-20b", "license": "Apache-2.0", "memory": 11600000000, "backend": "llama-cpp"},
    {"id": "hf.ggerganov.whisper.cpp", "name": "ggerganov/whisper.cpp", "license": "Apache-2.0", "memory": 487010000, "backend": "whisper-cpp"}
  ],
  "inferenceServers": [
    {"name": "granite-3.3-8b-instruct-server", "status": "running", "type": "llama-cpp", "connection": {"port": 35000}, "container": {"engineId": "podman.podman", "containerId": "8c1f2a9e04b7"}, "models": ["hf.ibm-granite.granite-3.3-8b-instruct-GGUF"], "health": {"Status": "healthy", "FailingStreak": 0}, "labels": {"ai-lab-inference-server": "[\"hf.ibm-granite.granite-3.3-8b-instruct-GGUF\"]", "gpu": "nvidia"}, "image": "quay.io/ramalama/cuda-llama-server@sha256:b9ced640"},
    {"name": "granite-4.0-micro-server", "status": "stopped", "type": "llama-cpp", "connection": {"port": 35001}, "container": {"engineId": "podman.podman", "containerId": "1d7e55c3a2f0"}, "models": ["hf.ibm-granite.granite-4.0-micro-GGUF"], "exit": 0}
  ],
  "applications": [
    {"recipeId": "rag", "modelId": "hf.ibm-granite.granite-3.3-8b-instruct-GGUF", "name": "acme-support-assistant", "pod": {"Id": "5b0e9d7f11aa", "Name": "rag", "Status": "Running", "Containers": 3}, "appPorts": [8501], "modelPorts": [35002], "health": "healthy", "backend": "llama-cpp"},
    {"recipeId": "chatbot-java-quarkus", "modelId": "hf.ibm-granite.granite-4.0-tiny-GGUF", "pod": {"Id": "a71c03e2b9d4", "Name": "chatbot-java-quarkus", "Status": "Exited"}, "appPorts": [8080], "modelPorts": [35003], "health": "none", "backend": "llama-cpp"}
  ],
  "playgrounds": [
    {"id": "pg-1", "name": "acme-support prompt tuning", "modelId": "hf.ibm-granite.granite-3.3-8b-instruct-GGUF", "messages": 12, "updated": "2026-10-07T15:22:00Z"}
  ],
  "llamaStack": {"containerId": "e4b2c1d09f88", "port": 5001, "playgroundPort": 8501, "labels": {"ai-lab-llama-stack-container": "true"}}
}
```

Sources:
- /home/astefani/github/podman-desktop/ext-ai-lab/packages/backend/src/assets/ai.json, inference-images.json
- /home/astefani/github/podman-desktop/ext-ai-lab/packages/shared/src/models/IInference.ts, IApplicationState.ts, IPlaygroundV2.ts
- https://github.com/containers/podman-desktop-extension-ai-lab
- https://github.com/containers/ai-lab-recipes
