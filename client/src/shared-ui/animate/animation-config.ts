/**
 * Seconds. These mirror `--transition-duration-fast`, `-normal` and `-slow` in `tokens.css`,
 * because the animation library takes numbers and cannot read a CSS token. A test compares them
 * with the tokens, so they cannot drift.
 */
export const ANIMATION_DURATION = { fast: 0.12, normal: 0.24, slow: 0.4 } as const;

/** The easing of `--ease-standard`, as the animation library expects it. */
export const EASE_STANDARD = [0.2, 0, 0, 1] as const;

/** The most a list reveal is delayed, so a long list never feels slow. */
export const MAX_STAGGER_STEPS = 5;
export const STAGGER_STEP_SECONDS = 0.04;
