# Debug shell (`podman-desktop.debug-shell`, proposed – O3)

Docker Debug / OrbStack parity: a shell with real tools inside any container, even distroless,
without changing the image.

## Real mechanism
```
podman run -it --rm --name debug-<target> \
  --pid=container:<target> --network=container:<target> --ipc=container:<target> \
  --cap-add SYS_PTRACE --label io.podman-desktop.debug-target=<target id> <toolbox> bash
```
- Target processes are visible (PID 1 = the app), its ports answer on `localhost`, its root
  filesystem is at `/proc/1/root`. In a pod, `--pod <name>` replaces the three namespace flags.
- Toolbox images: `registry.fedoraproject.org/fedora-toolbox:43` (default),
  `registry.access.redhat.com/ubi9/toolbox:9.8`, `docker.io/nicolaka/netshoot:latest` (network).

## Placement (P#)
| Contribution | Where | P# |
|---|---|---|
| `tabs` `debug` | Container details › Debug, when RUNNING (not on debug containers themselves) | P14 |
| `menus` kebab | "Debug shell" → Debug tab | P14 |
| `groupers` | `io.podman-desktop.debug-target` → group "debug <target name> (debug)" | P10 |

## Journeys
1. `acme-orders-dev` › Debug → image Fedora toolbox 43 → **Start debug shell** (task: pull + attach)
   → terminal → `ps aux` (java … quarkus-run.jar as PID 1) → `cat /proc/1/root/deployments/config/application.properties`
   → `curl -s localhost:8080/q/health` → **End session** (debug container removed).
2. Network issue → pick netshoot → `ss -ltnp`.

## Mock decisions
- Session state in `world.ext['podman-desktop.debug-shell'].sessions[targetId]`; the debug
  container is a real world container (visible in the list, grouped under the target).
- The scripted terminal answers depend on the target (Java/Quarkus targets get the Quarkus
  process, deployments listing, `application.properties` and `/q/health`); `help` lists them.

## Sources
docs/research/podman-desktop.debug-shell.md; `podman-run(1)` (`--pid`, `--network`, `--ipc=container:`).
