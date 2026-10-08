# redhat.kaiden-bridge – Kaiden (proposed)

- **Real objects**: Kaiden agents (`claude`, `goose`, `opencode`, `codex`, `cursor` with base images `ghcr.io/openkaiden/openshell-image-*`), OpenShell gateway `ghcr.io/nvidia/openshell/gateway:0.0.71`, workspace create options (agent, model, gateway, skills, mcp), phases Provisioning/Ready.
- **Placement**: "OpenShell gateway" service connection (P8) with Agent workspaces and Agents sections (P2); "Kaiden sandboxes" container grouper (P10); "Open in Kaiden" container kebab.
- **Journey**: Start agent workspace (Claude Code + MaaS granite-3-3-8b-instruct + kubernetes-mcp-server + skill rag-eval) → task → sandbox in Containers › Kaiden sandboxes.
- **Sources**: docs/research/redhat.kaiden-bridge.md.
