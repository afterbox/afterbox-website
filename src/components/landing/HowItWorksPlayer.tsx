"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";

const steps = 3;

// Mobile steps last 8s, desktop 6s. Matches the 24s / 18s durations in globals.css.
const mobileQuery = "(max-width: 767px)";
const subscribeToMobile = (onChange: () => void) => {
  const media = matchMedia(mobileQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

// Where the loop is (0–1), read from the phone, which shows at every width. Null without motion.
function loopProgress(root: HTMLElement | null) {
  const animation = root
    ?.getAnimations({ subtree: true })
    .find((a) => a instanceof CSSAnimation && a.animationName === "hw-a1");
  return animation?.effect?.getComputedTiming().progress ?? null;
}

const stepAt = (progress: number) => Math.min(steps - 1, Math.floor(progress * steps));

/**
 * Drives the How it works loop, which itself is plain CSS (keyframes in globals.css).
 * Any descendant with data-hw-step="n" jumps to that step when clicked, a horizontal
 * swipe changes step, and the loop pauses only while off-screen.
 * Exposes data-step for the reduced-motion styles, where nothing auto-advances.
 */
export default function HowItWorksPlayer({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [step, setStep] = useState(0);
  const [restarts, setRestarts] = useState(0);
  const [inView, setInView] = useState(true);
  const isMobile = useSyncExternalStore(
    subscribeToMobile,
    () => matchMedia(mobileQuery).matches,
    () => false,
  );
  const stepSeconds = isMobile ? 8 : 6;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Crossing 768px shows step parts that were display: none and changes the loop length.
  // Restart everything at the phone's current step to keep them in step.
  useEffect(() => {
    const media = matchMedia(mobileQuery);
    const resync = () => {
      const progress = loopProgress(ref.current);
      if (progress == null) return;
      setStep(stepAt(progress));
      setRestarts((n) => n + 1);
    };
    media.addEventListener("change", resync);
    return () => media.removeEventListener("change", resync);
  }, []);

  // Runs after the new --hw-delay is in the DOM, so the animations start over from that step.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!restarts || !el) return;
    el.dataset.restart = "";
    void el.offsetWidth;
    delete el.dataset.restart;
  }, [restarts]);

  const goTo = (next: number) => {
    setStep((next + steps) % steps);
    setRestarts((n) => n + 1);
  };

  // The step on screen now. Without motion there are no animations, so it is the chosen one.
  const currentStep = () => {
    const progress = loopProgress(ref.current);
    return progress == null ? step : stepAt(progress);
  };

  return (
    <div
      ref={ref}
      data-hw=""
      data-step={step}
      className={`group/hw touch-pan-y ${className}`}
      style={
        {
          "--hw-delay": `${-step * stepSeconds}s`,
          "--hw-play": inView ? "running" : "paused",
        } as CSSProperties
      }
      onClick={(e) => {
        const target = (e.target as Element).closest<HTMLElement>("[data-hw-step]");
        if (target) goTo(Number(target.dataset.hwStep));
      }}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        const touch = e.changedTouches[0];
        touchStart.current = null;
        if (!start || !touch) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
        goTo(currentStep() + (dx < 0 ? 1 : -1));
      }}
    >
      {children}
    </div>
  );
}
