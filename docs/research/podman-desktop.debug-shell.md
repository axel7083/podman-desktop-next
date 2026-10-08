# Container debug shell (O3 — Docker Debug / OrbStack parity)

## 1. Identity
- **Display name:** Debug shell · **Extension id:** `podman-desktop.debug-shell` (proposed) · **Icon:** https://github.com/containers.png
- **Description:** Open a shell with real tools inside any container — even distroless or scratch — without changing the image.

## 2. Real objects & fields
- Podman: `podman run -it --rm --name debug-orders-api --pid=container:orders-api --network=container:orders-api --ipc=container:orders-api --cap-add SYS_PTRACE -v /run/user/1000/podman/podman.sock:/run/podman.sock registry.fedoraproject.org/fedora-toolbox:43 bash`; target rootfs visible at `/proc/1/root`. In a pod: `--pod orders` instead of the three namespace flags.
- Toolbox images: `fedora-toolbox:43`, `registry.access.redhat.com/ubi9/toolbox:9.8`, `docker.io/nicolaka/netshoot:latest` (network).
- Debug containers labelled `io.podman-desktop.debug-target=<id>` for cleanup/grouping (P10).

## 3. Placement
- **tabs:** container "Debug" tab next to Terminal (P14) with image picker; **menus:** container "Debug shell"; terminal banner "Distroless image — no /bin/sh; use Debug". P#: **P10, P14**.

## 4. Journeys
1. `orders-api` (ubi-micro, no shell) → Terminal fails → "Debug" → toolbox attached → `ps aux` shows the app as PID 1 → `cat /proc/1/root/app/config.yaml`.
2. Network issue → choose netshoot → `tcpdump -i eth0 port 5432`.

## 5. Sample data
```json
[{"target":"orders-api","targetImage":"quay.io/acme/orders-api:2.3","shell":false,"debugImage":"registry.fedoraproject.org/fedora-toolbox:43","debugContainer":"debug-orders-api","namespaces":["pid","net","ipc"],"status":"running"},
 {"target":"orders-db","debugImage":"docker.io/nicolaka/netshoot:latest","namespaces":["net"],"status":"exited"},
 {"target":"pod:orders","debugImage":"registry.access.redhat.com/ubi9/toolbox:9.8","namespaces":["pod"],"status":"running"}]
```
