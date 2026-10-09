/** podman-desktop.kubectl-cli – built-in kubectl CLI installer (P17 CLI lifecycle). */
import type { MockExtension } from '#lib/ext/types.ts';

const extension: MockExtension = {
  id: 'podman-desktop.kubectl-cli',
  displayName: 'kubectl CLI',
  publisher: 'podman-desktop',
  category: 'Kubernetes & OpenShift',
  description: 'Install and update the kubectl command-line tool.',
  version: '1.29.0',
  icon: 'icons/podman-desktop.kubectl-cli.png',
  builtin: true,
  tags: ['community'],
  pApis: ['P17'],
  contributes: {
    cliTools: [
      {
        id: 'kubectl',
        name: 'kubectl',
        displayName: 'kubectl',
        description: 'kubectl is the Kubernetes command-line tool to run commands against clusters.',
        version: '1.34.1',
        latest: '1.34.1',
        path: '/usr/local/bin/kubectl',
      },
    ],
  },
};

export default extension;
