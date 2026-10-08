# Scenario: RHEL customer

## Story
**Alice Moreau**, platform developer at ACME Corp (a RHEL shop: Satellite in the DC, RHEL 9 in prod, piloting RHEL 10 and edge kiosks). She works on a **Windows 11 laptop (WSL2)** and a **Fedora/RHEL workstation**. Policy says: build on UBI, ship only images that pass CVE + CIS checks, and every Linux box must be registered. She wants Podman Desktop to be the place where her RHEL subscription, her machines and her image hygiene meet — without opening console.redhat.com.

## Fixtures (world seed)
- **Red Hat account:** signed in as `alice.dev@acme-corp.com`, org id `19830412`, account `6301142`; registry.redhat.io via service account `podman-desktop`; Developer Subscription (16 systems, renews 2027-03-02) + RHEL Server Standard (expiring 2026-10-31).
- **Activation keys:** `podman-desktop` (Workstation / Development/Test / Self-Support), `ci-runners`, `edge-lab`, `satellite-dc1`.
- **Podman connections:** `podman-machine-default` (WSL, Fedora CoreOS, default, registered via rpm-ostree path), **`rhel-9`** (WSL, RHEL 9.7, registered, Advisor 2 hits, 2 CVEs).
- **RHEL VMs:** `rhel10-dev` (WSL, RHEL 10.1, running, registered, Advisor 3 hits incl. SSHD_SECURE, 1 Critical CVE) and `rhel9-db` (Hyper-V, RHEL 9.7, stopped, not registered, "Near retirement").
- **Images:** `quay.io/acme/orders-api:2.3` (FROM ubi9/python-311 9.5 → grade C, 27 Grype CVEs → 6 after VEX, CIS 71.4%, 2 OpenShift findings, hardened alternative `hummingbird/python:3.12`), `quay.io/acme/legacy-portal:1.9` (ubi8/nodejs-18, Retired, grade F), `quay.io/acme/rhel10-web:1.4` (bootc, lint 1 warning/1 error), `registry.access.redhat.com/ubi9/ubi-minimal:9.8` (grade A), `quay.io/vrothberg/command-line-assistant:41`.
- **Hosted:** Image Builder blueprints `rhel-wsl-podman` (v3 success), `rhel10-cis-guest` (building); bootc disk images; optional Satellite `satellite.acme.corp` and Edge Manager with 4 devices / 1 pending enrollment.
- Data files: see sibling `redhat.*.md` sample JSON.

## 5 most impressive journeys
1. **"Create RHEL Podman machine" in one click (R4).** Podman > Create > RHEL Podman machine → RHEL 9.7, official WSL image, 4 CPU/4 GB, auto-register `podman-desktop` → live task (download 812 MB, verify sha256 `bf4fa114…`, init, provision, start, register) → new `rhel-9` engine with Subscription + Advisor tabs. Bonus failure branches: Hyper-V → "use custom compose", RHEL 10 on WSL → nftables error.
2. **From noisy CVEs to a hardened rebase.** Images > `orders-api:2.3` → Checks tab aggregates Grype + **VEX** (27 → 6 actionable, RHSA links) + **Pyxis** grade C ("9.8 grade A available") + **Lifecycle** (python3.11 near retirement) + **Hummingbird** alternative (0 CVEs, −68% size) → "Compare" → "Clone container onto hardened image" → side-by-side running.
3. **Compliance loop.** Same image → **OpenSCAP** CIS L1 (71.4%, 18 fails) → generate fix → rebuild → 88%; then **Image Builder** blueprint `rhel10-cis-guest` with the same profile → compose `pending→building→success` → "Create RHEL VM from this image" → VM auto-registered.
4. **Registered-fleet health on the laptop.** RHEL VMs list shows Advisor/CVE badges → `rhel10-dev` Advisor tab → SSHD_SECURE → "Explain with **RHEL Lightspeed**" → "Fix in terminal" → re-check clears the hit; `rhel9-db` "Near retirement" → register + start → first check-in appears.
5. **bootc to edge device.** `rhel10-web:1.4` → bootc lint blocks build (kargs error) → fix → Build qcow2 with `rhel10/bootc-image-builder:10.1` → Boot in RHEL VMs → **Edge Manager** enrollment request → approve into fleet `kiosks` → push 1.1 → devices `Updating → Online`, one `Error` rolled back by greenboot.

Alt for disconnected customers: swap the registration target to **Satellite** (`rhel9-dev` key, CV RHEL9-Base/Dev) in journeys 1 and 4.
