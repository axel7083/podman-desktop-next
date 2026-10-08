/**
 * Mock extension contribution model.
 *
 * The shell knows nothing about any product: every integration is a folder in
 * `src/extensions/<id>/index.ts` that default-exports a {@link MockExtension}.
 * The shell renders whatever the *enabled* extensions contribute.
 *
 * This file doubles as a working draft of the platform API items listed in
 * docs/integration-opportunities.md (Appendix A, P1–P18): every contribution
 * point names the P# it represents.
 */
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import type { Component } from 'svelte';

import type {
  Container,
  ContainerImage,
  KubeObject,
  Pod,
  TaskStep,
  Volume,
  World,
} from '#lib/world.svelte.ts';

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

/** Scenario presets (plan §2). `everything` is the union of all of them. */
export type ScenarioId =
  | 'community'
  | 'rhel'
  | 'openshift'
  | 'appdev'
  | 'ai'
  | 'platform'
  | 'automation'
  | 'windows';

/** Appendix A platform-API item, e.g. `'P2'`. */
export type PApi = `P${number}`;

/**
 * An icon: a static asset path (`'icons/redhat.bootc.png'`, resolved with
 * `asset()`), a FontAwesome definition, or a Svelte component.
 */
export type IconRef = string | IconDefinition | Component<{ size?: string; class?: string }>;

/** A component, either eager or lazily imported (`() => import('./X.svelte')`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentRef<P extends Record<string, any> = Record<string, never>> =
  | Component<P>
  | (() => Promise<{ default: Component<P> }>);

/** Scenario context passed to functions that vary per persona (e.g. WSL hint on Windows). */
export interface ScenarioContext {
  scenarios: ReadonlySet<ScenarioId>;
  has(id: ScenarioId): boolean;
}

/* ------------------------------------------------------------------ */
/* A. Connections (P1, P8, P11, P12)                                   */
/* ------------------------------------------------------------------ */

/**
 * Connection kind decides the primary-nav group and the core resources shown
 * in the secondary nav:
 * - `engine` → ENGINES (container engines: Podman machine, Docker context, WSL.C…) – P11 opens the type
 * - `kubernetes` → KUBERNETES (kind, minikube, OpenShift Local, OCM clusters…) – P1 canonical key
 * - `vm` → VMS & SERVICES (RHEL VMs, macadam…)
 * - `service` → VMS & SERVICES (Kafka, Keycloak, RHDH Local…) – P8 service connection type
 */
export type ConnectionKind = 'engine' | 'kubernetes' | 'vm' | 'service';

export type ConnectionStatus = 'started' | 'starting' | 'stopped' | 'stopping' | 'error' | 'creating' | 'unknown';

/** Static description of a connection contributed by an extension (P1). */
export interface ConnectionDef {
  /** Unique, URL-safe id (used in `/c/<id>/…`). */
  id: string;
  name: string;
  kind: ConnectionKind;
  /** Provider that owns it (one provider card in Settings › Resources). */
  providerId: string;
  providerName: string;
  /** Provider icon; defaults to the extension icon. */
  icon?: IconRef;
  /** Engine flavour (P11: open `ContainerProviderConnection.type`). */
  engineType?: 'podman' | 'docker' | 'wslc' | 'apple' | string;
  /** Small hint chip after the name, e.g. `WSL`, `OCM`, `☁`. */
  hint?: string;
  hintTooltip?: string;
  initialStatus: ConnectionStatus;
  /** Socket path, API URL or service URL. */
  endpoint: string;
  version?: string;
  /** Free-form summary rows (CPU, memory, VM type…). */
  details?: Record<string, string>;
  /**
   * Capabilities used by `when` clauses (P2), e.g. `'kube.crd:datascienceclusters'`,
   * `'podman'`, `'remote'`.
   */
  capabilities?: string[];
  /** Override the default core resource list of this kind. */
  resources?: string[];
  /** Child connection (e.g. a Docker context pointing at a Podman machine). */
  parentId?: string;
}

/** Runtime view of a connection, as consumed by the shell. */
export interface ConnectionView extends ConnectionDef {
  status: ConnectionStatus;
  /** Extension that contributes it. */
  ext: ExtensionMeta;
  /** Created at runtime by a factory (can be deleted). */
  dynamic: boolean;
  /** Owner extension is disabled: shown greyed with an "Enable" action. */
  extensionDisabled?: boolean;
}

/** Field of a FormPage-style wizard (P12, P18). */
export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'file' | 'slider';
  default?: string | number | boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
}

export type FormValues = Record<string, string | number | boolean>;

/**
 * "Create …" wizard shown on the provider card in Settings › Resources and in
 * the command palette (P12 async remote factory, P18 programmatic machine creation).
 */
