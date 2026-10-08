/**
 * RHEL Lightspeed command-line assistant mock data (ext-redhat-lightspeed:
 * container `rhel-lightspeed-podman-desktop` from
 * `quay.io/vrothberg/command-line-assistant:41`, backend
 * `https://cert.console.redhat.com/api/lightspeed/v1/infer`).
 */
export const RL_EXT = 'redhat.rhel-lightspeed';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  references?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  context?: string;
  messages: ChatMessage[];
}

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-01',
    title: 'Enable CodeReady Builder on RHEL 9',
    createdAt: '2026-10-08T07:31:00Z',
    messages: [
      { role: 'user', text: 'How do I enable the CodeReady Builder repo on RHEL 9?' },
      {
        role: 'assistant',
        text: 'Run:\n\n    sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms\n\nThen `dnf repolist` to verify that `codeready-builder-for-rhel-9-x86_64-rpms` is listed.',
        references: ['https://access.redhat.com/articles/4348511'],
      },
    ],
  },
  {
    id: 'conv-02',
    title: 'SELinux denial in orders-api',
    createdAt: '2026-10-08T08:02:41Z',
    context: 'container logs · orders-api',
    messages: [
      { role: 'user', text: 'Explain: SELinux is preventing /usr/bin/python3 from write access on the directory /data' },
      { role: 'assistant', text: 'The bind-mounted host directory lacks the `container_file_t` label. Re-run with `-v ./data:/data:Z`, or relabel it once:\n\n    chcon -Rt container_file_t ./data' },
    ],
  },
];

/** Canned inference: keyword → answer. */
export function answer(question: string): ChatMessage {
  const q = question.toLowerCase();
  if (q.includes('sshd_secure') || q.includes('permitrootlogin')) {
    return {
      role: 'assistant',
      text: 'SSHD_SECURE fires because root can log in over SSH with a password. Disable it in a drop-in and restart sshd:\n\n    sudo sed -i \'s/^PermitRootLogin yes/PermitRootLogin no/\' /etc/ssh/sshd_config.d/01-permitrootlogin.conf\n    sudo systemctl restart sshd\n\nKeep a non-root user in the `wheel` group (for example `core`) before you apply it, then run `sudo insights-client --check-results` to clear the recommendation.',
      references: ['https://access.redhat.com/solutions/7044949', 'https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/securing_networks/assembly_using-secure-communications-between-two-systems-with-openssh_securing-networks'],
    };
  }
  if (q.includes('selinux')) {
    return { role: 'assistant', text: 'Switch SELinux back to enforcing:\n\n    sudo sed -i \'s/^SELINUX=permissive/SELINUX=enforcing/\' /etc/selinux/config\n    sudo touch /.autorelabel && sudo systemctl reboot\n\nThe relabel runs once at boot and can take a few minutes.' };
  }
  if (q.includes('kernel')) {
    return { role: 'assistant', text: 'Update the kernel to the latest z-stream and restart the machine:\n\n    sudo dnf upgrade -y kernel\n    podman machine stop rhel-9 && podman machine start rhel-9\n\n`uname -r` should then print 5.14.0-611.16.1.el9_7.' };
  }
  if (q.includes('nftables') || q.includes('wsl')) {
    return { role: 'assistant', text: 'RHEL 10 uses nftables for netavark. On WSL it needs a kernel built with `CONFIG_NF_TABLES` (WSL 2.6+, kernel 6.6). Check with:\n\n    wsl --version\n    podman machine ssh rhel-10 sudo nft list ruleset' };
  }
  return {
    role: 'assistant',
    text: 'Here is how to approach it on RHEL:\n\n    sudo dnf search <package>\n    sudo dnf install <package>\n\nIf the package lives in an add-on repository, enable it with `subscription-manager repos --enable <repo-id>` first.',
  };
}
