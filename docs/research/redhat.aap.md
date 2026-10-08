# Ansible Automation Platform controller + AAP MCP server (R64)

## 1. Identity
- **Display name:** Ansible Automation Platform
- **Extension id:** `redhat.aap` (proposed; prior art [RedHatOfficial/aap-demo-podman-desktop-extension](https://github.com/RedHatOfficial/aap-demo-podman-desktop-extension), local AAP demo on OpenShift Local, pushed 2026-10-07)
- **Icon:** https://github.com/ansible.png
- **Description:** Connect to your AAP, launch job templates and follow job output, and expose AAP to your AI agents through the AAP MCP server.

## 2. Real objects & fields
- **Product:** AAP **2.7** GA 2026-06-10 ([what's new](https://www.redhat.com/en/blog/whats-new-ansible-automation-platform-2-7)): visual EE builder in the automation portal, MCP server **Technology Preview** (also TP in 2.6.4; containerized installer exposes it on port **8448** HTTPS).
- **Gateway API** (2.5+): `https://aap.acme-corp.com/api/controller/v2/…`; token via `POST /api/gateway/v1/tokens/` or SSO.
- **Job template** `GET /api/controller/v2/job_templates/` → `{id, name, description, job_type:"run"|"check", inventory, project, playbook, execution_environment, ask_variables_on_launch, ask_limit_on_launch, last_job_run, last_job_failed, status, summary_fields{inventory, project, last_job}}`; launch `POST /job_templates/{id}/launch/ {extra_vars, limit}` → `{job, id}`.
- **Job** `GET /jobs/{id}/` → `status: new|pending|waiting|running|successful|failed|error|canceled`, `started, finished, elapsed, failed, launch_type: manual|relaunch|callback|scheduled|dependency|workflow|webhook|sync|scm`, `execution_node`; output `GET /jobs/{id}/stdout/?format=txt`, events `/jobs/{id}/job_events/` (`event: runner_on_ok|runner_on_failed|playbook_on_stats…`, `host_name`, `changed`).
- **Inventory** `GET /inventories/` → `{id, name, kind:""|"smart"|"constructed", total_hosts, hosts_with_active_failures, total_groups, has_inventory_sources}`.
- **AAP MCP server** ([ansible/aap-mcp-server](https://github.com/ansible/aap-mcp-server)): Node 22 service generated from AAP OpenAPI; services `controller|galaxy|gateway|eda`; toolsets e.g. `job_management: [controller.job_templates_launch_create, controller.jobs_read, controller.workflow_job_templates_launch_create]`, `inventory_management: [controller.inventories_list, controller.hosts_list]`; config `aap-mcp.yaml`, env `BASE_URL`, `MCP_PORT` (default 3000); write tools opt-in.

## 3. Placement
- **connections (`service`, P8):** "AAP acme-prod" with status (ping) and navSections Job templates / Jobs / Inventories. **accounts:** AAP token or Red Hat SSO (P16). **menus:** job template "Launch", job "Relaunch", "Open in AAP". **MCP:** "Expose to agents" registers the AAP MCP server in the MCP registry (P9). **dashboardCards:** last 5 jobs. P#: **P8, P9, P16, P2**.

## 4. Journeys
1. **Launch & follow.** AAP acme-prod › Job templates › "Deploy orders (podman)" → Launch with `limit: web*` → job 4822 `pending → running → successful`, live stdout + host summary.
2. **Failed job triage.** Jobs › 4821 `failed` (launched by EDA webhook) → events: `runner_on_failed` db01 → "Run locally with navigator in same EE".
3. **Agent access.** MCP › Add "AAP MCP" (read-only toolsets) → agent asks "which jobs failed today?" → `controller.jobs_list` tool call shown.

## 5. Sample data
```json
{"connection":{"name":"acme-prod","url":"https://aap.acme-corp.com","version":"2.7.1","status":"started","user":"alice.dev"},
 "jobTemplates":[
  {"id":12,"name":"Deploy orders (podman)","job_type":"run","playbook":"deploy-orders.yml","inventory":"RHEL app hosts","execution_environment":"acme-ee-network:1.0","last_job_run":"2026-10-08T10:12:00Z","status":"successful"},
  {"id":15,"name":"Remediate orders","job_type":"run","playbook":"restart-orders.yml","inventory":"RHEL app hosts","status":"failed","last_job_failed":true},
  {"id":21,"name":"Patch RHEL 9 (check mode)","job_type":"check","playbook":"patch.yml","inventory":"All RHEL","status":"never updated"},
  {"id":30,"name":"Build EE nightly","job_type":"run","playbook":"ee-build.yml","inventory":"localhost","status":"successful"}],
 "jobs":[
  {"id":4822,"name":"Deploy orders (podman)","status":"running","launch_type":"manual","started":"2026-10-08T10:12:01Z","execution_node":"exec-01"},
  {"id":4821,"name":"Remediate orders","status":"failed","launch_type":"webhook","started":"2026-10-08T10:04:05Z","finished":"2026-10-08T10:04:51Z","elapsed":46.2},
  {"id":4815,"name":"Patch RHEL 9 (check mode)","status":"canceled","launch_type":"scheduled"},
  {"id":4810,"name":"Build EE nightly","status":"successful","launch_type":"scheduled","elapsed":512.9},
  {"id":4809,"name":"Deploy orders (podman)","status":"error","launch_type":"manual"}],
 "inventories":[
  {"id":3,"name":"RHEL app hosts","kind":"","total_hosts":6,"hosts_with_active_failures":1},
  {"id":4,"name":"All RHEL","kind":"constructed","total_hosts":42,"hosts_with_active_failures":0},
  {"id":5,"name":"Edge kiosks","kind":"smart","total_hosts":4}],
 "mcp":{"server":"aap-mcp","url":"https://aap.acme-corp.com:8448/mcp","toolsets":["job_management","inventory_management"],"writeEnabled":false}}
```
