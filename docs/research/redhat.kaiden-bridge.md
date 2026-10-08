# Kaiden bridge

## 1. Identity
- Display name: Kaiden (agents and sandboxes)
- Extension id: `redhat.kaiden-bridge` (proposed; Kaiden's own built-ins use publisher `kaiden`, e.g. `kaiden.container`, `kaiden.openshift-ai`)
- Icon: https://raw.githubusercontent.com/openkaiden/artwork/refs/heads/main/icon-1024.png (verified 200 image/png; bear with VR goggles). Alt: https://raw.githubusercontent.com/openkaiden/kaiden/main/buildResources/icon.png (unverified)
- Description: Show Kaiden agent workspaces (sandboxes running as Podman containers) inside Podman Desktop and share inference providers, MCP servers and skills between the two apps.

## 2. Real objects / fields / enums
- Kaiden (github.com/openkaiden/kaiden, v`0.1.0-next`, Electron fork of Podman Desktop). Packages: `packages/main` (`ProviderRegistry`, `ContainerProviderRegistry`, `KubernetesClient`, `MCPManager`), `renderer`, `preload`, `preload-webview`, `extension-api` (published as `@openkaiden/api`), `webview-api`, `api`.
- Built-in extensions: inference `claude`, `gemini`, `mistral`, `openai-compatible`, `openshift-ai`, `vertex-ai`, `ollama`, `ramalama`; agents `claude`, `codex`, `copilot`, `cursor`, `goose`, `opencode`, `openclaw`; `mcp-registries`; RAG `milvus`, `docling`; `container`; sandbox `openshell`, `openshell-podman-gateway`.
- Agent: `{ id, name, description, icon?, tags?, command, acp?{command, args}, configurationFiles[{path, read()}], baseImage?, destinationSkillsFolder, isSupportedModelType?(), preWorkspaceStart(ctx) }`, registered with `agents.registerAgent()`. Real values: Claude Code `id: claude`, `command: claude`, `acp: claude-agent-acp`, `baseImage: ghcr.io/openkaiden/openshell-image-claude:fd194d5`, tags `['Cloud']`, env `ANTHROPIC_BASE_URL=https://inference.local`; Goose `command: goose`, skills `${HOME}/.agents/skills`; OpenCode `command: opencode`, skills `${HOME}/.opencode/skills`; Codex `codex`; Cursor `cursor` (`~/.cursor/skills`); Copilot (`~/.copilot/skills`); OpenClaw `baseImage: ghcr.io/openkaiden/openshell-image-openclaw:d08a4b1`.
- Agent workspace (sandbox) create options: `{ sourcePath?, agent, image?, model, gateway, name?, description?, project?, skills?[], network?, secrets?[], mcp?, workspaceConfiguration?, mounts?[], replaceConfig? }`. Name: DNS-1123 label, max 19 chars. Schema from `@openkaiden/workspace-configuration` (`WorkspaceConfiguration`, `NetworkConfiguration`, `McpServer`, `McpCommand`, `McpConfiguration`, `Mount`).
- Sandboxes run through NVIDIA OpenShell: gateway container `ghcr.io/nvidia/openshell/gateway:0.0.71` started on Podman by `openshell-podman-gateway` (label `ai.openkaiden.openshell-podman-gateway.port`). `OpenShellSandboxInfo { id, name, phase: 'Provisioning'|'Ready'|'Error' }`; `OpenShellGateway { id, name, endpoint, status(), features{supportMount} }`; CLI ops `sandbox.list/delete/connect`, `provider.list/create/delete`, `inference.set({gatewayId, providerName, model})`.
- Inference (P9): `InferenceProviderConnection { id, name, type: cloud|local|self-hosted, llmMetadata?, endpoint?, sdk, credentials(), status(), models[{label}] }`.
- MCP: `MCPServer { serverId, config }`, config `MCPRemoteServerConfig {type:'remote', index, headers}` | `MCPPackageServerConfig {type:'package', index, runtimeArguments, packageArguments, environmentVariables}`; `MCPServerDetail` = official registry `ServerDetail`; `mcpRegistry.registerRegistryProvider/suggestRegistry/registerServer`.
- Skills: `CreateSkillParams { label, path }`; copied into the agent's `destinationSkillsFolder` at workspace start; ACP sessions list per workspace.
- PD rebase epic: podman-desktop#19144 (rename `@podman-desktop/api` usage, `packages/assets`, extension asset bundling) to let Kaiden rebase on PD.

## 3. Placement in the mockup
- connections: kind `service` (P8) "OpenShell gateway (podman)" under Podman connection, endpoint `https://127.0.0.1:<port>`; status from gateway container.
- navSections (P2) under that connection, `when: extension.redhat.kaiden-bridge.active`: Agent Workspaces, Agents, Skills.
- groupers (P10): group containers by label `ai.openkaiden.*` -> "Kaiden sandboxes" group in Containers list.
- columns: Containers: "Agent" (Claude Code/Goose), "Model"; Agent Workspaces: Name, Agent, Model, Phase, Project, MCP servers.
- tabs (P14): container detail "Agent" tab (agent, model, skills, MCP servers, ACP session count); connection detail tab "Shared with Kaiden" (P9 inference + MCPManager sharing toggles).
- menus: workspace row: Open in Kaiden, Attach terminal, Stop, Delete; inference/MCP rows: "Share with Kaiden".
- tools (P3): "Agents" catalog page listing registered agents. dashboardCards (P17): "Running agents: 2".
- commands: `kaiden.openWorkspace`, `kaiden.createWorkspace`. onboarding: detect Kaiden install (`~/.local/share/kaiden`, unverified) and offer pairing.
- P15: workspace linked to project folder `~/src/acme-support-assistant`.

## 4. Journeys
1. Start an agent on the project: Projects > acme-support-assistant > "Start agent workspace" -> choose Claude Code, model `granite-3-3-8b-instruct` via "acme MaaS", MCP `kubernetes-mcp-server`, skill `rag-eval` -> task "Creating agent workspace acme-support-cc" (log: `Pulling ghcr.io/openkaiden/openshell-image-claude:fd194d5`, `Gateway ready on 127.0.0.1:41871`, `sandbox phase Provisioning -> Ready`, `copying 1 skill to /home/sandbox/.claude/skills`, `inference.set provider=maas model=granite-3-3-8b-instruct`; ~25s) -> new container in group "Kaiden sandboxes", row in Agent Workspaces with phase Ready.
2. Share local inference: Resources > AI Lab (local) row > "Share with Kaiden" -> task "Registering OpenShell provider ai-lab-local" (`provider.create type=openai`, 2s) -> Kaiden model picker now lists the local granite model; Agent tab of sandboxes shows option to switch.
3. Inspect a running sandbox: Containers > Kaiden sandboxes > `openshell-goose-docs` > Agent tab -> see Goose, model, 3 MCP servers, 2 ACP sessions; kebab "Open in Kaiden" deep-links `kaiden://agent-workspaces/<id>` (unverified scheme).

## 5. Sample data
```json
[
  {"type": "agent", "id": "claude", "name": "Claude Code", "command": "claude", "acp": {"command": "claude-agent-acp", "args": []}, "baseImage": "ghcr.io/openkaiden/openshell-image-claude:fd194d5", "tags": ["Cloud"], "destinationSkillsFolder": "${HOME}/.claude/skills"},
  {"type": "agent", "id": "goose", "name": "Goose", "command": "goose", "destinationSkillsFolder": "${HOME}/.agents/skills"},
  {"type": "agent", "id": "opencode", "name": "OpenCode", "command": "opencode", "destinationSkillsFolder": "${HOME}/.opencode/skills"},
  {"type": "gateway", "id": "openshell-podman", "name": "OpenShell (podman)", "endpoint": "https://127.0.0.1:41871", "status": "started", "features": {"supportMount": true}, "image": "ghcr.io/nvidia/openshell/gateway:0.0.71"},
  {"type": "workspace", "id": "ws-7c41e2", "name": "acme-support-cc", "agent": "claude", "model": "granite-3-3-8b-instruct", "gateway": "openshell-podman", "project": "acme-support-assistant", "sourcePath": "/home/sam/src/acme-support-assistant", "skills": ["rag-eval"], "mcp": ["io.github.containers/kubernetes-mcp-server"], "phase": "Ready", "created": "2026-10-08T08:14:02Z"},
  {"type": "workspace", "id": "ws-19ab03", "name": "goose-docs", "agent": "goose", "model": "llama-3-3-70b-instruct", "gateway": "openshell-podman", "project": "acme-support-assistant", "skills": [], "mcp": ["io.github.github/github-mcp-server", "io.github.containers/kubernetes-mcp-server", "io.github.manusa/podman-mcp-server"], "phase": "Ready", "created": "2026-10-07T15:40:51Z"},
  {"type": "workspace", "id": "ws-0d3f88", "name": "opencode-ingest", "agent": "opencode", "model": "granite-3-3-8b-instruct", "gateway": "openshell-podman", "phase": "Provisioning", "created": "2026-10-08T09:01:17Z"},
  {"type": "container", "Id": "3e9a1f0c2b7d", "Names": ["openshell-acme-support-cc"], "Image": "ghcr.io/openkaiden/openshell-image-claude:fd194d5", "State": "running", "Labels": {"ai.openkaiden.workspace": "acme-support-cc", "ai.openkaiden.agent": "claude"}},
  {"type": "container", "Id": "b81c44e9a0f2", "Names": ["openshell-gateway"], "Image": "ghcr.io/nvidia/openshell/gateway:0.0.71", "State": "running", "Labels": {"ai.openkaiden.openshell-podman-gateway.port": "41871"}},
  {"type": "skill", "label": "rag-eval", "path": "/home/sam/.agents/skills/rag-eval"},
  {"type": "sharedInference", "providerId": "redhat.maas", "connectionId": "maas-rhoai-dev", "sharedWithKaiden": true}
]
```
Note: workspace container label keys other than `ai.openkaiden.openshell-podman-gateway.port` are (unverified).

Sources:
- https://github.com/openkaiden/kaiden (README)
- https://github.com/openkaiden/kaiden/blob/main/packages/extension-api/src/extension-api.d.ts
- https://github.com/openkaiden/kaiden/blob/main/packages/api/src/agent-workspace-info.ts
- https://github.com/openkaiden/kaiden/blob/main/extensions/claude/src/claude-extension.ts
- https://github.com/openkaiden/kaiden/blob/main/extensions/openshell-podman-gateway/src/manager/gateway-container-manager.ts
- https://github.com/podman-desktop/podman-desktop/issues/19144
- https://github.com/openkaiden/artwork
