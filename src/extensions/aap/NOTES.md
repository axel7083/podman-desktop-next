# redhat.aap — Ansible Automation Platform

**Real objects/fields** (AAP 2.7.1, Gateway API `https://aap.acme-corp.com/api/controller/v2/…`, token via `/api/gateway/v1/tokens/`)
- Job template `{id, name, job_type: run|check, playbook, inventory, project, execution_environment, ask_limit_on_launch, ask_variables_on_launch, last_job_run, status}`; launch `POST /job_templates/{id}/launch/ {limit, extra_vars}` → job id.
- Job `{id, status: new|pending|waiting|running|successful|failed|error|canceled, launch_type: manual|relaunch|webhook|scheduled…, started, finished, elapsed, execution_node}`; `/jobs/{id}/stdout/?format=txt`, `/jobs/{id}/job_events/` (`runner_on_ok|runner_on_failed|playbook_on_stats`, `host_name`).
- Inventory `{id, name, kind: ''|smart|constructed, total_hosts, hosts_with_active_failures, total_groups, has_inventory_sources}`.
- AAP MCP server (Technology Preview, `https://aap.acme-corp.com:8448/mcp`, ansible/aap-mcp-server): toolsets `job_management` (`controller.jobs_list`, `controller.jobs_read`, write: `controller.job_templates_launch_create`), `inventory_management` (`controller.inventories_list`, `controller.hosts_list`); write tools opt-in.

**Mock** (`data.ts`, state in `extData('redhat.aap', templates|jobs|inventories|mcp)`): templates 12/15/21/30, jobs 4822 running (streams to successful), 4821 failed (webhook from EDA, `runner_on_failed` db01), 4815 canceled, 4810 successful, 4809 error; launch creates 4823+ `pending → running → successful` with line-by-line stdout (`later`).

**Journeys**: (1) acme-prod › Job templates › Launch "Deploy orders (podman)" (limit `web*`) → job output streams → host summary. (2) Jobs › 4821 failed → failed host event → "Run locally in same EE" (runs the `ansible.runPlaybook` command of redhat.ansible). (3) Connection › MCP server tab → toolsets, write toggle off → "Register in MCP registry" → agent transcript "which jobs failed today?" → `controller.jobs_list`.

**Placement + P#**: service connection `acme-prod` (P8) · nav sections Job templates / Jobs / Inventories when `capabilities` has `aap` (P2) · connection tab "MCP server" (P14, registers in MCP registry P9) · account `alice.dev @ aap.acme-corp.com` (P16) · dashboard card "AAP jobs" + commands (P17).

**Sources**: docs/research/redhat.aap.md, _automation-scenario.md.
