import type { Transition } from "motion/react";
import type { CSSProperties } from "react";

// Plain values only, so server components can use the classes. The reduced-motion hook is in useMotionTokens.

/** The one easing curve: a soft ease-out. */
export const ease = [0.22, 1, 0.36, 1] as const;

/** Seconds. fast: hovers, presses, exits, small tweens. base: most things. slow: counters. */
export const duration = { fast: 0.18, base: 0.32, slow: 0.6 } as const;
export type Speed = keyof typeof duration;

/** Seconds between items in a list. `hook` paces the statement lines on the first screen. */
export const stagger = { base: 0.04, hook: 0.12 } as const;

/** Pixels. rise: things entering from below. slide: the guide's sideways step. drop: notes from above. */
export const distance = { rise: 12, slide: 24, drop: 8, lift: 2 } as const;

export const scale = { press: 0.98, pop: 0.9 } as const;

/** Opacity of a row that's set to be cancelled. */
export const dimmed = 0.55;

export function transition(speed: Speed, delay = 0): Transition {
  return { duration: duration[speed], ease, delay };
}

/** The same values for CSS transitions, set on the onboarding root. */
export const cssMotionVars = {
  "--motion-ease": `cubic-bezier(${ease.join(", ")})`,
  "--motion-fast": `${duration.fast * 1000}ms`,
  "--motion-base": `${duration.base * 1000}ms`,
  "--motion-press": `${scale.press}`,
  "--motion-lift": `-${distance.lift}px`,
} as CSSProperties;

/**
 * Hover colour (add the hover class alongside) and press, for buttons and tappable rows.
 * Outside onboarding the variables are unset, so it falls back to a plain 200ms with no press.
 */
export const pressable =
  "transition-[background-color,border-color,color,opacity,scale,translate] duration-[var(--motion-fast,200ms)] ease-[var(--motion-ease,ease)] active:scale-[var(--motion-press,1)] motion-reduce:active:scale-100";

/** Tiles also lift on hover. */
export const liftable = "hover:translate-y-[var(--motion-lift,0px)] motion-reduce:hover:translate-y-0";