# Image Builder (`redhat.image-builder`)

## Real objects / API
image-builder v1 OpenAPI: Blueprint (`name, distribution, image_requests[{architecture,image_type}], customizations{packages, custom_repositories, subscription, openscap, users}`), Compose (`image_status.status pending|building|uploading|registering|success|failure`, `upload_status.options.url`, `error{reason,details}`).

## Auth
SSO scope `api.console`.

## Journeys
1. Blueprint rhel10-cis-guest → Build image → task pending → building → uploading → success → Create RHEL VM from this image.
2. rhel-wsl-podman v3 compose → Create RHEL Podman machine from this image.
3. Failed v2 compose "No match for argument: systemd-networkd" → Add EPEL repository quick fix; Create blueprint dialog validates "OpenSCAP is not available for WSL images".

## Placement
tools (P3), dashboard card (P17), tasks (P15).

## Sources
docs/research/redhat.image-builder.md
