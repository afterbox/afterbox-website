"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSyncExternalStore } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import { distance, transition } from "@/lib/motion";
import { useMotionTokens } from "@/lib/useMotionTokens";

type ToastAction = { label: string; href: string };
type Toast = { id: number; message: string; action?: ToastAction } | null;

let current: Toast = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function set(next: Toast) {
  current = next;
  listeners.forEach((listener) => listener());
}

/** A dark note at the bottom for 3s (5s with an action), e.g. "Invite sent again to Ada". */
export function showToast(message: string, action?: ToastAction) {
  clearTimeout(timer);
  set({ id: Date.now(), message, action });
  timer = setTimeout(() => set(null), action ? 5000 : 3000);
}

function useToast() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}

const placements = {
  /** Phones: above the tabs. */
  tabs: "bottom-[calc(100px+env(safe-area-inset-bottom))] sm:bottom-8",
  /** Screens without tabs (setting up, unlocking). */
  bottom: "bottom-[calc(24px+env(safe-area-inset-bottom))] sm:bottom-8",
} as const;

/** Phones: 24px from each side. Desktop: centred at the bottom. */
export function Toaster({ placement = "tabs" }: { placement?: keyof typeof placements }) {
  const toast = useToast();
  const { move } = useMotionTokens();
  return (
    <div role="status" aria-live="polite" className={`pointer-events-none fixed inset-x-6 z-[60] flex justify-center ${placements[placement]}`}>
      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast.id}
            initial={{ opacity: 0, y: move(distance.rise) }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: transition("fast") }}
            transition={transition("base")}
            className="flex w-full items-center gap-2.5 rounded-panel bg-ink px-4 py-3.5 text-sm/[normal] text-on-night sm:w-auto sm:min-w-[320px]"
          >
            <CheckIcon size={16} />
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <Link
                href={toast.action.href}
                name="toast-action"
                onClick={() => set(null)}
                className="pointer-events-auto -my-3 flex min-h-11 items-center font-semibold whitespace-nowrap text-on-night underline-offset-3 hover:underline"
              >
                {toast.action.label}
              </Link>
            )}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
