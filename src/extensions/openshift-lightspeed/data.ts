/** OLS `POST /v1/query` request/response shapes and kubernetes-mcp-server state. */
import { extData, world } from '#lib/world.svelte.ts';

export const OLS_ID = 'redhat.openshift-lightspeed';

export interface Attachment {
  attachment_type: 'log' | 'configuration' | 'api object';
  content_type: 'text/plain' | 'application/yaml' | 'application/json';
  label: string;
  content: string;
}

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
  attachments?: Attachment[];
  referenced_documents?: { doc_url: string; doc_title: string }[];
  /** Suggested fix action (mock-specific). */
  fix?: { label: string; done?: boolean };
  streaming?: boolean;
  tokens?: { input: number; output: number };
}

export const OLS_CONFIG = {
  cluster: 'ocp-dev',
  defaultProvider: 'rhoai',
  defaultModel: 'granite-4-0-h-small',
  providers: [{ name: 'rhoai', type: 'rhoai_vllm', url: 'https://granite-4-0-h-small-llm.apps.ocp-dev.acme.internal/v1', models: ['granite-4-0-h-small'] }],
};

export const CRASH_ANSWER =
  'The container exits because PostgreSQL rejects the credentials: `FATAL: password authentication failed for user "ledger"`.\n\n' +
  'The Deployment `ledger-worker` reads `DB_PASSWORD` from Secret `ledger-db` (key `password`). That Secret was rotated at 08:55 (label `acme.com/rotated-at`), but the database behind `payments-db` – exposed from your laptop through Service Interconnect – still uses the previous password.\n\n' +
  'Fix: update Secret `ledger-db` with the current password of the `ledger` role, then restart the pod so it picks up the new value:\n\n' +
  '    oc -n ledger create secret generic ledger-db --from-literal=username=ledger --from-literal=password=<current> --dry-run=client -o yaml | oc apply -f -\n' +
  '    oc -n ledger rollout restart deployment/ledger-worker';

export const CRASH_DOCS = [
  { doc_url: 'https://docs.redhat.com/en/documentation/openshift_container_platform/4.22/html/nodes/working-with-pods', doc_title: 'Working with pods' },
  { doc_url: 'https://docs.redhat.com/en/documentation/openshift_container_platform/4.22/html/nodes/working-with-secrets', doc_title: 'Providing sensitive data to pods by using secrets' },
];

export const GENERIC_ANSWER =
  'On OpenShift 4.22 you can check this with `oc get events -n <namespace> --sort-by=.lastTimestamp` and `oc describe` on the object. Attach a pod, PipelineRun or VM with "Ask Lightspeed" to get an answer specific to your cluster.';

export function conversation(): Turn[] {
  return extData<Turn[]>(OLS_ID, 'conversation', []);
}

export interface McpState {
  status: 'running' | 'stopped' | 'starting';
  readOnly: boolean;
  port: number;
  toolsets: string[];
}

/** Read-only accessor (safe in templates). */
export function mcpState(connId: string): McpState {
  const all = world.ext[OLS_ID]?.mcp as Record<string, McpState> | undefined;
  return all?.[connId] ?? { status: 'stopped', readOnly: true, port: 8089, toolsets: ['core', 'config', 'helm'] };
}

export function setMcp(connId: string, patch: Partial<McpState>): void {
  const all = extData<Record<string, McpState>>(OLS_ID, 'mcp', {});
  all[connId] = { ...mcpState(connId), ...patch };
}

export function hasOls(connId: string): boolean {
  return (world.kube[connId] ?? []).some(o => o.kind === 'CustomResourceDefinition' && o.metadata.name === 'olsconfigs.ols.openshift.io');
}
