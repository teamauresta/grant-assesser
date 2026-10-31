/**
 * Marker highlights (Billabong design doc, section 2): a band of --hl-amber, --hl-sage or --hl-sky
 * behind --fg text, painted at this strength over --bg. app/globals.css uses the same number as
 * `color-mix(in srgb, var(--hl-amber) 35%, transparent)`; tests/lib/tokens.test.ts keeps --fg AA on it.
 */
export const HIGHLIGHT_ALPHA = 0.35;
