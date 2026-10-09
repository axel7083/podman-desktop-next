/** Shared classes of flow modal controls (28px, 6px radius, 12px). */
export const INPUT = 'h-7 px-2 rounded-md text-[12px] bg-[var(--pd-input-field-bg)] border border-[var(--pd-input-field-stroke)] text-[var(--pd-input-field-focused-text)] outline-none focus:border-[var(--pd-input-field-hover-stroke)]';

/** Status chip colours (gates, checks). */
export const CHIP: Record<'pass' | 'warn' | 'fail' | 'info', string> = {
  pass: 'bg-[color-mix(in_srgb,var(--pd-status-running)_16%,transparent)] text-[var(--pd-content-header)]',
  warn: 'bg-[color-mix(in_srgb,var(--pd-status-degraded)_18%,transparent)] text-[var(--pd-content-header)]',
  fail: 'bg-[color-mix(in_srgb,var(--pd-status-dead)_18%,transparent)] text-[var(--pd-content-header)]',
  info: 'bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]',
};

export const DOT: Record<'pass' | 'warn' | 'fail' | 'info', string> = {
  pass: 'bg-[var(--pd-status-running)]',
  warn: 'bg-[var(--pd-status-degraded)]',
  fail: 'bg-[var(--pd-status-dead)]',
  info: 'bg-[var(--pd-status-starting)]',
};
