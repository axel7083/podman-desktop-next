# redhat.ai-lab – Podman AI Lab

- **Real objects**: `ai.json` recipes/models (`ModelInfo`: id, name, registry, license, memory, backend), `InferenceServer` (container, connection.port, status, type llama-cpp|openvino|whisper-cpp), `ApplicationState` (recipeId, modelId, pod, appPorts), `PlaygroundV2`. Labels `ai-lab-inference-server`, `ai-lab-recipe-id`, `ai-lab-model-id`.
- **Placement**: Tool (P3) with the real sub-nav; unified Catalog (R54: AI Lab + RedHatAI + validated ModelCars + rhoai-dev catalog); container groupers (P10), Model column + Inference tab (P14), "Local AI" dashboard card (P17); settings are the real `ai-lab.*` properties.
- **Journeys**: Catalog › RedHatAI › Fits my GPU › Serve with Red Hat AI Inference → Creating Model service (steps inline) → Service details (endpoint, metrics, client code) → Open in playground. Recipe Catalog › RAG Chatbot › Start. Playground provider picker (AI Lab, vLLM, MaaS with quota, rhoai port-forward).
- **Sources**: ext-ai-lab `packages/frontend/src/pages/*`, `packages/backend/src/assets/ai.json`, `inference-images.json`; docs/research/redhat.ai-lab.md, redhat.ai-model-catalog.md.
