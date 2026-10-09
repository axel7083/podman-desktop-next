# k3d (O9)

## 1. Identity
- **Display name:** k3d · **Extension id:** `podman-desktop.k3d` (proposed; same shape as `../ext-kind/`) · **Icon:** https://github.com/k3d-io.png
- **Description:** Lightweight k3s clusters in Podman containers, with built-in load balancer and registry.

## 2. Real objects & fields
- **k3d v5.9.0** (2026-06-02). On Podman set `DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock` (rootful recommended; rootless needs cgroup v2 delegation). `k3d cluster create dev --servers 1 --agents 2 -p "8081:80@loadbalancer" --registry-create dev-registry:0.0.0.0:5001 --image rancher/k3s:v1.34.1-k3s1`.
- `k3d cluster list -o json` → `[{name, nodes[{name, role:"server"|"agent"|"loadbalancer"|"registry", State{Running, Status}}], serversCount, serversRunning, agentsCount, agentsRunning, hasLoadBalancer, imageVolume}]`; containers labelled `app=k3d`, `k3d.cluster=<name>`, `k3d.role=…`. Kube context `k3d-<name>`.

## 3. Placement
- **connectionFactories** "Create k3d cluster"; **connections:** kubernetes connection per cluster (P1 maps to `k3d-dev` context); **groupers:** node containers grouped by `k3d.cluster` (P10). P#: **P1, P10, P13**.

## 4. Journeys
1. Create `dev` (1 server, 2 agents, LB, registry) → task → connection `k3d-dev` started → Helm/Kubernetes nav appears.
2. Stop cluster → node containers grouped and stopped; delete removes context.

## 5. Sample data
```json
[{"name":"dev","serversCount":1,"serversRunning":1,"agentsCount":2,"agentsRunning":2,"hasLoadBalancer":true,"context":"k3d-dev","nodes":[{"name":"k3d-dev-server-0","role":"server","State":{"Running":true,"Status":"running"}},{"name":"k3d-dev-agent-0","role":"agent","State":{"Running":true}},{"name":"k3d-dev-agent-1","role":"agent","State":{"Running":true}},{"name":"k3d-dev-serverlb","role":"loadbalancer","State":{"Running":true}},{"name":"dev-registry","role":"registry","State":{"Running":true}}]},
 {"name":"edge-sim","serversCount":1,"serversRunning":0,"agentsCount":0,"agentsRunning":0,"hasLoadBalancer":false,"context":"k3d-edge-sim"}]
```
