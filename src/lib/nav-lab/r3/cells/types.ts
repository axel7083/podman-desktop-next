/** P13 list rows for the ui-svelte Table. */
import type { IconRef } from "#lib/ext/types.ts";

import type { LabResource } from "../../data.ts";
import type { MenuItem } from "../live.svelte.ts";

export interface ActionBtn {
  title: string;
  icon: IconRef;
  run: () => void;
  enabled?: boolean;
  danger?: boolean;
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
  /** Short id shown in purple (images). */
  shortId?: string;
  /** Group chip (Compose / Pod). */
  chip?: string;
  cols: Record<string, string>;
  open?: () => void;
  /** Pinned open (double-click / Enter). */
  pin?: () => void;
  buttons: ActionBtn[];
  menu?: () => MenuItem[];
  children?: LabRow[];
}
