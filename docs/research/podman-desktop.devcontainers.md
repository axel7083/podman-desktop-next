# Dev Containers

## 1. Identity
- **Display name:** Dev Containers
- **Extension id:** `podman-desktop.devcontainers` (proposed community id; no existing PD extension)
- **Icon:** https://raw.githubusercontent.com/devcontainers/devcontainers.github.io/gh-pages/img/devcontainers-logo.png (verified 200 `image/png`)
- **Description:** Detect `.devcontainer/devcontainer.json` in your projects, build and start them on Podman with the Dev Containers CLI, and see them as first-class containers.

## 2. Real objects & fields
- **Spec / CLI:** containers.dev spec; `@devcontainers/cli` **v0.89.0** (latest tag). Commands: `devcontainer up --workspace-folder ~/dev/acme-orders [--docker-path podman] [--remove-existing-container]`, `devcontainer exec --workspace-folder . mvn quarkus:dev`, `devcontainer build --workspace-folder . --image-name acme-orders-devc`, `devcontainer read-configuration`, `devcontainer features test|package|publish`, `devcontainer templates apply`. `up` prints JSON `{"outcome":"success","containerId","remoteUser","remoteWorkspaceFolder"}`.
- **devcontainer.json fields:** `name`, `image` | `build.{dockerfile, context, args, target}` | `dockerComposeFile` + `service` + `runServices`; `features` (map id -> options), `forwardPorts`, `portsAttributes`, `postCreateCommand`, `postStartCommand`, `postAttachCommand`, `initializeCommand`, `customizations.vscode.{extensions, settings}`, `remoteUser`, `containerUser`, `updateRemoteUserUID`, `mounts`, `runArgs`, `containerEnv`, `remoteEnv`, `workspaceFolder`, `workspaceMount`, `shutdownAction` (`none|stopContainer|stopCompose`), `hostRequirements`.
- **Labels set on created containers:** `devcontainer.local_folder=/home/maya/dev/acme-orders`, `devcontainer.config_file=/home/maya/dev/acme-orders/.devcontainer/devcontainer.json`, `devcontainer.metadata=[{...merged image+feature metadata JSON...}]`. Images built by the CLI are named `vsc-acme-orders-<hash>-features` (and `-uid`).
- **Features (OCI artifacts in GHCR):** `ghcr.io/devcontainers/features/java:1` (`version`, `installMaven`, `installGradle`), `node:1`, `docker-in-docker:2`, `docker-outside-of-docker:1`, `git:1`, `github-cli:1`, `kubectl-helm-minikube:1`, `common-utils:2`, `ghcr.io/devcontainers-extra/features/quarkus-cli` (community, unverified id).
- **Base images:** `mcr.microsoft.com/devcontainers/java:21` (also `:1-21-bookworm`), `mcr.microsoft.com/devcontainers/base:ubuntu`, `mcr.microsoft.com/devcontainers/typescript-node:22`; Red Hat alternative `registry.access.redhat.com/ubi9/openjdk-21` (needs `common-utils`).
- **Podman specifics:** VS Code setting `"dev.containers.dockerPath": "podman"` (and `dockerComposePath`); rootless needs `"runArgs": ["--userns=keep-id"]` + `"containerUser": "vscode"` / `"updateRemoteUserUID": true`, and SELinux `:Z` on bind mounts (`"workspaceMount": "source=${localWorkspaceFolder},target=/workspaces/acme-orders,type=bind,Z"`). `docker-in-docker` does not work rootless; prefer mounting the Podman socket.

## 3. Placement
- **project/workspace (P15):** detect `.devcontainer/devcontainer.json` in `~/dev/acme-orders`, show "Dev container" badge, link the resulting container via `devcontainer.local_folder` label.
- **groupers (P10):** group containers by `devcontainer.local_folder` -> group header "acme-orders (dev container)".
- **tabs (P14):** container detail "Dev Container" tab (config path, features, forwarded ports, lifecycle command status, parsed `devcontainer.metadata`).
- **menus:** project "Reopen/Start in dev container", container kebab "Rebuild dev container", "Open in VS Code", "Exec terminal as remoteUser".
- **cliTools:** `devcontainer` CLI install/update. **tasks (P15):** `devcontainer up`, `build`, rebuild. **settings:** default `--docker-path podman`, add `--userns=keep-id` automatically. **P7:** features listed as OCI artifacts (`podman artifact`) in an "OCI artifacts" view.

