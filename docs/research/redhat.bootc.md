# Bootable Container (bootc)

## 1. Identity
- **Display name:** Bootable Container
- **Extension id:** `redhat.bootc` (real; `ext-bootc/packages/backend/package.json`)
- **Icon:** `../ext-bootc/packages/backend/icon.png` (+ frontend `ext-bootc/packages/frontend/src/lib/bootc-icon.png`)
- **Description:** Support for bootable OS containers (bootc) and generating disk images.

## 2. Real objects & fields
- **BootcBuildInfo** (`packages/shared/src/models/bootc.ts`): `id, image, imageId, tag, engineId, type: BuildType[], folder, chown?, buildConfig?, buildConfigFilePath?, filesystem? (xfs|ext4|btrfs), arch? (amd64|arm64), status, timestamp, buildContainerId, awsAmiName?, awsBucket?, awsRegion?`.
- **BuildType:** `qcow2 | ami | raw | vmdk | anaconda-iso | vhd | gce` (spec asked "iso" = `anaconda-iso`). **BootcBuildStatus:** `running | creating | success | error | lost | deleting`.
- **BuildConfig** (bootc-image-builder TOML/JSON): `user[{name,password,key,groups}], filesystem[{mountpoint,minsize}], kernel{append}, anacondaIsoInstallerKickstartFilePath, anacondaIsoInstallerModules{enable,disable}`.
- **Builders** (`backend/src/constants.ts`): `quay.io/centos-bootc/bootc-image-builder@sha256:c2d683…`, `registry.redhat.io/rhel9/bootc-image-builder:9.7`, `registry.redhat.io/rhel10/bootc-image-builder:10.1`.
- **Examples** (`backend/assets/examples.json`): fedora-httpd, fedora-tailscale, fedora-podman-systemd, fedora-qemu-agent, fedora-wifi, fedora-kernel-module. **New presets (R7):** RHEL 10 base `registry.redhat.io/rhel10/rhel-bootc:10.1`, MicroShift-on-bootc (`FROM rhel-bootc:9.7` + `dnf install microshift`), **RHEL AI 3** bootc (`registry.redhat.io/rhelai3/bootc-cuda-rhel9:3.0` — exact repo name unverified), Fedora Hummingbird bootc.
- **`bootc container lint`** (run as last Containerfile step / in image): lints e.g. `var-log`, `var-tmpfiles`, `etc-usretc`, `kernel`, `kargs`, `sysusers`, `nonempty-boot`, `baseimage-root`, `buildah-injected`; output `Checks passed: N / Warnings: N`, exit≠0 on fatal.
- VM test via macadam (`vm-manager.ts`) with settings `bootc.macadam.username` (root), ssh key `~/.ssh/id_ed25519`.

## 3. Placement
- **navSections** under Podman connections (B, P2): "Bootable containers" → Dashboard / Disk images / Examples. **menus:** image kebab "Build disk image" (existing). **imageCheckers:** `bootc container lint` checker on images with label `containers.bootc=1` (P5). **tabs:** Disk image detail (Summary/Build log/VM). Link to RHEL VMs ("Boot in VM") and Image Builder ("Build in cloud" for wsl/vsphere types bootc can't do). P#: **P2, P5, P14, P15**.

## 4. Journeys
1. **Build qcow2 and boot it.** Images > `quay.io/acme/rhel10-web:1.4` (bootc label) → Build disk image → type qcow2 + anaconda-iso, arch amd64, user `alice` key → builder `rhel10/bootc-image-builder:10.1` (pulled from registry.redhat.io via RH account) → status `creating → running → success` (log stream `org.osbuild.qemu …`) → "Launch VM" → RHEL VMs connection `bootc-web`. Failure: not logged in to registry.redhat.io → `unauthorized`, CTA "Sign in to Red Hat".
2. **Lint before build.** Checks tab on image → `bootc container lint`: 1 warning `var-log: Found non-empty /var/log` + error `kargs: invalid TOML in /usr/lib/bootc/kargs.d/10-console.toml` → build disabled until fixed.
3. **Presets.** Examples → "RHEL AI 3" / "MicroShift 4.22 on RHEL 9" → Pull & build → ami type asks awsAmiName/bucket/region. Failure: arm64 RHEL AI preset unavailable → "x86_64 only".

## 5. Sample data
```json
[
  {"id":"rhel10-web-qcow2","image":"quay.io/acme/rhel10-web","tag":"1.4","imageId":"sha256:8c1f0a3b7d…","engineId":"podman.podman-machine-default","type":["qcow2"],"folder":"C:\\Users\\alice\\bootc\\rhel10-web","arch":"amd64","filesystem":"xfs","status":"success","timestamp":"2026-10-07T13:22:41Z","buildContainerId":"registry.redhat.io/rhel10/bootc-image-builder:10.1","buildConfig":{"user":[{"name":"alice","key":"ssh-ed25519 AAAAC3Nz… alice@acme","groups":["wheel"]}]}},
  {"id":"rhel10-web-iso","image":"quay.io/acme/rhel10-web","tag":"1.4","type":["anaconda-iso"],"arch":"amd64","status":"running","timestamp":"2026-10-08T08:05:10Z","folder":"C:\\Users\\alice\\bootc\\rhel10-web-iso"},
  {"id":"microshift-edge-raw","image":"quay.io/acme/microshift-edge","tag":"4.22","type":["raw"],"arch":"arm64","status":"error","timestamp":"2026-10-03T17:40:00Z","error":"manifest unknown: arm64 variant not found"},
  {"id":"rhelai-ami","image":"registry.redhat.io/rhelai3/bootc-cuda-rhel9","tag":"3.0","type":["ami"],"arch":"amd64","status":"success","awsAmiName":"rhelai3-dev","awsBucket":"acme-bootc-images","awsRegion":"us-east-1","timestamp":"2026-09-21T10:00:00Z"},
  {"id":"fedora-httpd-vmdk","image":"registry.gitlab.com/fedora/bootc/examples/httpd","tag":"latest","type":["vmdk"],"status":"lost","timestamp":"2026-08-02T09:00:00Z"},
  {"lint":{"image":"quay.io/acme/rhel10-web:1.4","results":[{"name":"var-log","status":"warning","message":"Found non-empty logfile: /var/log/dnf.rpm.log"},{"name":"kargs","status":"fail","message":"Parsing usr/lib/bootc/kargs.d/10-console.toml: invalid TOML"},{"name":"etc-usretc","status":"pass"},{"name":"sysusers","status":"pass"},{"name":"nonempty-boot","status":"pass"},{"name":"baseimage-root","status":"pass"}],"summary":"Checks passed: 7, Warnings: 1, Errors: 1"}},
  {"presets":[{"id":"rhel10-bootc","image":"registry.redhat.io/rhel10/rhel-bootc:10.1"},{"id":"rhel9-microshift","image":"quay.io/acme/microshift-bootc:4.22-rhel9.7","base":"registry.redhat.io/rhel9/rhel-bootc:9.7"},{"id":"rhelai3","image":"registry.redhat.io/rhelai3/bootc-cuda-rhel9:3.0","arch":["amd64"]},{"id":"hummingbird-bootc","image":"quay.io/hummingbird/bootc:latest"}]}
]
```
