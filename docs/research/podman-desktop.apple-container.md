# Apple container provider (parity reference for WSLC)

## 1. Identity
- **Display name:** Apple container
- **Extension id:** `redhat.apple-container` (package `apple-container`, publisher `redhat`, v0.2.0-next; [podman-desktop/extension-apple-container](https://github.com/podman-desktop/extension-apple-container))
- **Icon:** `../ext-apple-container/icon.png`
- **Description:** List/manage Apple containers on macOS (Apple silicon only).

## 2. Real objects & fields
- **How it works (read from `src/manager/container-provider-manager.ts`):** spawns bundled **[socktainer](https://github.com/socktainer/socktainer)** (v1.5.0, 2026-10-04), a Docker-REST-compatible shim over Apple's `container` CLI ([apple/container](https://github.com/apple/container) 1.5.0, 2026-09-29), then registers `{name:'Apple', type:'docker', endpoint:{socketPath:'~/.socktainer/container.sock'}}` after a fixed 2 s wait; polls `container system status` and sets provider `stopped` when the system service is down. Prereq: `container system start`.
- Apple model: one lightweight VM **per container** (Virtualization.framework), `container ls|run|images|build|system start/stop/status`.
- **Parity lesson for WSLC:** both engines lack a native Docker socket → shim pattern (socktainer ⇄ a `wslc` shim); both currently masquerade as `type: 'docker'`, hiding capability differences (no pods, no compose, no kube play) → **P11** (open engine type + capabilities).

## 3. Placement
- **connections:** single `Apple` connection (macOS). Mock a capability badge row ("VM-per-container", "no pods"). P#: **P11**.

## 4. Journeys
1. **Enable.** Install extension → banner "Run `container system start`" → Start → connection `Apple` started → containers listed.
2. **Parity table** (Windows scenario cross-check): Apple vs WSLC vs Podman capability matrix in Settings › Resources.

## 5. Sample data
```json
{"connection":{"name":"Apple","type":"docker","endpoint":{"socketPath":"/Users/alice/.socktainer/container.sock"},"status":"started","socktainer":"v1.5.0","container":"1.5.0"},
 "containers":[{"name":"web","image":"docker.io/library/nginx:1.29","state":"running","ip":"192.168.64.3","cpus":4,"memory":"1G"},{"name":"redis","image":"docker.io/valkey/valkey:9.1","state":"stopped"}],
 "capabilities":{"pods":false,"compose":false,"kubePlay":false,"build":true,"vmPerContainer":true}}
```
