# k3d (`podman-desktop.k3d`, proposed)

## Real objects & fields
- k3d v5.9.0. On Podman: `DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock` (rootful recommended).
- `k3d cluster list -o json` → `{name, nodes[{name, role: server|agent|loadbalancer|registry, State}], serversCount, serversRunning, agentsCount, agentsRunning, hasLoadBalancer}`.
- Containers labelled `app=k3d`, `k3d.cluster=<name>`, `k3d.role=<role>`; kube context `k3d-<name>`.

## CLI
`k3d cluster create dev --servers 1 --agents 2 -p "8081:80@loadbalancer" --registry-create dev-registry:0.0.0.0:5001 --image rancher/k3s:v1.34.1-k3s1`.

## Mock
- Connections `k3d-dev` (started: 1 server, 2 agents, LB 8081:80, registry dev-registry:5001, parent podman-machine-default, nodes/deployments/pods seeded) and `k3d-edge-sim` (stopped).
- Node containers on podman-machine-default (`k3d-dev-server-0`, `agent-0/1`, `serverlb`, `dev-registry`; rancher/k3s, k3d-proxy 5.9.0, registry:2) grouped by `k3d.cluster` (typeName "k3d cluster").
- Factory "Create k3d cluster" (name, servers, agents, LB port mapping, create registry, k3s image) → task with k3d log lines → connection + node containers.
- CLI tool k3d 5.9.0.

## Journeys
1. Settings › Resources › Create k3d cluster → task → `k3d-<name>` appears under Kubernetes; Helm releases nav appears.
2. podman-machine-default › Containers: node containers grouped per cluster.

## Placement + P#
connections (**P1**), groupers (**P10**), connectionFactories (**P12**).

## Sources
`docs/research/podman-desktop.k3d.md`.
