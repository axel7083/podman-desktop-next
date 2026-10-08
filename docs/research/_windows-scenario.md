# Scenario: Windows developer

## Story
**Sam Okafor**, .NET + Node developer at ACME on a **Windows 11 24H2** laptop. He has Docker Desktop from an old project, Podman machine for company work, and just got **WSL 3.0.1** with **WSL Containers (wslc) GA** (2026-09-29). Corporate VPN breaks his Podman networking on some days. He wants one app that shows all three engines honestly — what each can and can't do — and lets him move workloads between them.

## Fixtures (world seed)
- **WSL:** 3.0.1, distros `podman-machine-default` (WSL, Fedora CoreOS), `Ubuntu-24.04`; WSLC sessions `default` (running: `web` nginx:1.29 :8080, `pg` postgres:16 :5433, `hello` exited) and `ai-gpu` (stopped, GPU).
- **Docker contexts:** `default` (`npipe:////./pipe/docker_engine`), `desktop-linux` (current, Docker Desktop), `podman` (disguised Podman → skipped), `rancher-desktop` (stopped), `prod-ssh` (unsupported endpoint).
- **Podman:** `podman-machine-default` (rootless, WSL), pod `orders`.
- **Cross-platform reference:** Apple container connection (on Sam's colleague's Mac) for the capability matrix.
- Data: `microsoft.wslc.md`, `podman-desktop.docker-contexts.md`, `podman-desktop.apple-container.md`.

## 5 most impressive journeys
1. **Three engines, one nav.** Dashboard detects WSLC → enable → primary nav: `podman-machine-default`, `Docker (desktop-linux)`, `Docker (default)`, `WSLC default`; skipped contexts shown greyed with reasons.
2. **Honest capabilities.** Open `WSLC default` → containers/images/volumes/networks only; Pods/Compose/Kube tabs hidden with "Not supported by WSLC (Compose planned post-GA)" (P11 capability flags).
3. **Move a workload.** WSLC `web` → "Recreate on Podman" → same ports/env → run side by side → stop the WSLC one.
4. **VPN day.** Podman machine networking fails on VPN → hint "WSLC Consommé networking routes through Windows" → run `pg` on WSLC → app connects.
5. **Context hygiene.** `desktop-linux` is the current Docker context → "Make podman-machine-default current" → `docker` CLI in Windows Terminal now hits Podman; `prod-ssh` card explains remote contexts are coming (P1).
