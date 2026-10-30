/** P13 Views: autocomplete at the caret. Qualifiers first, then their values, counted live. */
import {
  faArrowDownWideShort,
  faCircleDot,
  faCubes,
  faFolderTree,
  faLayerGroup,
  faServer,
  faTag,
  faCheck,
  faTableList,
} from '@fortawesome/free-solid-svg-icons';

import type { IconRef } from '#lib/ext/types.ts';

import { conn, type LabResource } from '../../data.ts';
import { labConns } from '../../r2/simple.ts';
import { labelsOf } from './labels.ts';
import { engineMatches, envMatches, GROUPS, HAS_VALUES, matchResources, type QueryContext, SORTS, STATES } from './match.ts';
import { parseQuery, type QueryTerm, termAt } from './parse.ts';
import { CORE_TYPES, kindOf } from './resources.ts';

export interface Suggestion {
  /** Stable id within a list. */
  id: string;
  label: string;
  /** Replaces the whole term under the caret. Ends with a space when the term is complete. */
  insert: string;
  detail?: string;
  icon?: IconRef;
  count?: number;
  group?: string;
}

const QUALIFIER_MENU: { key: string; label: string; detail: string; icon: IconRef }[] = [
  { key: 'is', label: 'Is', detail: 'Type or state', icon: faCircleDot },
  { key: 'env', label: 'Environment', detail: 'A connection', icon: faServer },
  { key: 'engine', label: 'Engine', detail: 'Podman, Docker, Kubernetes…', icon: faCubes },
  { key: 'label', label: 'Label', detail: 'Key, then value', icon: faTag },
  { key: 'has', label: 'Has', detail: 'A label, a port, a namespace…', icon: faCheck },
  { key: 'ns', label: 'Namespace', detail: 'Kubernetes namespace', icon: faFolderTree },
  { key: 'project', label: 'Project', detail: 'Compose project or pod', icon: faLayerGroup },
  { key: 'sort', label: 'Sort', detail: 'Order of the results', icon: faArrowDownWideShort },
  { key: 'group', label: 'Group', detail: 'Group the results', icon: faTableList },
];

function quote(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

function countBy(rows: LabResource[], keys: (r: LabResource) => string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) for (const k of keys(r)) out.set(k, (out.get(k) ?? 0) + 1);
  return out;
}

function byCount(a: [string, number], b: [string, number]): number {
  return b[1] - a[1] || a[0].localeCompare(b[0]);
}

function isValues(prefix: string, base: LabResource[], typed: string): Suggestion[] {
  const kinds = new Map(base.map(r => kindOf(r)).map(k => [k.id, k]));
  const counts = countBy(base, r => [kindOf(r).id]);
  const core = CORE_TYPES.filter(id => counts.has(id));
  const rest = [...counts.keys()].filter(id => !CORE_TYPES.includes(id)).sort((a, b) => a.localeCompare(b));
  const types: Suggestion[] = [...core, ...rest].map(id => ({
    id: `type:${id}`,
    label: id,
    insert: `${prefix}is:${id} `,
    icon: kinds.get(id)?.icon,
    count: counts.get(id),
    group: 'Type',
  }));
  const states: Suggestion[] = STATES.map(id => ({ id: `state:${id}`, label: id, insert: `${prefix}is:${id} `, group: 'State' }));
  return [...states, ...types].filter(s => s.label.includes(typed));
}

function envValues(prefix: string, base: LabResource[], typed: string, ctx: QueryContext): Suggestion[] {
  const current = conn(ctx.currentConnId);
  const opts: Suggestion[] = [
    {
      id: 'env:@current',
      label: '@current',
      insert: `${prefix}env:@current `,
      detail: current ? `Follows the switcher, now ${current.name}` : 'Follows the switcher',
      count: base.filter(r => envMatches(r, '@current', ctx)).length,
    },
    ...labConns().map(c => ({
      id: `env:${c.id}`,
      label: c.name,
      insert: `${prefix}env:${quote(c.name)} `,
      detail: c.product,
      icon: c.icon,
      count: base.filter(r => r.connId === c.id).length,
    })),
  ];
  return opts.filter(s => s.label.toLowerCase().includes(typed));
}

function engineValues(prefix: string, base: LabResource[], typed: string): Suggestion[] {
  const conns = labConns();
  const engines = [...new Set(conns.map(c => c.engine))];
  if (conns.some(c => c.caps.kube) && !engines.includes('kubernetes')) engines.push('kubernetes');
  return engines
    .filter(e => e.includes(typed))
    .map(e => ({ id: `engine:${e}`, label: e, insert: `${prefix}engine:${e} `, count: base.filter(r => engineMatches(r, e)).length }));
}

