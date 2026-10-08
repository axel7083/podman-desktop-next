/**
 * redhat.openshift-checker – Containerfile directives that misbehave under
 * OpenShift's restricted SCC (P5, structured with `ruleId` + line).
 */
import type { CheckerDef, Finding, MockExtension } from '#lib/ext/types.ts';
import type { ContainerImage } from '#lib/world.svelte.ts';

const FINDINGS: Record<string, Finding[]> = {
  'quay.io/acme/orders-api': [
    { id: 'user-root', ruleId: 'user-root (line 28)', title: 'USER directive set to root at line 28: OpenShift runs containers with an arbitrarily assigned user ID', severity: 'high' },
    { id: 'chmod-permissions', ruleId: 'chmod-permissions (lines 10-18)', title: '`chmod 700 /app` at line 10-18: directories must be read/writable by the root group', severity: 'medium' },
  ],
  'quay.io/acme/legacy-portal': [{ id: 'expose-privileged-port', ruleId: 'expose-privileged-port (line 14)', title: 'EXPOSE 80: ports below 1024 require privileges not granted by restricted-v2 SCC', severity: 'medium' }],
};

const check = (i: ContainerImage): Finding[] => (i.base?.startsWith('hummingbird') ? [] : (FINDINGS[i.name] ?? []));

const checker: CheckerDef = {
  id: 'openshift',
  label: 'OpenShift readiness',
  description: 'Checks the image history for USER root, chmod/chown without root group and privileged ports.',
  durationMs: 900,
  check,
  summary: (_i, f) => (f.length ? `${f.length} directive${f.length > 1 ? 's' : ''} may break under restricted-v2 SCC` : 'OpenShift ready'),
};

const extension: MockExtension = {
  id: 'redhat.openshift-checker',
  displayName: 'Red Hat OpenShift Checker',
  publisher: 'redhat',
  category: 'Security & supply chain',
  description: "Flags Containerfile directives that misbehave under OpenShift's restricted SCC (arbitrary UID, root group).",
  version: '0.2.0',
  icon: 'icons/redhat.openshift-checker.png',
  tags: ['rhel', 'platform'],
  pApis: ['P5'],
  contributes: { imageCheckers: [checker] },
};

export default extension;
