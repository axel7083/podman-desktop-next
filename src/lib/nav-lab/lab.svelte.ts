/**
 * Mockup state: settings-bar toggles (theme, style, install…) and a small
 * `Workbench` (opened tabs) each proposal instantiates.
 */
import {
  faBorderAll,
  faFolderTree,
  faPuzzlePiece,
  faToolbox,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

import { untrack } from "svelte";

import type { IconRef } from "#lib/ext/types.ts";
import DashboardIcon from "#lib/images/DashboardIcon.svelte";
import PodIcon from "#lib/images/PodIcon.svelte";
import SettingsIcon from "#lib/images/SettingsIcon.svelte";

import {
  conn,
  CONNECTIONS,
  FEW_TABS,
  KINDS,
  type LabTarget,
  MANY_TABS,
  type PanelSession,
  resource,
  section,
  targetKey,
  tool,
  WORKFLOWS,
} from "./data.ts";
import { findNode, OVERVIEW_ICON } from "./r3/trees.ts";

export type RailMode = "icons" | "labels" | "expanded";
export type ScreenWidth = 1440 | 1280 | 1024;
/** v3 chrome style: JetBrains-like floating "islands" (default) or the v2 flat look. */
export type ChromeStyle = "islands" | "classic";

class LabState {
  theme = $state<"dark" | "light">("dark");
  /** Islands (default) or Classic chrome (`style=` param). */
  style = $state<ChromeStyle>("islands");
  /** Islands option "Different tool window background" (`twbg=on`). */
  toolBg = $state(false);
  rail = $state<RailMode>("expanded");
  tabs = $state<"few" | "many">("few");
  panel = $state(false);
  screen = $state<ScreenWidth>(1440);
  createOpen = $state(false);
  createContext = $state("");
  /** Overlay H: per-connection colour as context. */
  color = $state(false);
  /** Capture helper: open the proposal's key interaction (picker/omnibox) on load. */
  openKey = $state(false);
  /** Capture helper: initial single-connection context for round-2 proposals. */
  ctx = $state<string | undefined>(undefined);
  /** Dataset size for P12–P14: every connection, or only podman-machine-default. */
  conns = $state<"one" | "many">("many");
  /** P13: what is installed on top of the vanilla app (built-ins only, or every extension). */
  install = $state<"vanilla" | "all">("all");
  /** P13: extensions installed from a promotion card / the catalog while in Vanilla. */
  installed = $state<string[]>([]);
  /** P13: list rendering (PD card rows, modern full-bleed rows, dense grid). */
  table = $state<"classic" | "modern" | "grid">("modern");
  /** Session queued for the bottom panel (picked up by BottomPanel). */
  pending = $state<PanelSession | undefined>(undefined);
  /** Show the pending session side by side with the current pane (split). */
  pendingSplit = $state(false);

  /** Open the bottom panel and add a session to it (terminal / logs from a resource). */
  addSession(s: PanelSession, split = false): void {
    this.pending = s;
    this.pendingSplit = split;
    this.panel = true;
  }

  init(params: URLSearchParams): void {
    const theme = params.get("theme");
    this.theme = theme === "light" ? "light" : "dark";
    const rail = params.get("rail");
    this.rail =
      rail === "icons" || rail === "labels" || rail === "expanded"
        ? rail
        : "expanded";
    this.tabs = params.get("tabs") === "many" ? "many" : "few";
    this.panel = params.get("panel") === "on";
    const screen = Number(params.get("screen"));
    this.screen = screen === 1280 || screen === 1024 ? screen : 1440;
    this.color = params.get("color") === "on";
    this.openKey = params.get("open") === "on";
    this.ctx = params.get("ctx") ?? undefined;
    this.conns = params.get("conns") === "one" ? "one" : "many";
    this.install = params.get("install") === "vanilla" ? "vanilla" : "all";
    const table = params.get("table");
    this.table = table === "classic" || table === "grid" ? table : "modern";
    this.style = params.get("style") === "classic" ? "classic" : "islands";
    this.toolBg = params.get("twbg") === "on";
    this.applyTheme();
  }

  /** Theme layer on <html>: `dark|light` + `style-islands|style-classic` (+ `islands-twbg`). */
  applyTheme(): void {
    const cls = [this.theme, `style-${this.style}`];
    if (this.style === "islands" && this.toolBg) cls.push("islands-twbg");
    document.documentElement.className = cls.join(" ");
    document.documentElement.style.colorScheme = this.theme;
  }

  openCreate(context: string): void {
    this.createContext = context;
    this.createOpen = true;
  }

  /** Hash query mirroring the toggles (shareable URL). */
  query(): string {
    const q = new URLSearchParams();
    q.set("theme", this.theme);
    q.set("style", this.style);
    if (this.toolBg) q.set("twbg", "on");
    if (this.tabs === "many") q.set("tabs", "many");
    q.set("panel", this.panel ? "on" : "off");
    q.set("screen", String(this.screen));
    if (this.color) q.set("color", "on");
    if (this.conns === "one") q.set("conns", "one");
    if (this.install === "vanilla") q.set("install", "vanilla");
    q.set("table", this.table);
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

export const HOME = "__home__";

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
      this.tabs = initial.map((t) => ({ key: targetKey(t), target: t }));
      this.active = this.home ? HOME : this.tabs[0]?.key;
    });
  }

  resetFor(mode: "few" | "many"): void {
    this.reset(mode === "many" ? MANY_TABS : FEW_TABS);
  }

  get activeTarget(): LabTarget | undefined {
    if (this.active === HOME && this.home) return this.home;
    return this.tabs.find((t) => t.key === this.active)?.target;
  }

  goHome(target: LabTarget): void {
    this.home = target;
    this.active = HOME;
  }

  /** Open a target: focus the existing tab, else add (replacing the preview tab when `preview`). */
  open(
    target: LabTarget,
    opts: { preview?: boolean; after?: string } = {},
  ): void {
    const key = targetKey(target);
    const existing = this.tabs.find((t) => t.key === key);
    if (existing) {
      if (!opts.preview) existing.preview = false;
      this.active = key;
      return;
    }
    const tab: LabTab = { key, target, preview: opts.preview };
    const previewIdx = opts.preview
      ? this.tabs.findIndex((t) => t.preview)
      : -1;
    if (previewIdx >= 0) {
      this.tabs[previewIdx] = tab;
    } else {
      const activeIdx = this.tabs.findIndex((t) => t.key === this.active);
      this.tabs.splice(
        activeIdx >= 0 ? activeIdx + 1 : this.tabs.length,
        0,
        tab,
      );
    }
    this.active = key;
  }

  /** Replace the target of the active tab (browser-style navigation in place). */
  navigateActive(target: LabTarget): void {
    const key = targetKey(target);
    const idx = this.tabs.findIndex((t) => t.key === this.active);
    if (this.tabs.some((t) => t.key === key)) {
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
    const t = this.tabs.find((x) => x.key === key);
    if (t) t.preview = false;
  }

  close(key: string): void {
    const idx = this.tabs.findIndex((t) => t.key === key);
    if (idx < 0) return;
    this.tabs.splice(idx, 1);
    if (this.active === key)
      this.active =
        (this.tabs[idx] ?? this.tabs[idx - 1])?.key ??
        (this.home ? HOME : undefined);
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
    case "resource": {
      const r = resource(t.resId);
      return {
        title: r?.name ?? "?",
        icon: s?.ext?.icon ?? s?.icon ?? faBorderAll,
        connId: c?.id,
        crumb: [c?.name ?? "", s?.label ?? ""],
      };
    }
    case "scan": {
      const r = resource(t.resId);
      return {
        title: `Scan · ${r?.name ?? "?"}`,
        icon: "icons/podman-desktop.grype.png",
        connId: c?.id,
        crumb: [c?.name ?? "", "Grype"],
      };
    }
    case "layers": {
      const r = resource(t.resId);
      return {
        title: `Layers · ${r?.name ?? "?"}`,
        icon: "icons/podman-desktop.layers-explorer.png",
        connId: c?.id,
        crumb: [c?.name ?? "", "Layers explorer"],
      };
    }
    case "kompose": {
      const ids = (t.resId ?? "").split(",");
      const r = resource(ids[0]);
      return {
        title: `Kompose · ${ids.length > 1 ? `${ids.length} containers` : (r?.name ?? "?")}`,
        icon: "icons/kubernetes.kompose.png",
        connId: c?.id,
        crumb: [c?.name ?? "", "Kompose"],
      };
    }
    case "kubeplay":
      return {
        title: "Play Kubernetes YAML",
        icon: PodIcon,
        connId: c?.id,
        crumb: [c?.name ?? ""],
      };
    case "list":
      return {
        title: s?.label ?? "?",
        icon: s?.ext?.icon ?? s?.icon ?? faBorderAll,
        connId: c?.id,
        crumb: [c?.name ?? ""],
      };
    case "connection":
      // P13 (rule B6): a connection tab is its Overview (same icon as the tree row) + provider badge.
      return { title: c?.name ?? "?", icon: OVERVIEW_ICON, connId: c?.id, crumb: [c?.group ?? ""] };
    case "tool": {
      const x = tool(t.toolId);
      return {
        title: x?.name ?? "?",
        icon: x?.icon ?? faToolbox,
        crumb: ["Tools"],
      };
    }
    case "kind": {
      if (t.sectionId) {
        const sec = CONNECTIONS.flatMap((x) => x.sections).find(
          (x) => x.id === t.sectionId,
        );
        if (sec) return { title: sec.label, icon: sec.icon, crumb: [] };
      }
      const k = KINDS.find((x) => x.id === t.kindId);
      return {
        title: k?.label ?? "?",
        icon: k?.icon ?? faBorderAll,
        crumb: [],
      };
    }
    case "workflow": {
      const w = WORKFLOWS.find((x) => x.id === t.workflowId);
      return {
        title: w?.name ?? "Workflow",
        icon: w?.icon ?? faFolderTree,
        crumb: ["Workflows"],
      };
    }
    case "node": {
      const n = findNode(t.nodeId);
      return {
        title: n && n.node.label === "Overview" ? `${n.root.label} · Overview` : (n?.node.label ?? "?"),
        icon: n?.node.icon ?? n?.root.icon ?? faBorderAll,
        connId: c?.id,
        crumb: [c?.name ?? "", ...(n?.path ?? [])],
      };
    }
    case "tools":
      return { title: "Tools", icon: faToolbox, crumb: [] };
    case "settings":
      return { title: "Settings", icon: SettingsIcon, crumb: [] };
    case "extensions":
      return { title: "Extensions", icon: faPuzzlePiece, crumb: [] };
    case "accounts":
      return { title: "Accounts", icon: faUser, crumb: [] };
    case "dashboard":
    default:
      return { title: "Dashboard", icon: DashboardIcon, crumb: [] };
  }
}
