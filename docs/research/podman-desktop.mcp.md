# MCP hub

## 1. Identity
- Display name: MCP Servers
- Extension id: `podman-desktop.mcp` (proposed). Core roadmap epic podman-desktop#19491 (H2CY26-Q1CY27) has a "Podman Desktop MCP Server" item (install from PD, list runtime resources, inspect-container, debug-container-failure, run-artifact-in-container) and "AI Skills" (#19442); Kaiden already ships `kaiden.mcp-registries` + core `MCPManager`.
- Icon: https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/docs/logo/light.svg (verified 200 image/svg+xml; `dark.svg` sibling)
- Description: Browse the official MCP registry, run MCP servers as Podman containers or local processes, and wire them into Claude Code, Cursor, VS Code and Kaiden agents.

## 2. Real objects / fields / enums
- Registry API: `GET https://registry.modelcontextprotocol.io/v0/servers?search=<q>&limit=<n>&cursor=<c>` (also `/v0.1/servers`, `version=latest`). Response `{servers:[{server, _meta}], metadata:{nextCursor, count}}`; `_meta["io.modelcontextprotocol.registry/official"] = {status: active|deprecated|deleted, publishedAt, updatedAt, statusChangedAt, isLatest}`.
- server.json (schema `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`): `name` (reverse-DNS, e.g. `io.github.containers/kubernetes-mcp-server`), `description`, `version`, `repository{url, source}`, `websiteUrl`, `packages[{registryType: npm|pypi|oci|nuget|mcpb, registryBaseUrl, identifier, version, runtimeHint (npx|uvx|docker|dnx), transport{type: stdio|streamable-http|sse, url?}, runtimeArguments[], packageArguments[], environmentVariables[{name, description, isRequired, isSecret, default, format}]}]`, `remotes[{type: streamable-http|sse, url, headers[{name, isRequired, isSecret}]}]`. Argument: `{type: named|positional, name, description, isRequired, format, default, placeholder}`.
- Real entries: `io.github.containers/kubernetes-mcp-server` (latest release v0.0.67, 2026-09-18; packages npm `kubernetes-mcp-server` stdio, pypi via `uvx`, oci `ghcr.io/containers/kubernetes-mcp-server:v0.0.59` streamable-http `http://localhost:8080/mcp` with `-v ~/.kube/config:/kubeconfig:ro -e KUBECONFIG=/kubeconfig -p 8080:8080`; also `quay.io/containers/kubernetes_mcp_server`). `io.github.manusa/podman-mcp-server` v0.0.15 (npm + pypi, stdio). `io.github.github/github-mcp-server` v0.26.1, remote streamable-http `https://api.githubcopilot.com/mcp/`, image `ghcr.io/github/github-mcp-server` (env `GITHUB_PERSONAL_ACCESS_TOKEN`). Filesystem: npm `@modelcontextprotocol/server-filesystem` (args: allowed dirs; registry name unverified). Red Hat: `ghcr.io/redhatinsights/red-hat-lightspeed-mcp` (RedHatInsights/insights-mcp, env `LIGHTSPEED_CLIENT_ID/SECRET` unverified), `ansible/aap-mcp-server`, `openshift/kubernetes-mcp-server` (downstream).
- Tools: kubernetes-mcp-server `configuration_view, namespaces_list, projects_list, events_list, pods_list, pods_list_in_namespace, pods_get, pods_log, pods_exec, pods_run, pods_delete, pods_top, resources_list, resources_get, resources_create_or_update, resources_delete, resources_scale, helm_install, helm_list, helm_uninstall` (+ toolsets kiali_*, vm_*, tekton_*). podman-mcp-server `container_list, container_inspect, container_logs, container_run, container_stop, container_remove, image_list, image_pull, image_push, image_build, image_remove, network_list, volume_list`. github: `get_issue, create_pull_request, search_code, list_workflow_runs` (subset).
- Client configs: Claude Desktop `claude_desktop_config.json` `{"mcpServers": {"<id>": {command, args, env}}}`; Claude Code `claude mcp add <name> [-s user|project] [-e K=V] -- <cmd> <args>` / `claude mcp add --transport http <name> <url>`, project `.mcp.json` (same `mcpServers` shape, http entries `{type:"http", url, headers}`); Cursor `~/.cursor/mcp.json` (`mcpServers`); VS Code `.vscode/mcp.json` `{"servers": {"<id>": {type: stdio|http, command, args, env | url}}, "inputs": [{type:"promptString", id, description, password:true}]}` referenced as `${input:id}`.
- Gateways: `docker/mcp-gateway` (`docker mcp gateway run`), Stacklok ToolHive (`thv run <server>`, unverified flags). Cluster: `MCPServer` CR, `apiVersion: mcp.x-k8s.io/v1beta1` (kubernetes-sigs/mcp-lifecycle-operator; OpenShift copy), `spec.source{type: ContainerImage, containerImage.ref}`, `spec.config.port: 8080`; plus `MCPGatewayBinding` (v1alpha1).
- Kaiden P9 `MCPManager`: `MCPServer{serverId, config: remote{index, headers} | package{index, runtimeArguments, packageArguments, environmentVariables}}`.