export interface FactoryDef {
  id: string;
  /** Button label, sentence case: "Create Podman machine". */
  label: string;
  providerId: string;
  kind: ConnectionKind;
  description?: string;
  fields: FormField[];
  /** Steps of the long-running task (P15). */
  steps: (values: FormValues) => TaskStep[];
  /** Connection that appears in the primary nav when the task completes. */
  createConnection: (values: FormValues) => ConnectionDef;
  /** Optional world seeding for the new connection (e.g. kube nodes). */
  onCreated?: (world: World, conn: ConnectionDef, values: FormValues) => void;
}

/* ------------------------------------------------------------------ */
/* B. Secondary-nav sections (P2, P3)                                  */
/* ------------------------------------------------------------------ */

/**
 * A resource type contributed under *some* connections (kind B), e.g.
 * "Quadlets" under Podman, "VirtualMachines" under OpenShift. Rendered after
 * the "Extensions" divider of the secondary nav, with the extension icon as a
 * badge. Route: `/c/<conn>/<id>`.
 */
export interface NavSectionDef {
  id: string;
  label: string;
  icon?: IconRef;
  /** P2 `when` clause on the selected connection. */
  when: (conn: ConnectionView) => boolean;
  component: ComponentRef<{ conn: ConnectionView }>;
  /** Counter shown on the right, when meaningful. */
  counter?: (world: World, conn: ConnectionView) => number | undefined;
  order?: number;
}

/* ------------------------------------------------------------------ */
/* D. Tools (P3)                                                       */
/* ------------------------------------------------------------------ */

/** A standalone workspace in the primary nav TOOLS group (kind D, e.g. AI Lab). */
export interface ToolDef {
  id: string;
  label: string;
  icon?: IconRef;
  description?: string;
  component: ComponentRef<Record<string, never>>;
  /** Badge counter in the nav. */
  badge?: (world: World) => number | undefined;
}

/* ------------------------------------------------------------------ */
/* Details tabs, menus, columns, groupers (P4, P10, P14)               */
/* ------------------------------------------------------------------ */

export type ResourceTarget = 'container' | 'image' | 'pod' | 'connection' | 'kube-resource' | 'volume';

/** Context passed to tabs, menus and `when` clauses. */
export interface ResourceContext {
  target: ResourceTarget;
  conn: ConnectionView;
  /** The resource object (Container, ContainerImage, Pod, Volume, KubeObject or the ConnectionView). */
  resource: Container | ContainerImage | Pod | Volume | KubeObject | ConnectionView;
}

/** Extra tab on a details page (P14). Shown after core tabs + divider; >3 go to "More". */
export interface TabDef {
  id: string;
  label: string;
  target: ResourceTarget;
  when?: (ctx: ResourceContext) => boolean;
  component: ComponentRef<{ ctx: ResourceContext }>;
}

/**
 * Action contributed to a resource (existing menus + P4 Kubernetes menus).
 * - `row`: icon button in list rows · `kebab`: row overflow menu
 * - `toolbar`: list page header · `details`: details page header actions
 */
export interface MenuDef {
  id: string;
  label: string;
  icon?: IconDefinition;
  target: ResourceTarget;
  placement: 'row' | 'kebab' | 'toolbar' | 'details';
  when?: (ctx: ResourceContext) => boolean;
  run: (ctx: ResourceContext) => void;
}

/** List column contributed to a core list (P14). */
export interface ColumnDef {
  id: string;
  title: string;
  target: 'container' | 'image' | 'pod' | 'volume';
  width?: string;
  value: (row: Container | ContainerImage | Pod | Volume) => string | undefined;
}

/**
 * Group container rows by a label value (P10), generalising the compose
 * grouping (`com.docker.compose.project`) to Quarkus Dev Services,
 * Testcontainers, AI Lab, Ansible EEs…
 */
export interface GrouperDef {
  id: string;
  /** Container label key. */
  label: string;
  /** Group type shown in the name: "bookinfo (compose)". */
  typeName: string;
  icon?: IconRef;
  /**
   * Display name of a group when the label value is an opaque key (e.g. a
   * Testcontainers session UUID or a Quarkus process UUID). Defaults to the value.
   */
  groupName?: (value: string, containers: Container[]) => string;
  /** Extra secondary-line items of the group row (e.g. `java · 2.0.5`). */
  groupDetails?: (value: string, containers: Container[]) => string[];
  /** Group header actions. */
  actions?: { id: string; label: string; icon: IconDefinition; run: (group: string, containers: Container[]) => void }[];
}

/* ------------------------------------------------------------------ */
/* C. Cross-cutting (P5, P6, P13, P16, P17)                            */
/* ------------------------------------------------------------------ */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'success';

