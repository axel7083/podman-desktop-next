# Scenario: Automation engineer (Ansible)

## Story
**Marco Bianchi**, automation engineer at ACME Corp, writes Ansible content for RHEL app hosts and edge kiosks. ACME runs **AAP 2.7** (`aap.acme-corp.com`) with EDA. Podman is already ADT's default runtime, so he wants one place to scaffold content, build execution environments, run playbooks in the same EE as AAP, turn hand-made containers into playbooks, and see AAP jobs — plus give his AI agent read-only AAP access.

## Fixtures (world seed)
- **Accounts:** Red Hat SSO (registry.redhat.io pull), AAP connection `acme-prod` (2.7.1, token), AAP MCP `https://aap.acme-corp.com:8448/mcp` read-only.
- **Connections:** `podman-machine-default`, `rhel-9` (RHEL Podman machine, target host for exports).
- **Images:** `ansible-dev-tools-rhel9:26.8.0` (ADT), `ee-minimal-rhel9:2.20`, `ee-supported-rhel9:1.0.0`, `de-supported-rhel9:1.3.1` (AAP 2.7), `localhost/acme/ee-network:1.0` (built).
- **Projects:** collection `acme.infra`, playbook project `acme.ops` (`site.yml`, `restart-orders.yml`, `deploy-orders.yml`), inventory 3 hosts (web01, web02, db01).
- **Runs:** artifact `site-artifact-2026-10-08T09:41:12.json` (db01 failed), `podman-hosts-artifact-…` (successful).
- **Containers:** pod `orders` (orders-api + orders-db), `valkey`, EDA activation `eda-podman-health`.
- **AAP:** job templates (Deploy orders, Remediate orders, Patch RHEL 9 check, Build EE nightly), jobs 4822 running / 4821 failed (webhook) / 4815 canceled / 4809 error. Data: `redhat.ansible-*.md`, `redhat.aap.md`.

## 5 most impressive journeys
1. **Scaffold → run in EE → replay.** Tools › Ansible › New playbook project `acme.ops` → Run `site.yml` with `ee-supported-rhel9` → live recap (db01 failed) → Replay artifact → failed task "Start nginx" → open in ADT shell.
2. **Form-based EE build.** New EE on `ee-minimal-rhel9:2.20` + `containers.podman 1.21.0`, `cisco.ios` → build task → EE badge in Images → "Use as navigator default" → push to Quay for AAP.
3. **Export as Ansible.** Select pod `orders` → Export (quadlet mode, secret moved to `podman_secret` + vault) → Run against `rhel-9` → quadlet units active → same playbook saved as AAP job template source.
4. **Event-driven self-heal.** Start rulebook `podman-health.yml` in DE → make `orders-db` unhealthy → rule fires `run_playbook` → second event throttled → `orders-api` died → `run_job_template` → AAP job 4821.
5. **AAP from the desktop + agent.** `acme-prod` › Jobs › 4821 failed → host events → "Run locally in same EE" → fix → Launch "Deploy orders" (job 4822 live stdout) → ask agent via AAP MCP "which jobs failed today?" → tool call `controller.jobs_list`.
