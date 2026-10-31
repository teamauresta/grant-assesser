/**
 * Marker highlights (Billabong design doc, section 2): a band of --hl-amber, --hl-sage or --hl-sky
 * behind --fg text, painted at this strength over --bg. The `highlight` utility in app/globals.css
 * paints it as `color-mix(in srgb, var(--hl, var(--hl-amber)) 35%, transparent)`.
 * tests/lib/tokens.test.ts keeps --fg AA on each tone at this strength, and checks the utility's 35%
 * is this number.
 */
export const HIGHLIGHT_ALPHA = 0.35;
