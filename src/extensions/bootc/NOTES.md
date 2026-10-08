# Bootable Container (`redhat.bootc`)

## Real objects / API
`BootcBuildInfo{id, image, tag, engineId, type[], folder, arch, status, buildContainerId}`; builders `registry.redhat.io/rhel10/bootc-image-builder:10.1`; `bootc container lint` (var-log, kargs…).

## Auth
registry.redhat.io via the Red Hat account service account.

## Journeys
1. Engine › Bootable containers → Build disk image → lint error blocks rhel10-web:1.4 → Fix and rebuild image.
2. edge-kiosk:1.1 → qcow2 → Boot in RHEL VM → VM `edge-kiosk-vm` (bootc hint) → Edge Manager enrollment request.
3. Image Security tab: bootc container lint checker.

## Placement
navSections (P2), image menus (P14), imageChecker (P5), tasks (P15).

## Sources
docs/research/redhat.bootc.md, ext-bootc
