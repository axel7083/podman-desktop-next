/**
 * Nav lab state: lab toggles (proposal, theme, rail mode…) and a small
 * `Workbench` (opened tabs) each proposal instantiates.
 */
import { faBorderAll, faFolderTree, faPuzzlePiece, faToolbox, faUser } from '@fortawesome/free-solid-svg-icons';

import { untrack } from 'svelte';

import type { IconRef } from '#lib/ext/types.ts';
import DashboardIcon from '#lib/images/DashboardIcon.svelte';
import SettingsIcon from '#lib/images/SettingsIcon.svelte';

import { conn, CONNECTIONS, FEW_TABS, KINDS, type LabTarget, MANY_TABS, resource, section, targetKey, tool, WORKFLOWS } from './data.ts';

export type ProposalId = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7' | 'p8' | 'p9' | 'p10' | 'p11' | 'p12';
export type RailMode = 'icons' | 'labels' | 'expanded';
export type ScreenWidth = 1440 | 1280 | 1024;

export const PROPOSALS: { id: ProposalId; name: string; short: string; defaultRail: RailMode; round: 1 | 2 }[] = [
  { id: 'p1', name: 'P1 · IDE / Explorer', short: 'IDE / Explorer', defaultRail: 'labels', round: 1 },
  { id: 'p2', name: 'P2 · Provider rail + tabs (hybrid)', short: 'Hybrid', defaultRail: 'expanded', round: 1 },
  { id: 'p3', name: 'P3 · Browser-style', short: 'Browser', defaultRail: 'expanded', round: 1 },
  { id: 'p4', name: 'P4 · Kind-first + scoping', short: 'Kind-first', defaultRail: 'expanded', round: 1 },
  { id: 'p5', name: 'P5 · Lens-style hotbar', short: 'Hotbar', defaultRail: 'icons', round: 1 },
  { id: 'p6', name: 'P6 · Scope chip in the title bar', short: 'Scope chip', defaultRail: 'expanded', round: 2 },
  { id: 'p7', name: 'P7 · Breadcrumb header', short: 'Breadcrumb', defaultRail: 'expanded', round: 2 },
  { id: 'p8', name: 'P8 · Aggregated + connection facets', short: 'Facets', defaultRail: 'expanded', round: 2 },
  { id: 'p9', name: 'P9 · Dashboard launcher + tab groups', short: 'Tab groups', defaultRail: 'icons', round: 2 },
  { id: 'p10', name: 'P10 · Status-bar context', short: 'Status bar', defaultRail: 'expanded', round: 2 },
  { id: 'p11', name: 'P11 · Command-first omnibox', short: 'Omnibox', defaultRail: 'expanded', round: 2 },
  { id: 'p12', name: 'P12 · Switcher at the top of the nav', short: 'Nav switcher', defaultRail: 'expanded', round: 2 },
];

class LabState {
  proposal = $state<ProposalId | undefined>(undefined);
  theme = $state<'dark' | 'light'>('dark');
  rail = $state<RailMode>('expanded');
  tabs = $state<'few' | 'many'>('few');
  panel = $state(false);
  screen = $state<ScreenWidth>(1440);
  createOpen = $state(false);
  createContext = $state('');
  /** Overlay H: per-connection colour as context. */
  color = $state(false);
  /** Capture helper: open the proposal's key interaction (picker/omnibox) on load. */
  openKey = $state(false);
  /** Capture helper: initial single-connection context for round-2 proposals. */
  ctx = $state<string | undefined>(undefined);

  init(params: URLSearchParams): void {
    const p = params.get('p');
    this.proposal = PROPOSALS.some(x => x.id === p) ? (p as ProposalId) : undefined;
    const theme = params.get('theme');
    this.theme = theme === 'light' ? 'light' : 'dark';
    const rail = params.get('rail');
    this.rail = rail === 'icons' || rail === 'labels' || rail === 'expanded' ? rail : (PROPOSALS.find(x => x.id === this.proposal)?.defaultRail ?? 'expanded');
    this.tabs = params.get('tabs') === 'many' ? 'many' : 'few';
    this.panel = params.get('panel') === 'on';
    const screen = Number(params.get('screen'));
    this.screen = screen === 1280 || screen === 1024 ? screen : 1440;
    this.color = params.get('color') === 'on';
    this.openKey = params.get('open') === 'on';
    this.ctx = params.get('ctx') ?? undefined;
    this.applyTheme();
  }

  applyTheme(): void {
    document.documentElement.className = this.theme;
    document.documentElement.style.colorScheme = this.theme;
  }

  selectProposal(id: ProposalId | undefined): void {
    this.proposal = id;
    this.rail = PROPOSALS.find(x => x.id === id)?.defaultRail ?? 'expanded';
  }

  openCreate(context: string): void {
    this.createContext = context;
    this.createOpen = true;
  }

  /** Hash query mirroring the toggles (shareable URL). */
  query(): string {
    const q = new URLSearchParams();
    if (this.proposal) q.set('p', this.proposal);
    q.set('theme', this.theme);
    q.set('rail', this.rail);
    q.set('tabs', this.tabs);
    q.set('panel', this.panel ? 'on' : 'off');
    q.set('screen', String(this.screen));
    if (this.color) q.set('color', 'on');
    return q.toString();
  }
}

export const lab = new LabState();

