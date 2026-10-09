# OpenShift Lightspeed + kubernetes-mcp-server

## 1. Identity
- **Display name:** OpenShift Lightspeed
- **Extension id:** `redhat.openshift-lightspeed` (proposed; distinct from real `redhat.rhel-lightspeed` in ext-redhat-lightspeed)
- **Icon:** `../ext-redhat-lightspeed/packages/extension/icon.png` (Lightspeed mark); MCP: https://github.com/containers.png
- **Description:** Ask OpenShift Lightspeed about the active cluster, with kubernetes-mcp-server giving agents scoped access to the same context.

## 2. Real objects & fields
- `OLSConfig` (`ols.openshift.io/v1alpha1`, name `cluster`): `spec.llm.providers[].{name, type:"openai"|"azure_openai"|"watsonx"|"rhoai_vllm"|"rhelai_vllm", url, credentialsSecretRef, models[].name}`, `spec.ols.defaultProvider`, `spec.ols.defaultModel`; detected via service `lightspeed-app-server` in `openshift-lightspeed` ns.
- `POST /v1/query` (bearer = user's cluster token; [docs](https://docs.redhat.com/en/documentation/red_hat_openshift_lightspeed/1.0/html/operate/ols-interacting-with-the-api)): request `{query, conversation_id?, provider?, model?, attachments:[{attachment_type:"log"|"configuration"|"api object", content_type:"text/plain"|"application/yaml"|"application/json", content}]}` → `{conversation_id, response, referenced_documents:[{doc_url, doc_title}], truncated, input_tokens, output_tokens, available_quotas}`. Streaming: `/v1/streaming_query`. Feedback: `POST /v1/feedback`.
- kubernetes-mcp-server ([containers/kubernetes-mcp-server](https://github.com/containers/kubernetes-mcp-server)): `npx kubernetes-mcp-server@latest --port 8089 --read-only --kubeconfig <file> --toolsets core,config,helm`; tools `pods_list`, `pods_get`, `pods_log`, `pods_exec`, `resources_list`, `resources_get`, `resources_create_or_update`, `events_list`, `namespaces_list`, `projects_list` (OpenShift), `configuration_view`, `helm_list`.

## 3. Placement
- **tools:** "Lightspeed" chat panel scoped to the selected Kubernetes connection (context chip "ocp-dev / payments").
- **menus:** pod/PipelineRun/VM kebab "Ask Lightspeed" → attaches YAML + last 200 log lines as `attachments`.
- **navSections/connection tab:** "MCP" on Kubernetes connections: start/stop kubernetes-mcp-server bound to that context, read-only toggle, copy client config (P9). P#: **P4, P9, P14**.

## 4. Journeys
1. **Explain CrashLoopBackOff.** Pod `ledger-worker-…` CrashLoopBackOff → Ask Lightspeed → streamed answer citing docs + suggested patch. Failure: cluster has no Lightspeed (`ocp-prod` lacks OLSConfig) → "Not installed — install via Operators" link (OLM journey).
2. **MCP for my agent.** ocp-dev → MCP tab → Start (read-only) → copy config snippet for Claude Code / Goose → status Running on :8089, tool count 18.
3. **Quota.** `available_quotas` low → banner.

## 5. Sample data
```json
{
  "olsConfig":{"cluster":"ocp-dev","defaultProvider":"rhoai","defaultModel":"granite-4-0-h-small","providers":[{"name":"rhoai","type":"rhoai_vllm","url":"https://granite-4-0-h-small-llm.apps.ocp-dev.acme.internal/v1","models":["granite-4-0-h-small"]}]},
  "conversation":[
    {"role":"user","query":"Why is ledger-worker-6b9f7c5d8-q2x8z in CrashLoopBackOff?","attachments":[{"attachment_type":"log","content_type":"text/plain","content":"Error: FATAL: password authentication failed for user \"ledger\"\n"}]},
    {"role":"assistant","conversation_id":"7c1e9a42-3b5d-4f8e-a6c0-2d9b1e4f7a35","response":"The container exits because PostgreSQL rejects the credentials. The Deployment reads DB_PASSWORD from Secret `ledger-db` key `password`, which was rotated at 08:55. Restart the pod after updating the Secret, or reference the Skupper-exposed `payments-db` service credentials...","referenced_documents":[{"doc_url":"https://docs.redhat.com/en/documentation/openshift_container_platform/4.22/html/nodes/working-with-pods","doc_title":"Working with pods"},{"doc_url":"https://docs.redhat.com/en/documentation/openshift_container_platform/4.22/html/nodes/working-with-secrets","doc_title":"Providing sensitive data to pods by using secrets"}],"truncated":false,"input_tokens":2214,"output_tokens":186,"available_quotas":{"UserQuotaLimiter":47812}}
  ],
  "mcpServers":[
    {"connection":"ocp-dev","name":"kubernetes-mcp-server","version":"0.0.58","status":"running","port":8089,"readOnly":true,"toolsets":["core","config","helm"],"tools":18,"startedAt":"2026-10-08T09:35:00Z"},
    {"connection":"minc","name":"kubernetes-mcp-server","status":"stopped","readOnly":false}
  ]
}
```
