# podman-desktop.mcp – MCP hub (proposed)

- **Real objects**: official registry `server.json` (name, version, packages[registryType oci|npm, transport stdio|streamable-http], remotes), kubernetes-mcp-server 0.0.67 tools, client configs (`.mcp.json` / `claude mcp add`, `.vscode/mcp.json` `servers`, `~/.cursor/mcp.json`), `MCPServer` CR `mcp.x-k8s.io/v1beta1`.
- **Placement**: "MCP gateway" service connection (P8); "MCP servers" tool (P3) with Installed / Registry / Clients; server details with tools; "Add to client" config diff; "Deploy to rhoai-dev" → MCPServer section under clusters with the CRD (P2/P4); container grouper (P10).
- **Journey**: Registry search "kubernetes" → Install (OCI, kubeconfig read-only) → `tools/list → 22 tools` → Add to Claude Code / VS Code → Deploy to rhoai-dev.
- **Sources**: docs/research/podman-desktop.mcp.md.
