# WSL Containers (WSLC / `wslc.exe`) provider (O2, roadmap)

## 1. Identity
- **Display name:** WSL Containers
- **Extension id:** `podman-desktop.wslc` (proposed; tracked in [Adding support of WSLC on Windows #18348](https://github.com/podman-desktop/podman-desktop/issues/18348), open)
- **Icon:** https://github.com/microsoft.png (WSL has no separate logo asset; use the Tux-on-Windows glyph from learn.microsoft.com WSL docs if licensed)
- **Description:** See and manage the Linux containers you run with Microsoft's built-in `wslc` engine next to your Podman machines.

## 2. Real objects & fields
- **Status: GA** on **2026-09-29** in WSL **3.0.1** ([release](https://github.com/microsoft/WSL/releases/tag/3.0.1), [Learn: WSL container](https://learn.microsoft.com/en-us/windows/wsl/wsl-container)); public preview started 2026-07-02 (WSL 2.9.x pre-release); 3.0.2 pre-release 2026-10-05. Requires WSL ≥ 2.9.3 (`wsl --update`).
- **CLI** (`wslc.exe`, alias `container.exe`): groups `container`, `image`, `volume`, `network`, `session`, `registry`, `system`. Examples: `wslc run --rm -it -d -p 8080:80 --name web nginx`, `wslc container ps|list|stop|restart|rm|cp|logs|exec|inspect --size`, `wslc image ls|pull|push|build|prune -f`, `wslc system info`, `wslc session shell`, network connect/disconnect, events, health checks (2.9.11–3.0 changelogs).
- **Object model:** `Session` (per-user `wslcsession.exe`, own Hyper-V VM, state VHD under `%AppData%\Local\wslc\sessions`, default 2 vCPU / 2 GB / 32 GB) → images, `Container`, networks, volumes (virtiofs or VHD-backed) → `Process`. Privileged `wslservice.exe` creates VMs via HCS. Networking "Consommé" (traffic exits as the user's Windows process — VPN friendly). GPU via CDI `/dev/dxg`.
- **API:** NuGet `Microsoft.WSL.Containers` (C#, C++/WinRT preview, C): `WslcService.GetMissingComponents()`, `new Session(new SessionSettings("MyApp", @"C:\WslcData"){CpuCount, MemoryMB}).Start()`, `session.PullImageAsync(...)`, `session.CreateContainer(ContainerSettings{Name, InitProcess})`, `container.Start/Stop/Delete`, `session.Terminate()`.
- **Gap:** no documented Docker-compatible `DOCKER_HOST` socket/pipe for third parties at GA; Compose is "top priority post-GA". So PD needs either a CLI-driven provider or a socktainer-style shim (C# helper on `Microsoft.WSL.Containers` exposing a Docker API npipe).

## 3. Placement
- **connections:** provider `wslc` with one connection per WSLC **session** (P11: `ContainerProviderConnection.type` must open beyond `'docker'|'podman'`; capability flags: no pods, no kube play, no compose yet). **connectionFactories:** "New WSLC session" (CPU/RAM/storage path). **cliTools:** `wslc` detection via `wsl --version`. **menus:** container "Open in Windows Terminal (`wslc exec`)". P#: **P1, P11**.

## 4. Journeys
1. **Detect.** Windows 11 with WSL 3.0.1 → Dashboard card "WSL Containers detected (session `default`, 3 containers)" → Enable → connection appears under Windows engines.
2. **Mixed engines.** Containers list scoped to `wslc/default` shows `web` (nginx) running; capability banner "Pods and Compose not supported by this engine".
3. **Move workload.** `web` → "Recreate on podman-machine-default" (copies run args) → compare.

## 5. Sample data
```json
{"wsl":{"version":"3.0.1","kernel":"6.6.87.2-1","wslcAvailable":true},
 "sessions":[{"name":"default","state":"Running","cpuCount":2,"memoryMB":2048,"vhd":"C:\\Users\\alice\\AppData\\Local\\wslc\\sessions\\default\\session.vhdx","sizeGB":32},
             {"name":"ai-gpu","state":"Stopped","cpuCount":8,"memoryMB":16384,"gpu":true}],
 "containers":[
  {"session":"default","id":"8c1f2e9a4b7d","name":"web","image":"docker.io/library/nginx:1.29","status":"running","ports":["0.0.0.0:8080->80/tcp"],"created":"2026-10-08T08:02:11Z"},
  {"session":"default","id":"1a2b3c4d5e6f","name":"pg","image":"docker.io/library/postgres:16","status":"running","ports":["5433->5432/tcp"],"health":"healthy"},
  {"session":"default","id":"9f8e7d6c5b4a","name":"hello","image":"docker.io/library/alpine:latest","status":"exited","exitCode":0}],
 "images":[{"session":"default","repository":"nginx","tag":"1.29","sizeMB":192},{"session":"default","repository":"postgres","tag":"16","sizeMB":438},{"session":"default","repository":"alpine","tag":"latest","sizeMB":8}],
 "volumes":[{"session":"default","name":"pgdata","driver":"vhd","sizeGB":4}]}
```