## 4. Journeys
1. **Start acme-orders in a dev container.** Projects -> acme-orders (badge "devcontainer.json") -> "Start dev container" -> task "devcontainer up" (log: `[1/4] Resolving features java:1, node:1`, `[2/4] Building vsc-acme-orders-5f2c...-features`, `[3/4] Starting container`, `[4/4] postCreateCommand: mvn -q dependency:go-offline`; ~95 s) -> new container `acme-orders_devcontainer-app-1` grouped under "acme-orders (dev container)", ports 8080/5005 forwarded.
2. **Inspect & exec.** Container -> Dev Container tab -> sees features, `remoteUser: vscode`, lifecycle `postCreateCommand: done (41 s)` -> "Exec as vscode" opens terminal in `/workspaces/acme-orders`.
3. **Rebuild after editing features.** Add `ghcr.io/devcontainers/features/github-cli:1` -> stale banner "config changed" -> Rebuild -> task "devcontainer up --remove-existing-container" (~60 s) -> container replaced, new image tag.

## 5. Sample data
```json
{
  "devcontainerJson": {
    "name": "acme-orders",
    "image": "mcr.microsoft.com/devcontainers/java:21",
    "features": {
      "ghcr.io/devcontainers/features/java:1": {"version": "21", "installMaven": "true"},
      "ghcr.io/devcontainers/features/node:1": {"version": "22"}
    },
    "forwardPorts": [8080, 5005],
    "postCreateCommand": "mvn -q dependency:go-offline",
    "customizations": {"vscode": {"extensions": ["redhat.java", "redhat.vscode-quarkus", "redhat.vscode-kaoto"]}},
    "remoteUser": "vscode",
    "updateRemoteUserUID": true,
    "runArgs": ["--userns=keep-id"],
    "containerEnv": {"QUARKUS_DATASOURCE_JDBC_URL": "jdbc:postgresql://host.containers.internal:5432/orders"},
    "mounts": ["source=${localEnv:HOME}/.m2,target=/home/vscode/.m2,type=bind,Z"],
    "workspaceFolder": "/workspaces/acme-orders"
  },
  "upResult": {"outcome": "success", "containerId": "8c41f0a2d9e7", "remoteUser": "vscode", "remoteWorkspaceFolder": "/workspaces/acme-orders"},
  "containers": [
    {"Id": "8c41f0a2d9e7", "Names": ["acme-orders_devcontainer"], "Image": "vsc-acme-orders-5f2c9e1b-features-uid", "State": "running", "Created": "2026-10-08T08:12:44Z",
     "Labels": {"devcontainer.local_folder": "/home/maya/dev/acme-orders", "devcontainer.config_file": "/home/maya/dev/acme-orders/.devcontainer/devcontainer.json", "devcontainer.metadata": "[{\"id\":\"ghcr.io/devcontainers/features/java:1\"},{\"remoteUser\":\"vscode\"},{\"postCreateCommand\":\"mvn -q dependency:go-offline\"}]"}},
    {"Id": "3b7d2e19ac04", "Names": ["inventory-service_devcontainer"], "Image": "vsc-inventory-service-a81d07c3-uid", "State": "exited", "Created": "2026-09-29T14:03:10Z",
     "Labels": {"devcontainer.local_folder": "/home/maya/dev/inventory-service", "devcontainer.config_file": "/home/maya/dev/inventory-service/.devcontainer/devcontainer.json"}}
  ],
  "features": [
    {"id": "ghcr.io/devcontainers/features/java:1", "version": "1.6.3", "digest": "sha256:4e1a9c"},
    {"id": "ghcr.io/devcontainers/features/node:1", "version": "1.6.2", "digest": "sha256:b70f2d"},
    {"id": "ghcr.io/devcontainers/features/github-cli:1", "version": "1.0.14", "digest": "sha256:91cd3e"},
    {"id": "ghcr.io/devcontainers/features/docker-outside-of-docker:1", "version": "1.6.1", "digest": "sha256:2a5f80"}
  ]
}
```

## Sources
- https://containers.dev/implementors/json_reference/
- https://containers.dev/features
- https://github.com/devcontainers/cli (tags v0.89.0)
- https://github.com/devcontainers/features/tree/main/src/java
- https://github.com/devcontainers/images/tree/main/src/java
- https://code.visualstudio.com/remote/advancedcontainers/docker-options (Podman `dockerPath`)
- https://github.com/microsoft/vscode-remote-release/wiki/Rootless-Podman (keep-id, unverified URL)
