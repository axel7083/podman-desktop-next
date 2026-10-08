/**
 * redhat.ansible – Ansible development tools on Podman: ADT workspace,
 * ansible-creator projects, ansible-navigator runs + artifact replay,
 * ansible-builder execution environments, Event-Driven Ansible rulebooks and
 * "Export as Ansible…" (containers.podman) for containers and pods.
 */
import { faFileCode, faHammer, faPlay, faPlus, faStar } from '@fortawesome/free-solid-svg-icons';

import { openDialog } from '#lib/dialog.svelte.ts';
import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { ago, type Container, type ContainerImage, hexId, MB, type Pod, world } from '#lib/world.svelte.ts';

import { useImageAsNavigatorEe } from './actions.ts';
import AnsibleTool from './components/AnsibleTool.svelte';
import ExportDialog from './components/ExportDialog.svelte';
import RunDialog from './components/RunDialog.svelte';
import { ADT_IMAGE, ANSIBLE_ID, ansibleKind, DE_IMAGE, ENGINE, RH_REG, store } from './data.ts';

function exportContainer(c: Container): void {
  const pod = c.podId ? world.pods.find(p => p.id === c.podId) : undefined;
  openDialog(ExportDialog, { podId: pod?.id, containerIds: pod ? pod.containerIds : [c.id] });
}

function exportPod(p: Pod): void {
  openDialog(ExportDialog, { podId: p.id, containerIds: p.containerIds });
}

