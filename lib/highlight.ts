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
 * stay one plain string (the PDF reads it too) and name its band by the words. Throws when the phrase
 * is empty or missing: a copy edit must not drop the band without a test noticing.
 */
export function splitHighlight(text: string, phrase: string): [string, string, string] {
  const at = phrase ? text.indexOf(phrase) : -1;
  if (at < 0) throw new Error(`Phrase "${phrase}" is not in "${text}"`);
  return [text.slice(0, at), phrase, text.slice(at + phrase.length)];
}
