/**
 * A warning callout (Billabong design doc section 11, Task 9): --warn-fg on --warn-bg in a neutral
 * --border-strong outline (3.5 / 3.3 on --warn-bg, 3.2 / 3.7 on the page; borders stay neutral), for
 * the storage warnings and the backup reminder. All its text is --warn-fg: muted text is not checked
 * against --warn-bg. tests/components/settings.test.tsx (expectWarnCallout) checks the callers, and
 * tests/lib/tokens.test.ts the colour pairs.
 */
export const WARN_CALLOUT = 'flex items-start gap-3 rounded-lg border border-border-strong bg-warn-bg p-4 text-sm text-warn-fg';
