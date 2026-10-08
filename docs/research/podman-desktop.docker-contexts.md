# Docker context provider (one connection per `docker context`)

## 1. Identity
- **Display name:** Docker
- **Extension id:** `podman-desktop.docker` (built-in, `/home/astefani/github/podman-desktop/podman-desktop/extensions/docker/`)
- **Icon:** `/home/astefani/github/podman-desktop/podman-desktop/extensions/docker/packages/extension/icon.png`
- **Description:** Every Docker context on your machine (Docker Desktop, Rancher Desktop, Colima, remote engines) shows up as its own connection.

## 2. Real objects & fields
- **Already implemented (correction):** the built-in docker extension's `DockerDaemonMonitor` lists contexts via `DockerContextHandler.listContexts()` and registers **one container connection per live context**; `displayName` is `Docker` for `default`, else the context name. It **skips** non-`unix://`/`npipe://` endpoints (`tcp://`, `ssh://` → "unsupported endpoint"), skips contexts that are a Podman socket in disguise (`isDisguisedPodman`), marks registered-but-dead ones `stopped`, and disposes connections when the context disappears (e.g. Colima stop).
- **Type** (`extensions/docker/packages/api/src/docker-extension-api.d.ts`): `DockerContextInfo{name, isCurrentContext, metadata{description}, endpoints{docker{host}}}`; API `createContext(ctx)`, `removeContext(name)`.
- **Docker CLI:** `docker context ls --format json` → `{Name, Description, DockerEndpoint, Current, Error}`; store `~/.docker/contexts/meta/<sha256(name)>/meta.json` `{Name, Metadata{Description}, Endpoints{docker{Host, SkipTLSVerify}}}`; current context in `~/.docker/config.json` `currentContext` or `DOCKER_CONTEXT`.
- Typical Windows endpoints: `npipe:////./pipe/docker_engine` (Docker Desktop `desktop-linux` context: `npipe:////./pipe/dockerDesktopLinuxEngine`), Podman's `npipe:////./pipe/podman-machine-default`.

## 3. Placement
- **connections:** each context in the primary nav (provider-first UI); status from ping. Gaps to mock: `ssh://`/`tcp://` remote contexts (needs P1 canonical key), "Set as current context" menu, "Create context for this Podman machine" (exists via `createContext`). P#: **P1, P11**.

## 4. Journeys
1. **Coexistence on Windows.** Docker Desktop + Podman machine → nav shows `Docker` (default), `desktop-linux`, `podman-machine-default`; containers per connection.
2. **Context switch.** Connection menu "Make current Docker context" → `docker` CLI in terminal now targets Podman.
3. **Remote context:** `prod-ssh` (`ssh://ops@build01`) listed greyed "Remote SSH contexts not supported yet".

## 5. Sample data
```json
[
 {"Name":"default","Description":"Current DOCKER_HOST based configuration","DockerEndpoint":"npipe:////./pipe/docker_engine","Current":false,"status":"started"},
 {"Name":"desktop-linux","Description":"Docker Desktop","DockerEndpoint":"npipe:////./pipe/dockerDesktopLinuxEngine","Current":true,"status":"started"},
 {"Name":"podman","Description":"Podman machine podman-machine-default","DockerEndpoint":"npipe:////./pipe/podman-machine-default","Current":false,"skipped":"disguised podman"},
 {"Name":"rancher-desktop","Description":"Rancher Desktop moby context","DockerEndpoint":"npipe:////./pipe/docker_engine_rd","Current":false,"status":"stopped"},
 {"Name":"prod-ssh","Description":"Build host","DockerEndpoint":"ssh://ops@build01.acme.internal","Current":false,"skipped":"unsupported endpoint"}
]
```
