# Models-as-a-Service (MaaS) endpoints

## 1. Identity
- Display name: Models-as-a-Service (Red Hat OpenShift AI)
- Extension id: `redhat.maas` (proposed; the real Kaiden equivalent is `kaiden.openshift-ai` plus `kaiden.openai-compatible`)
- Icon: https://raw.githubusercontent.com/openkaiden/kaiden/main/extensions/openshift-ai/icon_light.png (verified 200 image/png; dark variant `icon_dark.png`). Fallback local: `../ext-ai-lab/packages/backend/icon.png`
- Description: Connect to your company's OpenShift AI MaaS gateway (or any OpenAI-compatible endpoint), mint API keys, browse subscribed models and track token quota.

## 2. Real objects / fields / enums
- Gateway: OpenShift Gateway API + Kuadrant 1.4.2+ (ODH) / RHCL 1.3+ (RHOAI); Authorino validates credential, strips `Authorization` before backend; Limitador enforces token rate limits (HTTP 429 when exceeded). KServe `LLMInferenceService` backends; PostgreSQL stores API keys.
- Inference (OpenAI-compatible, body routing): `POST https://maas.<cluster-domain>/v1/chat/completions`, `POST .../v1/embeddings`. Legacy path routing: `https://maas.<cluster-domain>/llm/<model>/v1/chat/completions`.
- maas-api (`/maas-api` prefix): `GET /health`, `GET /v1/models`, `POST /v1/api-keys`, `POST /v1/api-keys/search`, `POST /v1/api-keys/bulk-revoke`, `GET /v1/api-keys/config`, `GET|DELETE /v1/api-keys/{id}`, `GET /v1/subscriptions`, `GET /v1/model/{model-id}/subscriptions`, `GET /v1/tenants`.
- Model (`/v1/models` item, OpenAI Model inline + extras): `id`, `object`, `created`, `owned_by`, `kind`, `url`, `ready`, `modelDetails{displayName, description, genaiUseCase, contextWindow, modelCapabilities[]}`, `aliases[]`, `subscriptions[{name, displayName, description}]`. On-cluster id format `publishers/llm/models/<org>/<model>`; external models use plain names (e.g. `gpt-4o`).
- ApiKey: `id, name, description, username, subscription, tenant, groups[], creationDate, expirationDate, status (active|revoked|expired), lastUsedAt, ephemeral, labels{}`. Keys look like `sk-oai-...`.
- CRDs (group `maas.opendatahub.io/v1alpha1`): `MaaSModelRef` (spec.modelRef{kind,name}, endpointOverride, tenantRef; status.phase, endpoint, httpRouteHostnames, conditions), `MaaSSubscription` (spec.owner{groups,users}, modelRefs[{name, namespace, tokenRateLimits[{limit, window}], unlimited, billingRate{perToken}}], tokenMetadata{organizationId,costCenter}, priority), `MaaSAuthPolicy`, `Tenant`, `AITenant`, `ExternalModel`; plus `inference.opendatahub.io` `ExternalProvider`/`ExternalModel`.
- Tiers: legacy `free/premium/enterprise` via ConfigMap `tier-to-group-mapping` + gateway TokenRateLimitPolicy; now migrated to MaaSSubscription (per-model limits). Mockup shows subscription name, which can still be "premium".
- Kaiden model (P9): `InferenceProviderConnection { id, name, type: 'cloud'|'local'|'self-hosted', llmMetadata?{name, semanticRouter}, endpoint?, sdk, credentials(), lifecycle?, status(), models: {label}[] }`; factory `InferenceProviderConnectionFactory { connectionTypes, create(params) }`. Kaiden openshift-ai settings: `openshiftai.factory.url`, `openshiftai.factory.token`; openai-compatible: `openai.factory.baseURL`, `openai.factory.apiKey`.
- Usage (tokens used vs quota): no per-user usage endpoint in maas-api (unverified); mockup derives it from Limitador metrics / `tokenRateLimits` window (simulated).

## 3. Placement in the mockup
- connections: kind `inference` (P9) under a new "AI" provider group; one connection "acme MaaS (rhoai-dev)" type `self-hosted`, one "AI Lab local" type `local` (granite on :35000 range), optional generic "OpenAI-compatible".
- connectionFactories (P12/P18): "Add MaaS endpoint" form: Gateway URL (prefilled from kube context `rhoai-dev` cluster domain), auth = Red Hat SSO / OpenShift token (P16) or paste API key; "Add OpenAI-compatible endpoint" (baseURL, apiKey).
- navSections (P2) under the MaaS connection, `when: connection.kind == inference && provider == redhat.maas`: Models, API Keys, Subscriptions & Quota.
- tabs (P14) on connection detail: Summary (endpoint, tenant, status), Usage (bar: tokens used / limit per window).
- menus: model row: "Copy endpoint", "Copy curl", "Use in AI Lab Playground", "Share with Kaiden agent"; API key row: Revoke; toolbar: Create API key.
- columns: Models list: Display name, ID, Context window, Capabilities, Subscription, Ready.
- dashboardCards (P17): "Token quota" gauge per subscription. statusItems: quota warning at 80%.
- settings: default inference connection for the workspace "acme-support-assistant" (P15 project).
- commands: `maas.createApiKey`, `maas.testConnection`.

