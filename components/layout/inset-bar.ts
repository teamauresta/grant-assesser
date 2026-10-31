/**
 * The inset, rounded menu bar (docs/plans/2026-10-31-billabong-design.md, section 4), shared by the
 * desktop top bar, the mobile header and the bottom nav.
 *
 * BAR_BAND is the full-width strip each bar sits in: the page's own background, so content scrolling
 * behind a sticky or fixed bar never shows through the 8px gap around it (or under a phone's notch).
 * INSET_BAR is the bar itself; each caller adds its 8px inset and height. The gap above a top bar is
 * the band's padding, not the bar's margin, which would collapse through the band and leave the bar
 * stuck to the very top.
 *
 * Heights live in app/globals.css as --bar-h (the top band) and --bottom-bar-h (the bottom nav's band),
 * used by: the headers and the bottom nav themselves, html's scroll-padding-top and (below md)
 * scroll-padding-bottom, the sorting story's pinned block (components/home/sort-story.tsx), the
 * wizard's phone footer (components/assess/wizard.tsx), main's bottom padding (app/layout.tsx), the
 * toasts (components/ui/toast.tsx) and the "Updated from another tab" notice
 * (lib/store/workspace-provider.tsx).
 */
export const BAR_BAND = 'z-40 bg-bg';
export const INSET_BAR = 'rounded-lg border border-border bg-neutral-bg';