const extension: MockExtension = {
  id: ANSIBLE_ID,
  displayName: 'Ansible',
  publisher: 'redhat',
  description: 'Scaffold collections and playbooks, run them in an execution environment with ansible-navigator, build EEs, run rulebooks and export containers as playbooks — all on Podman.',
  version: '0.4.0',
  icon: 'icons/redhat.ansible.png',
  dependsOn: ['podman-desktop.podman'],
  tags: ['automation'],
  pApis: ['P3', 'P8', 'P10', 'P14', 'P15'],
  contributes: {
    tools: [
      {
        id: 'ansible',
        label: 'Ansible',
        icon: 'icons/redhat.ansible.png',
        description: 'Projects, navigator runs, execution environments and rulebooks.',
        component: AnsibleTool,
        badge: (): number | undefined => {
          const runs = (world.ext[ANSIBLE_ID]?.runs ?? []) as { status: string }[];
          const n = runs.filter(r => r.status === 'running').length;
          return n || undefined;
        },
      },
    ],
    columns: [
      {
        id: 'ansible-kind',
        title: 'Ansible',
        target: 'image',
        value: (row): string | undefined => ('tag' in row ? ansibleKind(row as ContainerImage) : undefined),
      },
    ],
    groupers: [
      { id: 'ansible-runner', label: 'ansible-runner', typeName: 'ansible run', icon: 'icons/redhat.ansible.png' },
      { id: 'eda-activation', label: 'io.ansible.eda.activation', typeName: 'EDA activation', icon: 'icons/redhat.ansible.png' },
    ],
    menus: [
      {
        id: 'export-container',
        label: 'Export as Ansible…',
        icon: faFileCode,
        target: 'container',
        placement: 'kebab',
        run: (ctx): void => exportContainer(ctx.resource as Container),
      },
      {
        id: 'export-container-details',
        label: 'Export as Ansible…',
        icon: faFileCode,
        target: 'container',
        placement: 'details',
        run: (ctx): void => exportContainer(ctx.resource as Container),
      },
      {
        id: 'export-pod',
        label: 'Export as Ansible…',
        icon: faFileCode,
        target: 'pod',
        placement: 'kebab',
        run: (ctx): void => exportPod(ctx.resource as Pod),
      },
      {
        id: 'use-as-navigator-ee',
        label: 'Use as navigator EE',
        icon: faStar,
        target: 'image',
        placement: 'kebab',
        when: (ctx): boolean => ansibleKind(ctx.resource as ContainerImage) === 'EE',
        run: (ctx): void => useImageAsNavigatorEe(ctx.resource as ContainerImage),
      },
    ],
    cliTools: [
      { id: 'ansible-navigator', name: 'ansible-navigator', displayName: 'ansible-navigator', description: 'Run playbooks in execution environments and replay artifacts.', version: '26.9.0', latest: '26.9.0', path: '~/.local/bin/ansible-navigator' },
      { id: 'ansible-builder', name: 'ansible-builder', displayName: 'ansible-builder', description: 'Build execution and decision environment images from execution-environment.yml.', version: '3.1.1', latest: '3.1.1', path: '~/.local/bin/ansible-builder' },
      { id: 'ansible-creator', name: 'ansible-creator', displayName: 'ansible-creator', description: 'Scaffold Ansible collections, playbook projects and plugins.', version: '26.9.0', latest: '26.9.0', path: '~/.local/bin/ansible-creator' },
      { id: 'ansible-rulebook', name: 'ansible-rulebook', displayName: 'ansible-rulebook', description: 'Run Event-Driven Ansible rulebooks.', version: '1.3.2', latest: '1.3.2', path: '~/.local/bin/ansible-rulebook' },
    ],
    commands: [
      { id: 'ansible.newProject', title: 'New playbook project', category: 'Ansible', icon: faPlus, run: (): void => navigate('/tools/ansible?tab=projects&new=playbook') },
      { id: 'ansible.buildEe', title: 'Build execution environment', category: 'Ansible', icon: faHammer, run: (): void => navigate('/tools/ansible?tab=environments&new=1') },
      { id: 'ansible.runPlaybook', title: 'Run playbook', category: 'Ansible', icon: faPlay, run: (): void => openDialog(RunDialog, { playbook: 'site.yml' }) },
    ],
  },
  seed(w): void {
    const e = ENGINE;
    // Red Hat AAP 2.7 images (Pyxis, 2026-09-23)
    const rhLabels = { vendor: 'Red Hat, Inc.', 'com.redhat.component': 'ansible-automation-platform' };
    w.images.push(
      mkImage(e, { name: `${RH_REG}/ansible-dev-tools-rhel9`, tag: '26.8.0', sizeMB: 1630, ageD: 15, base: 'ubi9', labels: { ...rhLabels, 'com.redhat.component': 'ansible-dev-tools-container' } }),
      mkImage(e, { name: `${RH_REG}/ee-minimal-rhel9`, tag: '2.20', sizeMB: 368, ageD: 15, base: 'ubi9', labels: { ...rhLabels, 'ansible-execution-environment': 'true', 'ansible.core.version': '2.20' } }),
      mkImage(e, { name: `${RH_REG}/ee-supported-rhel9`, tag: '1.0.0', sizeMB: 1210, ageD: 15, base: 'ubi9', labels: { ...rhLabels, 'ansible-execution-environment': 'true', 'ansible.core.version': '2.20' } }),
      mkImage(e, { name: `${RH_REG}/de-supported-rhel9`, tag: '1.3.1', sizeMB: 690, ageD: 15, base: 'ubi9', labels: { ...rhLabels, 'ansible-decision-environment': 'true' } }),
      mkImage(e, { name: 'quay.io/acme/orders-api', tag: '2.3', sizeMB: 388, ageD: 4, base: 'ubi9', labels: { 'io.quarkus.version': '3.27.0' } }),
      mkImage(e, { name: 'registry.redhat.io/rhel9/postgresql-16', tag: '9.8', sizeMB: 417, ageD: 18, base: 'ubi9' }),
      mkImage(e, { name: 'docker.io/valkey/valkey', tag: '9.1', sizeMB: 118, ageD: 11, base: 'debian-12' }),
    );
    // pod orders: infra + orders-api + orders-db (ports on the pod)
    const podId = hexId(64);
    const infra = mkContainer(e, { name: `${podId.slice(0, 12)}-infra`, image: 'localhost/podman-pause:5.6.2-1757000000', podId, ports: [8080, 5432], upM: 180 });
    const api = mkContainer(e, {
      name: 'orders-api',
      image: 'quay.io/acme/orders-api:2.3',
      podId,
      ports: [8080],
      upM: 180,
      env: ['DB_HOST=localhost', 'OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-lgtm:4318'],
      labels: { 'io.containers.autoupdate': 'registry' },
      logs: ['INFO  [io.quarkus] orders-api 2.3.0 on JVM (powered by Quarkus 3.27.0) started in 1.412s. Listening on: http://0.0.0.0:8080', 'INFO  [io.quarkus] Installed features: [agroal, hibernate-orm, jdbc-postgresql, opentelemetry, rest, smallrye-health]'],
    });
    const db = mkContainer(e, {
      name: 'orders-db',
      image: 'registry.redhat.io/rhel9/postgresql-16:9.8',
      podId,
      ports: [5432],
      upM: 180,
      command: 'run-postgresql',
      env: ['POSTGRESQL_USER=orders', 'POSTGRESQL_PASSWORD=Orders!2026', 'POSTGRESQL_DATABASE=orders'],
      logs: ['Starting server...', '2026-10-08 07:12:01.204 UTC [1] LOG:  database system is ready to accept connections'],
    });
    w.pods.push({ id: podId, name: 'orders', engineId: e, status: 'RUNNING', created: ago({ h: 6 }), containerIds: [infra.id, api.id, db.id] });
    const runnerUuid = hexId(32);
    w.containers.push(
      infra,
      api,
      db,
      mkContainer(e, { name: 'valkey', image: 'docker.io/valkey/valkey:9.1', ports: [6379], command: 'valkey-server --save 60 1', upM: 410 }),
      mkContainer(e, {
        name: 'eda-podman-health',
        image: DE_IMAGE,
        ports: [5000],
        upM: 25,
        command: 'ansible-rulebook -r rulebooks/podman-health.yml -i inventory.yml --verbose',
        labels: { 'io.ansible.eda.activation': 'podman-health', 'io.ansible.eda.rulebook': 'podman-health.yml' },
        logs: ['2026-10-08 09:50:00,412 - ansible_rulebook.app - INFO - Starting sources', '2026-10-08 09:50:00,598 - ansible_rulebook.engine - INFO - Waiting for events, ruleset: Podman container health'],
      }),
      mkContainer(e, {
        name: 'adt-workspace',
        image: ADT_IMAGE,
        upM: 75,
        command: 'sleep infinity',
        labels: { 'devcontainer.local_folder': '/home/marco/dev/ops-playbooks' },
        env: ['ANSIBLE_NAVIGATOR_CONTAINER_ENGINE=podman'],
      }),
      mkContainer(e, {
        name: `ansible_runner_${runnerUuid}`,
        image: `${RH_REG}/ee-supported-rhel9:latest`,
        state: 'EXITED',
        ageH: 1,
        labels: { 'ansible-runner': 'site.yml' },
        command: 'ansible-playbook site.yml -i inventory.yml',
      }),
    );
    w.volumes.push(
      { name: 'orders-pgdata', engineId: e, size: 48 * MB, created: ago({ h: 6 }), mountpoint: '/var/home/core/.local/share/containers/storage/volumes/orders-pgdata/_data' },
      { name: 'valkey-data', engineId: e, size: 2 * MB, created: ago({ d: 3 }), mountpoint: '/var/home/core/.local/share/containers/storage/volumes/valkey-data/_data' },
    );
    store();
  },
};

export default extension;
