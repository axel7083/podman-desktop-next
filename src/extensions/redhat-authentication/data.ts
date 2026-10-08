/**
 * Mock data shaped like ext-redhat-account (authentication-service.ts,
 * extension.ts) and the RHSM / terms-based-registry APIs. Generic on purpose:
 * the RHEL wave reuses this extension and only extends it.
 */
export const SSO_PROVIDER_ID = 'redhat-sso';

export interface RedHatSession {
  id: string;
  account: { id: string; label: string };
  organizationId: string;
  accountNumber: string;
  scopes: string[];
  expiresAt: string;
}

export const SESSION: RedHatSession = {
  id: '9d6e0b1c-5b2a-4c1e-a7d1-2f4c8e0a1b33',
  account: { id: 'f:528d76ff-f708-43ed-8cd5-fe16f4fe0ce6:jdoe-acme', label: 'jdoe@acme-bank.com' },
  organizationId: '18833012',
  accountNumber: '6301142',
  // default scopes of the real extension + api.ocm / api.console requested by OCM and Sandbox
  scopes: ['openid', 'id.username', 'email', 'api.rhsm', 'api.console', 'api.ocm'],
  expiresAt: '2026-10-08T17:42:00Z',
};

/** Terms-based registry service account → PD registry `registry.redhat.io`. */
export const REGISTRY_SERVICE_ACCOUNT = {
  name: 'podman-desktop',
  description: 'Service account to use from Podman Desktop',
  username: `${SESSION.organizationId}|podman-desktop`,
  created: '2026-03-02T09:14:11Z',
  registry: 'registry.redhat.io',
};

export type ServiceLevel = 'Premium' | 'Standard' | 'Self-Support';
export type Usage = 'Production' | 'Development/Test' | 'Disaster Recovery';
export type Role = 'Red Hat Enterprise Linux Server' | 'Red Hat Enterprise Linux Workstation' | 'Red Hat Enterprise Linux Compute Node';

/** RHSM `GET /api/rhsm/v2/activation_keys` items. */
export interface ActivationKey {
  id: string;
  name: string;
  role: Role;
  usage: Usage;
  serviceLevel: ServiceLevel;
  releaseVersion: string;
  additionalRepositories: { repositoryLabel: string }[];
}

export const ACTIVATION_KEYS: ActivationKey[] = [
  { id: '38291', name: 'podman-desktop', role: 'Red Hat Enterprise Linux Workstation', usage: 'Development/Test', serviceLevel: 'Self-Support', releaseVersion: '', additionalRepositories: [] },
  {
    id: '38292',
    name: 'ci-runners',
    role: 'Red Hat Enterprise Linux Server',
    usage: 'Production',
    serviceLevel: 'Standard',
    releaseVersion: '9.6',
    additionalRepositories: [{ repositoryLabel: 'codeready-builder-for-rhel-9-x86_64-rpms' }],
  },
  { id: '38407', name: 'edge-lab', role: 'Red Hat Enterprise Linux Server', usage: 'Development/Test', serviceLevel: 'Self-Support', releaseVersion: '10.0', additionalRepositories: [] },
];

export interface Subscription {
  sku: string;
  name: string;
  quantity: number;
  consumed: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expiring soon' | 'Expired';
}

export const SUBSCRIPTIONS: Subscription[] = [
  { sku: 'RH00798', name: 'Red Hat Developer Subscription for Individuals', quantity: 16, consumed: 5, startDate: '2026-03-02', endDate: '2027-03-02', status: 'Active' },
  { sku: 'MCT2735', name: 'Red Hat OpenShift Container Platform, Standard (2 cores or 4 vCPUs)', quantity: 64, consumed: 48, startDate: '2026-02-01', endDate: '2027-01-31', status: 'Active' },
];