## 3. Placement in the mockup
- tools (P3): "MCP Servers" page in Tools group: tabs Installed / Registry catalog / Clients.
- connections: kind `service` (P8) per running MCP server (endpoint `http://localhost:8080/mcp`, transport, status); stdio servers shown as "local process".
- connectionFactories (P12/P18): "Install MCP server" wizard generated from `packages[]` (pick package type, fill `environmentVariables` with isSecret -> stored as Podman secret).
- navSections (P2) under kube context `rhoai-dev`, `when: crd.mcp.x-k8s.io/MCPServer` (P4 CRD list/watch): "MCP Servers" listing MCPServer CRs in `sam-ai`.
- tabs (P14): MCP connection detail: Tools (name + description list), Logs, Clients (which config files reference it); container detail "MCP" tab when image is a known MCP server.
- menus: row "Add to Claude Code / Cursor / VS Code / Kaiden", "Deploy to cluster" (MCPServer CR), "Copy config snippet". groupers (P10): label `io.modelcontextprotocol.server` (proposed) groups MCP containers.
- dashboardCards (P17): "MCP servers: 3 running, 41 tools". settings: registry URL list (official + private).

## 4. Journeys
1. Install kubernetes-mcp-server as a container: Tools > MCP Servers > Registry, search "kubernetes" -> card io.github.containers/kubernetes-mcp-server 0.0.67 -> Install, choose OCI package, mount kubeconfig, read-only toggle -> task "Starting kubernetes-mcp-server" (log: `podman pull quay.io/containers/kubernetes_mcp_server:v0.0.67`, `podman run -d -p 8080:8080 -v ~/.kube/config:/kubeconfig:ro ...`, `initialize ok, protocolVersion 2025-11-25`, `tools/list -> 22 tools`; ~12s) -> new container + service connection "kubernetes-mcp-server" with Tools tab.
2. Wire into Claude Code: Installed row kebab > "Add to client" > Claude Code (project scope, ~/src/acme-support-assistant) -> task "Updating .mcp.json" (1s, shows diff) -> Clients tab shows Claude Code, Kaiden (`acme-support-cc` workspace) and VS Code status.
3. Deploy to cluster: row > "Deploy to rhoai-dev" -> preview MCPServer YAML in `sam-ai` -> task "Applying MCPServer kubernetes-mcp" (`kubectl apply`, `Ready=True` after 20s) -> appears in the rhoai-dev "MCP Servers" nav section with route URL.

