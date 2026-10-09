# Red Hat AI Inference (vLLM)

## 1. Identity
- Display name: Red Hat AI Inference (formerly Red Hat AI Inference Server, RHAIIS; renamed in 3.4)
- Extension id: `redhat.ai-inference-server` (proposed; no real Podman Desktop extension). Realistically a backend contributed into `redhat.ai-lab` (new `InferenceType` `vllm`) plus an InferenceProviderConnection.
- Icon: https://raw.githubusercontent.com/vllm-project/vllm/main/docs/assets/logos/vllm-logo-only-light.png (verified 200 image/png); Red Hat alternative: `../ext-redhat-account/icons/redhat-logo.svg`
- Description: Enterprise-supported vLLM container images for serving LLMs on NVIDIA/AMD/CPU/Spyre with an OpenAI-compatible API.

## 2. Real objects / fields / enums
- **Images (3.4.1, GA, vLLM v0.18.0)**: `registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1`, `registry.redhat.io/rhaii/vllm-rocm-rhel9:3.4.1`, `registry.redhat.io/rhaii/vllm-cpu-rhel9:3.4.1`, `registry.redhat.io/rhaii/vllm-spyre-rhel9:3.4.1`, `registry.redhat.io/rhaii/model-opt-cuda-rhel9:3.4.1` (LLM Compressor 0.10). Older namespace `registry.redhat.io/rhaiis/vllm-cuda-rhel9:3.2.5` (also `vllm-tpu-rhel9`, `vllm-rocm-rhel9`). TPU/Gaudi variants exist per release (unverified for 3.4 tags). Requires Red Hat registry login (P16).
- **Run (RHEL/Fedora, CDI)**:
  ```
  podman run --rm -it --device nvidia.com/gpu=all --security-opt=label=disable \
    --shm-size=4g -p 8000:8000 -e HF_TOKEN=$HF_TOKEN -e HF_HUB_OFFLINE=0 \
    -v ~/.cache/rhaii:/opt/app-root/src/.cache:Z \
    registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1 \
    --model RedHatAI/granite-3.1-8b-instruct-quantized.w4a16 \
    --served-model-name granite-8b --tensor-parallel-size 1 --max-model-len 16384 \
    --gpu-memory-utilization 0.90 --enable-auto-tool-choice --tool-call-parser granite
  ```
  GPU access requires `nvidia-container-toolkit` and `nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml`; `nvidia-ctk cdi list` shows `nvidia.com/gpu=0`, `nvidia.com/gpu=all`. Not supported on macOS (M4: no CUDA; use AI Lab llama.cpp or `vllm-cpu` x86 only).
- **Default port** 8000. **Endpoints**: `GET /v1/models`, `POST /v1/chat/completions`, `POST /v1/completions`, `POST /v1/embeddings`, `POST /v1/responses`, `GET /health`, `GET /metrics` (Prometheus: `vllm:num_requests_running`, `vllm:num_requests_waiting`, `vllm:kv_cache_usage_perc`, `vllm:generation_tokens_total`, `vllm:time_to_first_token_seconds`), `GET /version`, `POST /tokenize`.
- **Key flags**: `--model`, `--served-model-name`, `--tensor-parallel-size`, `--max-model-len`, `--gpu-memory-utilization`, `--quantization` (auto from compressed-tensors), `--enable-auto-tool-choice`, `--tool-call-parser`, `--api-key`, `--port`.
- **Hardware detection**: `nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv` -> "NVIDIA GeForce RTX 4090, 24564 MiB, 580.x"; AI Lab already has `IGPUInfo` (vendor, model, vram).

## 3. Placement in the mockup
- **connections** kind `service` (P8) "vLLM @ localhost:8000" with status running/stopped; plus registered **InferenceProviderConnection** (P9) type `openai-compatible`, endpoint `http://localhost:8000/v1`, models from `/v1/models`. MCPManager/Kaiden chat can select it.
- **connectionFactories** (P12/P18): "Create vLLM inference server" form (accelerator auto-detected: CUDA RTX 4090 24 GB; image variant; model picker fed by redhat.ai-model-catalog; max-model-len; TP size; HF token from secret store).
- AI Lab **Services** page: new backend `vllm` alongside llama-cpp (label `ai-lab-inference-server`).
- **tabs** (P14): "Inference" tab on the container: endpoint, curl snippet, live `/metrics` sparkline (tokens/s, KV cache %).
- **statusItems**: GPU memory usage. **dashboardCards** (P17): "GPU: RTX 4090 - 21.3/24 GB used by vllm".
- **onboarding**: check NVIDIA driver + CDI spec; offer "Generate CDI spec" task.

