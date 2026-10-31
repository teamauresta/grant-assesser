/**
 * The inset, rounded menu bar (docs/plans/2026-10-31-billabong-design.md, section 4), shared by the
 * desktop top bar, the mobile header and the bottom nav.
 *
 * BAR_BAND is the full-width strip each bar sits in: the page's own background, so content scrolling
 * behind a sticky or fixed bar never shows through the 8px gap around it (or under a phone's notch).
 * INSET_BAR is the bar itself; each caller adds its 8px inset and height. The gap above a top bar is
 * the band's padding, not the bar's margin, which would collapse through the band and leave the bar
 * stuck to the very top.
 */
export const BAR_BAND = 'z-40 bg-bg';
export const INSET_BAR = 'rounded-lg border border-border bg-neutral-bg';
