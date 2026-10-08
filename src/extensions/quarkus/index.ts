/**
 * redhat.quarkus (proposed) – makes Quarkus Dev Services visible: a P10
 * grouper folds the containers a dev-mode JVM spawned into
 * "acme-orders (Dev Services)" with "Open Dev UI"; a container tab shows the
 * config Quarkus injected; the Quarkus tool lists projects (P15 workspace)
 * with dev mode / build image tasks.
 */
import { faArrowUpRightFromSquare, faCubes, faFolderOpen } from '@fortawesome/free-solid-svg-icons';

import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { toast } from '#lib/world.svelte.ts';

import DevServiceTab from './components/DevServiceTab.svelte';
import QuarkusCard from './components/QuarkusCard.svelte';
import QuarkusTool from './components/QuarkusTool.svelte';
import { ACME_ORDERS, DEVSERVICE, devServiceContainer, ENGINE, PROCESS_UUID, projectByUuid, QUARKUS_EXT } from './data.ts';

const extension: MockExtension = {
  id: QUARKUS_EXT,
  displayName: 'Quarkus',
  publisher: 'redhat',
  description: 'Detect Quarkus projects, see the Dev Services containers they spawn, and run dev mode, build and image tasks (Red Hat build of Quarkus 3.33).',
  version: '0.3.0',
  icon: 'icons/redhat.quarkus.png',
  tags: ['appdev'],
  pApis: ['P3', 'P10', 'P14', 'P15', 'P17'],
  contributes: {
    groupers: [
      {
        id: 'devservices',
        label: PROCESS_UUID,
        typeName: 'Dev Services',
        icon: 'icons/redhat.quarkus.png',
        groupName: uuid => projectByUuid(uuid)?.name ?? `quarkus ${uuid.slice(0, 8)}`,
        groupDetails: uuid => {
          const p = projectByUuid(uuid);
          return p ? [`Quarkus ${p.platform.split('.redhat')[0]} · dev mode`, p.path] : [];
        },
        actions: [
          {
            id: 'devui',
            label: 'Open Dev UI',
            icon: faArrowUpRightFromSquare,
            run: (uuid): void => toast({ type: 'info', title: `Opening ${projectByUuid(uuid)?.devMode.devUi ?? 'http://localhost:8080/q/dev-ui'}/dev-services` }),
          },
          { id: 'project', label: 'Open project', icon: faFolderOpen, run: (): void => navigate('/tools/quarkus') },
        ],
      },
    ],
    tabs: [{ id: 'quarkus', label: 'Quarkus', target: 'container', when: ctx => !!(ctx.resource as { labels?: Record<string, string> }).labels?.[DEVSERVICE], component: DevServiceTab }],
    tools: [{ id: 'quarkus', label: 'Quarkus', icon: 'icons/redhat.quarkus.png', description: 'Projects, dev mode and Dev Services', component: QuarkusTool }],
    cliTools: [
      {
        id: 'quarkus',
        name: 'quarkus',
        displayName: 'Quarkus CLI',
        description: 'Create, build, run and deploy Quarkus applications (installed with JBang).',
        version: '3.33.3',
        latest: '3.33.3',
        path: '/home/maya/.jbang/bin/quarkus',
      },
    ],
    dashboardCards: [{ id: 'quarkus-dev', title: 'Quarkus dev mode', component: QuarkusCard }],
    commands: [
      { id: 'quarkus.open', title: 'Open Quarkus projects', category: 'Quarkus', icon: faCubes, run: (): void => navigate('/tools/quarkus') },
      { id: 'quarkus.devui', title: 'Open Dev UI (acme-orders)', category: 'Quarkus', icon: faArrowUpRightFromSquare, run: (): void => toast({ type: 'info', title: `Opening ${ACME_ORDERS.devMode.devUi}` }) },
    ],
  },
  seed(world): void {
    world.containers.push(...ACME_ORDERS.devServices.map(s => devServiceContainer(ACME_ORDERS, s)));
    world.containers.push(
      mkContainer(ENGINE, {
        name: 'acme-orders-dev',
        image: 'localhost/acme-orders:1.4.0-SNAPSHOT',
        ports: [8080, 5005, 9091],
        upM: 41,
        command: 'java -XX:+FlightRecorder -jar /deployments/quarkus-run.jar',
        env: [
          'QUARKUS_PROFILE=dev',
          'JAVA_TOOL_OPTIONS=-Dcom.sun.management.jmxremote.port=9091 -Dcom.sun.management.jmxremote.rmi.port=9091 -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false',
          'KAFKA_BOOTSTRAP_SERVERS=acme-kafka:9092',
        ],
        labels: { 'io.cryostat.discovery': 'true', 'io.cryostat.jmxHost': 'acme-orders-dev', 'io.cryostat.jmxPort': '9091', app: 'acme-orders', 'io.quarkus.version': '3.33.3' },
        logs: [
          '__  ____  __  _____   ___  __ ____  ______',
          ' --/ __ \\/ / / / _ | / _ \\/ //_/ / / / __/',
          ' -/ /_/ / /_/ / __ |/ , _/ ,< / /_/ /\\ \\',
          '--\\___\\_\\____/_/ |_/_/|_/_/|_|\\____/___/',
          'INFO  [io.quarkus] (main) acme-orders 1.4.0-SNAPSHOT on JVM (powered by Quarkus 3.33.3.redhat-00001) started in 2.913s. Listening on: http://0.0.0.0:8080',
          'INFO  [io.quarkus] (main) Profile dev activated. Live Coding activated.',
          'INFO  [io.quarkus] (main) Installed features: [agroal, apicurio-registry-avro, cdi, hibernate-orm, hibernate-orm-panache, jdbc-postgresql, messaging-kafka, oidc, rest, rest-jackson, smallrye-health]',
        ],
      }),
    );
    world.images.push(
      mkImage(ENGINE, { name: 'localhost/acme-orders', tag: '1.4.0-SNAPSHOT', sizeMB: 418, ageD: 0, base: 'ubi9', labels: { 'io.quarkus.version': '3.33.3' } }),
      mkImage(ENGINE, { name: 'docker.io/library/postgres', tag: '18', sizeMB: 456, ageD: 20, base: 'debian-12' }),
      mkImage(ENGINE, { name: 'docker.io/apache/kafka-native', tag: '4.2.0', sizeMB: 142, ageD: 30 }),
      mkImage(ENGINE, { name: 'quay.io/keycloak/keycloak', tag: '26.7.4', sizeMB: 471, ageD: 25, base: 'ubi9' }),
      mkImage(ENGINE, { name: 'quay.io/apicurio/apicurio-registry', tag: '3.3.1', sizeMB: 386, ageD: 30, base: 'ubi9' }),
    );
  },
};

export default extension;
