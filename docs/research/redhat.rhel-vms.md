# RHEL VMs (macadam)

## 1. Identity
- **Display name:** RHEL VMs
- **Extension id:** `redhat.rhel-vms` (real; `ext-rhel/package.json`, provider id `rhel-vms`)
- **Icon:** `/home/astefani/github/podman-desktop/ext-rhel/icon.png`
- **Description:** Create Red Hat Enterprise Linux VMs easily (macadam-managed, auto-registered).

## 2. Real objects & fields (`ext-rhel/src/extension.ts`, `package.json`)
- **Factory params:** `rhel-vms.factory.machine.name` (default `rhel`), `.image` enum `RHEL 10` | `RHEL 9` | `local image on disk` (default RHEL 10), `.image-path` (when local), `.force-download` (false), `.register` (true), `.cpus` (HOST_HALF_CPU_CORES), `.memory` (4000000000), `.diskSize` (100000000000), `.win.provider` enum `wsl` | `hyperv` (when WSL+Hyper-V both enabled). Mac → `applehv`; Linux → native (x64/arm64 images).
- **Machine (macadam `list --format json`):** `Name, Image, Running, Starting, CPUs, Memory, DiskSize, Port, RemoteUsername ("core"), IdentityPath, VMType`. Provider status `installed|configured|starting|ready`; connection status `started|stopped|starting|unknown`. VmProviderConnection with `shellAccess` (SSH terminal) and lifecycle start/stop/delete.
- **Register:** `macadam ssh <name> sudo subscription-manager register --force --activationkey podman-desktop --org <orgId>` (VM must be stopped first, then started).
- Only one VM supported in the POC (comment in `updateMachines`); mockup shows two to illustrate the target.

## 3. Placement
- **connections:** primary nav "RHEL VMs" provider → one **VM connection** per machine (status dot, CPU/mem/disk). Detail tabs: Summary, **Terminal** (shellAccess), Logs, **Subscription** (redhat-account, P14), **Advisor / Vulnerabilities** (R8, P14).
- **connectionFactories:** "Create virtual machine" (existing form). **menus:** Start/Stop/Delete/Open terminal/Register/"Copy SSH command". P#: **P1, P12, P14, P16** (P8-like VM connection type exists already).

## 4. Journeys
1. **Create RHEL 10 VM.** Create → name `rhel10-dev`, image RHEL 10, provider wsl, 4 CPU / 4 GB / 100 GB, register ☑ → steps: `Downloading image (cached? no)` → `Creating VM` → `Starting VM` → `Registering VM` → connection appears `started`. Failure: macadam `Error: machine "rhel10-dev" already exists`; or not signed in → "Red Hat sign-in required".
2. **Use local qcow2 from Image Builder / bootc.** image = local → pick `~/Downloads/composer-api-…-disk.qcow2` (from R5 or bootc build) → register off → VM running → Terminal tab `cat /etc/redhat-release`.
3. **Terminal + register later.** `rhel9-db` VM shows Subscription "Not registered" → Register → stop → start → register → Lightspeed tabs populate after first check-in (~2 min simulated).

## 5. Sample data
```json
[
  {"Name":"rhel10-dev","Image":"rhel10.tar.gz","VMType":"wsl","Running":true,"Starting":false,"CPUs":4,"Memory":"4096","DiskSize":"100","Port":0,"RemoteUsername":"core","IdentityPath":"C:\\Users\\alice\\.local\\share\\containers\\macadam\\machine\\machine","release":"Red Hat Enterprise Linux release 10.1 (Coughlan)","registered":true,"insightsId":"8a7c1d2e-3f40-4b5a-9c6d-7e8f9a0b1c2d","createdAt":"2026-09-18T08:21:00Z"},
  {"Name":"rhel9-db","Image":"rhel9.tar.gz","VMType":"hyperv","Running":false,"Starting":false,"CPUs":2,"Memory":"8192","DiskSize":"120","Port":50217,"RemoteUsername":"core","release":"Red Hat Enterprise Linux release 9.7 (Plow)","registered":false,"createdAt":"2026-07-02T14:05:12Z"},
  {"cache":[{"key":"RHEL 10","file":"rhel10.tar.gz","present":true},{"key":"RHEL 9","file":"rhel9.tar.gz","present":true}]},
  {"factoryDefaults":{"name":"rhel","image":"RHEL 10","register":true,"cpus":"HOST_HALF_CPU_CORES","memory":4000000000,"diskSize":100000000000,"winProvider":"wsl"}}
]
```
