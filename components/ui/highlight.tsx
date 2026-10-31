import type { ReactNode } from 'react';

export type HighlightTone = 'amber' | 'sage' | 'sky';

const TONES: Record<HighlightTone, string> = {
  amber: '[--hl:var(--hl-amber)]',
  sage: '[--hl:var(--hl-sage)]',
  sky: '[--hl:var(--hl-sky)]',
};

/**
 * A marker band behind a key phrase (Billabong design doc, sections 2 and 4): the `highlight` utility
 * in app/globals.css, at most once per heading. A <span>, not a <mark>: the band is emphasis in the
 * design, not relevance, and screen readers announce a mark as "highlighted". The utility sets the
 * text to --fg (muted text on a highlight is under AA in dark) and MarkText in forced colours, so
 * there is no text class here (a later .text-fg would beat MarkText) and no className to add one.
 */
export function Highlight({ tone = 'amber', children }: { tone?: HighlightTone; children: ReactNode }) {
  return <span className={`highlight ${TONES[tone]}`}>{children}</span>;
}
