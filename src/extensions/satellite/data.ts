/** Satellite 6.17 (Katello API) mock data. */
export const SERVER = { url: 'https://satellite.acme.corp', version: '6.17.4', organization: 'ACME', user: 'alice' };
export const ENVIRONMENTS = ['Library', 'Dev', 'QA', 'Prod'];
export const CONTENT_VIEWS = [
  { id: 7, name: 'RHEL9-Base', latest_version: '14.0', environments: ['Library', 'Dev', 'QA', 'Prod'], last_published: '2026-10-01', composite: false },
  { id: 9, name: 'RHEL10-Base', latest_version: '3.0', environments: ['Library', 'Dev'], last_published: '2026-09-24', composite: false },
  { id: 12, name: 'rhel9-apps', latest_version: '22.0', environments: ['Library', 'Prod'], last_published: '2026-10-06', composite: true },
];
export const ACTIVATION_KEYS = [
  { name: 'rhel9-dev', content_view: 'RHEL9-Base', environment: 'Dev', max_hosts: 10, usage_count: 7, service_level: 'Standard' },
  { name: 'rhel10-dev', content_view: 'RHEL10-Base', environment: 'Dev', max_hosts: undefined, usage_count: 2, service_level: 'Standard' },
  { name: 'rhel9-prod', content_view: 'rhel9-apps', environment: 'Prod', max_hosts: 200, usage_count: 188, service_level: 'Premium' },
];
export const REPOS = [
  { path: 'satellite.acme.corp/acme/prod/rhel9-apps/ubi9/python-312', tags: ['latest', '1-58'] },
  { path: 'satellite.acme.corp/acme/prod/rhel9-apps/ubi9/ubi-minimal', tags: ['9.8', 'latest'] },
  { path: 'satellite.acme.corp/acme/dev/rhel9-base/rhel9/postgresql-16', tags: ['latest'] },
];
