/**
 * P13 extension pages (`ToolView`): per-tool page config for every tool of
 * `TOOLS` except `bootc` (which renders the bootc extension view). Each entry
 * gives the header actions (one primary, optional secondary), the item noun,
 * an optional segmented filter, 2–4 counters, the table columns and realistic
 * rows with per-row quick actions (rule D11: ghost icon buttons, max 5).
 * Data follows the product research in docs/research/*.md.
 */
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import {
  faArrowsRotate,
  faArrowUp,
  faArrowUpRightFromSquare,
  faBoxArchive,
  faBug,
  faCircleCheck,
  faCircleDot,
  faCirclePlus,
  faClockRotateLeft,
  faCode,
  faCodeBranch,
  faComments,
  faCopy,
  faCube,
  faDatabase,
  faDownload,
  faFileExport,
  faFileImport,
  faFileLines,
  faFolderOpen,
  faGaugeHigh,
  faHammer,
  faKey,
  faLayerGroup,
  faListCheck,
  faMagnifyingGlass,
  faMicrochip,
  faPaperclip,
  faPause,
  faPen,
  faPlay,
  faPlug,
  faPlus,
  faPuzzlePiece,
  faRocket,
  faRotate,
  faServer,
  faShieldHalved,
  faSignature,
  faStop,
  faTerminal,
  faToggleOn,
  faTrash,
  faTriangleExclamation,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';

/** Row status: drives the status dot (running = green, ready = done / healthy, error, stopped, '' = none). */
export type ToolStatus = 'running' | 'ready' | 'error' | 'stopped' | '';

/** Labelled header action (primary / secondary button). */
export interface ToolAction {
  label: string;
  icon: IconDefinition;
}

/** Per-row ghost quick action (icon + tooltip). */
export interface ToolRowAction {
  title: string;
  icon: IconDefinition;
  danger?: boolean;
}

export interface ToolCol {
  title: string;
  key: string;
  /** CSS grid width (default `minmax(8rem, 1fr)`). */
  width?: string;
  numeric?: boolean;
  mono?: boolean;
}

export interface ToolRow {
  status: ToolStatus;
  name: string;
  cols: Record<string, string>;
}

export interface ToolStat {
  label: string;
  count: string | number;
  icon?: IconDefinition;
}

export interface ToolCfg {
  /** One-line description of what the page is for. */
  about: string;
  /** Plural item noun ("analyses", "blueprints"). */
  noun: string;
  primary: ToolAction;
  secondary?: ToolAction;
  /** Segmented filter on a column key (or `status`): [value, label]; "All" is added by the view. */
  seg?: { key: string; options: [string, string][] };
  stats?: ToolStat[];
  cols: ToolCol[];
  rows: ToolRow[];
  /** Quick actions of a row (ghost icons, max 5). */
  actions: (r: ToolRow) => ToolRowAction[];
  /** Read-only list (no selection checkbox). */
  readonly?: boolean;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const C = (title: string, key: string, opts: Partial<Omit<ToolCol, 'title' | 'key'>> = {}): ToolCol => ({ title, key, ...opts });

/** Rows from tuples `[status, name, ...values in column order]`. */
function R(cols: ToolCol[], data: [ToolStatus, string, ...string[]][]): ToolRow[] {
  return data.map(([status, name, ...vals]) => ({ status, name, cols: Object.fromEntries(cols.map((c, i) => [c.key, vals[i] ?? ''])) }));
}

/** Config with rows built from tuples against its own columns. */
function cfg(c: Omit<ToolCfg, 'rows'>, data: [ToolStatus, string, ...string[]][]): ToolCfg {
  return { ...c, rows: R(c.cols, data) };
}

const A = (title: string, icon: IconDefinition, danger = false): ToolRowAction => ({ title, icon, danger });
const DELETE = A('Delete', faTrash, true);
const LOGS = A('Logs', faFileLines);
const START = A('Start', faPlay);
const STOP = A('Stop', faStop);

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

export const TOOL_CFG: Record<string, ToolCfg> = {
  /* ---------------------------- AI ---------------------------- */
  'ai-lab': cfg(
    {
      about: 'Run open models locally: catalog models, recipes, playgrounds and OpenAI-compatible inference services on Podman.',
      noun: 'models',
      primary: { label: 'New service', icon: faRocket },
      secondary: { label: 'Import model', icon: faFileImport },
      seg: { key: 'status', options: [['running', 'Serving'], ['ready', 'Downloaded'], ['', 'Catalog']] },
      stats: [
        { label: 'Models downloaded', count: 4, icon: faDownload },
        { label: 'Services running', count: 1, icon: faServer },
        { label: 'Playgrounds', count: 2, icon: faComments },
        { label: 'Recipes', count: 18, icon: faCube },
      ],
      cols: [C('Size', 'size', { width: '6rem', numeric: true }), C('License', 'license', { width: '8rem' }), C('Backend', 'backend', { width: '8rem' }), C('Used by', 'used')],
      actions: r =>
        r.status === 'running'
          ? [A('Open playground', faComments), A('Copy endpoint', faCopy), A('Stop service', faStop)]
          : r.status === 'ready'
            ? [A('Start service', faPlay), A('Open playground', faComments), DELETE]
            : [A('Download', faDownload)],
    },
    [
      ['running', 'ibm-granite/granite-3.3-8b-instruct-GGUF', '4.9 GB', 'Apache-2.0', 'llama.cpp', 'chatbot (:35000)'],
      ['ready', 'ibm-granite/granite-4.0-h-tiny-GGUF', '4.2 GB', 'Apache-2.0', 'llama.cpp', 'Playground "summarize"'],
      ['ready', 'mistralai/Mistral-7B-Instruct-v0.3-GGUF', '4.4 GB', 'Apache-2.0', 'llama.cpp', '—'],
      ['ready', 'ggerganov/whisper.cpp small', '466 MB', 'MIT', 'whisper.cpp', 'audio-to-text recipe'],
      ['', 'RedHatAI/granite-3.1-8b-instruct-quantized.w4a16', '4.6 GB', 'Apache-2.0', 'vLLM', '—'],
      ['', 'instructlab/merlinite-7b-lab-GGUF', '4.1 GB', 'Apache-2.0', 'llama.cpp', '—'],
      ['', 'facebook/detr-resnet-101', '243 MB', 'Apache-2.0', 'none', '—'],
    ],
  ),

  mcp: cfg(
    {
      about: 'Run Model Context Protocol servers as containers and wire them into Claude Code, VS Code or Cursor.',
      noun: 'MCP servers',
      primary: { label: 'Add MCP server', icon: faCirclePlus },
      secondary: { label: 'Browse registry', icon: faMagnifyingGlass },
      seg: { key: 'status', options: [['running', 'Running'], ['stopped', 'Stopped']] },
      stats: [
        { label: 'Servers running', count: 3, icon: faServer },
        { label: 'Tools exposed', count: 107, icon: faPuzzlePiece },
        { label: 'Connected clients', count: 2, icon: faPlug },
      ],
      cols: [C('Source', 'src', { width: 'minmax(14rem, 2fr)', mono: true }), C('Transport', 'transport', { width: '9rem' }), C('Tools', 'tools', { width: '5rem', numeric: true }), C('Clients', 'clients')],
      actions: r => (r.status === 'running' ? [A('Copy client config', faCopy), LOGS, STOP] : r.status === 'error' ? [LOGS, A('Restart', faRotate), DELETE] : [START, DELETE]),
    },
    [
      ['running', 'github', 'ghcr.io/github/github-mcp-server:0.9', 'streamable-http', '42', 'Claude Code, VS Code'],
      ['running', 'kubernetes', 'quay.io/containers/kubernetes-mcp-server:0.3', 'stdio', '18', 'Claude Code'],
      ['running', 'aap', 'https://aap.acme-corp.com:8448/mcp', 'remote (http)', '35', 'VS Code'],
      ['stopped', 'podman', 'quay.io/manusa/podman-mcp-server:0.1', 'stdio', '12', '—'],
      ['stopped', 'filesystem', 'docker.io/mcp/filesystem:latest', 'stdio', '11', '—'],
      ['error', 'postgres', 'docker.io/mcp/postgres:latest', 'stdio', '—', 'Cursor'],
    ],
  ),

  lightspeed: cfg(
    {
      about: 'Ask RHEL Lightspeed about errors, logs and commands; attach container logs or a journal as context.',
      noun: 'conversations',
      primary: { label: 'New conversation', icon: faComments },
      secondary: { label: 'Attach logs', icon: faPaperclip },
      cols: [C('Context', 'ctx', { width: 'minmax(12rem, 1.5fr)' }), C('Product', 'product', { width: '9rem' }), C('Messages', 'msgs', { width: '6rem', numeric: true }), C('Updated', 'age', { width: '9rem' })],
      actions: () => [A('Continue', faComments), A('Export', faFileExport), DELETE],
    },
    [
      ['', 'Why does podman-machine-default fail to start?', 'podman machine start output', 'RHEL 10', '6', '12 minutes ago'],
      ['', 'SELinux denies /var/lib/orders bind mount', 'AVC denial · orders-db', 'RHEL 10', '4', '2 hours ago'],
      ['', 'Convert docker-compose.yml to Quadlets', 'compose.yaml (orders-stack)', 'RHEL 10', '9', '1 day ago'],
      ['', 'dnf: "Failed to download metadata for repo"', 'rhel-10 journal', 'RHEL 9.6', '3', '2 days ago'],
      ['', 'Tune firewalld for Kafka on 9092', 'kafka-0 logs', 'RHEL 10', '5', '6 days ago'],
      ['', 'Register a VM with an activation key', '—', 'RHEL 10', '2', '3 weeks ago'],
    ],
  ),

  'ai-inference': cfg(
    {
      about: 'Serve models with Red Hat AI Inference Server (vLLM) on a local GPU behind an OpenAI-compatible endpoint.',
      noun: 'deployments',
      primary: { label: 'Deploy model', icon: faRocket },
      secondary: { label: 'Benchmark', icon: faGaugeHigh },
      seg: { key: 'status', options: [['running', 'Running'], ['stopped', 'Stopped'], ['error', 'Failed']] },
      stats: [
        { label: 'Deployments running', count: 3, icon: faServer },
        { label: 'GPUs', count: 2, icon: faMicrochip },
        { label: 'Throughput', count: '224 tok/s', icon: faGaugeHigh },
      ],
      cols: [C('Model', 'model', { width: 'minmax(16rem, 2fr)', mono: true }), C('GPU', 'gpu', { width: 'minmax(10rem, 1fr)' }), C('Tokens/s', 'tps', { width: '6rem', numeric: true }), C('Endpoint', 'port', { width: '10rem', mono: true })],
      actions: r => (r.status === 'running' ? [A('Copy endpoint', faCopy), LOGS, STOP] : [START, LOGS, DELETE]),
    },
    [
      ['running', 'granite-3-3-8b', 'RedHatAI/granite-3.3-8b-instruct', 'NVIDIA RTX 4090 · 24 GB', '112', 'localhost:8000/v1'],
      ['running', 'qwen3-8b-w4a16', 'RedHatAI/Qwen3-8B-quantized.w4a16', 'NVIDIA L4 · 24 GB', '64', 'localhost:8001/v1'],
      ['running', 'mistral-small-24b', 'RedHatAI/Mistral-Small-3.1-24B-Instruct-2503-quantized.w8a8', 'NVIDIA A100 · 80 GB (rhel-10)', '48', 'rhel-10:8000/v1'],
      ['stopped', 'llama-3-1-8b-fp8', 'RedHatAI/Meta-Llama-3.1-8B-Instruct-FP8-dynamic', 'NVIDIA RTX 4090 · 24 GB', '—', 'localhost:8002/v1'],
      ['error', 'gpt-oss-20b', 'openai/gpt-oss-20b', 'CUDA out of memory', '—', 'localhost:8003/v1'],
    ],
  ),

  modelcar: cfg(
    {
      about: 'Package models as OCI ModelCar images that OpenShift AI (KServe) mounts as a sidecar.',
      noun: 'ModelCar images',
      primary: { label: 'Build ModelCar', icon: faHammer },
      secondary: { label: 'Pull from catalog', icon: faDownload },
      cols: [C('Model', 'model', { width: 'minmax(14rem, 2fr)', mono: true }), C('Format', 'fmt', { width: '8rem' }), C('Size', 'size', { width: '6rem', numeric: true }), C('Pushed to', 'pushed')],
      actions: r => [A('Push', faUpload), A('Deploy to OpenShift AI', faRocket), ...(r.status === 'error' ? [LOGS] : []), DELETE],
    },
    [
      ['ready', 'quay.io/acme/modelcar-granite-3.3-8b-instruct:1.0', 'ibm-granite/granite-3.3-8b-instruct', 'safetensors', '16.3 GB', 'quay.io · 2 days ago'],
      ['ready', 'quay.io/acme/modelcar-granite-3.1-8b-w4a16:1.0', 'RedHatAI/granite-3.1-8b-instruct-quantized.w4a16', 'safetensors', '4.6 GB', 'quay.io · 1 week ago'],
      ['', 'localhost/modelcar-qwen3-8b:dev', 'Qwen/Qwen3-8B', 'safetensors', '16.4 GB', 'Local only'],
      ['', 'localhost/modelcar-whisper-small:dev', 'openai/whisper-small', 'safetensors', '967 MB', 'Local only'],
      ['error', 'localhost/modelcar-llama-3.1-8b:dev', 'meta-llama/Llama-3.1-8B-Instruct', 'safetensors', '—', 'Build failed: gated model (HF token)'],
    ],
  ),

  maas: cfg(
    {
      about: 'Use remote models served by OpenShift AI Models-as-a-Service with your subscription and API keys.',
      noun: 'endpoints',
      primary: { label: 'Connect endpoint', icon: faPlug },
      secondary: { label: 'API keys', icon: faKey },
      stats: [
        { label: 'Endpoints', count: 5, icon: faPlug },
        { label: 'Tokens today', count: '412k', icon: faGaugeHigh },
        { label: 'Subscription', count: 'Premium', icon: faKey },
      ],
      cols: [C('Endpoint', 'url', { width: 'minmax(18rem, 2fr)', mono: true }), C('Tier', 'tier', { width: '7rem' }), C('Tokens today', 'tokens', { width: '8rem', numeric: true }), C('Latency', 'lat', { width: '6rem', numeric: true })],
      actions: () => [A('Copy endpoint', faCopy), A('Open in playground', faComments), A('Remove', faTrash, true)],
    },
    [
      ['running', 'granite-3-3-8b-instruct', 'https://maas.apps.rhoai-dev.acme.example/llm/granite-3-3-8b-instruct/v1', 'Premium', '182,340', '310 ms'],
      ['running', 'llama-4-scout-17b', 'https://maas.apps.rhoai-dev.acme.example/llm/llama-4-scout-17b/v1', 'Premium', '121,904', '540 ms'],
      ['running', 'qwen3-coder-30b', 'https://maas.apps.rhoai-dev.acme.example/llm/qwen3-coder-30b/v1', 'Premium', '96,112', '480 ms'],
      ['running', 'gpt-oss-20b', 'https://maas.apps.rhoai-dev.acme.example/llm/gpt-oss-20b/v1', 'Free', '11,870', '720 ms'],
      ['error', 'mistral-large-2411', 'https://maas.apps.rhoai-dev.acme.example/llm/mistral-large-2411/v1', 'Enterprise', '0', '429 rate limited'],
    ],
  ),

  /* ------------------------- Build & ship ------------------------- */
  mta: cfg(
    {
      about: 'Analyze Java applications with the Migration Toolkit for Applications (kantra) and estimate the migration effort.',
      noun: 'analyses',
      primary: { label: 'New analysis', icon: faMagnifyingGlass },
      secondary: { label: 'Custom rules', icon: faListCheck },
      seg: { key: 'target', options: [['Quarkus 3', 'Quarkus 3'], ['EAP 8', 'EAP 8'], ['OpenJDK 21', 'OpenJDK 21']] },
      stats: [
        { label: 'Applications', count: 6, icon: faCube },
        { label: 'Mandatory issues', count: 58, icon: faTriangleExclamation },
        { label: 'Story points', count: 729, icon: faListCheck },
      ],
      cols: [C('Application', 'app', { width: 'minmax(10rem, 1fr)', mono: true }), C('Target', 'target', { width: '8rem' }), C('Issues', 'issues', { width: '5rem', numeric: true }), C('Story points', 'sp', { width: '7rem', numeric: true }), C('Analyzed', 'age', { width: '9rem' })],
      actions: r => (r.status === 'running' ? [LOGS, A('Cancel', faStop)] : [A('Open report', faFileLines), A('Re-run', faRotate), DELETE]),
    },
    [
      ['ready', 'orders-monolith', '~/src/orders-legacy', 'Quarkus 3', '142', '412', '2 hours ago'],
      ['ready', 'billing', '~/src/billing', 'EAP 8', '37', '96', '1 day ago'],
      ['ready', 'claims', '~/src/claims', 'Quarkus 3', '64', '180', '2 days ago'],
      ['ready', 'inventory-service', '~/src/inventory', 'OpenJDK 21', '18', '41', '6 days ago'],
      ['running', 'customer-portal', '~/src/customer-portal', 'EAP 8', '—', '—', 'Analyzing… 62%'],
      ['error', 'legacy-payments', '~/src/payments-ejb', 'Quarkus 3', '—', '—', 'Failed: Maven dependency resolution'],
    ],
  ),

  'image-builder': cfg(
    {
      about: 'Describe RHEL images as blueprints and build them with Image Builder for clouds, VMs and edge devices.',
      noun: 'blueprints',
      primary: { label: 'Build image', icon: faHammer },
      secondary: { label: 'New blueprint', icon: faCirclePlus },
      seg: { key: 'distro', options: [['RHEL 10.0', 'RHEL 10'], ['RHEL 9.6', 'RHEL 9']] },
      stats: [
        { label: 'Blueprints', count: 6, icon: faLayerGroup },
        { label: 'Composes this month', count: 23, icon: faHammer },
        { label: 'Failed composes', count: 1, icon: faTriangleExclamation },
      ],
      cols: [C('Distribution', 'distro', { width: '8rem' }), C('Image type', 'type', { width: '9rem' }), C('Architecture', 'arch', { width: '7rem' }), C('Last compose', 'last')],
      actions: r => (r.status === 'running' ? [LOGS, A('Cancel', faStop)] : [A('Build', faHammer), A('Download', faDownload), A('Edit', faPen), DELETE]),
    },
    [
      ['ready', 'rhel-10-edge-kiosk', 'RHEL 10.0', 'edge-installer', 'x86_64', 'Succeeded · 2 hours ago'],
      ['ready', 'rhel-9-webserver', 'RHEL 9.6', 'ami', 'x86_64', 'Succeeded · 1 day ago'],
      ['running', 'dev-workstation', 'RHEL 10.0', 'qcow2', 'x86_64', 'Building · 34%'],
      ['error', 'azure-gateway', 'RHEL 9.6', 'vhd', 'x86_64', 'Failed · depsolve: package nginx-1.26 not found'],
      ['ready', 'arm-sensor', 'RHEL 10.0', 'raw', 'aarch64', 'Succeeded · 6 days ago'],
      ['', 'wsl-dev', 'RHEL 10.0', 'wsl', 'x86_64', 'Never built'],
    ],
  ),

  konflux: cfg(
    {
      about: 'Follow the Konflux builds, integration tests and Enterprise Contract results of your components next to your local images.',
      noun: 'components',
      primary: { label: 'Add component', icon: faCirclePlus },
      secondary: { label: 'Open Konflux UI', icon: faArrowUpRightFromSquare },
      seg: { key: 'app', options: [['payments', 'payments'], ['orders', 'orders'], ['checkout', 'checkout']] },
      stats: [
        { label: 'Applications', count: 3, icon: faLayerGroup },
        { label: 'Builds today', count: 14, icon: faHammer },
        { label: 'Failed builds', count: 1, icon: faTriangleExclamation },
        { label: 'EC violations', count: 2, icon: faShieldHalved },
      ],
      cols: [C('Application', 'app', { width: '8rem' }), C('Last build', 'build', { width: 'minmax(12rem, 1.5fr)' }), C('Enterprise Contract', 'ec', { width: '10rem' }), C('Last promoted image', 'img', { width: 'minmax(14rem, 2fr)', mono: true })],
      actions: r => (r.status === 'running' ? [LOGS, A('Cancel build', faStop)] : [A('Pull image', faDownload), A('Run locally', faPlay), A('Rebuild', faRotate), LOGS]),
    },
    [
      ['ready', 'payments-api', 'payments', 'Succeeded · 12 minutes ago', 'Passed', 'quay.io/redhat-user-workloads/acme-tenant/payments-api@sha256:2a9e4c7b'],
      ['error', 'payments-worker', 'payments', 'Failed · task sast-snyk-check', '—', 'quay.io/redhat-user-workloads/acme-tenant/payments-worker@sha256:91f0c3d2'],
      ['running', 'payments-ui', 'payments', 'Running · build-container', 'Passed (previous)', 'quay.io/redhat-user-workloads/acme-tenant/payments-ui@sha256:7c11e8a4'],
      ['error', 'orders-api', 'orders', 'Succeeded · 1 hour ago', '2 violations', 'quay.io/redhat-user-workloads/acme-tenant/orders-api@sha256:c3d4e5f6'],
      ['ready', 'orders-db-migrator', 'orders', 'Succeeded · 3 hours ago', 'Passed', 'quay.io/redhat-user-workloads/acme-tenant/orders-db-migrator@sha256:0b8a2f19'],
      ['ready', 'checkout-gateway', 'checkout', 'Succeeded · 1 day ago', '1 warning', 'quay.io/redhat-user-workloads/acme-tenant/checkout-gateway@sha256:5e6f7a8b'],
    ],
  ),

  quarkus: cfg(
    {
      about: 'Quarkus projects in dev mode and the Dev Services containers (databases, Kafka, Keycloak…) they start on Podman.',
      noun: 'projects',
      primary: { label: 'New project', icon: faCirclePlus },
      secondary: { label: 'Import project', icon: faFolderOpen },
      seg: { key: 'status', options: [['running', 'Dev mode'], ['stopped', 'Stopped']] },
      stats: [
        { label: 'Projects', count: 5, icon: faCode },
        { label: 'In dev mode', count: 2, icon: faPlay },
        { label: 'Dev Services containers', count: 5, icon: faDatabase },
      ],
      cols: [C('Quarkus', 'version', { width: '9rem' }), C('Dev UI', 'ui', { width: '12rem', mono: true }), C('Dev Services', 'ds', { width: 'minmax(12rem, 1.5fr)' }), C('Path', 'path', { mono: true })],
      actions: r => (r.status === 'running' ? [A('Open Dev UI', faArrowUpRightFromSquare), LOGS, STOP] : [A('Start dev mode', faPlay), A('Build image', faHammer), A('Remove', faTrash, true)]),
    },
    [
      ['running', 'hello-quarkus', '3.27.0', 'localhost:8080/q/dev-ui', 'PostgreSQL, Kafka', '~/src/hello-quarkus'],
      ['running', 'orders-service', '3.20.3.redhat-00003', 'localhost:8081/q/dev-ui', 'PostgreSQL, Keycloak, Apicurio Registry', '~/src/orders-service'],
      ['stopped', 'inventory', '3.27.0', '—', 'MongoDB', '~/src/inventory'],
      ['stopped', 'notification-service', '3.15.6.redhat-00002', '—', 'Kafka, Redis', '~/src/notifications'],
      ['error', 'billing-native', '3.27.0', '—', 'PostgreSQL', '~/src/billing (native build failed: GraalVM not found)'],
    ],
  ),

  helm: cfg(
    {
      about: 'Browse chart repositories and install charts as Helm releases on your Kubernetes contexts.',
      noun: 'charts',
      primary: { label: 'Install chart', icon: faDownload },
      secondary: { label: 'Add repository', icon: faCirclePlus },
      seg: { key: 'status', options: [['running', 'Installed'], ['', 'Available']] },
      cols: [C('Repository', 'repo', { width: '11rem' }), C('Chart version', 'ver', { width: '8rem', mono: true }), C('App version', 'app', { width: '8rem', mono: true }), C('Releases', 'rel')],
      actions: r => (r.status === 'running' ? [A('Upgrade', faArrowUp), A('Values', faFileLines), A('Uninstall', faTrash, true)] : [A('Install', faDownload), A('Show values', faFileLines)]),
    },
    [
      ['running', 'postgresql', 'bitnami', '16.7.21', '17.6.0', 'orders-db · kind-dev/orders'],
      ['running', 'redhat-developer-hub', 'openshift-helm-charts', '1.7.1', '1.7.1', 'rhdh · openshift-local/rhdh'],
      ['running', 'cert-manager', 'jetstack', 'v1.18.2', 'v1.18.2', 'cert-manager · kind-dev/cert-manager'],
      ['', 'keycloakx', 'codecentric', '7.1.3', '26.3.3', '—'],
      ['', 'grafana', 'grafana', '10.0.0', '12.1.1', '—'],
      ['', 'ingress-nginx', 'ingress-nginx', '4.13.2', '1.13.2', '—'],
      ['', 'argo-cd', 'argo', '8.3.0', 'v3.1.1', '—'],
    ],
  ),

  kreate: cfg(
    {
      about: 'Generate Kubernetes YAML from templates or from a running container, with a live preview.',
      noun: 'templates',
      primary: { label: 'New resource', icon: faCirclePlus },
      secondary: { label: 'From container', icon: faCube },
      seg: { key: 'group', options: [['Workloads', 'Workloads'], ['Network', 'Network'], ['Config & storage', 'Config & storage']] },
      cols: [C('API version', 'api', { width: '12rem', mono: true }), C('Group', 'group', { width: '10rem' }), C('Generated', 'gen', { width: '7rem', numeric: true }), C('Last used', 'age')],
      actions: () => [A('Create from template', faPlus), A('Preview YAML', faFileLines)],
      readonly: true,
    },
    [
      ['', 'Deployment', 'apps/v1', 'Workloads', '14', '2 hours ago'],
      ['', 'CronJob', 'batch/v1', 'Workloads', '3', '6 days ago'],
      ['', 'Service', 'v1', 'Network', '12', '2 hours ago'],
      ['', 'Route', 'route.openshift.io/v1', 'Network', '5', '1 day ago'],
      ['', 'Ingress', 'networking.k8s.io/v1', 'Network', '2', '3 weeks ago'],
      ['', 'ConfigMap', 'v1', 'Config & storage', '9', '1 day ago'],
      ['', 'PersistentVolumeClaim', 'v1', 'Config & storage', '4', '2 days ago'],
      ['', 'HorizontalPodAutoscaler', 'autoscaling/v2', 'Workloads', '1', '3 weeks ago'],
    ],
  ),

  devcontainers: cfg(
    {
      about: 'Open a folder in a dev container defined by devcontainer.json and connect VS Code to it.',
      noun: 'dev containers',
      primary: { label: 'Open folder', icon: faFolderOpen },
      secondary: { label: 'New configuration', icon: faCirclePlus },
      seg: { key: 'status', options: [['running', 'Running'], ['stopped', 'Stopped']] },
      cols: [C('Folder', 'folder', { width: '10rem', mono: true }), C('Image', 'image', { width: 'minmax(14rem, 2fr)', mono: true }), C('Features', 'features')],
      actions: r =>
        r.status === 'running'
          ? [A('Open in VS Code', faCode), A('Terminal', faTerminal), A('Rebuild', faRotate), STOP]
          : r.status === 'error'
            ? [LOGS, A('Rebuild', faRotate), DELETE]
            : [START, A('Rebuild', faRotate), DELETE],
    },
    [
      ['running', 'orders', '~/src/orders', 'mcr.microsoft.com/devcontainers/java:21', 'maven, docker-outside-of-docker'],
      ['running', 'frontend', '~/src/frontend', 'mcr.microsoft.com/devcontainers/typescript-node:22', 'github-cli'],
      ['stopped', 'checkout', '~/src/checkout', 'mcr.microsoft.com/devcontainers/go:1.25', 'kubectl-helm-minikube'],
      ['stopped', 'quarkus-demo', '~/src/quarkus-demo', 'registry.access.redhat.com/ubi9/openjdk-21:latest', 'java, quarkus-cli'],
      ['stopped', 'ml-notebook', '~/src/ml-notebook', 'mcr.microsoft.com/devcontainers/python:3.12', 'nvidia-cuda, jupyterlab'],
      ['error', 'infra', '~/src/infra', 'mcr.microsoft.com/devcontainers/base:ubuntu', 'terraform (postCreateCommand failed)'],
    ],
  ),

  /* ------------------------- Integration ------------------------- */
  ansible: cfg(
    {
      about: 'Run and lint playbooks locally, and build the execution environments they run in (ansible-navigator, ansible-builder).',
      noun: 'playbooks and execution environments',
      primary: { label: 'Run playbook', icon: faPlay },
      secondary: { label: 'Build execution environment', icon: faHammer },
      seg: { key: 'kind', options: [['Playbook', 'Playbooks'], ['Execution environment', 'Execution environments']] },
      cols: [C('Type', 'kind', { width: '11rem' }), C('Source', 'src', { width: 'minmax(14rem, 2fr)', mono: true }), C('Last run', 'last', { width: '9rem' }), C('Result', 'result')],
      actions: r =>
        r.cols.kind === 'Playbook'
          ? r.status === 'running'
            ? [LOGS, A('Cancel', faStop)]
            : [A('Run', faPlay), A('Lint', faListCheck), LOGS]
          : [A('Inspect', faMagnifyingGlass), A('Push', faUpload), DELETE],
    },
    [
      ['ready', 'site.yml', 'Playbook', '~/src/infra/site.yml', '12 minutes ago', 'ok=42 changed=3 failed=0'],
      ['error', 'deploy-orders.yml', 'Playbook', '~/src/infra/deploy-orders.yml', '1 hour ago', 'ok=17 changed=2 failed=1'],
      ['running', 'harden-rhel.yml', 'Playbook', '~/src/infra/harden-rhel.yml', 'Now', 'Running · task 18/64'],
      ['ready', 'ee-acme-network:1.4', 'Execution environment', 'quay.io/acme/ee-network:1.4', 'Built 2 days ago', 'ansible-core 2.18 · 12 collections'],
      ['ready', 'ee-supported-rhel9', 'Execution environment', 'registry.redhat.io/ansible-automation-platform-25/ee-supported-rhel9:latest', 'Pulled 1 week ago', 'ansible-core 2.16 · 21 collections'],
      ['ready', 'community-ansible-dev-tools', 'Execution environment', 'ghcr.io/ansible/community-ansible-dev-tools:latest', 'Pulled 3 weeks ago', 'ansible-core 2.18 · dev tools'],
    ],
  ),

  kaoto: cfg(
    {
      about: 'Design Apache Camel integrations visually with Kaoto and run them locally with Camel JBang.',
      noun: 'integrations',
      primary: { label: 'New integration', icon: faCirclePlus },
      secondary: { label: 'Import', icon: faFileImport },
      seg: { key: 'kind', options: [['Integration', 'Integrations'], ['Kamelet', 'Kamelets'], ['Pipe', 'Pipes']] },
      cols: [C('Kind', 'kind', { width: '8rem' }), C('Route', 'route', { width: 'minmax(14rem, 2fr)' }), C('Steps', 'steps', { width: '5rem', numeric: true }), C('Runtime', 'rt')],
      actions: r => (r.status === 'running' ? [A('Open designer', faPen), LOGS, STOP] : [A('Run with Camel JBang', faPlay), A('Open designer', faPen), DELETE]),
    },
    [
      ['running', 'orders-to-kafka.camel.yaml', 'Integration', 'platform-http → kafka:orders', '6', 'Camel 4.14 · :8080'],
      ['stopped', 'sftp-to-s3.camel.yaml', 'Integration', 'sftp → aws2-s3', '4', 'Camel 4.14'],
      ['error', 'invoice-transform.camel.yaml', 'Integration', 'kafka:invoices → kaoto-datamapper → jms', '8', 'Missing component camel-jms'],
      ['', 'slack-notifier.kamelet.yaml', 'Kamelet', 'kamelet:source → slack', '3', '—'],
      ['', 'order-router.pipe.yaml', 'Pipe', 'kafka-source → content-based router → http-sink', '5', '—'],
    ],
  ),

  rhdh: cfg(
    {
      about: 'Run Red Hat Developer Hub (Backstage) locally to try dynamic plugins and software templates.',
      noun: 'plugins and templates',
      primary: { label: 'Open portal', icon: faArrowUpRightFromSquare },
      secondary: { label: 'Add plugin', icon: faCirclePlus },
      seg: { key: 'kind', options: [['Plugin', 'Plugins'], ['Template', 'Templates']] },
      stats: [
        { label: 'Portal', count: 'localhost:7007', icon: faServer },
        { label: 'Plugins enabled', count: 4, icon: faPuzzlePiece },
        { label: 'Catalog entities', count: 128, icon: faLayerGroup },
      ],
      cols: [C('Type', 'kind', { width: '7rem' }), C('Package', 'pkg', { width: 'minmax(16rem, 2fr)', mono: true }), C('Version', 'ver', { width: '6rem', mono: true }), C('State', 'state')],
      actions: r => (r.cols.kind === 'Plugin' ? [A(r.status === 'stopped' ? 'Enable' : 'Disable', faToggleOn), A('Configure', faPen)] : [A('Run template', faPlay), A('View YAML', faFileLines)]),
    },
    [
      ['ready', 'GitHub Actions', 'Plugin', '@backstage-community/plugin-github-actions', '0.12.0', 'Enabled'],
      ['ready', 'Topology', 'Plugin', '@red-hat-developer-hub/backstage-plugin-topology', '2.3.1', 'Enabled'],
      ['ready', 'Tekton', 'Plugin', '@backstage-community/plugin-tekton', '3.27.0', 'Enabled'],
      ['ready', 'Quay', 'Plugin', '@backstage-community/plugin-quay', '1.22.0', 'Enabled'],
      ['stopped', 'Argo CD', 'Plugin', '@roadiehq/backstage-plugin-argo-cd', '2.10.1', 'Disabled'],
      ['', 'Quarkus service', 'Template', 'templates/quarkus-web-template.yaml', 'v1beta3', 'Registered'],
      ['', 'Node.js backend', 'Template', 'templates/nodejs-backend.yaml', 'v1beta3', 'Registered'],
    ],
  ),

  services: cfg(
    {
      about: 'One-click local services for development: databases, brokers, identity and observability, as containers.',
      noun: 'services',
      primary: { label: 'Add service', icon: faCirclePlus },
      seg: { key: 'status', options: [['running', 'Running'], ['stopped', 'Stopped']] },
      cols: [C('Category', 'cat', { width: '8rem' }), C('Image', 'image', { width: 'minmax(16rem, 2fr)', mono: true }), C('Ports', 'ports', { width: '9rem', mono: true })],
      actions: r => (r.status === 'running' ? [A('Copy connection string', faCopy), LOGS, A('Terminal', faTerminal), STOP] : [START, DELETE]),
    },
    [
      ['running', 'postgresql', 'Database', 'registry.redhat.io/rhel10/postgresql-16:latest', ':5432'],
      ['running', 'keycloak', 'Identity', 'registry.redhat.io/rhbk/keycloak-rhel9:26.4', ':8180'],
      ['running', 'kafka', 'Messaging', 'registry.redhat.io/amq-streams/kafka-40-rhel9:3.0', ':9092'],
      ['running', 'otel-lgtm', 'Observability', 'docker.io/grafana/otel-lgtm:0.11', ':3000 :4317 :4318'],
      ['stopped', 'valkey', 'Cache', 'docker.io/valkey/valkey:8', ':6379'],
      ['stopped', 'amq-broker', 'Messaging', 'registry.redhat.io/amq7/amq-broker-rhel9:7.13', ':61616 :8161'],
      ['stopped', 'datagrid', 'Cache', 'registry.redhat.io/datagrid/datagrid-8-rhel9:1.6', ':11222'],
    ],
  ),

  apicurio: cfg(
    {
      about: 'Store and version event schemas and API definitions in a local Apicurio Registry.',
      noun: 'artifacts',
      primary: { label: 'Create artifact', icon: faCirclePlus },
      secondary: { label: 'Upload', icon: faUpload },
      seg: { key: 'type', options: [['AVRO', 'Avro'], ['OPENAPI', 'OpenAPI'], ['PROTOBUF', 'Protobuf'], ['JSON', 'JSON Schema']] },
      stats: [
        { label: 'Artifacts', count: 7, icon: faFileLines },
        { label: 'Groups', count: 3, icon: faLayerGroup },
        { label: 'Versions', count: 31, icon: faCodeBranch },
      ],
      cols: [C('Group', 'group', { width: '11rem', mono: true }), C('Type', 'type', { width: '7rem' }), C('Versions', 'versions', { width: '6rem', numeric: true }), C('Latest', 'latest', { width: '6rem', mono: true }), C('Modified', 'age')],
      actions: () => [A('New version', faCodeBranch), A('Download', faDownload), A('Copy coordinates', faCopy), DELETE],
    },
    [
      ['ready', 'OrderCreated', 'com.acme.orders', 'AVRO', '5', '5', '2 hours ago'],
      ['ready', 'OrderShipped', 'com.acme.orders', 'AVRO', '3', '3', '1 day ago'],
      ['ready', 'orders-api', 'com.acme.orders', 'OPENAPI', '9', '2.3.0', '1 day ago'],
      ['ready', 'payments-api', 'com.acme.payments', 'OPENAPI', '6', '1.5.0', '2 days ago'],
      ['ready', 'inventory.proto', 'com.acme.inventory', 'PROTOBUF', '4', '4', '6 days ago'],
      ['ready', 'Customer', 'com.acme.orders', 'JSON', '2', '2', '3 weeks ago'],
      ['stopped', 'OrderCreatedV0', 'com.acme.orders', 'AVRO', '2', '2', 'Deprecated'],
    ],
  ),

  debezium: cfg(
    {
      about: 'Stream row-level changes from your databases to Kafka with Debezium connectors on Kafka Connect.',
      noun: 'connectors',
      primary: { label: 'New connector', icon: faCirclePlus },
      secondary: { label: 'Import config', icon: faFileImport },
      seg: { key: 'status', options: [['running', 'Running'], ['stopped', 'Paused'], ['error', 'Failed']] },
      stats: [
        { label: 'Connectors', count: 5, icon: faPlug },
        { label: 'Events/s', count: '1.8k', icon: faGaugeHigh },
        { label: 'Max lag', count: '2.1 s', icon: faClockRotateLeft },
      ],
      cols: [C('Source', 'src', { width: '9rem' }), C('Tables', 'tables', { width: 'minmax(12rem, 2fr)', mono: true }), C('Topic prefix', 'topic', { width: '9rem', mono: true }), C('Lag', 'lag', { width: '6rem', numeric: true })],
      actions: r => (r.status === 'running' ? [A('Pause', faPause), A('Restart', faRotate), LOGS] : r.status === 'error' ? [A('Restart', faRotate), LOGS, DELETE] : [A('Resume', faPlay), DELETE]),
    },
    [
      ['running', 'orders-postgres-cdc', 'PostgreSQL 16', 'public.orders, public.order_items', 'acme.orders', '120 ms'],
      ['running', 'customers-mysql-cdc', 'MySQL 8.4', 'crm.customers, crm.addresses', 'acme.crm', '2.1 s'],
      ['running', 'catalog-mongodb-cdc', 'MongoDB 7.0', 'catalog.products', 'acme.catalog', '340 ms'],
      ['error', 'inventory-oracle-cdc', 'Oracle 19c', 'INVENTORY.STOCK', 'acme.inventory', '—'],
      ['stopped', 'billing-sqlserver-cdc', 'SQL Server 2022', 'dbo.invoices', 'acme.billing', '—'],
    ],
  ),

  /* --------------------------- Security --------------------------- */
  quay: cfg(
    {
      about: 'Push images to quay.io or your Quay registry and review the Clair security scan of every tag.',
      noun: 'repositories',
      primary: { label: 'Push image', icon: faUpload },
      secondary: { label: 'New repository', icon: faCirclePlus },
      seg: { key: 'vis', options: [['Public', 'Public'], ['Private', 'Private']] },
      stats: [
        { label: 'Repositories', count: 6, icon: faBoxArchive },
        { label: 'Tags', count: 87, icon: faCodeBranch },
        { label: 'Critical / high', count: 3, icon: faShieldHalved },
      ],
      cols: [C('Visibility', 'vis', { width: '7rem' }), C('Tags', 'tags', { width: '5rem', numeric: true }), C('Last push', 'push', { width: '9rem' }), C('Vulnerabilities', 'vulns')],
      actions: () => [A('Pull', faDownload), A('Copy pull command', faCopy), A('Security scan', faShieldHalved), A('Open on Quay', faArrowUpRightFromSquare)],
    },
    [
      ['error', 'quay.io/acme/orders-api', 'Private', '14', '2 hours ago', '1 Critical · 2 High · 5 Medium'],
      ['ready', 'quay.io/acme/payments-api', 'Private', '22', '12 minutes ago', 'No known vulnerabilities'],
      ['ready', 'quay.io/acme/frontend', 'Public', '9', '1 day ago', '3 Medium · 6 Low'],
      ['ready', 'quay.io/acme/hello-quarkus', 'Public', '4', '6 days ago', '1 Low'],
      ['ready', 'quay.io/acme/edge-kiosk', 'Private', '6', '2 days ago', 'No known vulnerabilities'],
      ['error', 'quay.io/acme/legacy-billing', 'Private', '32', '3 weeks ago', '2 High · 11 Medium'],
    ],
  ),

  tpa: cfg(
    {
      about: 'Upload SBOMs to Trusted Profile Analyzer and track the CVEs and VEX statements that affect their packages.',
      noun: 'SBOMs',
      primary: { label: 'Upload SBOM', icon: faUpload },
      secondary: { label: 'Generate SBOM', icon: faHammer },
      seg: { key: 'fmt', options: [['SPDX 2.3', 'SPDX'], ['CycloneDX 1.6', 'CycloneDX']] },
      stats: [
        { label: 'SBOMs', count: 6, icon: faFileLines },
        { label: 'Packages', count: '2,431', icon: faCube },
        { label: 'Critical CVEs', count: 3, icon: faBug },
        { label: 'VEX statements', count: 87, icon: faShieldHalved },
      ],
      cols: [C('Format', 'fmt', { width: '8rem' }), C('Packages', 'pkgs', { width: '6rem', numeric: true }), C('CVEs', 'cves', { width: 'minmax(10rem, 1fr)' }), C('VEX', 'vex', { width: 'minmax(10rem, 1fr)' }), C('Uploaded', 'age', { width: '8rem' })],
      actions: () => [A('View vulnerabilities', faShieldHalved), A('Download', faDownload), DELETE],
    },
    [
      ['error', 'orders-api 2.3', 'CycloneDX 1.6', '412', '1 Critical · 4 High', '3 affected · 11 not affected', '2 hours ago'],
      ['ready', 'payments-api 1.5.0', 'SPDX 2.3', '388', '2 Medium', '14 not affected', '12 minutes ago'],
      ['ready', 'ubi10-minimal 10.0', 'SPDX 2.3', '106', '1 Low', '22 not affected · 3 fixed', '1 day ago'],
      ['error', 'keycloak 26.4', 'SPDX 2.3', '731', '2 Critical · 1 High', '2 affected · 9 fixed', '2 days ago'],
      ['ready', 'kafka 3.9 (Streams 3.0)', 'CycloneDX 1.6', '544', '3 Medium', '18 not affected', '6 days ago'],
      ['ready', 'rhel-bootc 10.0', 'SPDX 2.3', '250', 'None', '5 fixed', '3 weeks ago'],
    ],
  ),

  tas: cfg(
    {
      about: 'Sign images keylessly with Trusted Artifact Signer (Fulcio certificates, Rekor transparency log) and verify them.',
      noun: 'signatures',
      primary: { label: 'Sign image', icon: faSignature },
      secondary: { label: 'Verify image', icon: faCircleCheck },
      seg: { key: 'status', options: [['ready', 'Verified'], ['error', 'Failed'], ['', 'Unsigned']] },
      cols: [C('Digest', 'digest', { width: '10rem', mono: true }), C('Identity (Fulcio OIDC)', 'id', { width: 'minmax(16rem, 2fr)' }), C('Rekor index', 'rekor', { width: '8rem', numeric: true }), C('Signed', 'age', { width: '9rem' })],
      actions: r => (r.status === '' ? [A('Sign', faSignature)] : [A('Verify', faCircleCheck), A('View in Rekor', faArrowUpRightFromSquare), A('Copy cosign command', faCopy)]),
    },
    [
      ['ready', 'quay.io/acme/payments-api:1.5.0', 'sha256:2a9e4c7b', 'github.com/acme/payments/.github/workflows/release.yml@refs/tags/v1.5.0', '148203917', '12 minutes ago'],
      ['ready', 'quay.io/acme/orders-api:2.3', 'sha256:c3d4e5f6', 'sam@acme-corp.com (sso.acme-corp.com)', '148197402', '2 hours ago'],
      ['ready', 'quay.io/acme/edge-kiosk:1.1', 'sha256:8f2e1a90', 'sam@acme-corp.com (sso.acme-corp.com)', '148011288', '2 days ago'],
      ['error', 'quay.io/acme/frontend:2.1', 'sha256:4b7d9c13', 'Certificate identity mismatch', '147863055', '1 day ago'],
      ['', 'quay.io/acme/hello-quarkus:dev', 'sha256:e1f20b77', '—', '—', 'Not signed'],
    ],
  ),

  conforma: cfg(
    {
      about: 'Validate image signatures, attestations and SLSA provenance against Conforma (Enterprise Contract) policies.',
      noun: 'policy results',
      primary: { label: 'Validate image', icon: faListCheck },
      secondary: { label: 'Edit policy', icon: faPen },
      seg: { key: 'status', options: [['ready', 'Passed'], ['error', 'Failed']] },
      stats: [
        { label: 'Images checked', count: 5, icon: faCube },
        { label: 'Violations', count: 4, icon: faTriangleExclamation },
        { label: 'Warnings', count: 7, icon: faShieldHalved },
      ],
      cols: [C('Policy', 'policy', { width: 'minmax(12rem, 1.5fr)' }), C('Successes', 'ok', { width: '6rem', numeric: true }), C('Violations', 'viol', { width: '6rem', numeric: true }), C('Warnings', 'warn', { width: '6rem', numeric: true }), C('Checked', 'age', { width: '9rem' })],
      actions: () => [A('View report', faFileLines), A('Re-run', faRotate), A('Copy ec command', faCopy)],
    },
    [
      ['ready', 'quay.io/acme/payments-api:1.5.0', 'redhat (release)', '64', '0', '1', '12 minutes ago'],
      ['error', 'quay.io/acme/orders-api:2.3', 'redhat (release)', '58', '2', '3', '1 hour ago'],
      ['ready', 'quay.io/acme/edge-kiosk:1.1', 'slsa3', '21', '0', '0', '2 days ago'],
      ['error', 'quay.io/acme/frontend:2.1', 'slsa3', '17', '2', '2', '1 day ago'],
      ['ready', 'quay.io/acme/checkout-gateway:0.9', 'minimal', '12', '0', '1', '3 days ago'],
    ],
  ),

  grype: cfg(
    {
      about: 'Scan local images for known vulnerabilities with Anchore Grype.',
      noun: 'scans',
      primary: { label: 'Scan image', icon: faShieldHalved },
      secondary: { label: 'Update database', icon: faArrowsRotate },
      seg: { key: 'status', options: [['error', 'With critical'], ['ready', 'No critical']] },
      cols: [C('Critical', 'crit', { width: '6rem', numeric: true }), C('High', 'high', { width: '6rem', numeric: true }), C('Medium', 'med', { width: '6rem', numeric: true }), C('Fixable', 'fix', { width: '6rem', numeric: true }), C('Scanned', 'age', { width: '9rem' })],
      actions: () => [A('Open results', faFileLines), A('Rescan', faRotate), A('Export SARIF', faFileExport), DELETE],
    },
    [
      ['error', 'quay.io/acme/orders-api:1.4', '1', '2', '5', '6', '2 hours ago'],
      ['ready', 'registry.redhat.io/ubi10/ubi:latest', '0', '0', '3', '1', '1 day ago'],
      ['error', 'docker.io/library/postgres:17', '2', '9', '21', '18', '1 day ago'],
      ['ready', 'quay.io/keycloak/keycloak:26.4', '0', '1', '4', '5', '2 days ago'],
      ['ready', 'docker.io/valkey/valkey:8', '0', '0', '1', '0', '6 days ago'],
      ['error', 'docker.io/library/python:3.12', '3', '27', '64', '51', '3 weeks ago'],
    ],
  ),

  /* --------------------------- Platform --------------------------- */
  cryostat: cfg(
    {
      about: 'Discover JVMs running in your containers and capture JDK Flight Recorder (JFR) recordings with Cryostat.',
      noun: 'targets',
      primary: { label: 'Start recording', icon: faCircleDot },
      secondary: { label: 'Automated rules', icon: faListCheck },
      stats: [
        { label: 'JVM targets', count: 5, icon: faServer },
        { label: 'Active recordings', count: 3, icon: faCircleDot },
        { label: 'Archived recordings', count: 14, icon: faFileLines },
      ],
      cols: [C('JVM', 'jvm', { width: 'minmax(10rem, 1fr)' }), C('Connection', 'url', { width: 'minmax(16rem, 2fr)', mono: true }), C('Recordings', 'rec', { width: '10rem' })],
      actions: r => (r.status === 'error' ? [A('Edit credentials', faKey), A('Retry', faRotate)] : [A('Start recording', faCircleDot), A('Open dashboard', faGaugeHigh), A('Download JFR', faDownload)]),
    },
    [
      ['running', 'orders-api', 'Quarkus 3.27 · OpenJDK 21', 'service:jmx:rmi:///jndi/rmi://orders-api:9091/jmxrmi', '2 active · 5 archived'],
      ['running', 'inventory-service', 'Spring Boot 3.5 · OpenJDK 21', 'http://inventory-service:9977 (agent)', '1 active · 3 archived'],
      ['ready', 'keycloak-dev', 'Keycloak 26.4 · OpenJDK 21', 'service:jmx:rmi:///jndi/rmi://keycloak-dev:9010/jmxrmi', '4 archived'],
      ['ready', 'kafka-0', 'Kafka 3.9 · OpenJDK 17', 'service:jmx:rmi:///jndi/rmi://kafka-0:9999/jmxrmi', '2 archived'],
      ['error', 'billing', 'JBoss EAP 8.1 · OpenJDK 17', 'service:jmx:remote+http://billing:9990', 'JMX authentication failed'],
    ],
  ),

  edge: cfg(
    {
      about: 'Enroll bootc-based devices in Red Hat Edge Manager, group them in fleets and roll out OS image updates.',
      noun: 'devices',
      primary: { label: 'Enroll device', icon: faCirclePlus },
      secondary: { label: 'New fleet', icon: faLayerGroup },
      seg: { key: 'fleet', options: [['kiosks', 'kiosks'], ['sensors', 'sensors']] },
      stats: [
        { label: 'Devices', count: 6, icon: faMicrochip },
        { label: 'Online', count: 3, icon: faCircleCheck },
        { label: 'Fleets', count: 2, icon: faLayerGroup },
        { label: 'Pending enrollments', count: 1, icon: faClockRotateLeft },
      ],
      cols: [C('Fleet', 'fleet', { width: '7rem' }), C('OS image', 'img', { width: 'minmax(14rem, 2fr)', mono: true }), C('Update', 'upd', { width: 'minmax(10rem, 1.5fr)' }), C('Last seen', 'seen', { width: '9rem' })],
      actions: r => (r.cols.upd === 'Pending enrollment' ? [A('Approve', faCircleCheck), A('Deny', faTrash, true)] : [A('Console', faTerminal), A('Roll back', faClockRotateLeft), A('Decommission', faTrash, true)]),
    },
    [
      ['running', 'kiosk-lab-01', 'kiosks', 'quay.io/acme/edge-kiosk:1.1', 'Up to date', '30 seconds ago'],
      ['running', 'kiosk-lab-02', 'kiosks', 'quay.io/acme/edge-kiosk:1.0 → 1.1', 'Updating · rebooting', '2 minutes ago'],
      ['error', 'kiosk-lab-03', 'kiosks', 'quay.io/acme/edge-kiosk:1.0', 'Greenboot check failed, rolled back', '1 minute ago'],
      ['running', 'sensor-gw-01', 'sensors', 'quay.io/acme/edge-sensor:2.4', 'Out of date (2.5 available)', '45 seconds ago'],
      ['stopped', 'sensor-gw-02', 'sensors', 'quay.io/acme/edge-sensor:2.4', 'Powered off', '3 days ago'],
      ['', 'rhel10-dev', '—', 'localhost/edge-kiosk:1.1-dev', 'Pending enrollment', '5 minutes ago'],
    ],
  ),

  satellite: cfg(
    {
      about: 'Register hosts and VMs to Satellite, follow their errata and promote content views across lifecycle environments.',
      noun: 'hosts and content views',
      primary: { label: 'Register host', icon: faCirclePlus },
      secondary: { label: 'Sync content', icon: faArrowsRotate },
      seg: { key: 'kind', options: [['Host', 'Hosts'], ['Content view', 'Content views']] },
      stats: [
        { label: 'Hosts', count: 4, icon: faServer },
        { label: 'Security errata', count: 15, icon: faShieldHalved },
        { label: 'Content views', count: 2, icon: faLayerGroup },
      ],
      cols: [C('Type', 'kind', { width: '8rem' }), C('Lifecycle environment', 'env', { width: '11rem' }), C('OS / content', 'os', { width: 'minmax(12rem, 1.5fr)' }), C('Errata', 'errata')],
      actions: r =>
        r.cols.kind === 'Host'
          ? [A('Apply errata', faShieldHalved), A('Run job', faTerminal), A('Open in Satellite', faArrowUpRightFromSquare)]
          : [A('Publish', faUpload), A('Promote', faArrowUp), A('Open in Satellite', faArrowUpRightFromSquare)],
    },
    [
      ['running', 'rhel10-dev.acme.corp', 'Host', 'Dev', 'RHEL 10.0', '3 security · 7 bug fix'],
      ['running', 'web-01.acme.corp', 'Host', 'Production', 'RHEL 9.6', 'Up to date'],
      ['error', 'build-02.acme.corp', 'Host', 'QA', 'RHEL 9.6', '12 security · 4 bug fix'],
      ['stopped', 'kiosk-lab-01.acme.corp', 'Host', 'Dev', 'RHEL 10.0 (image mode)', 'Not reported for 3 days'],
      ['ready', 'RHEL10-base', 'Content view', 'Library → Dev → QA', 'BaseOS, AppStream · v14', 'Published 2 days ago'],
      ['ready', 'RHEL9-apps', 'Content view', 'Library → Production', 'BaseOS, AppStream, EPEL · v31', 'Published 1 week ago'],
    ],
  ),
};

