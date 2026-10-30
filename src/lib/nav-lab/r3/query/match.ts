/** P13 Views: run a parsed query over the visible resources. */
import { conn, type LabResource } from '../../data.ts';
import { containerInfo, usedByCount } from '../details.ts';
import { resStatus } from '../live.svelte.ts';
import { labelsOf } from './labels.ts';
import type { QueryTerm } from './parse.ts';
import { allResources, kindOf, searchedConns } from './resources.ts';

export const STATES = ['running', 'stopped', 'degraded', 'unused'];
export const HAS_VALUES = ['label', 'port', 'namespace', 'group'];
export const GROUPS = ['none', 'kind', 'env', 'app'] as const;
export type GroupBy = (typeof GROUPS)[number];

export interface QueryContext {
  /** Connection selected in the switcher: what `env:@current` follows. */
  currentConnId?: string;
}

export interface QueryResult {
  rows: LabResource[];
  groupBy: GroupBy;
  /** Environments with at least one result. */
  envCount: number;
  /** Stopped connections, which a query cannot reach. */
  unreachable: string[];
}

export function stateMatches(r: LabResource, state: string): boolean {
  const st = resStatus(r);
  switch (state) {
    case 'running':
      return st === 'running';
    case 'stopped':
      return st === 'stopped' || st === 'exited';
    case 'degraded':
      return st === 'degraded' || st === 'error' || st === 'starting';
    case 'unused':
      return (r.sectionId === 'images' || r.sectionId === 'volumes') && usedByCount(r) === 0;
    default:
      return false;
  }
}

function hasMatches(r: LabResource, what: string): boolean {
  switch (what) {
    case 'label':
      return Object.keys(labelsOf(r)).length > 0;
    case 'port':
      return r.sectionId === 'containers' ? containerInfo(r).ports.length > 0 : !!(r.cols?.ports ?? r.cols?.port);
    case 'namespace':
      return !!r.ns;
    case 'group':
      return !!r.group || r.sectionId === 'compose';
    default:
      return false;
  }
}

export function labelMatches(r: LabResource, value: string): boolean {
  const [key, ...rest] = value.split('=');
  const labels = labelsOf(r);
  if (!(key in labels)) return false;
  return rest.length === 0 || rest.join('=') === '' || labels[key] === rest.join('=');
}

export function envMatches(r: LabResource, value: string, ctx: QueryContext): boolean {
  if (value === '@current') return r.connId === ctx.currentConnId;
  const v = value.toLowerCase();
  return r.connId.toLowerCase() === v || conn(r.connId)?.name.toLowerCase() === v;
}

export function engineMatches(r: LabResource, value: string): boolean {
  const c = conn(r.connId);
  // Every cluster is Kubernetes; `engine:openshift` narrows it down.
  return value === 'kubernetes' ? !!c?.caps.kube : c?.engine === value;
}

export function projectMatches(r: LabResource, value: string): boolean {
  return r.group === value || (r.sectionId === 'compose' && r.name === value);
}

function textMatches(r: LabResource, value: string): boolean {
  const v = value.toLowerCase();
  return r.name.toLowerCase().includes(v) || r.sub.toLowerCase().includes(v);
}

/** The test behind one term. Empty values (`is:` while typing) match everything. */
function testOf(t: QueryTerm, ctx: QueryContext): (r: LabResource) => boolean {
  switch (t.key) {
    case undefined:
      return r => textMatches(r, t.value);
    case 'is':
      return r => kindOf(r).id === t.value.toLowerCase();
    case 'status':
      return r => stateMatches(r, t.value.toLowerCase());
    case 'env':
      return r => envMatches(r, t.value, ctx);
    case 'engine':
      return r => engineMatches(r, t.value);
    case 'label':
      return r => labelMatches(r, t.value);
    case 'has':
      return r => hasMatches(r, t.value);
    case 'ns':
      return r => r.ns === t.value;
    case 'project':
      return r => projectMatches(r, t.value);
    default:
      return () => true;
  }
}

/** Terms ORed together: a resource has only one type, state, environment… `label:` and `has:` stay ANDed. */
function orGroup(t: QueryTerm): string | undefined {
  return t.key && ['is', 'status', 'env', 'engine', 'ns', 'project'].includes(t.key) ? t.key : undefined;
}

/** Keep the terms that filter (known qualifier with a value, not `group:`). */
function filterTerms(terms: QueryTerm[]): QueryTerm[] {
  return terms.filter(t => t.valid && t.value !== '' && t.key !== 'group');
}

export function matchResources(terms: QueryTerm[], ctx: QueryContext): LabResource[] {
  const active = filterTerms(terms);
  const anded = active.filter(t => t.negated || !orGroup(t)).map(t => ({ test: testOf(t, ctx), negated: t.negated }));
  const ored = new Map<string, ((r: LabResource) => boolean)[]>();
  for (const t of active) {
    const g = orGroup(t);
    if (g && !t.negated) ored.set(g, [...(ored.get(g) ?? []), testOf(t, ctx)]);
  }
  const groups = [...ored.values()];
  return allResources().filter(r => anded.every(a => a.test(r) !== a.negated) && groups.every(tests => tests.some(test => test(r))));
}

function lastValue<T extends string>(terms: QueryTerm[], key: string, allowed: readonly T[]): T | undefined {
  return terms.findLast((t): boolean => t.key === key && allowed.includes(t.value as T))?.value as T | undefined;
}

/** Applies the Views rules against the visible, non-deleted resources. */
export function runQuery(terms: QueryTerm[], ctx: QueryContext): QueryResult {
  const rows = matchResources(terms, ctx);
  return {
    rows,
    groupBy: lastValue(terms, 'group', GROUPS) ?? 'none',
    envCount: new Set(rows.map(r => r.connId)).size,
    unreachable: searchedConns().unreachable.map(c => c.name),
  };
}
