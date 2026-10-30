/**
 * P13 Views: saved queries and their unsaved edits. Drafts live here, not in
 * the page, because `{#key wb.active}` remounts the page on every tab switch.
 */
import { storageKey } from '#lib/version.ts';

import { colorOf, iconOf } from './view-style.ts';

export interface ViewSort {
  /** Column key: `status`, `name`, `kind`, `env`, `ns`, `age`, `label:<key>`. */
  col: string;
  asc: boolean;
}

export interface ViewStyle {
  name: string;
  /** Key in `VIEW_ICONS`. */
  icon?: string;
  /** Key in `VIEW_COLORS`. */
  color?: string;
}

export interface SavedView extends ViewStyle {
  id: string;
  query: string;
  sort?: ViewSort;
}

export interface ViewDraft extends Partial<ViewStyle> {
  query: string;
  /** Unsaved views only: a saved view keeps its sort on itself. */
  sort?: ViewSort;
}

const KEY = storageKey('views');

const STARTER: SavedView[] = [
  { id: 'this-engine', name: 'This engine', icon: 'server', query: 'env:@current' },
  { id: 'failing', name: 'Failing', icon: 'fire', color: 'red', query: 'status:degraded status:stopped' },
  { id: 'orders-app', name: 'Orders app', icon: 'layer-group', color: 'purple', query: 'label:part-of=orders group:env' },
];

/** Views saved before `status:` existed and while `sort:` was a qualifier. */
function migrate(v: SavedView): SavedView {
  return { ...v, query: v.query.replace(/\bis:(running|stopped|degraded|unused)\b/g, 'status:$1').replace(/-?\bsort:\S+\s*/g, '').trim() };
}

function load(): SavedView[] {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedView[]).map(migrate) : STARTER;
  } catch {
    return STARTER;
  }
}

function persist(): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(views.saved));
  } catch {
    // Storage unavailable (private mode): saved for this session only.
  }
}

export const views = $state<{ saved: SavedView[]; drafts: Record<string, ViewDraft> }>({ saved: load(), drafts: {} });

let seq = 0;

function nextId(): string {
  seq += 1;
  return `view-${Date.now().toString(36)}-${seq}`;
}

function savedView(id: string): SavedView | undefined {
  return views.saved.find(v => v.id === id);
}

/** Current query, including unsaved edits. */
export function viewQuery(id: string | undefined): string {
  if (!id) return '';
  return views.drafts[id]?.query ?? savedView(id)?.query ?? '';
}

export function viewName(id: string | undefined): string {
  if (!id) return 'View';
  return savedView(id)?.name ?? views.drafts[id]?.name ?? 'New view';
}

/** Key in `VIEW_ICONS`. */
export function viewIconKey(id: string | undefined): string | undefined {
  return id ? (savedView(id)?.icon ?? views.drafts[id]?.icon) : undefined;
}

/** Key in `VIEW_COLORS`. */
export function viewColorKey(id: string | undefined): string | undefined {
  return id ? (savedView(id)?.color ?? views.drafts[id]?.color) : undefined;
}

export function viewIcon(id: string | undefined): ReturnType<typeof iconOf> {
  return iconOf(viewIconKey(id));
}

/** CSS colour of the icon; undefined keeps the surrounding colour. */
export function viewColor(id: string | undefined): string | undefined {
  return colorOf(viewColorKey(id));
}

export function isSaved(id: string): boolean {
  return !!savedView(id);
}

export function isDirty(id: string): boolean {
  const draft = views.drafts[id];
  if (!draft) return false;
  const saved = savedView(id);
  return !saved || draft.query !== saved.query;
}

/** New unsaved view; returns its id. */
export function createDraft(initialQuery = ''): string {
  const id = nextId();
  views.drafts[id] = { query: initialQuery };
  return id;
}

export function setQuery(id: string, query: string): void {
  const draft = views.drafts[id];
  if (draft) draft.query = query;
  else views.drafts[id] = { query };
}

/** Name, icon and colour apply at once on a saved view: only the query has a draft. */
export function customize(id: string, style: ViewStyle): void {
  const saved = savedView(id);
  if (saved) {
    Object.assign(saved, style);
    persist();
  } else if (views.drafts[id]) Object.assign(views.drafts[id], style);
}

export function viewSort(id: string): ViewSort | undefined {
  return savedView(id)?.sort ?? views.drafts[id]?.sort;
}

export function setSort(id: string, sort: ViewSort): void {
  const saved = savedView(id);
  if (saved) {
    saved.sort = sort;
    persist();
  } else if (views.drafts[id]) views.drafts[id].sort = sort;
}

export function save(id: string): void {
  const draft = views.drafts[id];
  const saved = savedView(id);
  if (saved) saved.query = viewQuery(id);
  else views.saved.push({ id, name: viewName(id), icon: draft?.icon, color: draft?.color, sort: draft?.sort, query: viewQuery(id) });
  delete views.drafts[id];
  persist();
}

export function revert(id: string): void {
  delete views.drafts[id];
}

export function remove(id: string): void {
  views.saved = views.saved.filter(v => v.id !== id);
  delete views.drafts[id];
  persist();
}

/** Saved copy of a view; returns its id. */
export function duplicate(id: string): string {
  const copy: SavedView = { id: nextId(), name: `${viewName(id)} copy`, icon: viewIconKey(id), color: viewColorKey(id), sort: viewSort(id), query: viewQuery(id) };
  views.saved.push(copy);
  persist();
  return copy.id;
}

/** A closed tab drops its unsaved edits. */
export function discardDraft(id: string): void {
  delete views.drafts[id];
}
