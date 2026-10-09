# Red Hat Lightspeed Image Builder (hosted)

## 1. Identity
- **Display name:** Image Builder
- **Extension id:** `redhat.image-builder` (new; no existing PD extension) — dependsOn `redhat.redhat-authentication` (scope `api.console`)
- **Icon:** Red Hat product icon "Image Builder" (https://console.redhat.com/insights/image-builder favicon set); fallback `../ext-redhat-account/icons/redhat-logo.svg`
- **Description:** Build RHEL images (WSL, qcow2, ISO, AMI, vSphere…) from blueprints on console.redhat.com and use them locally.

## 2. Real objects & fields (`https://console.redhat.com/api/image-builder/v1/openapi.json`)
- **Blueprint:** `id, name (≤100), description (≤250), distribution (rhel-9|rhel-10|rhel-9.6|rhel-10.0|centos-10|fedora-…), customizations, image_requests[≥1], bootc?, lint{errors[]}`; versioned (`/blueprints/{id}/compose`, `/blueprints/{id}/composes?blueprint_version=`).
- **ComposeRequest:** `distribution, image_name, image_description, client_id ("api"|"ui"), customizations, image_requests:[{architecture: x86_64|aarch64, image_type, upload_request:{type: aws|aws.s3|gcp|azure|oci.objectstorage, options}, snapshot_date?}]`.
- **image_type enum:** `aws, ami, azure, vhd, gcp, guest-image (qcow2), image-installer (ISO), network-installer, bootable-container-iso, edge-commit, edge-installer, rhel-edge-*, oci, pxe-tar-xz, vsphere, vsphere-ova, wsl`.
- **ComposeStatus.image_status.status:** `pending | building | uploading | registering | success | failure`; `upload_status.options.url` (S3 presigned, valid 6 h); `error{reason, details}`.
- **Customizations:** `packages[], payload_repositories, custom_repositories, subscription{organization, activation-key, server-url, base-url, insights, rhc}, openscap{profile_id, profile_name}, users[{name, ssh_key, password, groups}], groups, filesystem[{mountpoint,min_size}], partitioning_mode (raw|lvm|auto-lvm), services{enabled,disabled,masked}, firewall, kernel{name,append}, timezone, locale, hostname, fips{enabled}, files, directories, cacerts, containers, installer, aap_registration`.

## 3. Placement
- **tools:** "Image Builder" in Tools group (D, P3): Blueprints list → detail (versions, compose history, Download). **dashboardCards:** "Last compose: rhel-wsl-podman v3 — success". **Integrations:** consumers in R4 wizard ("Custom compose") and RHEL VMs ("local image") via P15 tasks; bootc "Build in cloud" alternative. P#: **P3, P15, P16, P17**.

## 4. Journeys
1. **Create WSL blueprint for Podman.** New blueprint → RHEL 9 → target WSL → registration `podman-desktop` key → packages (podman, podman-docker, openssh-server, sudo, procps-ng, iproute, dhcp-client, net-tools, systemd-networkd) + EPEL repo → Save & build → task status `pending → building (≈6 min) → success` → "Create Podman machine from this image" (R4).
2. **Hardened qcow2 for VM.** Blueprint `rhel10-cis` → guest-image x86_64, OpenSCAP `xccdf_org.ssgproject.content_profile_cis_server_l1`, user `alice` + ssh key → build → Download → "Create RHEL VM" prefilled image path. Failure: OpenSCAP not supported for wsl → validation "OpenSCAP is not available for WSL images".
3. **Failure:** compose `failure` `{reason:"Error depsolving: No match for package systemd-networkd"}` → "Add EPEL repository" quick fix → rebuild v4.

## 5. Sample data
```json
{
  "blueprints":[
    {"id":"4f1b2c3d-1a2b-4c5d-8e9f-0a1b2c3d4e5f","name":"rhel-wsl-podman","description":"RHEL 9 WSL distro usable as a Podman machine","version":3,"distribution":"rhel-9","last_modified_at":"2026-10-06T09:12:00Z","image_requests":[{"architecture":"x86_64","image_type":"wsl","upload_request":{"type":"aws.s3","options":{}}}],"customizations":{"packages":["podman","podman-docker","openssh-server","sudo","procps-ng","iproute","dhcp-client","net-tools","systemd-networkd"],"custom_repositories":[{"id":"epel9","name":"EPEL 9","baseurl":["https://dl.fedoraproject.org/pub/epel/9/Everything/x86_64/"],"check_gpg":true}],"subscription":{"organization":19830412,"activation-key":"podman-desktop","insights":true,"rhc":true}}},
    {"id":"9e8d7c6b-5a49-4382-a1b0-c9d8e7f6a5b4","name":"rhel10-cis-guest","description":"CIS L1 hardened qcow2 for local VMs","version":5,"distribution":"rhel-10","last_modified_at":"2026-09-28T16:40:00Z","image_requests":[{"architecture":"x86_64","image_type":"guest-image","upload_request":{"type":"aws.s3","options":{}}}],"customizations":{"openscap":{"profile_id":"xccdf_org.ssgproject.content_profile_cis_server_l1","profile_name":"CIS Red Hat Enterprise Linux 10 Benchmark for Level 1 - Server"},"users":[{"name":"alice","ssh_key":"ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJ6… alice@acme","groups":["wheel"]}],"packages":["tmux","git"]}},
    {"id":"1c2d3e4f-5a6b-4c7d-8e9f-a0b1c2d3e4f5","name":"rhel9-edge-iso","description":"Installer ISO for lab boxes","version":1,"distribution":"rhel-9","last_modified_at":"2026-08-11T11:00:00Z","image_requests":[{"architecture":"aarch64","image_type":"image-installer"}]},
    {"id":"7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d","name":"rhel9-vsphere-app","description":"VMware template for staging","version":2,"distribution":"rhel-9","last_modified_at":"2026-07-30T08:00:00Z","image_requests":[{"architecture":"x86_64","image_type":"vsphere-ova"}]}
  ],
  "composes":[
    {"id":"b2f4c1d0-7e3a-4c9b-8a10-3d2e1f0a9b8c","blueprint":"rhel-wsl-podman","blueprint_version":3,"image_type":"wsl","created_at":"2026-10-06T09:13:02Z","image_status":{"status":"success","upload_status":{"type":"aws.s3","status":"success","options":{"url":"https://image-builder-service-production.s3.amazonaws.com/composer-api-b2f4c1d0-wsl.tar.gz?X-Amz-Expires=21600"}}}},
    {"id":"c3a5d2e1-8f4b-4dac-9b21-4e3f2a1b0c9d","blueprint":"rhel-wsl-podman","blueprint_version":2,"image_type":"wsl","created_at":"2026-10-01T15:02:44Z","image_status":{"status":"failure","error":{"id":9,"reason":"Error depsolving","details":"No match for argument: systemd-networkd"}}},
    {"id":"d4b6e3f2-9a5c-4ebd-8c32-5f4a3b2c1d0e","blueprint":"rhel10-cis-guest","blueprint_version":5,"image_type":"guest-image","created_at":"2026-10-08T07:55:10Z","image_status":{"status":"building"}},
    {"id":"e5c7f4a3-0b6d-4fce-9d43-6a5b4c3d2e1f","blueprint":"rhel9-vsphere-app","blueprint_version":2,"image_type":"vsphere-ova","created_at":"2026-10-08T08:01:00Z","image_status":{"status":"pending"}},
    {"id":"f6d8a5b4-1c7e-4adf-8e54-7b6c5d4e3f2a","blueprint":"rhel9-edge-iso","blueprint_version":1,"image_type":"image-installer","created_at":"2026-10-08T07:40:00Z","image_status":{"status":"uploading"}}
  ]
}
```
