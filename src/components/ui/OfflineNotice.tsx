"use client";

import { onlineManager } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useSyncExternalStore } from "react";
import { WifiOffIcon } from "@/components/ui/icons";
import { transition } from "@/lib/motion";

function useOnline() {
  return useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
    () => true,
  );
}

/** A calm notice while offline. Changes made meanwhile wait and are sent when the connection comes back. */
export default function OfflineNotice() {
  const online = useOnline();
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={transition("base")}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 sm:bottom-6"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-ink-deep px-4 py-2.5 text-[13px] font-semibold text-on-night shadow-pop">
            <WifiOffIcon size={15} />
            You’re offline. We’ll save your changes when you’re back.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
