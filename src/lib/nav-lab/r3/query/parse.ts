/** P13 Views: tolerant tokenizer for GitHub-style queries. Pure, no Svelte or DOM. */

export const QUALIFIERS = ['is', 'env', 'engine', 'label', 'has', 'ns', 'project', 'sort', 'group'] as const;
export type Qualifier = (typeof QUALIFIERS)[number];

export interface QueryTerm {
  /** Qualifier as typed; undefined for free text. */
  key?: string;
  /** Value without quotes. */
  value: string;
  negated: boolean;
  /** Offsets of the raw term in the query, `end` exclusive. */
  start: number;
  end: number;
  /** False for an unknown qualifier: flagged in the input, ignored when matching. */
  valid: boolean;
}

function isQualifier(key: string): key is Qualifier {
  return (QUALIFIERS as readonly string[]).includes(key);
}

function unquote(s: string): string {
  return s.replaceAll('"', '');
}

function term(raw: string, start: number): QueryTerm {
  const negated = raw.startsWith('-') && raw.length > 1;
  const body = negated ? raw.slice(1) : raw;
  const end = start + raw.length;
  const colon = body.indexOf(':');
  const key = colon > 0 ? body.slice(0, colon) : '';
  // `redis:8` is flagged, `quay.io/acme/orders:1.4` is an image reference: free text.
  if (!/^[a-zA-Z-]+$/.test(key)) return { value: unquote(body), negated, start, end, valid: true };
  return { key: key.toLowerCase(), value: unquote(body.slice(colon + 1)), negated, start, end, valid: isQualifier(key.toLowerCase()) };
}

/** Never throws, keeps offsets so the input can highlight and replace a term. */
export function parseQuery(text: string): QueryTerm[] {
  const out: QueryTerm[] = [];
  let start = -1;
  let quoted = false;
  for (let i = 0; i <= text.length; i++) {
    const ch = text[i];
    if (ch === undefined || (!quoted && /\s/.test(ch))) {
      if (start >= 0) out.push(term(text.slice(start, i), start));
      start = -1;
      continue;
    }
    if (start < 0) start = i;
    if (ch === '"') quoted = !quoted;
  }
  return out;
}

/** The term under the caret (the caret may sit right after it). */
export function termAt(terms: QueryTerm[], caret: number): QueryTerm | undefined {
  return terms.find(t => caret >= t.start && caret <= t.end);
}
