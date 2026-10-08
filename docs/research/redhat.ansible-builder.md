# Ansible execution & decision environment builder (R61)

## 1. Identity
- **Display name:** Ansible — Execution environments
- **Extension id:** `redhat.ansible` (EE half; same extension as `redhat.ansible-dev-tools.md`)
- **Icon:** https://github.com/ansible.png
- **Description:** Build execution and decision environment images with a form over `execution-environment.yml` v3, and see which local images are EEs.

## 2. Real objects & fields
- **ansible-builder 3.1.1** (`registry.redhat.io/ansible-automation-platform-27/ansible-builder-rhel9:3.1.1`). `ansible-builder build -f execution-environment.yml -t acme/ee-network:1.0 --container-runtime podman -v 3`; `ansible-builder create` emits `context/Containerfile`.
- **execution-environment.yml v3:** `version: 3`; `images.base_image.name`; `dependencies{ansible_core{package_pip}, ansible_runner{package_pip}, python_interpreter{package_system, python_path}, galaxy (path or inline collections[]), python (requirements.txt or list), system (bindep.txt or list), exclude{python, system, all_from_collections}}`; `additional_build_files[{src, dest}]`; `additional_build_steps{prepend_base, append_base, prepend_galaxy, append_galaxy, prepend_builder, append_builder, prepend_final, append_final}`; `build_arg_defaults{ANSIBLE_GALAXY_CLI_COLLECTION_OPTS, ANSIBLE_GALAXY_CLI_ROLE_OPTS, PKGMGR_PRESERVE_CACHE}`; `options{package_manager_path, skip_ansible_check, relax_passwd_permissions, workdir, user, tags, container_init{cmd, entrypoint, package_pip}}`.
- **Red Hat base images (Pyxis, 2026-09-23):** AAP 2.7 — `ee-minimal-rhel9:2.20` (ansible-core 2.20; `2.16` stream too), `ee-supported-rhel9:1.0.0`, `de-supported-rhel9:1.3.1`; AAP 2.6 — `ee-minimal-rhel9:2.0`, `ee-supported-rhel9:2.0`, `de-supported-rhel9:1.2.2`; AAP 2.5 still patched (RHSA-2026:71192). Community: `ghcr.io/ansible/community-ansible-dev-tools`.
- EE detection: image label/`/usr/bin/ansible-runner` + `/runner` workdir; DE images contain `ansible-rulebook`.

## 3. Placement
- **tools:** "Ansible › Environments" form editor (P15 task for build). **columns/badges:** "EE"/"DE" badge on image list; **tabs:** image "Ansible content" (collections + ansible-core version via `ansible-galaxy collection list`). **menus:** image "Use as navigator EE", "Inspect collections". P#: **P10, P14, P15**.

## 4. Journeys
1. **Build EE from form.** New EE → base `ee-minimal-rhel9:2.20` → collections `containers.podman 1.21.0`, `ansible.posix`, `cisco.ios` → python `jmespath` → build task (galaxy, builder, final stages) → image `localhost/acme/ee-network:1.0` with EE badge.
2. **Inspect.** `ee-supported-rhel9:1.0.0` → Ansible content tab: 30+ certified collections listed → "Use as navigator default".
3. **Failure:** registry.redhat.io not logged in → pull denied → CTA "Sign in with Red Hat account".

## 5. Sample data
```json
{"definition":{"version":3,"images":{"base_image":{"name":"registry.redhat.io/ansible-automation-platform-27/ee-minimal-rhel9:2.20"}},
  "dependencies":{"galaxy":{"collections":[{"name":"containers.podman","version":"1.21.0"},{"name":"ansible.posix"},{"name":"cisco.ios"}]},"python":["jmespath","netaddr"],"system":["git-core [platform:rpm]"]},
  "options":{"package_manager_path":"/usr/bin/microdnf","tags":["localhost/acme/ee-network:1.0"]}},
 "images":[
  {"name":"registry.redhat.io/ansible-automation-platform-27/ee-minimal-rhel9","tag":"2.20","kind":"EE","ansibleCore":"2.20","created":"2026-09-23T22:07:14Z"},
  {"name":"registry.redhat.io/ansible-automation-platform-27/ee-supported-rhel9","tag":"1.0.0","kind":"EE","created":"2026-09-23T22:07:12Z"},
  {"name":"registry.redhat.io/ansible-automation-platform-27/de-supported-rhel9","tag":"1.3.1","kind":"DE","created":"2026-09-23T22:07:13Z"},
  {"name":"registry.redhat.io/ansible-automation-platform-26/ee-supported-rhel9","tag":"2.0","kind":"EE"},
  {"name":"localhost/acme/ee-network","tag":"1.0","kind":"EE","ansibleCore":"2.20","collections":3,"sizeMB":412},
  {"name":"registry.redhat.io/ansible-automation-platform-27/ansible-dev-tools-rhel9","tag":"26.8.0","kind":"ADT"}]}
```
