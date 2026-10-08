/**
 * redhat.openshift-cli-pack (proposed) – installs, updates and puts on PATH
 * the OpenShift command-line tools (P17 CLI lifecycle). Featured tools appear
 * in Settings › CLI Tools; the full pack and the cluster version-skew matrix
 * live in Settings › OpenShift CLI.
 */
import { faDownload, faTerminal } from '@fortawesome/free-solid-svg-icons';

import type { MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import CliPackSettings from './components/CliPackSettings.svelte';
import { BIN_DIR, CLI_PACK_ID, installedVersion, installTool, TOOLS } from './data.ts';

const extension: MockExtension = {
  id: CLI_PACK_ID,
  displayName: 'OpenShift CLI Tools',
  publisher: 'redhat',
  description: 'Install, update and put on PATH the OpenShift command-line tools, matched to your clusters.',
  version: '0.4.0',
  icon: 'icons/redhat.openshift-cli-pack.svg',
  tags: ['openshift'],
  pApis: ['P17'],
  contributes: {
    cliTools: TOOLS.filter(t => t.featured).map(t => ({
      id: t.name,
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      version: t.installed,
      latest: t.latest,
      path: `${BIN_DIR}/${t.name}`,
    })),
    settings: [{ id: 'openshift-cli', title: 'OpenShift CLI', icon: 'icons/redhat.openshift-cli-pack.svg', component: CliPackSettings }],
    commands: [
      {
        id: 'openshift-cli.install-recommended',
        title: 'Install recommended OpenShift CLI tools',
        category: 'OpenShift CLI',
        icon: faDownload,
        run: (): void => {
          for (const t of TOOLS.filter(x => x.recommended && installedVersion(x.name) !== x.latest)) installTool(t.name);
        },
      },
      { id: 'openshift-cli.open', title: 'Open OpenShift CLI tools', category: 'OpenShift CLI', icon: faTerminal, run: (): void => navigate('/settings/openshift-cli') },
    ],
  },
};

export default extension;
