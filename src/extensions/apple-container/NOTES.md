# Apple container (`redhat.apple-container`)

Real extension: podman-desktop/extension-apple-container (v0.2.0-next). Catalog-only here; parity reference for WSLC.

## Real objects & fields
- Spawns bundled **socktainer** v1.5.0 (Docker-REST shim over Apple's `container` CLI 1.5.0) and registers `{name: 'Apple', type: 'docker', endpoint.socketPath: ~/.socktainer/container.sock}`; polls `container system status`.
- One lightweight Virtualization.framework VM **per container**. Capabilities: pods ✗, compose ✗, kube play ✗, build ✓.

## CLI
`container system start|stop|status`, `container ls|run|images|build`.

## Mock
- Connection `apple` (engine type `apple`, stopped, `resources` containers/images, hint `macOS`).
- Tab "Prerequisites": banner "Run `container system start`" + Start (starts the connection).
- Tab "Capabilities": reuses `../wslc/components/CapabilitiesTab.svelte` (only contributed here when WSLC is disabled, to avoid a duplicate tab).
- Seed: `web` (nginx:1.29 running), `redis` (valkey 9.1 stopped).

## Journeys
1. Extensions › Catalog › Install → Apple › Prerequisites → Start → connection started.
2. Capabilities: Apple vs WSLC vs Podman vs Docker.

## Placement + P#
connections, tabs — **P11** (both Apple and WSLC masquerade as `docker` today, hiding capability differences).

## Sources
`docs/research/podman-desktop.apple-container.md`, `docs/research/_windows-scenario.md`.
