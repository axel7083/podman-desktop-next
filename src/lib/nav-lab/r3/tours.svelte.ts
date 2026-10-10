/**
 * P13 guided tours of the 8 Red Hat workflows (docs/p13-red-hat-flows.md):
 * the dashboard "Red Hat workflows" cards and the "Tour: …" palette entries
 * start them, `r3/TourOverlay.svelte` plays them. A step highlights an
 * existing element (data-testid / tree key), says why, and advances when its
 * `done` condition holds (or when the highlighted element is clicked). "Show
 * me" performs each step itself. `ensure` (tour-wide and per step) puts the
 * app in the state the step needs (connection, expanded tree, extension
 * installed, tab open), so a tour can't get stuck.
 */
import type { LabTarget } from '../data.ts';
import { RESOURCES } from '../data.ts';
import { lab } from '../lab.svelte.ts';
import { AI_CONN, aiState, aiTarget } from './ai.ts';
import { installExt } from './exts.ts';
import { flows, signIn, signOut } from './flows.svelte.ts';

export interface TourStep {
  title: string;
  /** Why this step matters (shown in the callout). */
  why: string;
  /** CSS selector of the element to highlight, or a finder. */
  target: string | (() => HTMLElement | null | undefined);
  /** The target must contain this text. */
  text?: string;
  /** `click` (default): the user acts on the target; `wait`: a task runs; `info`: read and press Next. */
  kind?: 'click' | 'wait' | 'info';
  /** The step is complete (polled). Without it, a click on the target completes a `click` step. */
  done?: () => boolean;
  /** "Show me" / Next action (default: click the target). */
  act?: (el: HTMLElement) => void;
  /** State the step needs (run when the step starts and again if its target is missing). */
  ensure?: () => void;
  /** Skip the step when its target does not show up. */
  optional?: boolean;
}

export interface Tour {
  id: string;
  title: string;
  /** One-line outcome. */
  outcome: string;
  /** Product logos, in flow order. */
  logos: [string, string][];
  /** Run once when the tour starts. */
  start?: () => void;
  /** Run before every step. */
  ensure?: () => void;
  steps: TourStep[];
}

/** P13 callbacks the tours drive (registered by P13.svelte). */
export interface TourHost {
  open: (t: LabTarget) => void;
  /** Make a connection current (no-op when it already is). */
  select: (connId: string) => void;
  /** Expand tree rows of a connection. */
  expand: (connId: string, keys: string[]) => void;
}

class TourState {
  id = $state<string | undefined>(undefined);
  i = $state(0);
  showme = $state(false);
  done = $state(false);
  /** Set by Back: the step is shown even if its condition already holds. */
  hold = $state(false);
  host: TourHost | undefined;
}

export const tour = new TourState();

/* ------------------------------------------------------------------ helpers */

const PMD = 'podman-machine-default';
const BOOTC = `bootc@${PMD}`;
const AILAB = `ai-lab@${PMD}`;
const MODEL = 'granite-3.3-8b-instruct';
const IMAGE = 'quay.io/acme/orders-api:1.4';

