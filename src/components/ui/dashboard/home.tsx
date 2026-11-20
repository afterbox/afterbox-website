"use client";

import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import {
  CameraIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FlagIcon,
  PersonAddIcon,
  PoundIcon,
  ResendIcon,
  SparkleIcon,
} from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import { findsLine, type CategorySummary, type Task } from "@/lib/dashboard/api";
import { formatPence, plural } from "@/lib/dashboard/format";
import type { DashEvent, Item } from "@/lib/dashboard/mock";
import { distance, liftable, pressable, stagger, transition } from "@/lib/motion";
import { useMotionTokens } from "@/lib/useMotionTokens";
import { CategoryGlyph, Square, StackedMonograms } from "./bits";

/* Tiles: one per category. */

export function Tile({ summary, delay = 0 }: { summary: CategorySummary; delay?: number }) {
  const { move } = useMotionTokens();
  const money = summary.monthly > 0 ? `${formatPence(summary.monthly)} a month` : summary.worth > 0 ? formatPence(summary.worth).replace(/\.00$/, "") : null;
  return (
    <motion.li initial={{ opacity: 0, y: move(distance.rise) }} animate={{ opacity: 1, y: 0 }} transition={transition("base", delay)}>
      <Link
        href={`/home/record/${summary.id}?from=home`}
        name={`tile-${summary.id}`}
        className={`flex h-full flex-col gap-3.5 rounded-panel bg-card p-[18px] ring-1 ring-line hover:ring-ink-soft/30 sm:p-5 ${pressable} ${liftable}`}
      >
        <span className="flex items-center justify-between">
          <Square size={36}>
            <CategoryGlyph icon={summary.icon} size={18} />
          </Square>
          <StackedMonograms letters={summary.monograms} />
        </span>
        <span className="block min-w-0 flex-1">
          <span className="block text-[24px]/none tracking-[-0.03em] text-ink sm:text-[28px]/none">{summary.count}</span>
          <span className="mt-1.5 block text-[15px] text-ink">{summary.label}</span>
          {money && <span className="mt-0.5 block text-[13px] text-ink-soft tabular-nums">{money}</span>}
        </span>
        <span className="block border-t border-line pt-3 text-[13px] font-semibold">
          {summary.missing > 0 ? (
            <span className="text-ink-soft">{summary.missing === 1 ? "1 needs details" : `${summary.missing} need details`}</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-positive">
              <CheckIcon size={13} strokeWidth={2.4} />
              Complete
            </span>
          )}
        </span>
      </Link>
    </motion.li>
  );
}

/* The dark "new finds" banner, with the haze glow drifting behind. */

export function FindsBanner({ finds, onReview }: { finds: Item[]; onReview: () => void }) {
  return (
    <div className="relative flex items-center gap-4 overflow-hidden rounded-card bg-ink-deep p-[18px] sm:px-6 sm:py-[22px]">
      <span
        aria-hidden="true"
        className="ab-drift pointer-events-none absolute -top-20 -right-[60px] size-[260px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-haze)_50%,transparent),transparent_70%)]"
      />
      <Square size={44} tone="glass" className="max-sm:size-10">
        <SparkleIcon size={22} className="max-sm:size-5" />
      </Square>
      <div className="relative min-w-0 flex-1">
        <p className="text-[17px] tracking-[-0.01em] text-on-night sm:text-[20px]">{plural(finds.length, "new find", "new finds")}</p>
        <p className="mt-[3px] text-[13px] text-on-night-soft">{findsLine(finds)}</p>
      </div>
      <button
        type="button"
        onClick={onReview}
        className={`relative inline-flex h-10 flex-none cursor-pointer items-center rounded-full bg-on-night px-[18px] text-sm/[normal] font-semibold text-ink-deep hover:opacity-90 focus-visible:outline-on-night ${pressable}`}
      >
        Review
      </button>
    </div>
  );
}

/* Next up */

const label = "text-xs/[normal] font-semibold tracking-[0.04em] text-ink-soft uppercase";

/** Day 1: one card, "Who should know?" (also People with nobody chosen yet, without the eyebrow). */
export function PersonCard({ onChoose, eyebrow = true }: { onChoose: () => void; eyebrow?: boolean }) {
  return (
    <div className="rounded-card bg-card p-6 ring-1 ring-line sm:p-7">
      {eyebrow && <p className={`mb-[18px] ${label}`}>Next up</p>}
      <Square size={44}>
        <PersonAddIcon size={22} />
      </Square>
      <div className="h-4" />
      <h2 className="mb-1.5 text-[22px]/[1.1] tracking-[-0.035em] text-ink sm:text-[24px]/[1.1]">Who should know?</h2>
      <p className="mb-6 text-sm/normal text-ink-soft sm:text-[15px]/normal">Choose one person who can find all of this when it matters.</p>
      <Button variant="inkDeep" size="block" onClick={onChoose}>
        Choose someone
      </Button>
    </div>
  );
}

