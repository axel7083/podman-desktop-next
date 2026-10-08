/**
 * redhat.debezium (proposed) – change data capture from local databases to
 * Kafka. "Capture changes with Debezium" on PostgreSQL containers (P14 menu)
 * opens the "Change data capture" tab (wal_level check → enable logical
 * replication task → connector wizard → task); connectors are listed under
 * every Kafka connection (P2), and new CDC topics appear in Kafka.
 */
import { faArrowRightArrowLeft } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import type { Container } from '#lib/world.svelte.ts';
import { navigate } from '#lib/nav.ts';

import { isService, serviceContainer } from '../_appdev/services.ts';
import CdcTab from './components/CdcTab.svelte';
import ConnectorsSection from './components/ConnectorsSection.svelte';
import { DBZ_EXT, ensureStore, isPostgres, seedConnectors, store } from './data.ts';

const extension: MockExtension = {
  id: DBZ_EXT,
  displayName: 'Debezium',
  publisher: 'redhat',
  description: 'Stream row-level changes from local databases to Kafka: run Kafka Connect with Debezium, create and monitor connectors.',
  version: '0.2.0',
  icon: 'icons/redhat.debezium.png',
  dependsOn: ['redhat.streams-kafka', 'podman-desktop.postgresql'],
  tags: ['appdev'],
  pApis: ['P2', 'P14', 'P15'],
  contributes: {
    menus: [
      {
        id: 'capture',
        label: 'Capture changes with Debezium',
        icon: faArrowRightArrowLeft,
        target: 'container',
        placement: 'kebab',
        when: ctx => isPostgres(ctx.resource as Container),
        run: (ctx): void => navigate(`/c/${ctx.conn.id}/containers/${(ctx.resource as Container).id}/cdc`),
      },
    ],
    tabs: [{ id: 'cdc', label: 'Change data capture', target: 'container', when: ctx => isPostgres(ctx.resource as Container), component: CdcTab }],
    navSections: [
      {
        id: 'connectors',
        label: 'Connectors',
        when: conn => isService(conn, 'kafka'),
        component: ConnectorsSection,
        counter: (_w, conn) => store().connectors.filter(c => c.kafka === conn.id).length,
        order: 5,
      },
    ],
  },
  seed(world): void {
    ensureStore().connectors.push(...seedConnectors());
    world.containers.push(
      serviceContainer('acme-kafka', 'kafka', {
        name: 'acme-connect',
        image: 'quay.io/debezium/connect:3.7',
        ports: [8083],
        env: ['BOOTSTRAP_SERVERS=acme-kafka:9092', 'GROUP_ID=1', 'CONFIG_STORAGE_TOPIC=connect_configs', 'OFFSET_STORAGE_TOPIC=connect_offsets', 'STATUS_STORAGE_TOPIC=connect_statuses'],
        upM: 180,
        group: true,
      }),
    );
  },
};

export default extension;
