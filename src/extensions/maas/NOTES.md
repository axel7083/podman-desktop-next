# redhat.maas – Models-as-a-Service (proposed)

- **Real objects**: maas-api `/v1/models` (modelDetails, subscriptions), `/v1/api-keys` (`sk-oai-…`, status, expiration), `MaaSSubscription.tokenRateLimits` (500k tokens / 1h for premium-ai-team), HTTP 429 from Limitador.
- **Placement**: `service` connection "acme MaaS (rhoai-dev)" with capability `inference` (P9); factory "Add MaaS endpoint" (P12); sections Models, API keys, Subscriptions & quota; account "OpenShift AI (rhoai-dev)" (P16); quota card + status item (P17).
- **Journeys**: create API key (shown once, stored as Podman secret `maas-api-key`); playground on MaaS → quota 82% → 100% → 429 + toast "Switch to local AI Lab model".
- **Sources**: docs/research/redhat.maas.md.
