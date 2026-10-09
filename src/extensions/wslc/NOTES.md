# WSL Containers (`podman-desktop.wslc`)

Proposed provider for Microsoft's built-in container engine (`wslc.exe`, GA 2026-09-29 in WSL 3.0.1).

## Real objects & fields
- **Session** (per-user `wslcsession.exe`, own Hyper-V VM, VHD under `%AppData%\Local\wslc\sessions`, default 2 vCPU / 2 GB / 32 GB) → images, containers, networks, volumes (virtiofs or VHD) → processes.
- Networking "Consommé": traffic exits as the user's Windows process (VPN friendly). GPU via CDI `/dev/dxg`.
- No Docker-compatible socket at GA; Compose is "top priority post-GA".

## CLI / API
- `wslc run -d -p 8080:80 --name web nginx`, `wslc container ls|stop|rm|logs|exec|inspect`, `wslc image ls|pull|build`, `wslc session shell`, `wslc system info`.
- NuGet `Microsoft.WSL.Containers`: `WslcService.GetMissingComponents()`, `new Session(new SessionSettings(name, path){CpuCount, MemoryMB}).Start()`, `session.CreateContainer(...)`.

## Mock
- Connections `wslc-default` (started) and `wslc-ai-gpu` (stopped, GPU), engine type `wslc`, `resources` = containers/images/volumes/networks (no Pods/Secrets).
- Factory "Create WSLC session" (name, CPU, memory, storage path, GPU).
- Tab "Capabilities" on every engine (Podman / Docker / WSLC / Apple container matrix, current column highlighted, limitation banner).
- Container kebab "Recreate on Podman" (dialog with copied run args, target engine, shifted ports → task → new container) and "Open in Windows Terminal".
- Dashboard card (WSL 3.0.1 detected, sessions, VPN hint), CLI tool `wslc` 3.0.1.

## Journeys
1. Dashboard detects WSLC → `WSLC default` in Engines → containers only (no Pods).
2. Capabilities tab explains Compose/pods/socket gaps honestly.
3. `web` → Recreate on Podman → same ports/env on `podman-machine-default`, optionally stop the WSLC copy.

## Placement + P#
connections, connectionFactories, tabs, menus, cliTools, dashboardCards — **P1, P11** (open engine type + capability flags).

## Sources
`docs/research/microsoft.wslc.md`, `docs/research/_windows-scenario.md`.