## 5. Sample data
```json
[
  {"server": {"name": "io.github.containers/kubernetes-mcp-server", "version": "0.0.67", "description": "A Model Context Protocol (MCP) server for Kubernetes and OpenShift", "repository": {"url": "https://github.com/containers/kubernetes-mcp-server", "source": "github"}, "packages": [{"registryType": "oci", "identifier": "quay.io/containers/kubernetes_mcp_server:v0.0.67", "runtimeHint": "docker", "transport": {"type": "streamable-http", "url": "http://localhost:8080/mcp"}}, {"registryType": "npm", "identifier": "kubernetes-mcp-server", "version": "0.0.67", "transport": {"type": "stdio"}}]}, "_meta": {"io.modelcontextprotocol.registry/official": {"status": "active", "publishedAt": "2026-09-18T14:02:11Z", "isLatest": true}}},
  {"server": {"name": "io.github.manusa/podman-mcp-server", "version": "0.0.15", "description": "MCP server for Podman and Docker", "packages": [{"registryType": "npm", "identifier": "podman-mcp-server", "version": "0.0.15", "transport": {"type": "stdio"}}]}},
  {"server": {"name": "io.github.github/github-mcp-server", "version": "0.26.1", "remotes": [{"type": "streamable-http", "url": "https://api.githubcopilot.com/mcp/", "headers": [{"name": "Authorization", "isRequired": true, "isSecret": true}]}], "packages": [{"registryType": "oci", "identifier": "ghcr.io/github/github-mcp-server:0.26.1", "transport": {"type": "stdio"}, "environmentVariables": [{"name": "GITHUB_PERSONAL_ACCESS_TOKEN", "isRequired": true, "isSecret": true}]}]}},
  {"server": {"name": "io.github.modelcontextprotocol/server-filesystem", "version": "2026.7.1", "packages": [{"registryType": "npm", "identifier": "@modelcontextprotocol/server-filesystem", "transport": {"type": "stdio"}, "packageArguments": [{"type": "positional", "value": "/home/sam/src/acme-support-assistant"}]}]}},
  {"server": {"name": "com.redhat/lightspeed-mcp", "version": "0.3.0", "packages": [{"registryType": "oci", "identifier": "ghcr.io/redhatinsights/red-hat-lightspeed-mcp:latest", "transport": {"type": "stdio"}, "environmentVariables": [{"name": "LIGHTSPEED_CLIENT_ID", "isRequired": true}, {"name": "LIGHTSPEED_CLIENT_SECRET", "isRequired": true, "isSecret": true}]}]}},
  {"installed": "kubernetes-mcp-server", "kind": "container", "containerId": "9c2e71ab04f3", "endpoint": "http://localhost:8080/mcp", "status": "running", "tools": 22, "clients": ["claude-code", "kaiden"], "startedAt": "2026-10-08T08:10:33Z"},
  {"installed": "podman-mcp-server", "kind": "process", "command": "npx", "args": ["-y", "podman-mcp-server@0.0.15"], "status": "running", "tools": 13, "clients": ["cursor"]},
  {"tool": "pods_list_in_namespace", "server": "kubernetes-mcp-server", "description": "List all the Kubernetes pods in the specified namespace", "inputSchema": {"namespace": "string"}},
  {"tool": "container_logs", "server": "podman-mcp-server", "description": "Displays the logs of a Podman or Docker container", "inputSchema": {"name": "string"}},
  {"client": "claude-code", "file": "/home/sam/src/acme-support-assistant/.mcp.json", "content": {"mcpServers": {"kubernetes": {"type": "http", "url": "http://localhost:8080/mcp"}}}},
  {"client": "vscode", "file": "/home/sam/src/acme-support-assistant/.vscode/mcp.json", "content": {"inputs": [{"type": "promptString", "id": "gh-pat", "description": "GitHub PAT", "password": true}], "servers": {"github": {"type": "http", "url": "https://api.githubcopilot.com/mcp/", "headers": {"Authorization": "Bearer ${input:gh-pat}"}}}}},
  {"apiVersion": "mcp.x-k8s.io/v1beta1", "kind": "MCPServer", "metadata": {"name": "kubernetes-mcp", "namespace": "sam-ai"}, "spec": {"source": {"type": "ContainerImage", "containerImage": {"ref": "quay.io/containers/kubernetes_mcp_server:v0.0.67"}}, "config": {"port": 8080}}, "status": {"conditions": [{"type": "Ready", "status": "True"}]}}
]
```
Unverified in sample: filesystem and Red Hat Lightspeed registry names/versions, Lightspeed env var names, oci tag `v0.0.67` on quay, protocolVersion string.

Sources:
- https://registry.modelcontextprotocol.io/v0/servers?search=kubernetes-mcp-server
- https://github.com/modelcontextprotocol/registry (server.json schema docs)
- https://github.com/containers/kubernetes-mcp-server
- https://github.com/manusa/podman-mcp-server
- https://github.com/github/github-mcp-server
- https://github.com/RedHatInsights/insights-mcp, https://github.com/ansible/aap-mcp-server
- https://github.com/kubernetes-sigs/mcp-lifecycle-operator (config/samples/mcp_v1beta1_mcpserver.yaml)
- https://code.visualstudio.com/docs/copilot/chat/mcp-servers, https://docs.anthropic.com/en/docs/claude-code/mcp, https://docs.cursor.com/context/model-context-protocol
- https://github.com/podman-desktop/podman-desktop/issues/19491
- https://github.com/openkaiden/kaiden/blob/main/packages/extension-api/src/extension-api.d.ts
