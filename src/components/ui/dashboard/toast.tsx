"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSyncExternalStore } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { distance, transition } from "@/lib/motion";
import { useMotionTokens } from "@/lib/useMotionTokens";

type Toast = { id: number; message: string } | null;

let current: Toast = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function set(next: Toast) {
  current = next;
  listeners.forEach((listener) => listener());
}

/** A dark note at the bottom for 3s, e.g. "Invite sent again to Ada". */
export function showToast(message: string) {
  clearTimeout(timer);
  set({ id: Date.now(), message });
  timer = setTimeout(() => set(null), 3000);
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

/** Phones: above the tabs, 24px from each side. Desktop: centred at the bottom. */
export function Toaster() {
  const toast = useToast();
  const { move } = useMotionTokens();
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-6 bottom-[calc(100px+env(safe-area-inset-bottom))] z-[60] flex justify-center sm:bottom-8">
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
            {toast.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
