/** maas-api shapes (models, api-keys, subscriptions) – opendatahub-io/models-as-a-service. */
export interface MaasModel {
  id: string;
  displayName: string;
  kind: 'LLMInferenceService' | 'ExternalModel';
  contextWindow?: string;
  capabilities: string[];
  subscription: string;
  ready: boolean;
  selected?: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  subscription: string;
  creationDate: string;
  expirationDate?: string;
  status: 'active' | 'revoked' | 'expired';
  lastUsedAt?: string;
}

export interface MaasState {
  usage: { used: number; limit: number; window: string; subscription: string };
  keys: ApiKey[];
}

export const MODELS: MaasModel[] = [
  { id: 'publishers/llm/models/ibm-granite/granite-3-3-8b-instruct', displayName: 'Granite 3.3 8B Instruct', kind: 'LLMInferenceService', contextWindow: '128k', capabilities: ['chat', 'tool-calling'], subscription: 'premium-ai-team', ready: true },
  { id: 'publishers/llm/models/meta-llama/llama-3-3-70b-instruct', displayName: 'Llama 3.3 70B Instruct', kind: 'LLMInferenceService', contextWindow: '128k', capabilities: ['chat'], subscription: 'premium-ai-team', ready: true },
  { id: 'publishers/llm/models/ibm-granite/granite-embedding-125m-english', displayName: 'Granite Embedding 125M', kind: 'LLMInferenceService', capabilities: ['embeddings'], subscription: 'free-tier', ready: true },
  { id: 'gpt-4o', displayName: 'GPT-4o (external)', kind: 'ExternalModel', capabilities: ['chat'], subscription: 'enterprise-gov', ready: false },
];

export const SUBSCRIPTIONS = [
  { name: 'premium-ai-team', model: 'granite-3-3-8b-instruct', limit: 500_000, window: '1h', costCenter: 'CC-4410' },
  { name: 'premium-ai-team', model: 'llama-3-3-70b-instruct', limit: 100_000, window: '1h', costCenter: 'CC-4410' },
  { name: 'free-tier', model: 'granite-embedding-125m-english', limit: 50_000, window: '1h', costCenter: '' },
];

export const SEED: MaasState = {
  usage: { used: 412_380, limit: 500_000, window: 'hour', subscription: 'premium-ai-team' },
  keys: [
    { id: 'a3f1c2e4-7b1d-4c9a-9e10-5d2f0b6a8c11', name: 'kaiden-acme-support-cc', subscription: 'premium-ai-team', creationDate: '2026-10-06T09:12:44Z', expirationDate: '2027-01-04T09:12:44Z', status: 'active', lastUsedAt: '2026-10-08T07:58:02Z' },
    { id: '0c9e7d55-2f3b-4a61-8d4e-91b7c2a0f3de', name: 'laptop-m4-scratch', subscription: 'free-tier', creationDate: '2026-08-14T16:03:10Z', status: 'revoked' },
  ],
};
