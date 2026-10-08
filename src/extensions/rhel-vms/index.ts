/**
 * redhat.rhel-vms – RHEL VMs (macadam) + R4 "Create RHEL Podman machine".
 * Contributes: RHEL VM connections (kind `vm`), the RHEL Podman machine
 * `rhel-9` (engine under the Podman provider), two factories (P12/P18), a
 * Terminal tab on every RHEL connection (P14), the ACME image fixtures.
 */
import { faCopy, faTerminal } from '@fortawesome/free-solid-svg-icons';

import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import type { ConnectionDef, FactoryIssue, FormValues, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { ago, hexId, notify, type TaskStep, toast } from '#lib/world.svelte.ts';

import { ORG_ID, registerLog, setRegistration } from '../rhel-registration/store.ts';
import { ACTIVATION_KEYS, COMPOSES, OFFICIAL_IMAGES, RELEASES, SATELLITE_KEYS } from './data.ts';

const ID = 'redhat.rhel-vms';

const PROVIDERS = [
  { value: 'wsl', label: 'WSL (Windows)' },
  { value: 'hyperv', label: 'Hyper-V (Windows)' },
  { value: 'applehv', label: 'Apple HyperVisor (macOS)' },
  { value: 'libkrun', label: 'GPU enabled – LibKrun (macOS)' },
];

const str = (v: FormValues[string] | undefined): string => String(v ?? '');

function imageFile(v: FormValues): { file: string; sha?: string; size?: number; from: string } {
  if (v.source === 'compose') {
    const c = COMPOSES[str(v.compose)];
    return { file: c?.file ?? 'compose.tar.gz', from: 'Image Builder compose' };
  }
  if (v.source === 'local') return { file: str(v.path).split(/[\\/]/).pop() || 'image', from: 'local file' };
  const img = OFFICIAL_IMAGES.find(i => i.release === v.release && i.provider === (v.provider === 'libkrun' ? 'applehv' : v.provider));
  return { file: img?.file ?? 'rhel.tar.gz', sha: img?.sha256, size: img?.size, from: 'api.access.redhat.com' };
}

function registrationSteps(name: string, v: FormValues, ssh: string): TaskStep[] {
  if (!v.register) return [];
  const target = v.target === 'satellite' ? 'satellite' : 'rhsm';
  return [
    ...(target === 'satellite'
      ? [{ label: 'Install Satellite CA (katello-ca-consumer)', ms: 900, log: [`$ ${ssh} sudo rpm -Uvh http://satellite.acme.corp/pub/katello-ca-consumer-latest.noarch.rpm`] }]
      : []),
    {
      label: `Register with ${target === 'satellite' ? 'Satellite' : 'Red Hat'} (activation key ${str(v.key)})`,
      ms: 2000,
      log: registerLog(name, str(v.key), '7c9e2b14-5d3a-4f81-b6e0-2a9d4c8f1e37', target).map((l, i) => (i === 0 ? `$ ${ssh} ${l.slice(2)}` : l)),
    },
  ];
}

function registrationIssues(v: FormValues): FactoryIssue[] {
  if (!v.register) return [];
  if (v.target === 'satellite' && !SATELLITE_KEYS.includes(str(v.key))) {
    return [{ field: 'key', level: 'error', message: `Activation key '${str(v.key)}' not found on satellite.acme.corp`, suggestion: 'Satellite keys: rhel9-dev (RHEL9-Base · Dev), rhel10-dev (RHEL10-Base · Dev).', fix: { label: 'Use rhel10-dev', values: { key: 'rhel10-dev' } } }];
  }
  if (v.target !== 'satellite' && SATELLITE_KEYS.includes(str(v.key))) {
    return [{ field: 'key', level: 'error', message: `HTTP error (422 - Unprocessable Entity): Activation key '${str(v.key)}' not found for organization '${ORG_ID}'`, fix: { label: 'Use podman-desktop', values: { key: 'podman-desktop' } } }];
  }
  return [];
}

const rhelDetails = (release: string, vmType: string, cpus: string, mem: string, disk: string, image: string): Record<string, string> => ({
  OS: RELEASES[release]?.pretty ?? release,
  'VM type': vmType,
  CPUs: cpus,
  Memory: mem,
  Disk: disk,
  Image: image,
});

const extension: MockExtension = {
  id: ID,
  displayName: 'RHEL VMs',
  publisher: 'redhat',
  description: 'Create Red Hat Enterprise Linux VMs and RHEL Podman machines, registered with your subscription.',
  version: '0.4.0',
  icon: 'icons/redhat.rhel-vms.png',
  dependsOn: ['redhat.redhat-authentication', 'redhat.rhel-registration', 'podman-desktop.podman'],
  tags: ['rhel', 'windows'],
  pApis: ['P1', 'P11', 'P12', 'P14', 'P15', 'P18'],
  contributes: {
    connections: (s): ConnectionDef[] => {
      const win = s.has('windows') || s.has('rhel');
      return [
        {
          id: 'rhel-9',
          name: 'rhel-9',
          kind: 'engine',
          providerId: 'podman',
          providerName: 'Podman',
          engineType: 'podman',
          hint: 'RHEL',
          hintTooltip: 'Red Hat Enterprise Linux 9.7 Podman machine (registered)',
          initialStatus: 'started',
          endpoint: win ? 'npipe:////./pipe/podman-rhel-9' : 'unix:///run/user/1000/podman/rhel-9-api.sock',
          version: '5.6.0',
          details: { ...rhelDetails('rhel-9.8', win ? 'wsl' : 'applehv', '4', '4 GiB', '100 GiB', 'rhel9.tar.gz'), OS: 'Red Hat Enterprise Linux release 9.7 (Plow)', Lifecycle: 'RHEL 9.7 · Near retirement (2026-11-30) · 9.8 available' },
          capabilities: ['podman', 'machine', 'rhel', 'rhel:9.7'],
        },
        {
          id: 'rhel10-dev',
          name: 'rhel10-dev',
          kind: 'vm',
          providerId: 'rhel-vms',
          providerName: 'RHEL VMs',
          hint: win ? 'WSL' : undefined,
          initialStatus: 'started',
          endpoint: 'ssh://core@localhost:50211',
          details: { ...rhelDetails('rhel-10.2', win ? 'wsl' : 'applehv', '4', '4 GiB', '100 GiB', 'rhel10.tar.gz'), OS: 'Red Hat Enterprise Linux release 10.1 (Coughlan)', 'Managed by': 'macadam 0.3.0' },
          capabilities: ['rhel', 'rhel:10.1', 'ssh'],
        },
        {
          id: 'rhel9-db',
          name: 'rhel9-db',
          kind: 'vm',
          providerId: 'rhel-vms',
          providerName: 'RHEL VMs',
          hint: win ? 'Hyper-V' : undefined,
          initialStatus: 'stopped',
          endpoint: 'ssh://core@localhost:50217',
          details: { ...rhelDetails('rhel-9.8', win ? 'hyperv' : 'applehv', '2', '8 GiB', '120 GiB', 'rhel9.tar.gz'), OS: 'Red Hat Enterprise Linux release 9.7 (Plow)', Lifecycle: 'RHEL 9.7 · Near retirement (2026-11-30)', 'Managed by': 'macadam 0.3.0' },
          capabilities: ['rhel', 'rhel:9.7', 'ssh'],
        },
      ];
    },
    connectionFactories: [
      {
        id: 'rhel-podman-machine',
        label: 'Create RHEL Podman machine',
        providerId: 'podman',
        kind: 'engine',
        description: 'A Podman machine running Red Hat Enterprise Linux, registered with your subscription (podman machine init --image).',
        fields: [
          { id: 'name', label: 'Name', type: 'text', default: 'rhel-10', required: true },
          {
            id: 'release',
            label: 'RHEL release',
            type: 'select',
            default: 'rhel-10.2',
            options: [
              { value: 'rhel-10.2', label: 'RHEL 10.2 (Coughlan)' },
              { value: 'rhel-9.8', label: 'RHEL 9.8 (Plow)' },
            ],
          },
          {
            id: 'source',
            label: 'Image source',
            type: 'select',
            default: 'official',
            options: [
              { value: 'official', label: 'Official RHEL image (downloaded with your subscription)' },
              { value: 'compose', label: 'Custom Image Builder compose' },
              { value: 'local', label: 'Local file…' },
            ],
          },
          {
            id: 'compose',
            label: 'Image Builder compose',
            type: 'select',
            default: 'b2f4c1d0-7e3a-4c9b-8a10-3d2e1f0a9b8c',
            options: Object.entries(COMPOSES).map(([value, c]) => ({ value, label: c.label })),
            description: 'Composes built on console.redhat.com (Image Builder tool).',
            visible: v => v.source === 'compose',
          },
          { id: 'path', label: 'Image file', type: 'file', placeholder: 'rhel-10.2-x86_64-wsl.tar.gz', visible: v => v.source === 'local' },
          { id: 'provider', label: 'Provider type', type: 'select', default: 'wsl', options: PROVIDERS },
          { id: 'cpus', label: 'CPU(s)', type: 'slider', default: 4, min: 1, max: 12, unit: 'cores' },
          { id: 'memory', label: 'Memory', type: 'slider', default: 4, min: 2, max: 32, unit: 'GiB' },
          { id: 'disk', label: 'Disk size', type: 'slider', default: 100, min: 20, max: 500, unit: 'GiB' },
          { id: 'rootful', label: 'Machine with root privileges', type: 'checkbox', default: false },
          { id: 'register', label: 'Register the machine automatically (subscription-manager)', type: 'checkbox', default: true },
          {
            id: 'target',
            label: 'Register with',
            type: 'select',
            default: 'rhsm',
            options: [
              { value: 'rhsm', label: 'Red Hat (console.redhat.com · org 19830412)' },
              { value: 'satellite', label: 'Satellite (satellite.acme.corp · org ACME)' },
            ],
            visible: v => v.register === true,
          },
          { id: 'key', label: 'Activation key', type: 'select', default: 'podman-desktop', options: ACTIVATION_KEYS, visible: v => v.register === true },
        ],
        validate: (v): FactoryIssue[] => {
          const issues: FactoryIssue[] = [];
          if (v.provider === 'hyperv' && v.source === 'official') {
            issues.push(
              {
                field: 'provider',
                level: 'error',
                message: 'provider hyperv is not supported',
                suggestion: 'Red Hat publishes official RHEL machine images for WSL, Apple HyperVisor and Linux only. Use a Hyper-V (vhd) image built with Image Builder, or run the machine on WSL.',
                fix: { label: 'Use custom compose', values: { source: 'compose', compose: 'a7e3c9d1-2b4f-4e6a-9c8d-1f2e3d4c5b6a' } },
              },
              { field: 'provider', level: 'info', message: 'WSL is available on this host (WSL 2.6.1, kernel 6.6.87.2).', fix: { label: 'Switch to WSL', values: { provider: 'wsl' } } },
            );
          }
          if (v.source === 'compose') {
            const c = COMPOSES[str(v.compose)];
            if (c && v.provider === 'wsl' && c.type !== 'wsl') {
              issues.push({ field: 'compose', level: 'error', message: `This compose is a ${c.type} image; WSL needs a wsl (.tar.gz) image`, fix: { label: 'Use rhel-wsl-podman v3', values: { compose: 'b2f4c1d0-7e3a-4c9b-8a10-3d2e1f0a9b8c' } } });
            }
            if (c && v.provider === 'hyperv' && c.type !== 'vhd') {
              issues.push({ field: 'compose', level: 'error', message: `This compose is a ${c.type} image; Hyper-V needs a vhd image`, fix: { label: 'Use rhel10-podman-hyperv v1', values: { compose: 'a7e3c9d1-2b4f-4e6a-9c8d-1f2e3d4c5b6a' } } });
            }
          }
          if (v.source === 'local' && !v.path) issues.push({ field: 'path', level: 'error', message: 'Select an image file' });
          if (v.release === 'rhel-10.2' && v.provider === 'wsl') {
            issues.push({ field: 'release', level: 'info', message: 'RHEL 10 on WSL needs kernel 6.6+ for nftables networking', suggestion: 'Detected 6.6.87.2-microsoft-standard-WSL2: supported.' });
          }
          return [...issues, ...registrationIssues(v)];
        },
        steps: (v): TaskStep[] => {
          const name = str(v.name);
          const img = imageFile(v);
          const folder = v.provider === 'wsl' || v.provider === 'hyperv' ? 'C:\\Users\\alice\\AppData\\Roaming\\Podman Desktop\\extensions-storage\\redhat.rhel-vms\\images\\' : '~/.local/share/podman-desktop/extensions-storage/redhat.rhel-vms/images/';
          const ssh = `podman machine ssh ${name}`;
          return [
            {
              label: v.source === 'local' ? `Copy ${img.file}` : `Download ${img.file}${img.size ? ` (${Math.round(img.size / 1048576)} MB)` : ''}`,
              ms: 3000,
              log: v.source === 'official' && img.sha ? [`GET https://api.access.redhat.com/management/v1/images/${img.sha}/download`, `Saving to ${folder}${img.file}`] : [`Source: ${img.from}`],
            },
            { label: `Verify sha256 ${(img.sha ?? hexId(64)).slice(0, 8)}…`, ms: 900, log: ['sha256 checksum OK'] },
            {
              label: 'podman machine init',
              ms: 2200,
              log: [`$ podman machine init --image ${folder}${img.file} --cpus ${str(v.cpus)} --memory ${Number(v.memory) * 1024} --disk-size ${str(v.disk)}${v.rootful ? ' --rootful' : ''} ${name}`, `Machine init complete`],
            },
            { label: `podman machine start ${name}`, ms: 2000, log: [`Starting machine "${name}"`, 'API forwarding listening on: npipe:////./pipe/podman-' + name, `Machine "${name}" started successfully`] },
            ...registrationSteps(name, v, ssh),
          ];
        },
        createConnection: (v): ConnectionDef => {
          const name = str(v.name);
          const rel = RELEASES[str(v.release)] ?? RELEASES['rhel-10.2'];
          const winish = v.provider === 'wsl' || v.provider === 'hyperv';
          return {
            id: name,
            name,
            kind: 'engine',
            providerId: 'podman',
            providerName: 'Podman',
            engineType: 'podman',
            hint: 'RHEL',
            hintTooltip: `${rel.pretty} Podman machine${v.register ? ' (registered)' : ''}`,
            initialStatus: 'started',
            endpoint: winish ? `npipe:////./pipe/podman-${name}` : `unix:///run/user/1000/podman/${name}-api.sock`,
            version: '5.6.0',
            details: rhelDetails(str(v.release), str(v.provider), str(v.cpus), `${str(v.memory)} GiB`, `${str(v.disk)} GiB`, imageFile(v).file),
            capabilities: ['podman', 'machine', 'rhel', `rhel:${rel.version}`],
          };
        },
        onCreated: (world, conn, v): void => {
          const major = str(v.release).startsWith('rhel-10') ? '10' : '9';
          world.images.push(
            mkImage(conn.id, { name: `registry.access.redhat.com/ubi${major}/ubi-minimal`, tag: major === '10' ? '10.2' : '9.8', sizeMB: major === '10' ? 92 : 101, ageD: 2, base: `ubi${major}` }),
            mkImage(conn.id, { name: 'quay.io/podman/hello', tag: 'latest', sizeMB: 0.8, ageD: 40 }),
          );
          world.networks.push({ id: hexId(64), name: 'podman', engineId: conn.id, driver: 'bridge', subnet: '10.88.0.0/16', created: Date.now() });
          if (v.register) {
            const sat = v.target === 'satellite';
            setRegistration(conn.id, {
              status: 'Current',
              target: sat ? 'satellite' : 'rhsm',
              key: str(v.key),
              org: sat ? 'ACME' : ORG_ID,
              consumerUuid: '7c9e2b14-5d3a-4f81-b6e0-2a9d4c8f1e37',
              registeredAt: Date.now(),
              ...(sat ? { contentView: major === '10' ? 'RHEL10-Base' : 'RHEL9-Base', environment: 'Dev' } : {}),
            });
          }
          notify({ type: 'success', title: `${conn.name} is ready`, body: `${conn.details?.OS ?? 'RHEL'} Podman machine${v.register ? ', registered with Red Hat' : ''}.` });
        },
      },
      {
        id: 'rhel-vm',
        label: 'Create RHEL VM',
        providerId: 'rhel-vms',
        kind: 'vm',
        description: 'A Red Hat Enterprise Linux virtual machine managed by macadam, with SSH access.',
        fields: [
          { id: 'name', label: 'Name', type: 'text', default: 'rhel', required: true },
          {
            id: 'image',
            label: 'Image',
            type: 'select',
            default: 'rhel-10.2',
            options: [
              { value: 'rhel-10.2', label: 'RHEL 10' },
              { value: 'rhel-9.8', label: 'RHEL 9' },
              { value: 'local', label: 'Local image on disk' },
            ],
          },
          { id: 'path', label: 'Image path', type: 'file', placeholder: '~/Downloads/composer-api-d4b6e3f2-disk.qcow2', visible: v => v.image === 'local' },
          { id: 'forceDownload', label: 'Force download (ignore cached image)', type: 'checkbox', default: false, visible: v => v.image !== 'local' },
          { id: 'provider', label: 'Provider type', type: 'select', default: 'wsl', options: PROVIDERS.slice(0, 3) },
          { id: 'cpus', label: 'CPU(s)', type: 'slider', default: 4, min: 1, max: 12, unit: 'cores' },
          { id: 'memory', label: 'Memory', type: 'slider', default: 4, min: 2, max: 32, unit: 'GiB' },
          { id: 'disk', label: 'Disk size', type: 'slider', default: 100, min: 20, max: 500, unit: 'GiB' },
          { id: 'register', label: 'Register the VM automatically', type: 'checkbox', default: true },
          { id: 'target', label: 'Register with', type: 'select', default: 'rhsm', options: [{ value: 'rhsm', label: 'Red Hat (console.redhat.com)' }, { value: 'satellite', label: 'Satellite (satellite.acme.corp)' }], visible: v => v.register === true },
          { id: 'key', label: 'Activation key', type: 'select', default: 'podman-desktop', options: ACTIVATION_KEYS, visible: v => v.register === true },
        ],
        validate: (v): FactoryIssue[] => [
          ...(v.image === 'local' && !v.path ? [{ field: 'path', level: 'error' as const, message: 'Select a qcow2/vhd/tar.gz image' }] : []),
          ...registrationIssues(v),
        ],
        steps: (v): TaskStep[] => {
          const name = str(v.name);
          const file = v.image === 'local' ? str(v.path).split(/[\\/]/).pop() : str(v.image).startsWith('rhel-10') ? 'rhel10.tar.gz' : 'rhel9.tar.gz';
          return [
            { label: v.image === 'local' ? `Using local image ${file}` : `Downloading image ${file} (cached: ${v.forceDownload ? 'ignored' : 'no'})`, ms: 2500 },
            { label: 'Creating VM', ms: 1800, log: [`$ macadam init --cpus ${str(v.cpus)} --memory ${Number(v.memory) * 1024} --disk-size ${str(v.disk)} --name ${name} ${file}`] },
            { label: 'Starting VM', ms: 1600, log: [`$ macadam start ${name}`, `Machine "${name}" started successfully`] },
            ...registrationSteps(name, v, `macadam ssh ${name}`),
          ];
        },
        createConnection: (v): ConnectionDef => {
          const local = v.image === 'local';
          const rel = RELEASES[str(v.image)] ?? RELEASES['rhel-10.2'];
          return {
            id: str(v.name),
            name: str(v.name),
            kind: 'vm',
            providerId: 'rhel-vms',
            providerName: 'RHEL VMs',
            hint: v.provider === 'wsl' ? 'WSL' : v.provider === 'hyperv' ? 'Hyper-V' : undefined,
            initialStatus: 'started',
            endpoint: `ssh://core@localhost:${50220 + Math.floor(Math.random() * 60)}`,
            details: { ...rhelDetails(local ? 'rhel-10.2' : str(v.image), str(v.provider), str(v.cpus), `${str(v.memory)} GiB`, `${str(v.disk)} GiB`, local ? str(v.path) : str(v.image).startsWith('rhel-10') ? 'rhel10.tar.gz' : 'rhel9.tar.gz'), 'Managed by': 'macadam 0.3.0' },
            capabilities: ['rhel', `rhel:${local ? '10.2' : rel.version}`, 'ssh'],
          };
        },
        onCreated: (_world, conn, v): void => {
          if (v.register) {
            const sat = v.target === 'satellite';
            setRegistration(conn.id, { status: 'Current', target: sat ? 'satellite' : 'rhsm', key: str(v.key), org: sat ? 'ACME' : ORG_ID, consumerUuid: crypto.randomUUID(), registeredAt: Date.now() });
          }
        },
      },
    ],
    tabs: [
      {
        id: 'terminal',
        label: 'Terminal',
        target: 'connection',
        when: ctx => !!ctx.conn.capabilities?.includes('rhel'),
        component: () => import('./components/RhelTerminalTab.svelte'),
      },
    ],
    menus: [
      {
        id: 'copy-ssh',
        label: 'Copy SSH command',
        icon: faCopy,
        target: 'connection',
        placement: 'details',
        when: ctx => ctx.conn.providerId === 'rhel-vms',
        run: (ctx): void => toast({ type: 'success', title: 'Copied to clipboard', body: `macadam ssh ${ctx.conn.name}` }),
      },
      {
        id: 'open-terminal',
        label: 'Open terminal',
        icon: faTerminal,
        target: 'connection',
        placement: 'details',
        when: ctx => !!ctx.conn.capabilities?.includes('rhel'),
        run: (ctx): void => navigate(`/c/${ctx.conn.id}?tab=terminal`),
      },
    ],
    commands: [
      { id: 'rhel.machine.create', title: 'Create RHEL Podman machine', category: 'RHEL', run: (): void => navigate('/settings/create/rhel-podman-machine') },
      { id: 'rhel.vm.create', title: 'Create RHEL VM', category: 'RHEL', run: (): void => navigate('/settings/create/rhel-vm') },
    ],
    onboarding: [
      {
        id: 'rhel-machine',
        title: 'Run Podman on RHEL',
        steps: [
          { title: 'Sign in to Red Hat', description: 'Your Developer Subscription entitles 16 systems.' },
          { title: 'Create a RHEL Podman machine', description: 'Official RHEL for WSL image, registered automatically.' },
        ],
      },
    ],
  },
  seed(world): void {
    const pm = 'podman-machine-default';
    const acme = { vendor: 'ACME Corp', 'org.opencontainers.image.source': 'https://git.acme.corp/platform/orders-api' };
    world.images.push(
      mkImage(pm, { name: 'quay.io/acme/orders-api', tag: '2.3', sizeMB: 412, ageD: 6, base: 'ubi9/python-311:9.5', labels: { ...acme, 'com.redhat.component': 'python-311-container', 'io.k8s.display-name': 'Python 3.11' }, packages: [{ name: 'glibc', version: '2.34-168.el9_6.14' }, { name: 'openssl-libs', version: '3.2.2-6.el9_5.1' }, { name: 'python3.11', version: '3.11.11-1.el9_5' }] }),
      mkImage(pm, { name: 'quay.io/acme/legacy-portal', tag: '1.9', sizeMB: 638, ageD: 210, base: 'ubi8/nodejs-18', labels: { vendor: 'ACME Corp', 'com.redhat.component': 'nodejs-18-container' } }),
      mkImage(pm, { name: 'quay.io/acme/rhel10-web', tag: '1.4', sizeMB: 1630, ageD: 1, base: 'rhel10/rhel-bootc:10.1', labels: { 'containers.bootc': '1', 'ostree.bootable': 'true', vendor: 'ACME Corp' } }),
      mkImage(pm, { name: 'quay.io/acme/edge-kiosk', tag: '1.1', sizeMB: 1480, ageD: 2, base: 'rhel9/rhel-bootc:9.7', labels: { 'containers.bootc': '1', 'ostree.bootable': 'true', 'io.flightctl.agent': 'v1.3.1', vendor: 'ACME Corp' } }),
      mkImage(pm, { name: 'registry.access.redhat.com/ubi9/ubi-minimal', tag: '9.8', sizeMB: 103, ageD: 2, base: 'ubi9', labels: { vendor: 'Red Hat, Inc.', 'com.redhat.component': 'ubi9-minimal-container' } }),
    );
    world.containers.push(
      mkContainer(pm, { name: 'orders-api', image: 'quay.io/acme/orders-api:2.3', ports: [[8080, 8080]], command: 'gunicorn orders.wsgi:application --bind 0.0.0.0:8080', env: ['ORDERS_DB=postgresql://pg-dev:5432/orders'], upM: 75 }),
    );
    const r9 = 'rhel-9';
    world.images.push(
      mkImage(r9, { name: 'quay.io/vrothberg/command-line-assistant', tag: '41', sizeMB: 287, ageD: 20, base: 'ubi9' }),
      mkImage(r9, { name: 'registry.access.redhat.com/ubi9/ubi', tag: '9.8', sizeMB: 214, ageD: 2, base: 'ubi9', labels: { vendor: 'Red Hat, Inc.' } }),
      mkImage(r9, { name: 'registry.redhat.io/rhel9/postgresql-16', tag: '9.8', sizeMB: 365, ageD: 9, base: 'ubi9', labels: { vendor: 'Red Hat, Inc.' } }),
    );
    world.containers.push(
      mkContainer(r9, { name: 'rhel-lightspeed-podman-desktop', image: 'quay.io/vrothberg/command-line-assistant:41', command: 'clad', upM: 42 }),
      mkContainer(r9, { name: 'orders-db', image: 'registry.redhat.io/rhel9/postgresql-16:9.8', ports: [5432], env: ['POSTGRESQL_DATABASE=orders', 'POSTGRESQL_USER=orders'], upM: 300 }),
    );
    world.volumes.push({ name: 'orders-pgdata', engineId: r9, size: 48 * 1048576, created: ago({ d: 5 }), mountpoint: '/var/home/user/.local/share/containers/storage/volumes/orders-pgdata/_data' });
    world.networks.push({ id: hexId(64), name: 'podman', engineId: r9, driver: 'bridge', subnet: '10.88.0.0/16', created: ago({ d: 20 }) });
  },
};

export default extension;