## 4. Journeys
1. Connect company MaaS: Settings > Resources > AI > "Add MaaS endpoint" -> form prefilled `https://maas.apps.rhoai-dev.acme.example` -> Sign in with Red Hat SSO -> task "Connecting to MaaS" (steps: `GET /maas-api/health 200`, `GET /maas-api/v1/tenants -> default`, `GET /maas-api/v1/subscriptions -> premium-ai-team`, `GET /maas-api/v1/models -> 4 models (3 ready)`; ~4s) -> connection appears with status `started`, 4 models.
2. Mint key for the RAG app: MaaS connection > API Keys > Create -> name `acme-support-assistant-dev`, expiration 90d -> task "Creating API key" (`POST /maas-api/v1/api-keys`, 1s) -> key `sk-oai-...` shown once with Copy; option "Store as Podman secret `maas-api-key`" -> secret appears under Secrets and is injected into container `acme-support-assistant` env `OPENAI_API_KEY`.
3. Hit quota: Usage tab shows 412k / 500k tokens (1h window, premium) -> chatbot loop pushes to 100% -> toast "Rate limit reached (HTTP 429) on granite-3-3-8b-instruct, resets in 14 min" -> suggestion "Switch to local AI Lab model" -> container env switched to `http://host.containers.internal:35123/v1`.

## 5. Sample data
```json
[
  {"kind": "connection", "id": "maas-rhoai-dev", "name": "acme MaaS (rhoai-dev)", "type": "self-hosted", "endpoint": "https://maas.apps.rhoai-dev.acme.example/v1", "status": "started", "tenant": "default"},
  {"kind": "connection", "id": "ai-lab-local", "name": "AI Lab (local)", "type": "local", "endpoint": "http://localhost:35123/v1", "status": "started"},
  {"id": "publishers/llm/models/ibm-granite/granite-3-3-8b-instruct", "object": "model", "created": 1788220800, "owned_by": "sam-ai", "kind": "LLMInferenceService", "url": "https://maas.apps.rhoai-dev.acme.example/llm/granite-3-3-8b-instruct", "ready": true, "modelDetails": {"displayName": "Granite 3.3 8B Instruct", "genaiUseCase": "chat", "contextWindow": "128k", "modelCapabilities": ["chat", "tool-calling"]}, "subscriptions": [{"name": "premium-ai-team", "displayName": "Premium"}]},
  {"id": "publishers/llm/models/meta-llama/llama-3-3-70b-instruct", "object": "model", "kind": "LLMInferenceService", "ready": true, "modelDetails": {"displayName": "Llama 3.3 70B Instruct", "contextWindow": "128k", "modelCapabilities": ["chat"]}, "subscriptions": [{"name": "premium-ai-team"}]},
  {"id": "publishers/llm/models/ibm-granite/granite-embedding-125m-english", "object": "model", "kind": "LLMInferenceService", "ready": true, "modelDetails": {"displayName": "Granite Embedding 125M", "genaiUseCase": "embeddings", "modelCapabilities": ["embeddings"]}, "subscriptions": [{"name": "free-tier"}]},
  {"id": "gpt-4o", "object": "model", "kind": "ExternalModel", "ready": false, "modelDetails": {"displayName": "GPT-4o (external)"}, "subscriptions": [{"name": "enterprise-gov"}]},
  {"id": "a3f1c2e4-7b1d-4c9a-9e10-5d2f0b6a8c11", "name": "acme-support-assistant-dev", "username": "sam", "subscription": "premium-ai-team", "tenant": "default", "groups": ["ai-developers"], "creationDate": "2026-10-06T09:12:44Z", "expirationDate": "2027-01-04T09:12:44Z", "status": "active", "lastUsedAt": "2026-10-08T07:58:02Z", "ephemeral": false},
  {"id": "0c9e7d55-2f3b-4a61-8d4e-91b7c2a0f3de", "name": "laptop-m4-scratch", "username": "sam", "subscription": "free-tier", "creationDate": "2026-08-14T16:03:10Z", "status": "revoked", "ephemeral": false},
  {"kind": "MaaSSubscription", "name": "premium-ai-team", "namespace": "models-as-a-service", "owner": {"groups": [{"name": "ai-developers"}]}, "modelRefs": [{"name": "granite-3-3-8b-instruct", "namespace": "sam-ai", "tokenRateLimits": [{"limit": 500000, "window": "1h"}]}, {"name": "llama-3-3-70b-instruct", "namespace": "llm", "tokenRateLimits": [{"limit": 100000, "window": "1h"}]}], "tokenMetadata": {"costCenter": "CC-4410"}},
  {"kind": "usage", "subscription": "premium-ai-team", "model": "granite-3-3-8b-instruct", "window": "1h", "tokensUsed": 412380, "limit": 500000, "resetsAt": "2026-10-08T09:00:00Z"}
]
```

Sources:
- https://github.com/opendatahub-io/models-as-a-service (README, maas-api/openapi3.yaml)
- https://github.com/opendatahub-io/models-as-a-service/blob/main/docs/content/user-guide/inference.md
- https://github.com/opendatahub-io/models-as-a-service/blob/main/maas-api/internal/models/types.go
- https://github.com/opendatahub-io/models-as-a-service/blob/main/maas-api/internal/api_keys/types.go
- https://github.com/opendatahub-io/models-as-a-service/blob/main/maas-controller/api/maas/v1alpha1/maassubscription_types.go
- https://github.com/opendatahub-io/models-as-a-service/blob/main/docs/content/migration/tier-to-subscription.md
- https://github.com/openkaiden/kaiden/blob/main/packages/extension-api/src/extension-api.d.ts (InferenceProviderConnection)
- https://github.com/openkaiden/kaiden/tree/main/extensions/openshift-ai
