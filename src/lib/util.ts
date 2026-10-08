export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Count + noun with the right number: `plural(1, 'member')` → "1 member",
 * `plural(3, 'entry', 'entries')` → "3 entries". Use it everywhere a count is
 * printed (no "member(s)", no "1 seconds").
 */
export function plural(count: number, word: string, pluralWord = `${word}s`): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? word : pluralWord}`;
}

/** @deprecated use {@link plural} */
export const pluralize = plural;

/**
 * Elapsed time since `epochMs` as a duration: "just now", "1 minute",
 * "3 hours"… Callers add "ago" where needed (`ago(ms)` does it for them).
 */
export function duration(epochMs: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - epochMs) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return plural(seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return plural(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return plural(hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 31) return plural(days, 'day');
  return plural(Math.round(days / 30), 'month');
}

/** "just now" / "5 minutes ago". */
export function timeAgo(epochMs: number, now = Date.now()): string {
  const d = duration(epochMs, now);
  return d === 'just now' ? d : `${d} ago`;
}
