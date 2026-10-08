# Event-Driven Ansible — rulebooks fed by Podman events (R63)

## 1. Identity
- **Display name:** Event-Driven Ansible
- **Extension id:** `redhat.ansible` (EDA section)
- **Icon:** https://github.com/ansible.png
- **Description:** Run a rulebook locally in a decision environment and feed it Podman events (container died, health unhealthy) to trigger playbooks.

## 2. Real objects & fields
- **ansible-rulebook v1.3.2** (2026-09-25); `ansible.eda` collection **v2.13.0** (2026-07-07). Run: `ansible-rulebook -r rulebooks/podman-health.yml -i inventory.yml --verbose` inside `registry.redhat.io/ansible-automation-platform-27/de-supported-rhel9:1.3.1` (DE; `de-minimal-rhel9` also exists).
- **Rulebook:** list of rulesets `{name, hosts, sources:[{name?, <plugin>:{args}}], rules:[{name, condition, action|actions, enabled?, throttle{once_within|once_after, group_by_attributes}}]}`. Sources: `ansible.eda.webhook{host, port, token?}`, `ansible.eda.alertmanager`, `ansible.eda.kafka`, `ansible.eda.url_check`, `ansible.eda.range`, `ansible.eda.file_watch`. Conditions: `event.payload.Action == "health_status" and event.payload.Actor.Attributes.health_status == "unhealthy"`; `all:`/`any:`/`not_all:`.
- **Actions:** `run_playbook{name, extra_vars, retries}`, `run_module`, `run_job_template{name, organization, job_args}`, `run_workflow_template`, `post_event`, `set_fact`, `retract_fact`, `debug`, `print_event`, `none`, `shutdown`.
- **Podman bridge:** no first-party podman events source; the extension relays `podman events --format json` (`{Type, Action, Actor:{ID, Attributes:{name, image, health_status}}, time}`) to the webhook source on `localhost:5000`.
- **AAP EDA controller** (when connected): rulebook activations status `starting|running|pending|failed|stopping|stopped|deleting|completed|unresponsive|error`.

## 3. Placement
- **tools:** "Ansible › Rulebooks" (list, run/stop, event log stream). **groupers:** DE containers grouped under "EDA activations" (P10). **service connection:** a running activation is a `service` (P8). P#: **P8, P10, P15**.

## 4. Journeys
1. **Self-heal.** Run `podman-health.yml` (DE container) → stop the `orders-db` health → event `health_status unhealthy` → rule fires `run_playbook restart-orders.yml` → event log shows action `successful`.
2. **Alert to AAP.** Rule action `run_job_template "Remediate orders"` on AAP connection → job id link.
3. **Throttle:** container restart loop → `once_within: 5 minutes` suppresses repeats (visible as "throttled").

## 5. Sample data
```json
{"rulebook":{"name":"podman-health.yml","rulesets":[{"name":"Podman container health","hosts":"localhost",
  "sources":[{"ansible.eda.webhook":{"host":"0.0.0.0","port":5000}}],
  "rules":[
   {"name":"Restart unhealthy orders containers","condition":"event.payload.Action == \"health_status\" and event.payload.Actor.Attributes.health_status == \"unhealthy\"","action":{"run_playbook":{"name":"restart-orders.yml","extra_vars":{"container":"{{ event.payload.Actor.Attributes.name }}"}}},"throttle":{"once_within":"5 minutes","group_by_attributes":["event.payload.Actor.Attributes.name"]}},
   {"name":"Escalate died containers","condition":"event.payload.Action == \"died\"","action":{"run_job_template":{"name":"Remediate orders","organization":"ACME"}}}]}]},
 "activation":{"container":"eda-podman-health","image":"registry.redhat.io/ansible-automation-platform-27/de-supported-rhel9:1.3.1","status":"running","startedAt":"2026-10-08T09:50:00Z"},
 "events":[
  {"time":"2026-10-08T09:52:11Z","payload":{"Type":"container","Action":"health_status","Actor":{"ID":"3f9c","Attributes":{"name":"orders-db","health_status":"unhealthy"}}},"matchedRule":"Restart unhealthy orders containers","action":"run_playbook","status":"successful"},
  {"time":"2026-10-08T09:53:40Z","payload":{"Type":"container","Action":"health_status","Actor":{"Attributes":{"name":"orders-db","health_status":"unhealthy"}}},"matchedRule":"Restart unhealthy orders containers","status":"throttled"},
  {"time":"2026-10-08T10:04:02Z","payload":{"Type":"container","Action":"died","Actor":{"Attributes":{"name":"orders-api","exitCode":"137"}}},"matchedRule":"Escalate died containers","action":"run_job_template","status":"successful","jobId":4821}]}
```
