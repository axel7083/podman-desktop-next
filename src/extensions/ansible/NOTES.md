# redhat.ansible — Ansible (ADT, navigator, builder, EDA, Export as Ansible)

**Real objects/fields**
- ADT image `registry.redhat.io/ansible-automation-platform-27/ansible-dev-tools-rhel9:26.8.0` (ansible-core, lint, molecule, navigator, builder, creator).
- ansible-creator 26.9.0: `init collection acme.infra <path>`, `init playbook acme.ops <path>`, `add resource devcontainer|execution-environment`.
- ansible-navigator 26.9.0: `run site.yml -i inventory.yml --mode stdout --ee true --eei <EE> --ce podman --pp missing`; playbook artifact JSON v2.0 (`plays[].tasks[] {task, task_action, host, __result, __duration, res.msg}`), PLAY RECAP `ok/changed/unreachable/failed/skipped/rescued/ignored`; runner containers `ansible_runner_<uuid>` labelled `ansible-runner`.
- ansible-builder 3.1.1: `execution-environment.yml` v3 (`images.base_image.name`, `dependencies.galaxy.collections[]{name,version}`, `python`, `system`, `options.package_manager_path|tags`). Base images ee-minimal-rhel9:2.20, ee-supported-rhel9:1.0.0, de-supported-rhel9:1.3.1.
- ansible-rulebook 1.3.2 / ansible.eda 2.13.0: rulesets `{sources, rules{condition, action, throttle.once_within}}`; actions `run_playbook`, `run_job_template`; Podman events relayed to `ansible.eda.webhook` :5000.
- containers.podman 1.21.0: `podman_pod`, `podman_container` (`state: started|quadlet`, `publish`, `env`, `secrets`, `volume`, `healthcheck`, `restart_policy`, `quadlet_options`), `podman_image`, `podman_secret`; `redhat.rhel_system_roles.podman` (`podman_quadlet_specs`).

**Mock** (`data.ts`, `actions.ts`, state in `extData('redhat.ansible', projects|runs|events|settings)`): live navigator runs (tasks stream into the artifact, recap at the end, exited runner container added), creator scaffolding task, EE build task → `localhost/acme/ee-network:1.0` image (label `ansible-execution-environment`), EDA event simulation (run_playbook → restarts orders-db, throttled repeat, died → run_job_template → AAP job 4821), export generator recomputed from real container/pod fields (secrets with `PASSWORD|SECRET|TOKEN` → `podman_secret` + vault var).

**Journeys**: (1) Tools › Ansible › New project → Run site.yml in ee-supported → live recap (db01 failed) → replay → "Open in ADT shell". (2) New execution environment form + live YAML → Build → EE badge in Images → "Use as navigator default". (3) Pods › orders › kebab "Export as Ansible…" → Quadlet / System role → Save / Run with navigator. (4) Rulebooks → simulate unhealthy / died → event log → AAP job link.

**Placement + P#**: Tool page "Ansible" (P3) · tasks (P15) · image column badge EE/DE/ADT + "Use as navigator EE" image kebab (P14) · groupers `ansible-runner` "ansible run" and `io.ansible.eda.activation` "EDA activation" (P10) · "Export as Ansible…" container kebab/details + pod kebab (P14 + new generator kind) · CLI tools navigator/builder/creator/rulebook (P17) · commands (P17). EDA activation as a container group; as a P8 service connection later.

**Sources**: docs/research/_automation-scenario.md, redhat.ansible-dev-tools.md, redhat.ansible-builder.md, redhat.ansible-export.md, redhat.ansible-eda.md.
