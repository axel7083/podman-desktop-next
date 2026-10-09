/**
 * podman-desktop.kube-context – built-in: shows the current Kubernetes context
 * in the status bar and lets the user switch it (P1 context ↔ connection).
 */
import { faRightLeft } from '@fortawesome/free-solid-svg-icons';

import { registry } from '#lib/ext/registry.svelte.ts';
import type { MockExtension } from '#lib/ext/types.ts';
import KubeIcon from '#lib/images/KubeIcon.svelte';
import { toast, world } from '#lib/world.svelte.ts';

function kubeConnections(): string[] {
  return registry.activeConnections.filter(c => c.kind === 'kubernetes').map(c => c.name);
}

const extension: MockExtension = {
  id: 'podman-desktop.kube-context',
  displayName: 'Kube Context',
  publisher: 'podman-desktop',
  category: 'Kubernetes & OpenShift',
  description: 'Display and switch the current Kubernetes context from the status bar.',
  version: '1.29.0',
  icon: 'icons/podman-desktop.kube-context.png',
  builtin: true,
  tags: ['community'],
  pApis: ['P1'],
  contributes: {
    statusItems: [
      {
        id: 'current-context',
        align: 'left',
        icon: KubeIcon,
        text: (w): string => w.currentKubeContext ?? kubeConnections()[0] ?? 'No context',
        tooltip: 'Current Kubernetes context – click to switch',
        command: 'kube-context.switch',
      },
    ],
    commands: [
      {
        id: 'kube-context.switch',
        title: 'Switch Kubernetes context',
        category: 'Kubernetes',
        icon: faRightLeft,
        run: (): void => {
          const names = kubeConnections();
          if (names.length === 0) {
            toast({ type: 'warning', title: 'No Kubernetes context available' });
            return;
          }
          const current = world.currentKubeContext ?? names[0];
          const next = names[(names.indexOf(current) + 1) % names.length];
          world.currentKubeContext = next;
          toast({ type: 'info', title: `Switched Kubernetes context to ${next}` });
        },
      },
    ],
    settings: [
      {
        id: 'kubernetes',
        title: 'Kubernetes',
        properties: [
          { id: 'kubernetes.Kubeconfig', title: 'Path to the kubeconfig file', type: 'string', default: '~/.kube/config' },
          { id: 'kubernetes.statesExperimental', title: 'Monitor all contexts', type: 'boolean', default: false },
        ],
      },
    ],
  },
};

export default extension;
