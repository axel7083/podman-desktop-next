# Ansible development tools — ADT workspace, ansible-creator, ansible-navigator runs (R61)

## 1. Identity
- **Display name:** Ansible
- **Extension id:** `redhat.ansible` (proposed; this file covers the dev-tools half, EE builder in `redhat.ansible-builder.md`)
- **Icon:** https://github.com/ansible.png
- **Description:** Scaffold collections and playbooks, run them in an execution environment with ansible-navigator, and replay the results — all on Podman.

## 2. Real objects & fields
- **ADT image:** `registry.redhat.io/ansible-automation-platform-27/ansible-dev-tools-rhel9:26.8.0` (Pyxis, built 2026-09-23); upstream `ghcr.io/ansible/community-ansible-dev-tools` ([ansible-dev-tools v26.9.0](https://github.com/ansible/ansible-dev-tools), 2026-09-23). Run: `podman run -it --rm --privileged --user root -v $PWD:/workdir:Z <img>` (nested Podman for molecule). Contains ansible-core, ansible-lint, molecule, ansible-navigator, ansible-builder, ansible-creator, pytest-ansible, tox-ansible.
- **ansible-creator v26.9.0:** `ansible-creator init collection acme.infra ./collections/ansible_collections/acme/infra`, `ansible-creator init playbook acme.ops ./ops-playbooks`, `ansible-creator add resource devcontainer|devfile|execution-environment .`, `ansible-creator add plugin filter|lookup|action|module <name> .`.
- **ansible-navigator v26.9.0:** `ansible-navigator run site.yml -i inventory.yml --mode stdout --ee true --eei registry.redhat.io/ansible-automation-platform-27/ee-supported-rhel9:latest --ce podman --pp missing`. Settings `ansible-navigator.yml`: `ansible-navigator.execution-environment{enabled, image, container-engine: podman, pull.policy: always|missing|never|tag}`, `playbook-artifact{enable: true, save-as: "{playbook_dir}/{playbook_name}-artifact-{time_stamp}.json"}`; replay `ansible-navigator replay site-artifact-2026-10-08T09:41:12.json`.
- **Playbook artifact JSON:** `{version:"2.0", status:"successful"|"failed", status_color, stdout:[…], plays:[{name, __play_name, tasks:[{__task, __host, __result:"ok"|"changed"|"failed"|"skipped"|"unreachable", __changed, __duration, task, task_action, host, res, start, end}]}]}`; play recap per host `ok/changed/unreachable/failed/skipped/rescued/ignored`.
- Navigator EE containers are named `ansible_runner_<uuid>` and labelled by ansible-runner → group them (P10).

## 3. Placement
- **tools:** "Ansible" workspace (Projects → Runs → artifact replay). **groupers:** "Ansible runs" grouping `ansible_runner_*` containers (P10). **connections/service:** "ADT workspace" container as dev environment. **menus:** folder "New collection/playbook" (creator), playbook "Run in EE". **tasks:** navigator run with live stdout (P15). P#: **P10, P15, P3**.

## 4. Journeys
1. **Scaffold.** Tools › Ansible › New → Playbook project `acme.ops` (creator task) → opens with devcontainer pointing at ADT image.
2. **Run in EE.** `site.yml` against `inventory.yml` (3 hosts) with `ee-supported-rhel9` → live run → recap: web01 ok=7 changed=2, web02 ok=7 changed=2, db01 failed=1 → artifact saved.
3. **Replay & debug.** Runs › `site-artifact-2026-10-08T09:41:12.json` → play "Configure web tier" → task "Start nginx" on db01 failed (msg) → "Open in ADT shell".

## 5. Sample data
```json
{"runs":[
  {"artifact":"site-artifact-2026-10-08T09:41:12.json","playbook":"site.yml","ee":"registry.redhat.io/ansible-automation-platform-27/ee-supported-rhel9:latest","status":"failed","durationSec":71,
   "recap":{"web01.lab.acme":{"ok":7,"changed":2,"failed":0,"skipped":1,"unreachable":0},"web02.lab.acme":{"ok":7,"changed":2,"failed":0,"skipped":1,"unreachable":0},"db01.lab.acme":{"ok":3,"changed":0,"failed":1,"skipped":0,"unreachable":0}},
   "plays":[{"name":"Configure web tier","tasks":[
     {"task":"Gathering Facts","task_action":"gather_facts","host":"web01.lab.acme","__result":"ok","__duration":"2.1s"},
     {"task":"Install nginx","task_action":"ansible.builtin.dnf","host":"web01.lab.acme","__result":"changed","__duration":"18.4s"},
     {"task":"Deploy site config","task_action":"ansible.builtin.template","host":"web01.lab.acme","__result":"changed"},
     {"task":"Start nginx","task_action":"ansible.builtin.systemd_service","host":"db01.lab.acme","__result":"failed","res":{"msg":"Could not find the requested service nginx: host"}}]}]},
  {"artifact":"podman-hosts-artifact-2026-10-07T16:02:55.json","playbook":"podman-hosts.yml","ee":"registry.redhat.io/ansible-automation-platform-27/ee-minimal-rhel9:2.20","status":"successful","recap":{"localhost":{"ok":5,"changed":1,"failed":0}}}],
 "projects":[{"type":"collection","fqcn":"acme.infra","path":"~/dev/collections/ansible_collections/acme/infra"},{"type":"playbook","fqcn":"acme.ops","path":"~/dev/ops-playbooks"}]}
```