## 4. Journeys
1. Onboard GPU: Settings > Resources > vLLM service > Set up. Task "Checking GPU" (nvidia-smi found RTX 4090; CDI spec missing -> run `sudo nvidia-ctk cdi generate`; ~5 s). World: GPU badge "CUDA ready".
2. Start server: Connections > Create vLLM inference server > model `RedHatAI/granite-3.1-8b-instruct-quantized.w4a16`, name `granite-8b`. Task "Starting Red Hat AI Inference" (pull `vllm-cuda-rhel9:3.4.1` 9.8 GB, download weights 4.9 GB, log lines "Loading safetensors checkpoint shards: 100%", "Graph capturing finished in 18 secs", "Starting vLLM API server on http://0.0.0.0:8000"; ~2 min simulated as 20 s). World: container `rhaii-granite-8b` running, service connection green, InferenceProviderConnection added.
3. Use it: AI Lab > Playgrounds > New > provider "vLLM @ localhost:8000" model `granite-8b` -> chat; Inference tab shows 85 tok/s, KV cache 12%.

## 5. Sample data
```json
{
  "gpu": {"vendor": "NVIDIA", "model": "NVIDIA GeForce RTX 4090", "vram": 25757220864, "driver": "580.95.05", "cdi": ["nvidia.com/gpu=0", "nvidia.com/gpu=all"]},
  "servers": [
    {"name": "rhaii-granite-8b", "containerId": "3fa1c9d2e8b0", "image": "registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1", "status": "running", "port": 8000, "model": "RedHatAI/granite-3.1-8b-instruct-quantized.w4a16", "servedModelName": "granite-8b", "args": ["--max-model-len", "16384", "--tensor-parallel-size", "1"], "started": "2026-10-08T08:41:12Z"},
    {"name": "rhaii-qwen3-coder", "containerId": "b02e77a1c4d9", "image": "registry.redhat.io/rhaii/vllm-cuda-rhel9:3.4.1", "status": "exited", "exitCode": 1, "port": 8001, "model": "RedHatAI/Qwen3-Coder-Next-FP8-dynamic", "error": "ValueError: model requires 48.2 GiB, only 22.1 GiB free"}
  ],
  "v1_models": {"object": "list", "data": [{"id": "granite-8b", "object": "model", "created": 1791448872, "owned_by": "vllm", "root": "RedHatAI/granite-3.1-8b-instruct-quantized.w4a16", "max_model_len": 16384}]},
  "chat_completion": {"id": "chatcmpl-9b1f2c", "object": "chat.completion", "model": "granite-8b", "choices": [{"index": 0, "message": {"role": "assistant", "content": "To reset your Acme account password, open Settings > Security..."}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 412, "completion_tokens": 96, "total_tokens": 508}},
  "metrics": {"vllm:num_requests_running": 1, "vllm:num_requests_waiting": 0, "vllm:kv_cache_usage_perc": 0.12, "vllm:generation_tokens_total": 18234, "vllm:time_to_first_token_seconds_p50": 0.081},
  "health": {"GET /health": 200},
  "inferenceProviderConnection": {"providerId": "redhat.ai-inference-server", "name": "vLLM @ localhost:8000", "type": "openai-compatible", "endpoint": "http://localhost:8000/v1", "status": "started", "models": [{"label": "granite-8b"}]}
}
```

Sources:
- https://docs.redhat.com/en/documentation/red_hat_ai_inference/3.4/html/release_notes/rhaii-341-release-notes_release-notes
- https://docs.redhat.com/en/documentation/red_hat_ai_inference_server/3.2/html-single/release_notes/index
- https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html
- https://docs.vllm.ai/en/latest/usage/metrics.html
- https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/cdi-support.html
- https://podman-desktop.io/docs/podman/gpu