/** `label:` lists keys; `label:key=` lists values, led by "Any value". */
function labelValues(prefix: string, base: LabResource[], typed: string): Suggestion[] {
  const eq = typed.indexOf('=');
  if (eq < 0) {
    return [...countBy(base, r => Object.keys(labelsOf(r)))]
      .filter(([k]) => k.toLowerCase().includes(typed.toLowerCase()))
      .sort(byCount)
      .map(([k, n]) => ({ id: `label:${k}`, label: k, insert: `${prefix}label:${quote(k)}=`, count: n, group: 'Keys' }));
  }
  const key = typed.slice(0, eq);
  const val = typed.slice(eq + 1).toLowerCase();
  const values = [...countBy(base, r => (key in labelsOf(r) ? [labelsOf(r)[key]] : []))].sort(byCount);
  const total = values.reduce((n, [, c]) => n + c, 0);
  return [
    ...(val ? [] : [{ id: 'label-any', label: 'Any value', insert: `${prefix}label:${quote(key)} `, count: total, group: `Values for ${key}` }]),
    ...values
      .filter(([v]) => v.toLowerCase().includes(val))
      .map(([v, n]) => ({ id: `label=${v}`, label: v, insert: `${prefix}label:${quote(key)}=${quote(v)} `, count: n, group: `Values for ${key}` })),
  ];
}

function countedValues(prefix: string, key: string, base: LabResource[], typed: string, of: (r: LabResource) => string | undefined): Suggestion[] {
  return [...countBy(base, r => {
    const v = of(r);
    return v ? [v] : [];
  })]
    .filter(([v]) => v.toLowerCase().includes(typed))
    .sort(byCount)
    .map(([v, n]) => ({ id: `${key}:${v}`, label: v, insert: `${prefix}${key}:${quote(v)} `, count: n }));
}

function fixedValues(prefix: string, key: string, values: readonly string[], typed: string): Suggestion[] {
  return values.filter(v => v.includes(typed)).map(v => ({ id: `${key}:${v}`, label: v, insert: `${prefix}${key}:${v} ` }));
}

function valuesFor(active: QueryTerm, prefix: string, base: LabResource[], ctx: QueryContext): Suggestion[] {
  const typed = active.value;
  switch (active.key) {
    case 'is':
      return isValues(prefix, base, typed.toLowerCase());
    case 'env':
      return envValues(prefix, base, typed.toLowerCase(), ctx);
    case 'engine':
      return engineValues(prefix, base, typed.toLowerCase());
    case 'label':
      return labelValues(prefix, base, typed);
    case 'has':
      return fixedValues(prefix, 'has', HAS_VALUES, typed.toLowerCase());
    case 'ns':
      return countedValues(prefix, 'ns', base, typed.toLowerCase(), r => r.ns);
    case 'project':
      return countedValues(prefix, 'project', base, typed.toLowerCase(), r => r.group ?? (r.sectionId === 'compose' ? r.name : undefined));
    case 'sort':
      return fixedValues(prefix, 'sort', SORTS, typed.toLowerCase());
    case 'group':
      return fixedValues(prefix, 'group', GROUPS, typed.toLowerCase());
    default:
      return [];
  }
}

/** Options at the caret: qualifiers, or values for the qualifier being typed. */
export function suggest(text: string, caret: number, ctx: QueryContext): Suggestion[] {
  const terms = parseQuery(text);
  const active = termAt(terms, caret);
  if (active?.key === undefined) {
    const typed = (active?.value ?? '').toLowerCase();
    const prefix = active?.negated ? '-' : '';
    return QUALIFIER_MENU.filter(q => !typed || q.key.startsWith(typed) || q.label.toLowerCase().startsWith(typed)).map(q => ({
      id: q.key,
      label: q.label,
      insert: `${prefix}${q.key}:`,
      detail: q.detail,
      icon: q.icon,
      group: 'Filters',
    }));
  }
  // Counted against the rest of the query, so a value never promises results it cannot give.
  const base = matchResources(terms.filter(t => t !== active), ctx);
  return valuesFor(active, active.negated ? '-' : '', base, ctx);
}

/** Replace the term under the caret with a suggestion. */
export function applySuggestion(text: string, caret: number, s: Suggestion): { text: string; caret: number } {
  const active = termAt(parseQuery(text), caret);
  const start = active?.start ?? caret;
  const end = active?.end ?? caret;
  const after = text.slice(end);
  const insert = s.insert.endsWith(' ') && after.startsWith(' ') ? s.insert.slice(0, -1) : s.insert;
  const next = text.slice(0, start) + insert + after;
  const pos = start + insert.length + (insert === s.insert ? 0 : 1);
  return { text: next, caret: pos };
}

export { plural };