function visible(el: Element): el is HTMLElement {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

export function has(sel: string, text?: string): boolean {
  return [...document.querySelectorAll(sel)].some(el => visible(el) && (!text || (el.textContent ?? '').includes(text)));
}

/** First visible element matching the step target. */
export function findTarget(s: TourStep): HTMLElement | undefined {
  if (typeof s.target === 'function') return s.target() ?? undefined;
  return [...document.querySelectorAll(s.target)].find((el): el is HTMLElement => visible(el) && (!s.text || (el.textContent ?? '').includes(s.text)));
}

const treeKey = (k: string): string => `[data-testid="p13-tree"] [data-key="${k}"]`;
const treeItem =
  (name: string) =>
  (): HTMLElement | undefined =>
    [...document.querySelectorAll<HTMLElement>('[data-testid="p13-tree"] [role="treeitem"]')].find(el => el.querySelector('.truncate')?.textContent?.trim() === name);
const panelHas = (text: string): boolean => (document.querySelector('[data-testid="nav-lab-panel-body"]')?.textContent ?? '').includes(text);
const modalIs = (kind: string): boolean => flows.modal?.kind === kind;
const noModal = (): boolean => !flows.modal;
const chainHas = (image: string, step: string): boolean => (flows.chain[image] ?? []).some(e => e.step === step);
const install = (...ids: string[]): void => ids.forEach(installExt);
const ensureSignedIn = (): void => {
  if (!flows.account) signIn();
};
function rightClick(el: HTMLElement): void {
  const r = el.getBoundingClientRect();
  el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 24, clientY: r.top + r.height / 2 }));
}
const menuItem =
  (label: string) =>
  (): HTMLElement | undefined =>
    [...document.querySelectorAll<HTMLElement>('[data-testid="nav-lab-context-menu"] [role="menuitem"]')].find(el => (el.textContent ?? '').includes(label));
const resTarget = (connId: string, sectionId: string, name: string): LabTarget | undefined => {
  const r = RESOURCES.find(x => x.connId === connId && x.sectionId === sectionId && x.name === name);
  return r ? { kind: 'resource', connId, sectionId, resId: r.id } : undefined;
};
const openRes = (connId: string, sectionId: string, name: string) => (): void => {
  const t = resTarget(connId, sectionId, name);
  if (t) tour.host?.open(t);
};
const primary = (title: string, why: string, done: () => boolean = noModal): TourStep => ({ title, why, target: '[data-testid="modal-primary"]', done });
const wait = (title: string, why: string, target: string, done: () => boolean): TourStep => ({ title, why, target, kind: 'wait', done });

/* ------------------------------------------------------------------ tours */

