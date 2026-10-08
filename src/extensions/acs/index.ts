/**
 * redhat.acs-image-check (proposed) – Red Hat Advanced Cluster Security
 * build-time policy check (`roxctl image check`) as an image checker (P5),
 * with a "Block push on failing policy" setting used by the Quay push flow
 * and the Central API token in Accounts (P16).
 */
import type { MockExtension } from '#lib/ext/types.ts';

import { ACS_ID, acsCheck, CENTRAL, toFindings } from './data.ts';

const extension: MockExtension = {
  id: ACS_ID,
  displayName: 'Red Hat Advanced Cluster Security policy check',
  publisher: 'redhat',
  description: "Check images against your organization's ACS build-time policies before you push.",
  version: '0.1.0',
  icon: 'icons/redhat.acs-image-check.png',
  tags: ['openshift'],
  pApis: ['P5', 'P16'],
  contributes: {
    imageCheckers: [
      {
        id: 'acs',
        label: `ACS policy check (Central: ${CENTRAL.name})`,
        description: `roxctl image check against ${CENTRAL.endpoint} · ACS ${CENTRAL.version} · build-time policies of your organization.`,
        when: image => image.name.includes('/acme/') || image.name.startsWith('localhost/'),
        durationMs: 1400,
        check: image => toFindings(acsCheck(image)),
      },
    ],
    accounts: [{ id: 'acs-central', label: `Advanced Cluster Security (Central ${CENTRAL.name})`, account: 'API token · role Continuous Integration · expires 2027-01-08', signedInByDefault: true }],
    settings: [
      {
        id: 'acs',
        title: 'ACS policy check',
        icon: 'icons/redhat.acs-image-check.png',
        properties: [
          { id: 'acs.endpoint', title: 'Central endpoint (ROX_ENDPOINT)', type: 'string', default: CENTRAL.endpoint },
          { id: 'acs.blockPush', title: 'Block push on failing policy', description: 'Run roxctl image check before pushing and stop when a policy has enforcement FAIL_BUILD_ENFORCEMENT.', type: 'boolean', default: true },
        ],
      },
    ],
  },
};

export default extension;
