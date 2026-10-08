/**
 * redhat.aap – Ansible Automation Platform 2.7 as a service connection (P8):
 * job templates / jobs / inventories nav sections (P2), job launch + live
 * stdout, AAP token account (P16), "MCP server" connection tab registering
 * the AAP MCP server for agents (P9) and an "AAP jobs" dashboard card.
 */
import { faList, faRocket } from '@fortawesome/free-solid-svg-icons';

import { openDialog } from '#lib/dialog.svelte.ts';
import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import Inventories from './components/Inventories.svelte';
import JobsCard from './components/JobsCard.svelte';
import Jobs from './components/Jobs.svelte';
import JobTemplates from './components/JobTemplates.svelte';
import LaunchDialog from './components/LaunchDialog.svelte';
import McpTab from './components/McpTab.svelte';
import { AAP_ID, AAP_URL, CONN_ID, MCP_URL, store } from './data.ts';

/** Read-only count (counters render inside deriveds: never seed state there). */
function count(list: unknown): number | undefined {
  return Array.isArray(list) ? list.length : undefined;
}

const extension: MockExtension = {
  id: AAP_ID,
  displayName: 'Ansible Automation Platform',
  publisher: 'redhat',
  description: 'Connect to your AAP, launch job templates and follow job output, and expose AAP to your AI agents through the AAP MCP server.',
  version: '0.2.0',
  icon: 'icons/redhat.aap.png',
  dependsOn: ['redhat.ansible'],
  tags: ['automation'],
  pApis: ['P2', 'P8', 'P9', 'P16', 'P17'],
  contributes: {
    connections: [
      {
        id: CONN_ID,
        name: 'acme-prod',
        kind: 'service',
        providerId: 'aap',
        providerName: 'Ansible Automation Platform',
        initialStatus: 'started',
        endpoint: AAP_URL,
        version: '2.7.1',
        details: {
          User: 'alice.dev',
          'Gateway API': '/api/controller/v2',
          'MCP server': `${MCP_URL} (read-only)`,
          Organization: 'ACME',
        },
        capabilities: ['aap'],
      },
    ],
    navSections: [
      {
        id: 'aap-templates',
        label: 'Job templates',
        when: (conn): boolean => !!conn.capabilities?.includes('aap'),
        component: JobTemplates,
        counter: (world): number | undefined => count(world.ext[AAP_ID]?.templates),
        order: 1,
      },
      {
        id: 'aap-jobs',
        label: 'Jobs',
        when: (conn): boolean => !!conn.capabilities?.includes('aap'),
        component: Jobs,
        counter: (world): number | undefined => count(world.ext[AAP_ID]?.jobs),
        order: 2,
      },
      {
        id: 'aap-inventories',
        label: 'Inventories',
        when: (conn): boolean => !!conn.capabilities?.includes('aap'),
        component: Inventories,
        counter: (world): number | undefined => count(world.ext[AAP_ID]?.inventories),
        order: 3,
      },
    ],
    tabs: [
      {
        id: 'aap-mcp',
        label: 'MCP server',
        target: 'connection',
        when: (ctx): boolean => !!ctx.conn.capabilities?.includes('aap'),
        component: McpTab,
      },
    ],
    accounts: [
      {
        id: 'aap-acme-prod',
        label: 'Ansible Automation Platform',
        icon: 'icons/redhat.aap.png',
        account: 'alice.dev @ aap.acme-corp.com',
        scopes: ['read', 'write'],
        signedInByDefault: true,
      },
    ],
    dashboardCards: [{ id: 'aap-jobs', title: 'AAP jobs', component: JobsCard }],
    commands: [
      {
        id: 'aap.launch',
        title: 'Launch job template',
        category: 'AAP',
        icon: faRocket,
        run: (): void => {
          navigate(`/c/${CONN_ID}/aap-templates`);
          openDialog(LaunchDialog, { templateId: 12 });
        },
      },
      { id: 'aap.jobs', title: 'Open jobs', category: 'AAP', icon: faList, run: (): void => navigate(`/c/${CONN_ID}/aap-jobs`) },
    ],
  },
  seed(): void {
    store();
  },
};

export default extension;
