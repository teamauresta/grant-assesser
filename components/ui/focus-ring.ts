/** The shape of the shared focus style: a 2px outline offset by 2px, shown only for keyboard focus. */
const focusOutline = 'focus-visible:outline-2 focus-visible:outline-offset-2';

/** Shared focus style: the outline in the accent. */
export const focusRing = `${focusOutline} focus-visible:outline-accent`;

/**
 * The same outline drawn 2px inside the element, for a control flush with a frame's edge (the
 * dialog's Close button fills its title bar's corner, so an outer outline would poke out of the
 * frame). A separate string, not an override: in the built CSS `-outline-offset-2` comes before
 * `outline-offset-2`, so adding it after focusRing would lose.
 */
export const focusRingInset = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent';

/**
 * The same on the How it works panel, in --panel-fg: the light accent is only 2.07:1 on the forest
 * panel. A separate string, not an override, because cn() does not resolve Tailwind conflicts.
 */
export const panelFocusRing = `${focusOutline} focus-visible:outline-panel-fg`;
