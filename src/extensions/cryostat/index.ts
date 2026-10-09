/**
 * redhat.cryostat (proposed) – Cryostat 4.2 running next to the JVM
 * containers on Podman: container "JFR" tab (P14), "Start JFR recording" /
 * "Make discoverable by Cryostat" container menus, a Cryostat tool page (P3)
 * with targets, recordings, archives, templates and rules, and an
 * "Active JFR recordings" dashboard card (P17).
 */
import { faCircleDot, faEye } from '@fortawesome/free-solid-svg-icons';

import { mkContainer } from '#lib/ext/helpers.ts';
import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import type { Container } from '#lib/world.svelte.ts';

import { ENGINE } from '../_appdev/services.ts';
import ActiveRecordingsCard from './components/ActiveRecordingsCard.svelte';
import CryostatTool from './components/CryostatTool.svelte';
import JfrTab from './components/JfrTab.svelte';
import { CRYOSTAT_EXT, isDiscoverable, looksJava, makeDiscoverable, seedStore } from './data.ts';

function compose(service: string): Record<string, string> {
  return {
    'com.docker.compose.project': 'cryostat',
    'com.docker.compose.service': service,
    'com.docker.compose.project.working_dir': '/home/maya/.local/share/cryostat/compose',
    'com.docker.compose.project.config_files': 'cryostat.yml,db.yml,s3-seaweed.yml',
  };
}

const extension: MockExtension = {
  id: CRYOSTAT_EXT,
  displayName: 'Cryostat',
  publisher: 'redhat',
  category: 'Application development',
  description: 'Run a local Cryostat next to your JVM containers, auto-discover them over the Podman socket and capture and analyse JFR recordings.',
  version: '0.2.0',
  icon: 'icons/redhat.cryostat.svg',
  tags: ['appdev'],
  pApis: ['P3', 'P8', 'P14', 'P17'],
  contributes: {
    tabs: [
      {
        id: 'jfr',
        label: 'JFR',
        target: 'container',
        when: (ctx): boolean => isDiscoverable(ctx.resource as Container),
        component: JfrTab,
      },
    ],
    menus: [
      {
        id: 'cryostat.start-recording',
        label: 'Start JFR recording',
        icon: faCircleDot,
        target: 'container',
        placement: 'kebab',
        when: (ctx): boolean => isDiscoverable(ctx.resource as Container),
        run: (ctx): void => navigate(`/c/${ctx.conn.id}/containers/${(ctx.resource as Container).id}/jfr`),
      },
      {
        id: 'cryostat.make-discoverable',
        label: 'Make discoverable by Cryostat',
        icon: faEye,
        target: 'container',
        placement: 'kebab',
        when: (ctx): boolean => {
          const c = ctx.resource as Container;
          return !isDiscoverable(c) && looksJava(c) && !c.labels['com.docker.compose.project']?.startsWith('cryostat');
        },
        run: (ctx): void => makeDiscoverable(ctx.resource as Container),
      },
    ],
    tools: [
      {
        id: 'cryostat',
        label: 'Cryostat',
        icon: 'icons/redhat.cryostat.svg',
        description: 'JDK Flight Recorder for containerized JVMs',
        component: CryostatTool,
      },
    ],
    dashboardCards: [{ id: 'active-recordings', title: 'Active JFR recordings', component: ActiveRecordingsCard }],
  },
  seed(world): void {
    world.containers.push(
      mkContainer(ENGINE, {
        name: 'cryostat',
        image: 'quay.io/cryostat/cryostat:4.2.0',
        ports: [8181],
        labels: compose('cryostat'),
        env: [
          'CRYOSTAT_DISCOVERY_PODMAN_ENABLED=true',
          'CRYOSTAT_DISCOVERY_DOCKER_ENABLED=false',
          'CRYOSTAT_DISCOVERY_JDP_ENABLED=true',
          'QUARKUS_HTTP_PORT=8181',
          'STORAGE_BUCKETS_ARCHIVES_NAME=archivedrecordings',
        ],
        upM: 74,
        logs: [
          'INFO  [io.quarkus] cryostat 4.2.0 on JVM (powered by Quarkus 3.20) started in 4.812s. Listening on: http://0.0.0.0:8181',
          'INFO  [io.cryostat.discovery.ContainerDiscovery] Podman discovery enabled, polling unix:///run/user/1000/podman/podman.sock every 10s',
          'INFO  [io.cryostat.discovery.ContainerDiscovery] Target FOUND: acme-orders-dev (service:jmx:rmi:///jndi/rmi://acme-orders-dev:9091/jmxrmi)',
          'INFO  [io.cryostat.rules.RuleService] Activating rule orders-continuous for target acme-orders-dev',
        ],
      }),
      mkContainer(ENGINE, { name: 'cryostat-db', image: 'quay.io/cryostat/cryostat-db:4.2.0', labels: compose('db'), upM: 75 }),
      mkContainer(ENGINE, { name: 'cryostat-s3', image: 'docker.io/chrislusf/seaweedfs:3.80', ports: [8333], labels: compose('s3'), upM: 75 }),
    );
    seedStore();
  },
};

export default extension;