function Dots({ count, index, className = "" }: { count: number; index: number; className?: string }) {
  const { resize } = useMotionTokens();
  return (
    <span aria-hidden="true" className={`flex items-center gap-1.5 ${className}`}>
      {Array.from({ length: count }, (_, dot) => (
        <motion.span
          key={dot}
          initial={false}
          animate={{
            width: dot === index ? 18 : 6,
            backgroundColor: dot === index ? "var(--color-ink-deep)" : "var(--color-line)",
          }}
          transition={resize("base")}
          className="h-1.5 rounded-full"
        />
      ))}
    </span>
  );
}

const arrow = `flex size-8 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-ink hover:bg-ground disabled:cursor-default disabled:opacity-40 ${pressable}`;

type ItemTask = Extract<Task, { kind: "item" }>;

/**
 * Day 2 on: up to 3 tasks stacked. Swipe sideways (phones) or use the arrows or a drag (desktop).
 * Done tasks slide out and the next comes forward.
 */
function TaskStack({ tasks, onDocument }: { tasks: ItemTask[]; onDocument: (item: Item) => void }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const shown = Math.min(index, tasks.length - 1);
  const task = tasks[shown];
  const drag = useMotionValue(0);
  const { move, grow } = useMotionTokens();
  const pull = useTransform(drag, [-160, 0, 160], [1, 0, 1]);
  const backScale = useTransform(pull, [0, 1], [1, grow(1.03)]);
  const backY = useTransform(pull, [0, 1], [0, move(-6)]);

  function go(step: number) {
    const next = shown + step;
    if (next < 0 || next >= tasks.length) return;
    setDirection(step);
    setIndex(next);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    drag.set(0);
    if (info.offset.x < -80 || info.velocity.x < -500) go(1);
    else if (info.offset.x > 80 || info.velocity.x > 500) go(-1);
  }

  const position = `Next up · ${shown + 1} of ${tasks.length}`;

  return (
    <div>
      <div className="relative mb-4 sm:mb-0">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={task.item.id}
            custom={direction}
            variants={{
              enter: { opacity: 0, scale: grow(0.96), y: move(10) },
              shown: { opacity: 1, scale: 1, y: 0, x: 0 },
              exit: (step: number) => ({ opacity: 0, x: move(step >= 0 ? -320 : 320), transition: transition("base") }),
            }}
            initial="enter"
            animate="shown"
            exit="exit"
            transition={transition("base")}
            drag={tasks.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            dragSnapToOrigin
            onDrag={(_, info) => drag.set(info.offset.x)}
            onDragEnd={onDragEnd}
            className="relative z-[3] cursor-grab touch-pan-y rounded-card bg-card p-[22px] shadow-lift active:cursor-grabbing sm:p-7"
          >
            <div className="mb-[18px] flex items-center justify-between">
              <p className={label} aria-live="polite">
                {position}
              </p>
              <Dots count={tasks.length} index={shown} className="sm:hidden" />
              <span className="flex gap-1.5 max-sm:sr-only">
                <button type="button" aria-label="Previous task" disabled={shown === 0} onClick={() => go(-1)} className={arrow}>
                  <ChevronLeftIcon size={15} />
                </button>
                <button type="button" aria-label="Next task" disabled={shown === tasks.length - 1} onClick={() => go(1)} className={arrow}>
                  <ChevronRightIcon size={15} />
                </button>
              </span>
            </div>
            <div className="mb-[18px] flex items-center gap-3.5 sm:mb-0 sm:block">
              <Square size={44} className="max-sm:size-10">
                <CameraIcon size={22} className="max-sm:size-5" />
              </Square>
              <div className="min-w-0 flex-1 sm:mt-4">
                <h2 className="text-[17px]/[1.25] text-ink sm:mb-1.5 sm:text-[24px]/[1.1] sm:tracking-[-0.035em]">{task.title}</h2>
                <p className="mt-1 text-[13px]/[1.4] text-ink-soft sm:mt-0 sm:mb-6 sm:text-[15px]/normal">{task.body}</p>
              </div>
            </div>
            <Button variant="inkDeep" size="block" onClick={() => onDocument(task.item)}>
              Add the document
            </Button>
          </motion.div>
        </AnimatePresence>
        {tasks.length > 1 && (
          <motion.div
            aria-hidden="true"
            style={{ scale: backScale, y: backY }}
            className="absolute inset-x-3 -bottom-2 z-[2] h-[60px] rounded-card bg-card ring-1 ring-line"
          />
        )}
        {tasks.length > 2 && (
          <motion.div
            aria-hidden="true"
            style={{ scale: backScale, y: backY }}
            className="absolute inset-x-6 -bottom-4 z-[1] h-[60px] rounded-card bg-card opacity-70 ring-1 ring-line"
          />
        )}
      </div>
      {tasks.length > 1 && <Dots count={tasks.length} index={shown} className="mt-7 justify-center max-sm:hidden" />}
    </div>
  );
}

export function NextUp({ tasks, onChoose, onDocument }: { tasks: Task[]; onChoose: () => void; onDocument: (item: Item) => void }) {
  const itemTasks = tasks.filter((task): task is ItemTask => task.kind === "item");
  return (
    <AnimatePresence mode="wait" initial={false}>
      {tasks[0]?.kind === "person" ? (
        <motion.div key="person" exit={{ opacity: 0 }} transition={transition("fast")}>
          <PersonCard onChoose={onChoose} />
        </motion.div>
      ) : itemTasks.length > 0 ? (
        <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition("base")}>
          <TaskStack tasks={itemTasks} onDocument={onDocument} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* What's new / Coming up: rows in the side column on desktop, cards that scroll sideways on phones. */

const eventIcons = { check: CheckIcon, resend: ResendIcon, flag: FlagIcon } as const;

export function Events({ events, title, delay = 0 }: { events: DashEvent[]; title: string; delay?: number }) {
  const { move } = useMotionTokens();
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-[15px] font-semibold text-ink">{title}</h2>
      <ul className="no-scrollbar -mx-6 flex snap-x snap-mandatory scroll-px-6 gap-2.5 overflow-x-auto px-6 sm:mx-0 sm:block sm:overflow-visible sm:px-0">
        {events.map((event, index) => {
          const Icon = eventIcons[event.icon];
          const tint = event.tone === "positive" ? "bg-positive/6 text-positive" : "bg-warn/6 text-warn";
          return (
            <motion.li
              key={event.id}
              initial={{ opacity: 0, y: move(distance.rise) }}
              animate={{ opacity: 1, y: 0 }}
              transition={transition("base", delay + index * stagger.base)}
              className="w-[236px] flex-none snap-start sm:mb-2.5 sm:w-auto"
            >
              <Link
                href={event.href}
                name={`event-${event.id}`}
                className={`group flex h-full flex-col rounded-panel border border-line p-4 sm:flex-row sm:items-center sm:gap-3.5 sm:px-[18px] ${
                  event.tone === "positive" ? "bg-positive/6" : "bg-warn/6"
                } ${pressable}`}
              >
                <span aria-hidden="true" className={`flex size-8 flex-none items-center justify-center rounded-field ${tint}`}>
                  <Icon size={16} />
                </span>
                <span className="mt-3 block min-w-0 flex-1 sm:mt-0">
                  <span className="block text-[15px]/[1.3] text-ink">{event.title}</span>
                  <span className="mt-1 block text-[13px] text-ink-soft sm:mt-0.5">{event.sub}</span>
                </span>
                <ChevronRightIcon size={16} className="text-ink-soft/70 group-hover:text-ink max-sm:hidden" />
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

export function SavedSoFar({ yearly }: { yearly: number }) {
  return (
    <section aria-label="Saved so far">
      <h2 className="mb-3 text-[15px] font-semibold text-ink">Saved so far</h2>
      <div className="flex items-center gap-3.5 rounded-panel border border-line bg-ground px-5 py-[18px]">
        <Square size={36} tone="positive">
          <PoundIcon size={18} />
        </Square>
        <p className="text-sm/[normal] text-ink-soft">
          <span className="text-[22px] tracking-[-0.02em] text-ink tabular-nums">{formatPence(yearly)}</span> a year saved
        </p>
      </div>
    </section>
  );
}

/** The hidden file input behind every "Snap or upload": camera on phones, files on desktop. */
export function useDocumentPicker(onPicked: (file: File) => void) {
  const input = useRef<HTMLInputElement>(null);
  return {
    pick: () => input.current?.click(),
    input: (
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPicked(file);
        }}
      />
    ),
  };
}
