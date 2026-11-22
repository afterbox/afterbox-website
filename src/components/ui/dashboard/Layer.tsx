"use client";

import {
  animate,
  AnimatePresence,
  motion,
  motionValue,
  useDragControls,
  useMotionValue,
  usePresence,
  useTransform,
  type PanInfo,
} from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { ChevronLeftIcon, CloseIcon } from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import { distance, pressable, transition } from "@/lib/motion";
import { useMotionTokens } from "@/lib/useMotionTokens";
import { useMobile } from "./useMedia";

/* ---------------------------------------------------------------------------------------------
 * Overlays live in the URL (?sheet=…, and ?layer=… for one on top), so browser Back closes them.
 * Opening pushes a history entry; moving between steps of the same overlay replaces it.
 * ------------------------------------------------------------------------------------------- */

/** History entries pushed since the current overlay opened, so closing can step back past all of them. */
let depth = 0;

/** Params that belong to overlays and go when they close. */
const OVERLAY_PARAMS = ["sheet", "layer", "item", "step", "category", "find", "replace", "via"];

export function useLayers() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const href = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [params, pathname],
  );

  /** Opens an overlay (or the next step of one, with `replace`). */
  const open = useCallback(
    (sheet: string, extra: Record<string, string | null> = {}, { replace = false } = {}) => {
      const target = href({ sheet, layer: null, ...extra });
      if (replace) router.replace(target, { scroll: false });
      else {
        depth += 1;
        router.push(target, { scroll: false });
      }
    },
    [href, router],
  );

  const openLayer = useCallback(
    (layer: string) => {
      depth += 1;
      router.push(href({ layer }), { scroll: false });
    },
    [href, router],
  );

  const closeLayer = useCallback(() => {
    if (depth > 0) {
      depth -= 1;
      router.back();
    } else router.replace(href({ layer: null }), { scroll: false });
  }, [href, router]);

  /** Closes everything, stepping back past what it pushed. */
  const close = useCallback(() => {
    const steps = depth;
    depth = 0;
    if (steps > 0) window.history.go(-steps);
    else router.replace(href(Object.fromEntries(OVERLAY_PARAMS.map((key) => [key, null]))), { scroll: false });
  }, [href, router]);

  /**
   * Closes everything, then replaces the page underneath (e.g. back to Settings after Disconnect),
   * or with `push`, goes on from it so Back returns there (e.g. from Other ways to unlock).
   */
  const closeTo = useCallback(
    (target: string, { push = false } = {}) => {
      const steps = depth;
      depth = 0;
      const go = () => (push ? router.push(target, { scroll: false }) : router.replace(target, { scroll: false }));
      if (steps === 0) {
        go();
        return;
      }
      window.addEventListener("popstate", go, { once: true });
      window.history.go(-steps);
    },
    [router],
  );

  return {
    sheet: params.get("sheet"),
    layer: params.get("layer"),
    param: (key: string) => params.get(key),
    open,
    openLayer,
    closeLayer,
    close,
    closeTo,
  };
}

/** Browser Back (and leaving the page) also unwinds what we pushed. */
export function useLayerHistory() {
  const pathname = usePathname();
  useEffect(() => {
    const onPop = () => {
      if (depth > 0) depth -= 1;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    depth = 0;
  }, [pathname]);
}

/* ---------------------------------------------------------------------------------------------
 * The page behind a phone sheet scales back to 0.93, rounds and dims, following the sheet as it's dragged.
 * ------------------------------------------------------------------------------------------- */

/** 0 when no sheet covers the page, 1 when one is fully up. */
export const pageCover = motionValue(0);

export const SHEET_SPRING = { type: "spring", damping: 32, stiffness: 320 } as const;

/* ---------------------------------------------------------------------------------------------
 * Scroll lock and focus trap
 * ------------------------------------------------------------------------------------------- */

let locks = 0;

function useScrollLock() {
  useLayoutEffect(() => {
    locks += 1;
    const root = document.documentElement;
    if (locks === 1) {
      root.style.setProperty("--scrollbar-gap", `${window.innerWidth - root.clientWidth}px`);
      root.dataset.locked = "";
    }
    return () => {
      locks -= 1;
      if (locks === 0) delete root.dataset.locked;
    };
  }, []);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Focus goes in (to the title, or `data-autofocus`), Tab stays in, Esc closes, and focus goes back to the opener. */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = node.querySelector<HTMLElement>("[data-autofocus]") ?? node.querySelector<HTMLElement>("[data-title]") ?? node;
    requestAnimationFrame(() => first.focus({ preventScroll: true }));

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close.current();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const focusable = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const firstItem = focusable[0];
      const lastItem = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === firstItem || document.activeElement === node)) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }
    node.addEventListener("keydown", onKey);
    return () => {
      node.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [ref]);
}

/* ---------------------------------------------------------------------------------------------
 * Dialog title: every overlay is labelled by its title, which takes focus on open.
 * ------------------------------------------------------------------------------------------- */

