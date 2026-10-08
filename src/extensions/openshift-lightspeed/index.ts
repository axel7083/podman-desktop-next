/**
 * redhat.openshift-lightspeed (proposed) – OpenShift Lightspeed chat scoped to
 * a cluster, "Ask Lightspeed" on pods / PipelineRuns / VMs attaching YAML and
 * logs (P4, P14), and an MCP tab running kubernetes-mcp-server for the
 * connection's context (P9).
 */
import { faCommentDots } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension, ResourceContext } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import type { KubeObject } from '#lib/world.svelte.ts';

import LightspeedTool from './components/LightspeedTool.svelte';
import McpTab from './components/McpTab.svelte';
import { OLS_ID } from './data.ts';

const ASKABLE = ['Pod', 'PipelineRun', 'VirtualMachine', 'Deployment'];

function ask(ctx: ResourceContext): void {
  const o = ctx.resource as KubeObject;
  navigate(`/tools/lightspeed?conn=${ctx.conn.id}&about=${encodeURIComponent(`${o.kind}~${o.metadata.namespace ?? '_'}~${o.metadata.name}`)}`);
}

const askMenu = (placement: 'kebab' | 'details'): NonNullable<MockExtension['contributes']['menus']>[number] => ({
  id: `ols-ask-${placement}`,
  label: 'Ask Lightspeed',
  icon: faCommentDots,
  target: 'kube-resource',
  placement,
  when: ctx => !!ctx.conn.capabilities?.includes('openshift') && 'kind' in ctx.resource && ASKABLE.includes((ctx.resource as KubeObject).kind),
  run: ask,
});

const extension: MockExtension = {
  id: OLS_ID,
  displayName: 'OpenShift Lightspeed',
  publisher: 'redhat',
  description: 'Ask OpenShift Lightspeed about the active cluster, with kubernetes-mcp-server giving agents scoped access to the same context.',
  version: '0.1.0',
  icon: 'icons/redhat.openshift-lightspeed.png',
  tags: ['openshift'],
  pApis: ['P4', 'P9', 'P14'],
  contributes: {
    tools: [{ id: 'lightspeed', label: 'Lightspeed', icon: 'icons/redhat.openshift-lightspeed.png', description: 'OpenShift Lightspeed chat for the selected cluster', component: LightspeedTool }],
    menus: [askMenu('kebab'), askMenu('details')],
    tabs: [{ id: 'mcp', label: 'MCP', target: 'connection', when: ctx => ctx.conn.kind === 'kubernetes', component: McpTab }],
  },
};

export default extension;
