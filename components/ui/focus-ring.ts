/** The shape of the shared focus style: a 2px outline offset by 2px, shown only for keyboard focus. */
const focusOutline = 'focus-visible:outline-2 focus-visible:outline-offset-2';

/** Shared focus style: the outline in the accent. */
export const focusRing = `${focusOutline} focus-visible:outline-accent`;

/**
 * The same on the How it works panel, in --panel-fg: the light accent is only 2.07:1 on the forest
 * panel. A separate string, not an override, because cn() does not resolve Tailwind conflicts.
 */
export const panelFocusRing = `${focusOutline} focus-visible:outline-panel-fg`;
