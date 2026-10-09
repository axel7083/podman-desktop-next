/**
 * redhat.maas (proposed) – OpenShift AI Models-as-a-Service endpoints as
 * remote inference providers (P9): a `service` connection with the
 * `inference` capability, nav sections (Models, API keys, Subscriptions &
 * quota), SSO account (P16), quota card and status item (P17).
 */
import { faGaugeHigh } from '@fortawesome/free-solid-svg-icons';

import type { ConnectionDef, ConnectionView, MockExtension } from '#lib/ext/types.ts';

import { MAAS, maasUsage } from '../ai-lab/shared.ts';
import Keys from './components/Keys.svelte';
import Models from './components/Models.svelte';
import QuotaCard from './components/QuotaCard.svelte';
import Usage from './components/Usage.svelte';
import { SEED } from './data.ts';

const isMaas = (conn: ConnectionView): boolean => conn.providerId === 'maas';
const icon = 'icons/redhat.maas.png';

function maasConn(id: string, name: string, url: string): ConnectionDef {
  return {
    id,
    name,
    kind: 'service',
    providerId: 'maas',
    providerName: 'Models-as-a-Service',
    initialStatus: 'started',
    endpoint: `${url}/v1`,
    version: 'maas-api v0.4',
    details: { Tenant: 'default', Subscription: 'premium-ai-team', Auth: 'Red Hat SSO (sam@acme.example)', 'Inference type': 'self-hosted', Models: 'granite-3-3-8b-instruct, llama-3-3-70b-instruct' },
    capabilities: ['inference', 'openai-compatible'],
  };
}

const extension: MockExtension = {
  id: MAAS,
  displayName: 'Models-as-a-Service',
  publisher: 'redhat',
  category: 'AI',
  description: "Connect to your company's OpenShift AI MaaS gateway, mint API keys, browse subscribed models and track token quota.",
  version: '0.2.0',
  icon,
  dependsOn: ['redhat.ai-lab'],
  tags: ['ai'],
  pApis: ['P8', 'P9', 'P12', 'P16', 'P17'],
  contributes: {
    connections: [maasConn('maas-rhoai-dev', 'acme MaaS (rhoai-dev)', 'https://maas.apps.rhoai-dev.acme.example')],
    connectionFactories: [
      {
        id: 'maas-endpoint',
        label: 'Models-as-a-Service endpoint',
        providerId: 'maas',
        kind: 'service',
        description: 'An OpenShift AI Models-as-a-Service gateway (or any OpenAI-compatible endpoint).',
        fields: [
          { id: 'name', label: 'Name', type: 'text', default: 'acme MaaS (prod)', required: true },
          { id: 'url', label: 'Gateway URL', type: 'text', default: 'https://maas.apps.ocp-prod.acme.example', required: true },
          { id: 'auth', label: 'Authentication', type: 'select', default: 'sso', options: [{ value: 'sso', label: 'Red Hat SSO / OpenShift token' }, { value: 'key', label: 'Paste an API key' }] },
        ],
        steps: () => [
          { label: 'GET /maas-api/health → 200', ms: 600 },
          { label: 'GET /maas-api/v1/tenants → default', ms: 500 },
          { label: 'GET /maas-api/v1/subscriptions → premium-ai-team', ms: 500 },
          { label: 'GET /maas-api/v1/models → 4 models (3 ready)', ms: 700 },
        ],
        createConnection: (v): ConnectionDef => maasConn(String(v.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'), String(v.name), String(v.url)),
      },
    ],
    navSections: [
      { id: 'maas-models', label: 'Models', icon, when: isMaas, component: Models, order: 1, counter: (): number => 4 },
      { id: 'maas-keys', label: 'API keys', icon, when: isMaas, component: Keys, order: 2 },
      { id: 'maas-usage', label: 'Subscriptions & quota', icon, when: isMaas, component: Usage, order: 3 },
    ],
    accounts: [{ id: 'rhoai-dev-sso', label: 'OpenShift AI (rhoai-dev)', icon, account: 'sam@acme.example', scopes: ['maas:inference', 'maas:api-keys'], signedInByDefault: true }],
    dashboardCards: [{ id: 'maas-quota', title: 'Token quota', component: QuotaCard }],
    statusItems: [
      {
        id: 'maas-quota',
        align: 'right',
        icon: faGaugeHigh,
        text: (): string => {
          const u = maasUsage();
          return u ? `MaaS ${Math.round((u.used / u.limit) * 100)}%` : 'MaaS';
        },
        tooltip: 'MaaS token quota (premium-ai-team, per hour)',
      },
    ],
  },
  seed(world): void {
    world.ext[MAAS] = structuredClone(SEED) as unknown as Record<string, unknown>;
    world.accounts['rhoai-dev-sso'] = true;
  },
};

export default extension;