export const TOURS: Tour[] = [
  {
    id: 'account',
    title: 'Red Hat account',
    outcome: 'One sign-in unlocks registry.redhat.io, subscriptions, activation keys and the Developer Sandbox.',
    logos: [
      ['icons/redhat.redhat-authentication.png', 'Red Hat Authentication'],
      ['icons/podman-desktop.registries.png', 'registry.redhat.io'],
      ['icons/redhat.redhat-sandbox.png', 'Developer Sandbox'],
    ],
    start: (): void => {
      install('redhat-account');
      if (flows.account) signOut();
    },
    steps: [
      { title: 'Open Accounts', why: 'Every Red Hat sign-in lives in one place, in the title bar.', target: 'button[aria-label="Accounts"]', done: () => has('[data-testid="accounts-signin"]') },
      { title: 'Sign in with Red Hat', why: 'One SSO session is reused by every Red Hat extension.', target: '[data-testid="accounts-signin"]', done: () => modalIs('rh-signin') },
      primary('Continue in the browser', 'Red Hat SSO runs in your browser; Podman Desktop then configures the registry and keys.', () => has('[data-testid="modal-primary"]', 'Done')),
      primary('Finish', 'registry.redhat.io, subscriptions and activation keys are now configured.', () => !!flows.account && noModal()),
      { title: 'Activation keys ready', why: 'RHEL machines and VMs register with these keys, no copy-paste.', target: '[data-testid="rh-keys"]', kind: 'info' },
    ],
  },
  {
    id: 'rhel-machine',
    title: 'RHEL Podman machine',
    outcome: 'A subscribed RHEL 10 machine running Podman, made the current connection.',
    logos: [
      ['icons/redhat.redhat-authentication.png', 'Red Hat Authentication'],
      ['icons/redhat.rhel-vms.png', 'RHEL VMs'],
      ['icons/podman-desktop.podman.png', 'Podman'],
    ],
    start: (): void => {
      install('rhel', 'rhel-vms', 'redhat-account');
      ensureSignedIn();
    },
    steps: [
      { title: 'Open the connection switcher', why: 'New engines and clusters are added from the switcher.', target: '[data-testid="switcher-button"]', done: () => has('[data-testid="switcher-add"]') || flows.modal !== undefined },
      { title: 'Add connection', why: 'Every connection type contributed by an extension is listed here.', target: '[data-testid="switcher-add"]', done: () => !!flows.modal },
      { title: 'RHEL Podman machine', why: 'Contributed by the RHEL VMs extension.', target: '[data-factory="rhel-machine"]', done: () => modalIs('rhel-machine') },
      { title: 'Pick a provider', why: 'WSL, Hyper-V or applehv; incompatible choices explain the fix.', target: '[data-testid="rhel-provider"]', kind: 'info' },
      primary('Create', 'Downloads the official image, starts the machine and registers it with your activation key.'),
      wait('Watch the task', 'The task streams in the bottom panel; the machine becomes the current connection.', '[data-testid="nav-lab-panel-body"]', () => panelHas('is ready')),
    ],
  },
  {
    id: 'lightspeed',
    title: 'RHEL Lightspeed',
    outcome: 'Explain a failed command in the terminal and run the suggested fix.',
    logos: [
      ['icons/redhat.rhel-registration.png', 'RHEL'],
      ['icons/redhat.rhel-lightspeed.png', 'RHEL Lightspeed'],
    ],
    ensure: (): void => {
      install('rhel', 'lightspeed');
      lab.panel = true;
    },
    steps: [
      { title: 'Open the rhel-10 terminal', why: 'A dnf install just failed: the system is not registered.', target: '[data-testid="panel-tab"]', text: 'rhel-10', done: () => has('[data-testid="ask-lightspeed-failed"]') || has('[data-testid="lightspeed-chat"]') },
      { title: 'Ask Lightspeed', why: 'The failed command and its output are sent as context.', target: '[data-testid="ask-lightspeed-failed"]', done: () => has('[data-testid="lightspeed-chat"]') },
      wait('Read the answer', 'Answers cite docs.redhat.com and suggest a command.', '[data-testid="lightspeed-chat"]', () => has('[data-testid="ls-msg"][data-role="assistant"][data-done]')),
      { title: 'Run in terminal', why: 'Runs the suggested command on the same connection.', target: '[data-testid="ls-run"]' },
    ],
  },
  {
    id: 'supply-chain',
    title: 'Image supply chain',
    outcome: 'Scan, sign and push an image to Quay, then deploy it to OpenShift with its provenance.',
    logos: [
      ['icons/redhat.hummingbird.png', 'Hummingbird'],
      ['icons/podman-desktop.grype.png', 'Grype'],
      ['icons/redhat.quay.png', 'Quay'],
      ['icons/redhat.trusted-artifact-signer.png', 'Trusted Artifact Signer'],
      ['icons/redhat.openshift-local.png', 'OpenShift'],
    ],
    ensure: (): void => {
      install('grype', 'hummingbird', 'openshift-checker', 'quay', 'tas', 'openshift-local');
      tour.host?.select(PMD);
      tour.host?.expand(PMD, ['images']);
    },
    steps: [
      { title: `Open ${IMAGE}`, why: 'The image Summary shows its provenance: built → scanned → signed → pushed → deployed.', target: treeItem(IMAGE), done: () => has('[data-testid="provenance-timeline"]') },
      { title: 'Rebase on Hummingbird', why: 'When a hardened, zero-CVE base exists, rebuild on it first.', target: 'button[aria-label^="Rebase on Hummingbird"]', kind: 'info', optional: true },
      { title: 'Scan', why: 'Grype finds known CVEs; the result gates the push.', target: '[data-step="scanned"] [data-testid="timeline-action"]', done: () => chainHas(IMAGE, 'scanned'), ensure: openRes(PMD, 'images', IMAGE) },
      { title: 'Push to Quay', why: 'Push and sign in one step.', target: '[data-step="pushed"] [data-testid="timeline-action"]', done: () => modalIs('push-quay') || chainHas(IMAGE, 'pushed'), ensure: openRes(PMD, 'images', IMAGE) },
      primary('Push and sign', 'Gates show Grype and OpenShift checks; Trusted Artifact Signer signs keylessly.', () => noModal() || chainHas(IMAGE, 'pushed')),
      wait('Pushed and signed', 'The timeline links to the Rekor entry and the Quay tag.', '[data-step="pushed"]', () => chainHas(IMAGE, 'pushed')),
      { title: 'Deploy to…', why: 'Deploy the pushed image to a cluster.', target: '[data-step="deployed"] [data-testid="timeline-action"]', done: () => modalIs('deploy'), ensure: openRes(PMD, 'images', IMAGE) },
      { title: 'Pick a target', why: 'Developer Sandbox, OpenShift Local, minc or kind; the manifests adapt (Route or Ingress).', target: '[data-testid="deploy-target"]', kind: 'info' },
      primary('Deploy', 'Applies the Deployment, Service and Route, then waits for the rollout.'),
      wait('Rolling out', 'The task output streams in the bottom panel.', '[data-testid="nav-lab-panel-body"]', () => panelHas('is available at')),
      { title: 'Open the Deployment', why: 'The timeline links to the deployed resource on the cluster.', target: '[data-step="deployed"] [data-testid="timeline-link"]', done: () => has('[data-testid="kube-resource"]'), ensure: openRes(PMD, 'images', IMAGE) },
    ],
  },
  {
    id: 'bootc',
    title: 'bootc end to end',
    outcome: 'Turn a bootable container into a disk image and boot it in a RHEL VM.',
    logos: [
      ['icons/redhat.bootc.png', 'Bootable containers'],
      ['icons/redhat.image-builder.png', 'bootc-image-builder'],
      ['icons/redhat.rhel-vms.png', 'RHEL VMs'],
      ['icons/redhat.openshift-virtualization.png', 'OpenShift Virtualization'],
    ],
    start: ensureSignedIn,
    ensure: (): void => {
      install('bootc', 'rhel-vms', 'virt');
      tour.host?.select(PMD);
      tour.host?.expand(PMD, [BOOTC]);
    },
    steps: [
      { title: 'Open Bootable containers › Images', why: 'bootc images on this engine, with their lint status.', target: treeKey(`${BOOTC}/Images`), done: () => has('[data-testid="bootc-images"]') },
      { title: 'Build disk image', why: 'bootc-image-builder turns the image into qcow2, raw, ISO or AMI.', target: '[data-testid="bootc-build"]', done: () => modalIs('build-disk') },
      primary('Build', 'Pick types and architecture, then build.'),
      wait('Building', 'bootc-image-builder runs in the bottom panel.', '[data-testid="nav-lab-panel-body"]', () => panelHas('Build complete')),
      { title: 'Open Disk Images', why: 'Built disks land here.', target: treeKey(`${BOOTC}/Disk Images`), done: () => has('[data-testid="bootc-disks"]') },
      { title: 'Right-click the qcow2 disk', why: 'Disk actions: boot locally or run on OpenShift Virtualization.', target: '[data-testid="bootc-disks"] [data-testid="mt-row"]', text: 'orders-os-v3.qcow2', act: rightClick, done: () => !!menuItem('Boot in RHEL VM')() || modalIs('boot-vm') },
      { title: 'Boot in RHEL VM', why: 'Boots the disk with macadam on this machine.', target: menuItem('Boot in RHEL VM'), done: () => modalIs('boot-vm') },
      primary('Boot', 'Name, CPUs and memory, then boot.'),
      wait('Booting', 'The VM becomes a connection and its serial console opens in the panel.', '[data-testid="nav-lab-panel-body"]', () => panelHas('login:')),
    ],
  },
  {
    id: 'ai-chain',
    title: 'AI chain',
    outcome: 'Serve a model with vLLM, package it as a ModelCar, push to Quay and deploy to OpenShift AI.',
    logos: [
      ['icons/redhat.ai-lab.png', 'AI Lab'],
      ['icons/redhat.ai-inference-server.png', 'AI Inference Server'],
      ['icons/redhat.modelcar.png', 'ModelCar'],
      ['icons/redhat.quay.png', 'Quay'],
      ['icons/redhat.openshift-ai.png', 'OpenShift AI'],
    ],
    start: ensureSignedIn,
    ensure: (): void => {
      install('ai-lab', 'ai-inference', 'modelcar', 'quay', 'tas', 'rhoai');
      tour.host?.select(AI_CONN);
      tour.host?.expand(AI_CONN, [AILAB, `${AILAB}/Models`]);
    },
    steps: [
      { title: `Open ${MODEL}`, why: 'The model Summary shows the AI chain, from download to playground.', target: treeKey(`${AILAB}/Models/${MODEL}`), done: () => has('[data-testid="ai-model"]') },
      { title: 'Serve with Red Hat AI Inference', why: 'vLLM on your local GPU, OpenAI-compatible.', target: '[data-testid="ai-serve"]', done: () => modalIs('serve-vllm') || !!aiState(MODEL, 'served'), ensure: () => tour.host?.open(aiTarget('Models', MODEL)) },
      primary('Serve', 'The GPU check picks BF16 or FP8 for your VRAM.', () => !!aiState(MODEL, 'served')),
      { title: 'Package as ModelCar', why: 'An OCI image holding the model files, deployable by OpenShift AI.', target: '[data-testid="ai-modelcar"]', done: () => modalIs('modelcar') || !!aiState(MODEL, 'modelcar'), ensure: () => tour.host?.open(aiTarget('Models', MODEL)) },
      primary('Package', 'podman build with the model under /models.', () => !!aiState(MODEL, 'modelcar')),
      wait('Packaging', 'The ModelCar image appears in Images.', '[data-step="modelcar"]', () => has('[data-step="modelcar"][data-state="done"]')),
      { title: 'Push to Quay', why: 'OpenShift AI pulls the ModelCar from Quay.', target: '[data-step="pushed"] [data-testid="timeline-action"]', done: () => modalIs('push-quay') || has('[data-step="pushed"][data-state="done"]') },
      primary('Push', 'Same push modal as the image supply chain.', () => noModal()),
      wait('Pushing', 'The pushed step turns done with a Quay link.', '[data-step="pushed"]', () => has('[data-step="pushed"][data-state="done"]')),
      { title: 'Deploy to OpenShift AI', why: 'An InferenceService with storageUri oci://…', target: '[data-step="rhoai"] [data-testid="timeline-action"]', done: () => modalIs('deploy-rhoai') || !!aiState(MODEL, 'rhoai') },
      primary('Deploy', 'Namespace, runtime and GPUs, then deploy.', () => noModal()),
      wait('Loading', 'Pending → Loaded on rhoai-dev.', '[data-step="rhoai"]', () => has('[data-step="rhoai"][data-state="done"]')),
      { title: 'Use in playground', why: 'Compare the local, vLLM and OpenShift AI endpoints side by side.', target: '[data-step="playground"] [data-testid="timeline-action"]', done: () => has('[data-testid="playground-provider"]') },
    ],
  },
  {
    id: 'local-openshift',
    title: 'Local OpenShift',
    outcome: 'Add the OpenShift console and operators to a local MicroShift cluster.',
    logos: [
      ['icons/minc-org.minc.png', 'MicroShift (minc)'],
      ['icons/redhat.openshift-cluster-manager.svg', 'OpenShift Console'],
      ['icons/redhat.olm.png', 'Operators (OLM)'],
    ],
    ensure: (): void => {
      install('minc', 'openshift-console', 'olm');
      tour.host?.select('minc');
    },
    steps: [
      { title: 'Open OpenShift Console', why: 'minc ships without the web console; the extension adds it.', target: treeKey('console@minc'), done: () => has('[data-testid="console-install"]') || has('[data-testid="console-auth-warning"]') },
      { title: 'Install console', why: 'Deploys the console and port-forwards it to localhost:9000.', target: '[data-testid="console-install"]', done: () => !!flows.console.minc },
      wait('Installing', 'The console is ready when the warning shows.', '[data-testid="console-auth-warning"], [data-testid="console-install"]', () => has('[data-testid="console-auth-warning"]')),
      { title: 'Open Operators', why: 'OLM installs operators from the cluster catalogs.', target: treeKey('operators'), done: () => has('[data-testid="operators-seg"]') },
      { title: 'Browse the catalog', why: 'Installed | Catalog.', target: '[data-testid="operators-seg"] [role="radio"]', text: 'Catalog', done: () => has('[data-testid="operators-seg"] [role="radio"][aria-checked="true"]', 'Catalog') },
      {
        title: 'Install an operator',
        why: 'Creates a ClusterExtension; the task streams in the panel.',
        target: (): HTMLElement | undefined =>
          [...document.querySelectorAll<HTMLElement>('[data-testid="operators-view"] [data-testid="mt-row"]')].find(r => [...r.querySelectorAll('button')].some(b => b.textContent?.trim() === 'Install')),
        act: (el): void => [...el.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Install')?.click(),
      },
      wait('Installing', 'The operator moves to Installed.', '[data-testid="nav-lab-panel-body"]', () => panelHas('installed')),
    ],
  },
  {
    id: 'kompose',
    title: 'Kompose',
    outcome: 'Convert a Compose project to Kubernetes manifests and deploy it to kind.',
    logos: [
      ['icons/podman-desktop.compose.png', 'Compose'],
      ['icons/kubernetes.kompose.png', 'Kompose'],
      ['icons/podman-desktop.kind.png', 'Kind'],
    ],
    ensure: (): void => {
      install('kompose');
      tour.host?.select(PMD);
      tour.host?.expand(PMD, ['compose']);
    },
    steps: [
      { title: 'Open orders-stack', why: 'A Compose project running on Podman.', target: treeItem('orders-stack'), done: () => has('[data-testid="compose-convert"]') || has('[data-testid="kompose-view"]') },
      { title: 'Convert to Kubernetes', why: 'Kompose generates Deployments, Services, PVCs and Routes / Ingresses.', target: '[data-testid="compose-convert"]', done: () => has('[data-testid="kompose-view"]'), ensure: openRes(PMD, 'compose', 'orders-stack') },
      { title: 'Pick the target', why: 'Target cluster, namespace and generator; the manifests follow.', target: '[data-testid="kompose-target-bar"]', kind: 'info', optional: true },
      { title: 'Dry run', why: 'Validates the manifests against the cluster.', target: '[data-testid="kompose-dryrun"]' },
      wait('Dry run', 'The server-side dry run streams in the panel.', '[data-testid="nav-lab-panel-body"]', () => panelHas('Dry run OK')),
      { title: 'Deploy', why: 'Loads the images and applies the manifests.', target: '[data-testid="kompose-deploy"]' },
      wait('Deploying', 'New resources are highlighted in the cluster tree.', '[data-testid="nav-lab-panel-body"]', () => panelHas('deployed to')),
    ],
  },
];

export function findTour(id: string | undefined): Tour | undefined {
  return TOURS.find(t => t.id === id);
}

export function startTour(id: string, showme = false): void {
  const t = findTour(id);
  if (!t) return;
  t.start?.();
  tour.id = id;
  tour.i = 0;
  tour.done = false;
  tour.hold = false;
  tour.showme = showme;
}

export function exitTour(): void {
  tour.id = undefined;
  tour.done = false;
  tour.showme = false;
}
