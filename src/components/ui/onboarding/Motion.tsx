"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { distance, scale, transition, type Speed } from "@/lib/motion";
import { useMotionTokens } from "@/lib/useMotionTokens";

/** Entrance props to spread on a motion element: `<motion.li {...reveal.rise(delay)}>`. */
export function useReveal() {
  const { move, grow } = useMotionTokens();
  return {
    /** Fades in and rises. */
    rise: (delay = 0, speed: Speed = "base") => ({
      initial: { opacity: 0, y: move(distance.rise) },
      animate: { opacity: 1, y: 0 },
      transition: transition(speed, delay),
    }),
    /** Fades in and grows from 90%. */
    pop: (delay = 0) => ({
      initial: { opacity: 0, scale: grow(scale.pop) },
      animate: { opacity: 1, scale: 1 },
      transition: transition("base", delay),
    }),
    fade: (delay = 0, speed: Speed = "base") => ({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: transition(speed, delay),
    }),
  };
}

const riseTags = { div: motion.div, li: motion.li, p: motion.p };

/** An element that fades and rises in after `delay`, for server components' lists. */
export function Rise({
  as = "div",
  delay = 0,
  className,
  children,
}: {
  as?: keyof typeof riseTags;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const Tag = riseTags[as];
  return (
    <Tag {...useReveal().rise(delay)} className={className}>
      {children}
    </Tag>
  );
}

/**
 * Presence props that fade and open the height on the way in and close it on the way out.
 * The clip hides what's below the moving edge but leaves room for focus rings (2px outline, 2px offset).
 */
export function useCollapse({ drop = false, delay = 0 } = {}) {
  const { move, resize } = useMotionTokens();
  return {
    initial: { opacity: 0, height: 0, y: drop ? -move(distance.drop) : 0, clipPath: "inset(-4px)" },
    animate: {
      opacity: 1,
      height: "auto",
      y: 0,
      clipPath: "inset(-4px)",
      // Once open, popovers inside (the date picker) can reach past the edge.
      transitionEnd: { clipPath: "none" },
      transition: { ...transition("base", delay), height: resize("base", delay) },
    },
    exit: {
      opacity: 0,
      height: 0,
      clipPath: "inset(-4px)",
      transition: { ...transition("fast"), height: resize("fast") },
    },
  };
}

/**
 * Shows and hides its content with a fade and the height opening or closing, so nothing
 * appears or disappears with a jump. Margins belong inside (they're included in the height).
 * `drop` brings it down from above as it opens.
 */
export function Collapse({
  show,
  drop = false,
  delay = 0,
  initial = false,
  className = "",
  children,
}: {
  show: boolean;
  drop?: boolean;
  delay?: number;
  /** Also open when the screen first shows. */
  initial?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const collapse = useCollapse({ drop, delay });
  return (
    <AnimatePresence initial={initial}>
      {show && (
        <motion.div {...collapse} className={`flow-root ${className}`}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * A number that tweens to its value (from `from` on mount). Screen readers get the final value only.
 * With reduced motion it jumps straight there.
 */
export function AnimatedNumber({
  value,
  from = value,
  speed = "fast",
  delay = 0,
  format = (n: number) => String(Math.round(n)),
}: {
  value: number;
  from?: number;
  speed?: Speed;
  delay?: number;
  format?: (n: number) => string;
}) {
  const { reduced } = useMotionTokens();
  const current = useMotionValue(reduced ? value : from);
  const text = useTransform(current, format);

  useEffect(() => {
    if (reduced) {
      current.jump(value);
      return;
    }
    const controls = animate(current, value, transition(speed, delay));
    return () => controls.stop();
  }, [current, value, reduced, speed, delay]);

  return (
    <>
      <motion.span aria-hidden="true">{text}</motion.span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
