# RHEL Podman machine (R4) — "Create RHEL Podman machine"

## 1. Identity
- **Display name:** RHEL Podman machine (contribution of RHEL VMs; surfaced inside the Podman provider)
- **Extension id:** `redhat.rhel-vms` (real ext, new `connectionFactories` entry); depends on `redhat.redhat-authentication` and built-in `podman-desktop.podman` (needs **P18** `createMachine`)
- **Icon:** `../ext-rhel/icon.png` (RHEL hat) badged on the Podman connection
- **Description:** One-click Podman engine running RHEL 9/10 (WSL, Hyper-V or applehv), registered with your subscription.

## 2. Real objects & fields
- **Official images** (`ext-rhel/src/images.ts`): download by SHA via `GET https://api.access.redhat.com/management/v1/images/{checksum}/download` (`rh-api-sm.ts`, `authentication.ts:34`):
  - wsl RHEL 10.1 `e1871004d0075e0ce10cfb4c1aae7c1fb56cf2162e9d494d1f9c9d061902fec6`, RHEL 9.7 `bf4fa1142e0090e7f6fe163bf03d5f0de12ebafce02d4f8ea71dd5de3f1769c8`
  - applehv/arm64 10.1 `a522f6ab…5bcf`, 9.7 `e424cba7…d877`; linux x64 10.1 `dc74ad1a…9bae`, 9.7 `e89e0a3e…0047`
  - **no `hyperv` entry** → throws `provider hyperv is not supported` (real bug). Note: UBI tags are now 9.8 / 10.2 (Pyxis, 2026-10) so the hard-coded 9.7/10.1 are one minor behind → mockup can show "RHEL 9.8 available".
- **Cache** (`cache.ts`): `<storagePath>/images/rhel9.tar.gz|rhel10.tar.gz` on Windows, `.qcow2` elsewhere; others deleted on init.
- **Custom compose path** (blog 2024-08-01): Image Builder blueprint `rhel-wsl`, target `wsl` (.tar.gz), packages `podman podman-docker procps-ng openssh-server net-tools iproute dhcp-client sudo systemd-networkd` (last from EPEL 9 `https://dl.fedoraproject.org/pub/epel/9/Everything/x86_64/`), activation key, OpenSCAP unsupported for WSL; RHEL 10 failed on WSL (nftables kernel).
- **Podman machine init:** `podman machine init --image <path> --cpus N --memory MiB --disk-size GiB [--rootful] <name>`; providers `wsl|hyperv|applehv|libkrun` (`CONTAINERS_MACHINE_PROVIDER`).
- **Register:** `podman machine ssh <name> sudo subscription-manager register --force --activationkey podman-desktop --org <orgId>`.

## 3. Placement
- **connectionFactories:** Podman provider "Create" splits into *Podman machine* / **RHEL Podman machine** (P18, P12 prefilled params). Also an onboarding card on Dashboard for signed-in RH users on Windows.
- Result is a normal **Podman connection** (`rhel-9`) with RHEL badge, Subscription tab (from redhat-account, P14) and Lightspeed Advisor badge (R8). P#: **P18, P16, P11, P14, P15**.

Wizard fields: Name `rhel-9` · Release `RHEL 9.7` | `RHEL 10.1` (10 shows warning on WSL kernel < 6.6) · Source `Official RHEL for WSL image` | `Custom Image Builder compose` (picks blueprint/compose from R5) | `Local file…` · Provider `WSL` | `Hyper-V` | `applehv` · CPUs (default host/2) · Memory 4 GB · Disk 100 GB · Rootful ☐ · Auto-register with activation key [`podman-desktop` ▾] ☑ · Set as default connection ☐.

## 4. Journeys (task steps)
1. **Official image on WSL (happy path).** Steps: `Download rhel9.tar.gz (812 MB)` progress → `Verify sha256 bf4fa114…69c8` ✓ → `podman machine init --image …\rhel9.tar.gz rhel-9` → `Provision podman, openssh-server (dnf)` → `podman machine start rhel-9` → `subscription-manager register` ✓ "registered with ID a83b51f0…" → toast "rhel-9 is ready" + "Set as default?". Total ≈ 3 min simulated 15 s.
2. **Custom compose.** Source = Custom → pick blueprint `rhel-wsl-podman` → compose status `pending → building → uploading → success` (R5) → continues at Verify. Failure: compose `failure` "depsolve: package systemd-networkd not found (EPEL repo missing)" → "Edit blueprint" CTA.
3. **Failures to simulate:** sha256 mismatch → "Image corrupt, re-download" (force-download); Hyper-V chosen → "No official Hyper-V image; use Custom compose"; RHEL 10 on WSL → `nft: Protocol not supported` in machine start → "Use RHEL 9"; register `422 activation key not found`; not signed in → inline Sign-in button.

## 5. Sample data
```json
{
  "images":[
    {"release":"RHEL 9.7","provider":"wsl","sha256":"bf4fa1142e0090e7f6fe163bf03d5f0de12ebafce02d4f8ea71dd5de3f1769c8","file":"rhel9.tar.gz","size":851443712,"cached":true,"cachedAt":"2026-09-12T10:03:41Z"},
    {"release":"RHEL 10.1","provider":"wsl","sha256":"e1871004d0075e0ce10cfb4c1aae7c1fb56cf2162e9d494d1f9c9d061902fec6","file":"rhel10.tar.gz","size":903872512,"cached":false},
    {"release":"RHEL 9.7","provider":"applehv","sha256":"e424cba737c5d6315160111043f40108b3bc458c09c937454a3331c52503d877","file":"rhel9.qcow2","size":1073741824,"cached":false},
    {"release":"RHEL 10.1","provider":"applehv","sha256":"a522f6abacab1c5804477332bbd14a467c3f9812d3f2c46ee05c71b07df05bcf","file":"rhel10.qcow2","size":1137704960,"cached":false},
    {"release":"RHEL 9.7","provider":"hyperv","sha256":null,"supported":false}
  ],
  "machines":[
    {"Name":"podman-machine-default","VMType":"wsl","Image":"fedora-coreos-42","CPUs":4,"Memory":"8192","DiskSize":"100","Running":true,"Default":true,"rhel":false},
    {"Name":"rhel-9","VMType":"wsl","Image":"rhel9.tar.gz","CPUs":4,"Memory":"4096","DiskSize":"100","Running":true,"Default":false,"rhel":{"release":"9.7","registered":true,"consumerUuid":"a83b51f0-77c2-4f0e-8e11-6e2f4a9b0c21","podman":"5.6.0"}}
  ],
  "createTask":{"id":"task-r4-0007","title":"Create RHEL Podman machine rhel-9","steps":[
    {"name":"Download rhel9.tar.gz","status":"done","bytes":851443712},
    {"name":"Verify sha256","status":"done"},
    {"name":"podman machine init","status":"done","cmd":"podman machine init --image C:\\Users\\alice\\AppData\\Roaming\\Podman Desktop\\extensions-storage\\redhat.rhel-vms\\images\\rhel9.tar.gz --cpus 4 --memory 4096 --disk-size 100 rhel-9"},
    {"name":"Provision podman/openssh","status":"done"},
    {"name":"podman machine start","status":"done"},
    {"name":"Register subscription (podman-desktop)","status":"running"}
  ]}
}
```
