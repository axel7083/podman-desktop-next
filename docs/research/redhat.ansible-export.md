# "Export as Ansible" — containers.podman tasks / quadlets from running workloads (R62)

## 1. Identity
- **Display name:** Export as Ansible
- **Extension id:** `redhat.ansible` (generator contribution; complements `../ext-podman-quadlet/`)
- **Icon:** https://github.com/ansible.png
- **Description:** Turn selected containers and pods into an Ansible playbook (containers.podman) that recreates them on any RHEL host — as plain containers or as Quadlet units.

## 2. Real objects & fields
- **Collection:** [containers.podman](https://github.com/containers/ansible-podman-collections) **1.21.0** (latest tag). Also `fedora.linux_system_roles.podman` / `redhat.rhel_system_roles.podman` (`podman_kube_specs`, `podman_quadlet_specs`).
- **`containers.podman.podman_container`:** `name, image, state: present|absent|stopped|started|created|quadlet, command, entrypoint, env, env_file, publish (ports), volume, mount, network, pod, user, workdir, labels, restart_policy, healthcheck, healthcheck_interval, cap_add, device, memory, cpus, recreate, quadlet_dir, quadlet_filename, quadlet_file_mode, quadlet_options` (`generate_systemd` deprecated in favour of `state: quadlet`).
- **`podman_pod`:** `name, state: created|started|stopped|restarted|killed|paused|unpaused|absent|quadlet, publish, network, infra, infra_image, share, labels, quadlet_dir, quadlet_options`. Plus `podman_image` (`name, tag, pull, auth_file`), `podman_network`, `podman_volume`, `podman_secret`, `podman_login`.
- Source data: libpod `GET /containers/{id}/json` (Config.Env, HostConfig.PortBindings, Mounts, RestartPolicy, Labels) — drop runtime-only/default fields.

## 3. Placement
- **menus:** container / pod / multi-select "Export as Ansible…" (non-Kubernetes generator, like `registerKubernetesGenerator` but target `ansible`). Dialog: mode `container` | `quadlet` | `system-role`, host group, become, "include image pull". Output editor + "Save to project" + "Run with navigator". P#: **P14, P15** (+ new generator kind).

## 4. Journeys
1. **Pod to playbook.** Select pod `orders` (orders-api + postgres) → Export as Ansible (quadlet mode) → YAML preview → Save to `~/dev/ops-playbooks/deploy-orders.yml` → Run with navigator against `rhel-9` machine → units `orders.pod`, `orders-api.container` active.
2. **Single container, plain mode.** `valkey` → tasks `podman_image` + `podman_container state: started` with `restart_policy: always`.
3. **Secrets warning:** env `POSTGRES_PASSWORD` detected → offers `podman_secret` + `ansible-vault` placeholder.

## 5. Sample data
```yaml
- name: Recreate orders pod (exported by Podman Desktop 2026-10-08)
  hosts: app_hosts
  become: false
  tasks:
    - name: Pod orders
      containers.podman.podman_pod:
        name: orders
        state: quadlet
        publish: ["8080:8080", "5432:5432"]
        quadlet_options: ["[Install]", "WantedBy=default.target"]
    - name: Secret for postgres
      containers.podman.podman_secret:
        name: orders-db-password
        data: "{{ vault_orders_db_password }}"
    - name: Container orders-db
      containers.podman.podman_container:
        name: orders-db
        image: registry.redhat.io/rhel9/postgresql-16:9.8
        pod: orders.pod
        state: quadlet
        env: {POSTGRESQL_USER: orders, POSTGRESQL_DATABASE: orders}
        secrets: ["orders-db-password,type=env,target=POSTGRESQL_PASSWORD"]
        volume: ["orders-pgdata:/var/lib/pgsql/data:Z"]
    - name: Container orders-api
      containers.podman.podman_container:
        name: orders-api
        image: quay.io/acme/orders-api:2.3
        pod: orders.pod
        state: quadlet
        env: {DB_HOST: localhost, OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-lgtm:4318"}
        healthcheck: "curl -fs http://localhost:8080/q/health || exit 1"
        labels: {io.containers.autoupdate: registry}
```
