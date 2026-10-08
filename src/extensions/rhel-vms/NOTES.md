# RHEL VMs (`redhat.rhel-vms`) + RHEL Podman machine (R4)

## Real objects / API
macadam machines (`Name, Image, Running, CPUs, Memory, DiskSize, Port, RemoteUsername, VMType`); official images by sha256 from `GET https://api.access.redhat.com/management/v1/images/{checksum}/download` (wsl/applehv/linux, **no hyperv**); `podman machine init --image <file> --cpus --memory --disk-size [--rootful] <name>`; registration via `podman machine ssh <m> sudo subscription-manager register --activationkey <key> --org 19830412`.

## Auth
Red Hat SSO (redhat-authentication) for the image download; activation keys from rhel-registration.

## Journeys
1. Podman › Create new RHEL Podman machine → Hyper-V shows the real `provider hyperv is not supported` inline error with *Use custom compose* / *Switch to WSL* → task download → sha256 → init → start → register → `rhel-10` engine with RHEL hint, Subscription/Advisor/Terminal tabs.
2. Image Builder compose → *Create RHEL Podman machine from this image* / *Create RHEL VM from this image* (wizard prefilled via `?source=compose&compose=…`).
3. RHEL VMs `rhel10-dev`, `rhel9-db` (stopped, unregistered, near retirement) → Terminal tab with scripted SSH answers.

## Placement
connectionFactories (Podman provider card + "+" + palette, P12/P18), connections kind `vm` + engine `rhel-9` (P1/P11), tab Terminal (P14), details menus (P4).

## Sources
docs/research/redhat.rhel-podman-machine.md, redhat.rhel-vms.md, ext-rhel/src/images.ts
