/**
 * Marker highlights (Billabong design doc, section 2): a band of --hl-amber, --hl-sage or --hl-sky
 * behind --fg text, painted at this strength over --bg. The highlight utility in app/globals.css
 * paints it as `color-mix(in srgb, var(--hl, var(--hl-amber)) 35%, transparent)`.
 * tests/lib/tokens.test.ts keeps --fg AA on each tone at this strength, and checks the utility's 35%
 * is this number.
 */
export const HIGHLIGHT_ALPHA = 0.35;

/**
 * Splits a text around the phrase that gets the marker band, as [before, phrase, after], so copy can
 * stay one plain string (the PDF reads it too) and name its band by the words.
 *
 * For static copy only: tests check every phrase is in its text (tests/lib/highlight.test.ts). In
 * development and tests a missing or empty phrase throws, so a copy edit cannot drop the band without
 * a test noticing; in production it degrades to [text, '', ''], the plain text with no band, and
 * callers skip the band when the phrase is empty.
 */
export function splitHighlight(text: string, phrase: string): [string, string, string] {
  const at = phrase ? text.indexOf(phrase) : -1;
  if (at < 0) {
    if (process.env.NODE_ENV === 'production') return [text, '', ''];
    throw new Error(`Phrase "${phrase}" is not in "${text}"`);
  }
  return [text.slice(0, at), phrase, text.slice(at + phrase.length)];
}
