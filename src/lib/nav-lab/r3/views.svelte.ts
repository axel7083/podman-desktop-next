/**
 * P13 Views: saved queries and their unsaved edits. Drafts live here, not in
 * the page, because `{#key wb.active}` remounts the page on every tab switch.
 */
import { storageKey } from '#lib/version.ts';

export interface SavedView {
  id: string;
  name: string;
  query: string;
}

export interface ViewDraft {
  query: string;
  /** Undefined until renamed: the view is then named after its query. */
  name?: string;
}

const KEY = storageKey('views');

const STARTER: SavedView[] = [
  { id: 'this-engine', name: 'This engine', query: 'env:@current' },
  { id: 'failing', name: 'Failing', query: 'is:degraded is:stopped' },
  { id: 'orders-app', name: 'Orders app', query: 'label:part-of=orders group:env' },
];

function load(): SavedView[] {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedView[]) : STARTER;
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

export const views = $state<{ saved: SavedView[]; drafts: Record<string, ViewDraft>; renaming?: string }>({ saved: load(), drafts: {} });

let seq = 0;

function nextId(): string {
  seq += 1;
  return `view-${Date.now().toString(36)}-${seq}`;
}

function savedView(id: string): SavedView | undefined {
  return views.saved.find(v => v.id === id);
}

function defaultName(query: string): string {
  const q = query.trim();
  return q.length > 40 ? `${q.slice(0, 39)}…` : q || 'New view';
}

/** Current query, including unsaved edits. */
export function viewQuery(id: string | undefined): string {
  if (!id) return '';
  return views.drafts[id]?.query ?? savedView(id)?.query ?? '';
}

/** Current name, including unsaved edits. */
export function viewName(id: string | undefined): string {
  if (!id) return 'View';
  const draft = views.drafts[id];
  const saved = savedView(id);
  return draft?.name ?? saved?.name ?? defaultName(draft?.query ?? '');
}

export function isSaved(id: string): boolean {
  return !!savedView(id);
}

export function isDirty(id: string): boolean {
  const draft = views.drafts[id];
  if (!draft) return false;
  const saved = savedView(id);
  return !saved || draft.query !== saved.query || (draft.name !== undefined && draft.name !== saved.name);
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

export function rename(id: string, name: string): void {
  const draft = views.drafts[id];
  if (draft) draft.name = name;
  else views.drafts[id] = { query: viewQuery(id), name };
}

export function save(id: string): void {
  const query = viewQuery(id);
  const name = viewName(id).trim() || defaultName(query);
  const saved = savedView(id);
  if (saved) {
    saved.query = query;
    saved.name = name;
  } else views.saved.push({ id, name, query });
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
  const copy: SavedView = { id: nextId(), name: `${viewName(id)} copy`, query: viewQuery(id) };
  views.saved.push(copy);
  persist();
  return copy.id;
}

/** A closed tab drops its unsaved edits. */
export function discardDraft(id: string): void {
  delete views.drafts[id];
}
