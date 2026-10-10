<script lang="ts">
/**
 * OpenShift Console add-on, MicroShift-in-Container (minc) only (`caps.consoleAddon`):
 * install task (console Deployment + port-forward), then a
 * warning that authentication is disabled and the link to open it.
 */
import { faArrowUpRightFromSquare, faDownload, faTrash, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import { conn, type LabTarget } from '../data.ts';
import Btn from './Btn.svelte';
import Card from './Card.svelte';
import { flows, runTask } from './flows.svelte.ts';
import Head from './Head.svelte';
import KV from './KV.svelte';
import ResourcesCard from './ResourcesCard.svelte';

interface Props {
  connId: string;
  onopen: (t: LabTarget, opts: { preview?: boolean }) => void;
}

let { connId, onopen }: Props = $props();

const c = $derived(conn(connId));
const st = $derived(flows.console[connId]);
const url = 'http://localhost:9000';
const IMAGE = 'quay.io/openshift/origin-console:4.20';

function install(): void {
  flows.console[connId] = 'installing';
  runTask({
    title: 'Install console',
    connId,
    icon: 'icons/redhat.openshift-cluster-manager.svg',
    label: 'OpenShift Console add-on',
    target: { kind: 'node', connId, nodeId: `console@${connId}` },
    cmd: `kubectl apply -n openshift-console -f console-addon.yaml`,
    lines: [
      'namespace/openshift-console created',
      'serviceaccount/console created',
      'clusterrolebinding.rbac.authorization.k8s.io/console-cluster-admin created',
      `deployment.apps/console created (image ${IMAGE}, --user-auth=disabled)`,
      'service/console created',
      'deployment "console" successfully rolled out',
      '$ kubectl port-forward -n openshift-console svc/console 9000:9000',
      'Forwarding from 127.0.0.1:9000 -> 9000',
      `✔ OpenShift Console available at ${'http://localhost:9000'}`,
    ],
    done: () => void (flows.console[connId] = 'installed'),
  });
}
</script>

{#snippet actions()}
  {#if st === 'installed'}
    <Btn icon={faTrash} onclick={(): void => void delete flows.console[connId]}>Uninstall</Btn>
    <Btn kind="primary" icon={faArrowUpRightFromSquare} testid="console-open" onclick={(): void => void window.open(url, '_blank', 'noreferrer')}>Open console</Btn>
  {:else}
    <Btn kind="primary" icon={faDownload} testid="console-install" disabled={st === 'installing'} onclick={install}>{st === 'installing' ? 'Installing…' : 'Install console'}</Btn>
  {/if}
{/snippet}

<div data-testid="console-view" data-state={st ?? 'none'} class="flex flex-col h-full min-h-0">
  <Head icon="icons/redhat.openshift-cluster-manager.svg" title="OpenShift Console" status={st === 'installed' ? 'running' : st === 'installing' ? 'starting' : undefined} {connId} onconn={(): void => onopen({ kind: 'connection', connId }, {})} provenance="OpenShift Console" {actions} />
  <div class="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
    {#if st === 'installed'}
      <div data-testid="console-auth-warning" class="flex gap-2 p-3 rounded-lg bg-[color-mix(in_srgb,var(--pd-status-degraded)_14%,transparent)] text-[13px]">
        <span class="pt-0.5 text-[var(--pd-status-degraded)]"><AppIcon icon={faTriangleExclamation} /></span>
        <span class="text-[var(--pd-content-header)]">Authentication is disabled. The console runs with a cluster-admin service account: anyone who can reach {url} on this computer can manage {c?.name}. Use it for local development only.</span>
      </div>
    {/if}
    {#if !st}
      <p class="text-[13px] text-[var(--pd-table-body-text)] max-w-2xl">Install the OpenShift web console on {c?.name} to browse workloads, logs, events and the topology view in your browser. Podman Desktop deploys the console in the <span class="font-mono text-[12px]">openshift-console</span> namespace and forwards it to localhost.</p>
    {/if}
    <div class="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-4 items-start">
      <Card title="Details">
        <KV
          rows={[
            { k: 'Cluster', v: c?.name, onclick: (): void => onopen({ kind: 'connection', connId }, {}) },
            { k: 'Status', v: st === 'installed' ? 'Running' : st === 'installing' ? 'Installing' : 'Not installed' },
            { k: 'URL', v: st === 'installed' ? url : '—', href: st === 'installed' ? url : undefined },
            { k: 'Image', v: IMAGE, mono: true },
            { k: 'Authentication', v: 'Disabled (--user-auth=disabled)' },
          ]} />
      </Card>
      <ResourcesCard id="openshift-console" />
    </div>
  </div>
</div>