const TitleContext = createContext<string | undefined>(undefined);

const titleSizes = {
  /** Modals and focus cards: 27px on phones, 32px from 640px. */
  page: "text-[27px]/[1.1] tracking-[-0.035em] sm:text-[32px]/[1.1]",
  /** Forms in focus cards (Type it in, Who should know?). */
  form: "text-[24px]/[1.15] tracking-[-0.03em] sm:text-[28px]/[1.15]",
  /** Small sheets: the date picker's label. */
  sheet: "text-[22px]/[1.15] tracking-[-0.03em]",
} as const;

export function DialogTitle({
  size = "page",
  className = "",
  children,
}: {
  size?: keyof typeof titleSizes;
  className?: string;
  children: ReactNode;
}) {
  const id = use(TitleContext);
  return (
    <h2 id={id} data-title tabIndex={-1} className={`font-normal text-ink outline-none ${titleSizes[size]} ${className}`}>
      {children}
    </h2>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Phone: bottom sheet (iOS). Spring up, drag the grabber down to close, page behind scales back.
 * ------------------------------------------------------------------------------------------- */

function Sheet({
  onClose,
  overPage,
  label,
  children,
}: {
  onClose: () => void;
  /** Straight over the page (not over a full-screen step), so the page scales back. */
  overPage: boolean;
  label?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  const y = useMotionValue(0);
  const height = useRef(0);
  const titleId = useId();
  const controls = useDragControls();
  const { reduced } = useMotionTokens();
  const opacity = useMotionValue(reduced ? 0 : 1);
  const cover = useTransform(y, (value) => (height.current ? Math.max(0, Math.min(1, 1 - value / height.current)) : 0));
  const scrim = useTransform(() => (reduced ? opacity.get() : cover.get()));

  useScrollLock();
  useDialogFocus(ref, onClose);

  useLayoutEffect(() => {
    height.current = ref.current?.offsetHeight ?? 0;
    if (reduced) {
      y.jump(0);
      animate(opacity, 1, transition("base"));
      return;
    }
    y.jump(height.current);
    animate(y, 0, SHEET_SPRING);
  }, [y, reduced, opacity, overPage]);

  useEffect(() => {
    if (!overPage || reduced) return;
    return cover.on("change", (value) => pageCover.set(value));
  }, [cover, overPage, reduced]);

  useEffect(() => {
    if (isPresent) return;
    const done = () => {
      if (overPage) pageCover.set(0);
      safeToRemove();
    };
    if (reduced) {
      animate(opacity, 0, transition("fast")).then(done);
      return;
    }
    animate(y, height.current || window.innerHeight, { ...SHEET_SPRING, restDelta: 1 }).then(done);
  }, [isPresent, safeToRemove, y, reduced, opacity, overPage]);

  function onDragEnd(_: unknown, info: PanInfo) {
    const far = info.offset.y > height.current * 0.25;
    const flick = info.velocity.y > 600;
    if (far || flick) onClose();
    else animate(y, 0, SHEET_SPRING);
  }

  return (
    <TitleContext value={titleId}>
      <div className="fixed inset-0 z-50">
        <motion.div aria-hidden="true" style={{ opacity: scrim }} className="absolute inset-0 bg-scrim" onClick={onClose} />
        <motion.div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={label ? undefined : titleId}
          aria-label={label}
          tabIndex={-1}
          style={{ y, opacity }}
          drag={reduced ? false : "y"}
          dragListener={false}
          dragControls={controls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.04, bottom: 1 }}
          onDragEnd={onDragEnd}
          className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-sheet bg-card outline-none"
        >
          <div
            onPointerDown={(event) => controls.start(event)}
            className="flex flex-none cursor-grab touch-none justify-center pt-2.5 pb-7 active:cursor-grabbing"
          >
            <span aria-hidden="true" className="h-[5px] w-9 rounded-full bg-line" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(24px,calc(env(safe-area-inset-bottom)+12px))]">
            {children}
          </div>
        </motion.div>
      </div>
    </TitleContext>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Desktop: the centred card modal over the dim. Scales from 0.97 and fades.
 * ------------------------------------------------------------------------------------------- */

const modalWidths = { 480: "w-[480px]", 520: "w-[520px]" } as const;

function Modal({
  onClose,
  width = 480,
  label,
  children,
}: {
  onClose: () => void;
  width?: keyof typeof modalWidths;
  label?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { grow } = useMotionTokens();
  useScrollLock();
  useDialogFocus(ref, onClose);

  return (
    <TitleContext value={titleId}>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-6">
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: transition("fast") }}
          transition={transition("base")}
          className="fixed inset-0 bg-scrim"
          onClick={onClose}
        />
        <motion.div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={label ? undefined : titleId}
          aria-label={label}
          tabIndex={-1}
          initial={{ opacity: 0, scale: grow(0.97) }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: grow(0.97), transition: transition("fast") }}
          transition={transition("base")}
          className={`relative max-w-full rounded-card bg-card px-11 pt-12 pb-10 shadow-pop outline-none ${modalWidths[width]}`}
        >
          {children}
        </motion.div>
      </div>
    </TitleContext>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Focus page: desktop, a ground page with the wordmark and a close button around a centred card;
 * phone, a full-screen page with a close (or back) button. For steps that need the whole screen.
 * ------------------------------------------------------------------------------------------- */

const focusWidths = { 520: "sm:w-[520px]", 560: "sm:w-[560px]" } as const;

const roundButton = `flex size-10 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-card ${pressable}`;

function FocusPage({
  onClose,
  onBack,
  width = 520,
  center = false,
  label,
  children,
}: {
  onClose: () => void;
  /** Phones show a back chevron instead of the close X (a step that came from another layer). */
  onBack?: () => void;
  width?: keyof typeof focusWidths;
  /** Phones: centre short steps vertically (forms start at the top). */
  center?: boolean;
  label?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { move } = useMotionTokens();
  useScrollLock();
  useDialogFocus(ref, onClose);

  return (
    <TitleContext value={titleId}>
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={label ? undefined : titleId}
        aria-label={label}
        tabIndex={-1}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: transition("fast") }}
        transition={transition("base")}
        className="fixed inset-0 z-40 flex flex-col overflow-y-auto overscroll-contain bg-ground outline-none"
      >
        <header className="sticky top-0 z-10 flex h-[52px] flex-none items-center justify-between bg-ground px-3 sm:h-[88px] sm:px-10">
          <Link
            href="/home"
            name="focus-wordmark"
            className="text-[26px] font-semibold tracking-[-0.035em] text-ink max-sm:hidden"
          >
            afterbox
          </Link>
          {onBack ? (
            <>
              <button type="button" aria-label="Back" onClick={onBack} className={`${roundButton} sm:hidden`}>
                <ChevronLeftIcon size={22} />
              </button>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className={`${roundButton} border border-line max-sm:hidden`}
              >
                <CloseIcon size={18} />
              </button>
            </>
          ) : (
            <button type="button" aria-label="Close" onClick={onClose} className={`${roundButton} sm:border sm:border-line`}>
              <CloseIcon size={20} />
            </button>
          )}
        </header>
        <div className={`flex flex-1 flex-col px-6 sm:items-center sm:justify-center sm:px-6 sm:pt-2 sm:pb-16 ${center ? "max-sm:justify-center" : ""}`}>
          <motion.div
            initial={{ opacity: 0, y: move(distance.rise) }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition("base")}
            className={`w-full max-w-full pt-2 pb-[max(24px,calc(env(safe-area-inset-bottom)+12px))] sm:rounded-card sm:bg-card sm:px-14 sm:pt-14 sm:pb-12 sm:shadow-card sm:transition-[width] sm:duration-300 sm:ease-[var(--motion-ease)] ${focusWidths[width]}`}
          >
            {children}
          </motion.div>
        </div>
      </motion.div>
    </TitleContext>
  );
}

/* ---------------------------------------------------------------------------------------------
 * One overlay, presented for the screen size.
 * ------------------------------------------------------------------------------------------- */

type OverlayProps = {
  /** modal: centred card on desktop, sheet on phones. focus: focus card on desktop, full page on phones. */
  kind: "modal" | "focus";
  onClose: () => void;
  onBack?: () => void;
  width?: 480 | 520 | 560;
  center?: boolean;
  /** A sheet stacked over a full-screen step: it dims, but the page doesn't scale. */
  overPage?: boolean;
  label?: string;
  children: ReactNode;
};

export function Overlay({ kind, onClose, onBack, width, center, overPage = true, label, children }: OverlayProps) {
  const mobile = useMobile();
  if (kind === "focus") {
    return (
      <FocusPage onClose={onClose} onBack={onBack} width={width === 560 ? 560 : 520} center={center} label={label}>
        {children}
      </FocusPage>
    );
  }
  if (mobile) {
    return (
      <Sheet onClose={onClose} overPage={overPage} label={label}>
        {children}
      </Sheet>
    );
  }
  return (
    <Modal onClose={onClose} width={width === 520 ? 520 : 480} label={label}>
      {children}
    </Modal>
  );
}

/** A phone-only sheet over something else (Where does it go?, the date picker), keyed for AnimatePresence. */
export function PhoneSheet({
  open,
  onClose,
  overPage = false,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  overPage?: boolean;
  label?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <Sheet key="sheet" onClose={onClose} overPage={overPage} label={label}>
          {children}
        </Sheet>
      )}
    </AnimatePresence>
  );
}

/** Swaps one step of an overlay for the next: the old fades out, the new fades in and rises. */
export function Step({ id, children }: { id: string; children: ReactNode }) {
  const { move } = useMotionTokens();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={id}
        initial={{ opacity: 0, y: move(distance.rise) }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: transition("fast") }}
        transition={transition("base")}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