/** Structured image finding (P5: cve/package/fixedIn/vexStatus/advisoryUrl/ruleId). */
export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  cve?: string;
  package?: string;
  installed?: string;
  fixedIn?: string;
  vexStatus?: 'affected' | 'not_affected' | 'fixed' | 'under_investigation';
  advisoryUrl?: string;
  ruleId?: string;
  description?: string;
}

/** Image checker: one section per provider in the image "Security" tab (P5, P6). */
export interface CheckerDef {
  id: string;
  label: string;
  description?: string;
  when?: (image: ContainerImage) => boolean;
  /** Simulated duration of a scan, in ms (scaled by the speed control). */
  durationMs?: number;
  check: (image: ContainerImage) => Finding[];
}

/** Cluster add-on on Kubernetes connections (P13: install/uninstall/status/endpoints). */
export interface AddonDef {
  id: string;
  label: string;
  description: string;
  icon?: IconRef;
  when: (conn: ConnectionView) => boolean;
  installSteps: TaskStep[];
  endpoints?: (conn: ConnectionView) => { label: string; url: string }[];
}

/** Authentication provider listed in Accounts (P16 scopes). */
export interface AuthProviderDef {
  id: string;
  label: string;
  icon?: IconRef;
  /** Account shown once signed in. */
  account: string;
  scopes?: string[];
  signedInByDefault?: boolean;
}

/** Registry in Settings › Registries. */
export interface RegistryDef {
  id: string;
  name: string;
  server: string;
  icon?: IconRef;
  user?: string;
}

/** CLI tool in Settings › CLI Tools (P17 CLI lifecycle helpers). */
export interface CliToolDef {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version?: string;
  /** Newer version available → "Update" action. */
  latest?: string;
  path?: string;
}

/** Card in the Dashboard "Extensions" section (P17 dashboard cards). */
export interface CardDef {
  id: string;
  title: string;
  component: ComponentRef<Record<string, never>>;
}

/** Status-bar entry. */
export interface StatusItemDef {
  id: string;
  align: 'left' | 'right';
  icon?: IconRef;
  text: (world: World) => string;
  tooltip?: string;
  command?: string;
}

/** Command-palette entry (P17 search providers). */
export interface CommandDef {
  id: string;
  title: string;
  category?: string;
  icon?: IconDefinition;
  run: () => void;
}

export interface SettingProperty {
  id: string;
  title: string;
  description?: string;
  type: 'boolean' | 'string' | 'number' | 'enum';
  default: string | number | boolean;
  enum?: string[];
}

/** Section in Settings (generated from properties, or a custom component). */
export interface SettingDef {
  id: string;
  title: string;
  icon?: IconRef;
  properties?: SettingProperty[];
  component?: ComponentRef<Record<string, never>>;
}

/** Onboarding flow (shown in the extension card and the palette). */
export interface OnboardingDef {
  id: string;
  title: string;
  steps: { title: string; description: string }[];
}

/* ------------------------------------------------------------------ */
/* The extension                                                       */
/* ------------------------------------------------------------------ */

export interface Contributions {
  connections?: ConnectionDef[] | ((s: ScenarioContext) => ConnectionDef[]);
  connectionFactories?: FactoryDef[];
  navSections?: NavSectionDef[];
  tools?: ToolDef[];
  tabs?: TabDef[];
  menus?: MenuDef[];
  columns?: ColumnDef[];
  groupers?: GrouperDef[];
  imageCheckers?: CheckerDef[];
  addons?: AddonDef[];
  accounts?: AuthProviderDef[];
  registries?: RegistryDef[];
  cliTools?: CliToolDef[];
  dashboardCards?: CardDef[];
  statusItems?: StatusItemDef[];
  commands?: CommandDef[];
  settings?: SettingDef[];
  onboarding?: OnboardingDef[];
}

/** Identity of an extension, carried by every contribution for provenance. */
export interface ExtensionMeta {
  /** Real id where one exists (`publisher.name`), e.g. `redhat.openshift-local`. */
  id: string;
  displayName: string;
  /** `static/icons/<id>.png` (path without leading slash). */
  icon: string;
}

export interface MockExtension extends ExtensionMeta {
  publisher: string;
  description: string;
  version: string;
  /** Pre-installed like PD built-ins; enabled in every scenario. */
  builtin?: boolean;
  /** extensionDependencies, e.g. most RH extensions → `redhat.redhat-authentication`. */
  dependsOn?: string[];
  /** Scenario presets that enable it. */
  tags: ScenarioId[];
  /** Appendix A items this extension demonstrates. */
  pApis: PApi[];
  /** One-line summary of what the mock shows (Extensions page, inspect overlay). */
  contributes: Contributions;
  /** Contribute mock resources to the world (called once per world, when first enabled). */
  seed?: (world: World, s: ScenarioContext) => void;
}

/** Contribution enriched with its extension (what derived getters return). */
export type Contributed<T> = T & { ext: ExtensionMeta };
