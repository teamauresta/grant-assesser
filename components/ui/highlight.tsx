import type { ReactNode } from 'react';

export type HighlightTone = 'amber' | 'sage' | 'sky';

const TONES: Record<HighlightTone, string> = {
  amber: '[--hl:var(--hl-amber)]',
  sage: '[--hl:var(--hl-sage)]',
  sky: '[--hl:var(--hl-sky)]',
};

/**
 * A marker band behind a key phrase (Billabong design doc, section 2): the `highlight` utility in
 * app/globals.css, at most once per heading. The text is always --fg (muted text on a highlight is
 * under AA in dark), so there is no className to change it.
 */
export function Highlight({ tone = 'amber', children }: { tone?: HighlightTone; children: ReactNode }) {
  return <mark className={`highlight text-fg ${TONES[tone]}`}>{children}</mark>;
}
