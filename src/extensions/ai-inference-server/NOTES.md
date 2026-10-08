# redhat.ai-inference-server – Red Hat AI Inference (vLLM) (proposed)

- **Real objects**: images `registry.redhat.io/rhaii/vllm-{cuda,rocm,cpu}-rhel9:3.4.1` (vLLM 0.18), port 8000, `/v1/*`, `/health`, `/metrics` (`vllm:kv_cache_usage_perc`…), CDI `nvidia.com/gpu=all`.
- **Placement**: AI Lab backend "Red Hat AI Inference (vLLM) · proposed"; each server = `service` connection (P8) with capability `inference` (P9); GPU status item; GPU onboarding.
- **Journeys**: serve RedHatAI/granite-3.1-8b-instruct-quantized.w4a16 (pull → weights → /health 200); seeded `vllm-8001` shows the real out-of-memory failure for Qwen3-Coder-Next-FP8.
- **Sources**: docs/research/redhat.ai-inference-server.md.
