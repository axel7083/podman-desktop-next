import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import type { Component } from 'svelte';

import type { ExtensionMeta, IconRef } from '#lib/ext/types.ts';

/** Name cell (PD ContainerColumnNameContainer). */
export interface NameCellData {
  title: string;
  /** Secondary line items (state, ports, tag…) rendered spaced. */
  sub?: string[];
  href?: string;
  /** Extension badges (e.g. P14 list decorations). */
  badges?: { label: string; ext: ExtensionMeta }[];
  /** Group chip shown first on the second line (extension icon + short label). */
  chip?: { label: string; icon?: IconRef; ext?: ExtensionMeta };
}

export interface StatusCellData {
  status: string;
  icon: IconDefinition | Component | string;
}

export interface ActionSpec {
  title: string;
  icon: IconDefinition | Component;
  onClick: () => void;
  hidden?: boolean;
  enabled?: boolean;
  inProgress?: boolean;
  /** Set for contributed actions (provenance + inspect overlay). */
  ext?: ExtensionMeta;
}

export interface ActionsCellData {
  buttons: ActionSpec[];
  menu: ActionSpec[];
  detailed?: boolean;
}

export interface LabelCellData {
  name: string;
  type?: string;
  tip?: string;
  icon?: IconRef;
}
