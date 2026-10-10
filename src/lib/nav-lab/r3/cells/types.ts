/** P13 list rows for the ui-svelte Table. */
import type { IconRef } from "#lib/ext/types.ts";

import type { LabResource } from "../../data.ts";
import type { MenuItem } from "../live.svelte.ts";

export interface ActionBtn {
  title: string;
  icon: IconRef;
  /** Receives the click (anchor for a menu / popover). */
  run: (e?: MouseEvent) => void;
  enabled?: boolean;
  danger?: boolean;
  /** Labelled secondary button (always visible), e.g. catalog "Pull image". */
  label?: boolean;
  /**
   * Fixed-width status slot before the row actions (catalog "Pulled" / "Pull"):
   * 'done' = muted text with its icon, 'action' = labelled ghost button.
   */
  status?: 'done' | 'action';
}

export interface LabRow {
  name: string;
  selected?: boolean;
  /** Undefined for a group row (compose / pod). */
  r?: LabResource;
  status: string;
  icon: IconRef;
  /** Name cell. */
  title: string;
  sub: string[];
  /** Muted second line under the name (description, base image…); also the name tooltip. */
  desc?: string;
  /** Status dot tooltip (defaults to the status word). */
  dotTitle?: string;
  /** Small badge (severity…) rendered before a column value. */
  badge?: { col: string; text: string; tone: string; title?: string };
  /** Short id shown in purple (images). */
  shortId?: string;
  /** Group chip (Compose / Pod). */
  chip?: string;
  /** Group aggregate status ("2/3 running"). */
  agg?: string;
  cols: Record<string, string>;
  /** Proportion (0…1) for `bars` columns. */
  bar?: number;
  open?: () => void;
  /** Pinned open (double-click / Enter). */
  pin?: () => void;
  buttons: ActionBtn[];
  menu?: () => MenuItem[];
  children?: LabRow[];
}