/* ------------------------------------------------------------------ */
/* Workbench                                                           */
/* ------------------------------------------------------------------ */

export interface LabTab {
  key: string;
  target: LabTarget;
  /** Preview tab (italic, replaced by the next preview open). */
  preview?: boolean;
}

export const HOME = '__home__';

export class Workbench {
  tabs = $state<LabTab[]>([]);
  active = $state<string | undefined>(undefined);
  /** Optional non-closable leading tab mirroring the current list (P2/P4). */
  home = $state<LabTarget | undefined>(undefined);

  constructor(initial: LabTarget[] = []) {
    this.reset(initial);
  }

  /** Untracked: called from proposal effects that only depend on `lab.tabs`. */
  reset(initial: LabTarget[]): void {
    untrack(() => {
      this.tabs = initial.map(t => ({ key: targetKey(t), target: t }));
      this.active = this.home ? HOME : this.tabs[0]?.key;
    });
  }

  resetFor(mode: 'few' | 'many'): void {
    this.reset(mode === 'many' ? MANY_TABS : FEW_TABS);
  }

  get activeTarget(): LabTarget | undefined {
    if (this.active === HOME && this.home) return this.home;
    return this.tabs.find(t => t.key === this.active)?.target;
  }

  goHome(target: LabTarget): void {
    this.home = target;
    this.active = HOME;
  }

  /** Open a target: focus the existing tab, else add (replacing the preview tab when `preview`). */
  open(target: LabTarget, opts: { preview?: boolean; after?: string } = {}): void {
    const key = targetKey(target);
    const existing = this.tabs.find(t => t.key === key);
    if (existing) {
      if (!opts.preview) existing.preview = false;
      this.active = key;
      return;
    }
    const tab: LabTab = { key, target, preview: opts.preview };
    const previewIdx = opts.preview ? this.tabs.findIndex(t => t.preview) : -1;
    if (previewIdx >= 0) {
      this.tabs[previewIdx] = tab;
    } else {
      const activeIdx = this.tabs.findIndex(t => t.key === this.active);
      this.tabs.splice(activeIdx >= 0 ? activeIdx + 1 : this.tabs.length, 0, tab);
    }
    this.active = key;
  }

  /** Replace the target of the active tab (browser-style navigation in place). */
  navigateActive(target: LabTarget): void {
    const key = targetKey(target);
    const idx = this.tabs.findIndex(t => t.key === this.active);
    if (this.tabs.some(t => t.key === key)) {
      this.active = key;
      return;
    }
    if (idx < 0) {
      this.open(target);
      return;
    }
    this.tabs[idx] = { key, target };
    this.active = key;
  }

  pin(key: string): void {
    const t = this.tabs.find(x => x.key === key);
    if (t) t.preview = false;
  }

  close(key: string): void {
    const idx = this.tabs.findIndex(t => t.key === key);
    if (idx < 0) return;
    this.tabs.splice(idx, 1);
    if (this.active === key) this.active = (this.tabs[idx] ?? this.tabs[idx - 1])?.key ?? (this.home ? HOME : undefined);
  }
}

/* ------------------------------------------------------------------ */
/* Target description                                                  */
/* ------------------------------------------------------------------ */

export interface TargetInfo {
  title: string;
  icon: IconRef;
  /** Connection the target belongs to (provider badge). */
  connId?: string;
  crumb: string[];
}

export function describe(t: LabTarget): TargetInfo {
  const c = conn(t.connId);
  const s = section(c, t.sectionId);
  switch (t.kind) {
    case 'resource': {
      const r = resource(t.resId);
      return { title: r?.name ?? '?', icon: s?.icon ?? faBorderAll, connId: c?.id, crumb: [c?.name ?? '', s?.label ?? ''] };
    }
    case 'list':
      return { title: s?.label ?? '?', icon: s?.icon ?? faBorderAll, connId: c?.id, crumb: [c?.name ?? ''] };
    case 'connection':
      return { title: c?.name ?? '?', icon: c?.icon ?? faBorderAll, crumb: [c?.group ?? ''] };
    case 'tool': {
      const x = tool(t.toolId);
      return { title: x?.name ?? '?', icon: x?.icon ?? faToolbox, crumb: ['Tools'] };
    }
    case 'kind': {
      if (t.sectionId) {
        const sec = CONNECTIONS.flatMap(x => x.sections).find(x => x.id === t.sectionId);
        if (sec) return { title: sec.label, icon: sec.icon, crumb: [] };
      }
      const k = KINDS.find(x => x.id === t.kindId);
      return { title: k?.label ?? '?', icon: k?.icon ?? faBorderAll, crumb: [] };
    }
    case 'workflow': {
      const w = WORKFLOWS.find(x => x.id === t.workflowId);
      return { title: w?.name ?? 'Workflow', icon: w?.icon ?? faFolderTree, crumb: ['Workflows'] };
    }
    case 'tools':
      return { title: 'Tools', icon: faToolbox, crumb: [] };
    case 'settings':
      return { title: 'Settings', icon: SettingsIcon, crumb: [] };
    case 'extensions':
      return { title: 'Extensions', icon: faPuzzlePiece, crumb: [] };
    case 'accounts':
      return { title: 'Accounts', icon: faUser, crumb: [] };
    case 'dashboard':
    default:
      return { title: 'Dashboard', icon: DashboardIcon, crumb: [] };
  }
}
