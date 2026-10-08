# Dev Containers (`podman-desktop.devcontainers`, proposed)

Detect `.devcontainer/devcontainer.json` in projects, build and start them on Podman with the
Dev Containers CLI (`@devcontainers/cli` 0.89.0), and show them as first-class containers.

## Real objects (shapes in `data.ts`)
- **devcontainer.json** (containers.dev): `image`, `features` (OCI id → options), `forwardPorts`,
  `postCreateCommand`, `remoteUser`, `updateRemoteUserUID`, `runArgs`, `containerEnv`, `mounts`,
  `workspaceFolder`, `customizations.vscode.extensions`.
- **CLI**: `devcontainer up --workspace-folder ~/dev/acme-orders --docker-path podman [--remove-existing-container]`
  prints `{"outcome":"success","containerId","remoteUser","remoteWorkspaceFolder"}`.
- **Container labels** set by the CLI: `devcontainer.local_folder`, `devcontainer.config_file`,
  `devcontainer.metadata` (merged image + feature metadata JSON). Images `vsc-<name>-<hash>-features-uid`.
- Rootless Podman: `--userns=keep-id` + `updateRemoteUserUID`, `:Z` on bind mounts.

## Placement (P#)
| Contribution | Where | P# |
|---|---|---|
| `tools` `devcontainers` | Tools › Dev Containers: projects, JSON preview, wizard (`?open=1`) | P3 / P15 |
| `menus` toolbar | Containers list header "Open folder in dev container" | P14 |
| `commands` | Palette "Open folder in dev container" | P17 |
| `groupers` | `devcontainer.local_folder` → "acme-orders (dev container)" | P10 |
| `tabs` `devcontainer` | Container details › Dev Container (config, features, ports, lifecycle, metadata, Rebuild, Open in VS Code) | P14 |
| `cliTools` | Settings › CLI Tools › Dev Containers CLI 0.89.0 | P17 |
| `seed` | `inventory-service_devcontainer` EXITED + its image | – |

## Journeys
1. Containers › **Open folder in dev container** (or Tools › Dev Containers) → wizard (~/dev/acme-orders,
   keep-id) → **Start dev container** → task "devcontainer up acme-orders" ([1/4]…[4/4] + JSON outcome)
   → `acme-orders_devcontainer` RUNNING, ports 8080/5005, grouped "acme-orders (dev container)".
2. Container › Dev Container tab → features, `remoteUser vscode`, `postCreateCommand done (41 s)` → **Rebuild**.
3. `~/dev/inventory-service` (existing stopped container) → `devcontainer up` reuses and starts it,
   unless "Remove existing container" is checked.

## Mock decisions
- Rebuild keeps the container id (so the open details page stays valid); the real CLI replaces the container.
- `Browse…` cycles through the detected projects instead of opening a file dialog.
- The acme-orders container id starts with `8c41f0a2d9e7`, matching the dossier `upResult`.

## Sources
docs/research/podman-desktop.devcontainers.md (containers.dev JSON reference, devcontainers/cli v0.89.0,
devcontainers/features, VS Code rootless Podman notes).
