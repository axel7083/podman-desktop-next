# Scenario: AI developer

**Persona: Sam, an AI application engineer at Acme Retail.** Sam is building `acme-support-assistant`, a RAG chatbot over product manuals.

Sam prototypes locally on a GPU and evaluates quantized models. The company deploys to OpenShift AI, and coding agents need governed model access and safe tool access (MCP).

## Environment fixtures
- **Hardware:** Fedora 44 workstation with an NVIDIA RTX 4090 (24 GB, CDI `nvidia.com/gpu=all`); a MacBook M4 for travel. Podman 5.7.
- **Red Hat account:** signed in (P16). The registry.redhat.io pull secret is present.
- **AI Lab (`redhat.ai-lab`):**
  - Models downloaded from `ai.json` (real ids), e.g. the Granite instruct GGUF.
  - A llama-cpp inference server on port ~35123 (`ai-lab-inference-server` label).
  - A RAG recipe app running.
  - Playground conversation "manuals Q&A".
- **Red Hat AI Inference:**
  - Proposed vLLM backend `registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1` (vLLM 0.18).
  - Serving `RedHatAI/granite-3.1-8b-instruct-quantized.w4a16` on port 8000.
  - An InferenceProviderConnection (P9).
- **Unified catalog (R54):** RedHatAI Hugging Face models (live Oct 2026 data: granite-4.x, Qwen3.x FP8-dynamic, Llama-3.3-70B w8a8, gemma-4).
  - Fit badges against 24 GB of VRAM.
  - NVFP4 builds flagged as "needs Blackwell".
- **Kubernetes context `rhoai-dev`:**
  - OpenShift AI 3.5 `DataScienceCluster` components: kserve, workbenches, modelregistry/aiHub, trainer, ray, kueue, trustyai, aigateway, mcplifecycleoperator.
  - Project `sam-ai`: 1 workbench Notebook and 2 InferenceServices (`granite-8b` Ready, `qwen3-8b-fp8` Loading).
- **MaaS connection** at `https://maas.apps.rhoai-dev.acme.example`:
  - Subscription `premium-ai-team`, 4 models.
  - Token quota 412k / 500k per hour.
- **MCP servers:**
  - Running locally: `kubernetes-mcp-server` (OCI, streamable-http :8080) and `podman-mcp-server` (stdio).
  - Remote: GitHub MCP.
  - Registered clients: Claude Code (`.mcp.json`), VS Code, Cursor.
- **Kaiden:**
  - Gateway container `ghcr.io/nvidia/openshell/gateway:0.0.71`.
  - Two agent workspaces: `acme-support-cc` (Claude Code, Ready) and `openshell-goose-docs` (Goose).

## The 5 most impressive journeys
1. **"Pick a model that fits my GPU, serve it with vLLM."**
   - AI Lab → Catalog (RedHatAI tab) → filter "fits 24 GB" → `granite-3.1-8b-instruct-quantized.w4a16` → **Serve with Red Hat AI Inference**.
   - Task "Pull rhaii/vllm-cuda-rhel9:3.4.1 → load weights → `/health` 200", about 90 s.
   - Result: a new inference connection, an OpenAI endpoint card with a curl snippet, and the playground switches to it.
2. **"Laptop to cluster with ModelCar."**
   - Model row → **Package as ModelCar** → Containerfile preview (`FROM ubi9/ubi-micro`, `COPY models /models`).
   - Task build, then push `quay.io/acme-ai/modelcar-granite-3.1-8b-w4a16:1.0`.
   - "Deploy to rhoai-dev" → the generated `InferenceService` YAML with `storageUri: oci://quay.io/...` and runtime `vllm-cuda-runtime` → applied.
   - It appears in rhoai-dev → *OpenShift AI* → *Model serving* as Loading → Ready, with "Port-forward to playground".
3. **"OpenShift AI under my cluster, not in a browser tab."**
   - Primary nav `rhoai-dev` → secondary nav shows the **OpenShift AI** section only because `kube.hasCRD('datascienceclusters')` (P2/P4).
   - Sections: *Projects*, *Workbenches*, *Model serving*, *Model registry*.
   - Register the ModelCar as `RegisteredModel acme-granite` v1.0, with the ModelArtifact URI linked.
4. **"Governed company models and agents."**
   - Add the MaaS endpoint (SSO) → mint API key `acme-support-assistant-dev` → store it as a Podman secret injected into the app container.
   - Kaiden bridge: **Start agent workspace** on the project → Claude Code + MaaS `granite-3-3-8b-instruct` + MCP `kubernetes-mcp-server` + skill `rag-eval`.
   - Task (about 25 s): sandbox Provisioning → Ready.
   - The sandbox shows up under Containers → group "Kaiden sandboxes".
   - The quota toast at 100% offers "switch to local AI Lab model".
5. **"One-click MCP for every client."**
   - Tools → MCP Servers → Registry search "kubernetes" → `io.github.containers/kubernetes-mcp-server` 0.0.67 → Install as container with kubeconfig mounted read-only.
   - Task: `initialize ok`, `tools/list` returns 22 tools.
   - Tools tab lists `pods_list`, `pods_log`, `resources_create_or_update`, and others.
   - "Add to client" → Claude Code / VS Code / Cursor, with a config diff for each.
   - "Deploy to rhoai-dev" → MCPServer CR Ready.

Dossiers: `redhat.ai-lab, redhat.modelcar, redhat.ai-inference-server, redhat.ai-model-catalog, redhat.openshift-ai, redhat.maas, mcp-hub, redhat.kaiden-bridge`.
