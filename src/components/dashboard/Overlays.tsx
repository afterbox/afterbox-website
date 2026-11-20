"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import {
  BanIcon,
  CameraIcon,
  CheckIcon,
  ChevronRightIcon,
  MailIcon,
  PencilIcon,
  PeopleIcon,
  PersonAddIcon,
  SparkleIcon,
} from "@/components/ui/icons";
import Monogram from "@/components/ui/onboarding/Monogram";
import { AnimatedNumber, Collapse } from "@/components/ui/onboarding/Motion";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import Spinner from "@/components/ui/Spinner";
import TextField from "@/components/ui/TextField";
import { CategoryGlyph, Celebration, Lead, Pill, RoundIcon, Square } from "@/components/ui/dashboard/bits";
import { DateField, FormNote, MoneyField, SelectField } from "@/components/ui/dashboard/fields";
import { useDocumentPicker } from "@/components/ui/dashboard/home";
import { DialogTitle, Overlay, PhoneSheet, Step, useLayers } from "@/components/ui/dashboard/Layer";
import { useMobile } from "@/components/ui/dashboard/useMedia";
import {
  addFind,
  addItem,
  amountText,
  disconnectBank,
  getBankView,
  invite,
  isActive,
  itemTitle,
  leaveOutFind,
  markCelebrated,
  markFindsPrompted,
  saveDetails,
  summarise,
} from "@/lib/dashboard/api";
import { formatList, todayIso } from "@/lib/dashboard/format";
import {
  detailFields,
  detailLabels,
  frequencies,
  getCategory,
  getPickerCategories,
  guessCategory,
  relations,
  scanFor,
  type CategoryId,
  type DashboardState,
  type DetailField,
  type Frequency,
  type Item,
} from "@/lib/dashboard/mock";
import { useDashboardState, useLoaded } from "@/lib/dashboard/store";
import { pressable, transition } from "@/lib/motion";
import { useMotionTokens } from "@/lib/useMotionTokens";

const message = (caught: unknown) => (caught instanceof Error ? caught.message : String(caught));
const firstName = (name: string) => name.split(" ")[0];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join("");

/* ---------------------------------------------------------------------------------------------
 * 16: Saved. Every add ends here.
 * ------------------------------------------------------------------------------------------- */

function SavedStep({
  item,
  state,
  next,
  onNext,
  onDone,
}: {
  item: Item;
  state: DashboardState;
  next?: Item | null;
  onNext?: () => void;
  onDone: () => void;
}) {
  const { grow, reduced } = useMotionTokens();
  const count = state.items.filter(isActive).length;
  const summary = summarise(state.items).find((category) => category.id === item.category);
  const category = getCategory(item.category)!;

  return (
    <div className="text-center">
      <Celebration tone="positive">
        <CheckIcon size={32} strokeWidth={2.4} />
      </Celebration>
      <DialogTitle className="mb-2">Saved to your record</DialogTitle>
      <Lead className="mb-7">
        {itemTitle(item)} is safe with everything else. <AnimatedNumber value={count} from={count - 1} delay={0.3} /> in your record.
      </Lead>
      <div className="mb-7 flex items-center gap-3.5 rounded-panel border border-line bg-ground px-[18px] py-4 text-left">
        <Square size={40}>
          <CategoryGlyph icon={category.icon} size={20} />
        </Square>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] text-ink">{category.label}</p>
          <p className="mt-0.5 truncate text-[13px] text-ink-soft">{formatList([...new Set(summary?.providers ?? [itemTitle(item)])])}</p>
        </div>
        <span className="text-[22px] tracking-[-0.02em] text-ink tabular-nums">
          <AnimatedNumber value={summary?.count ?? 1} from={(summary?.count ?? 1) - 1} delay={0.3} />
        </span>
        <motion.span
          initial={{ opacity: 0, scale: grow(0.6) }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduced ? transition("base", 0.4) : { type: "spring", stiffness: 500, damping: 18, delay: 0.4 }}
        >
          <Pill tone="added">+1</Pill>
        </motion.span>
      </div>
      {next && onNext ? (
        <>
          <Button variant="inkDeep" size="block" onClick={onNext}>
            Next: {itemTitle(next)}
          </Button>
          <QuietLink onClick={onDone} className="mt-3.5">
            Done for now
          </QuietLink>
        </>
      ) : (
        <Button variant="inkDeep" size="block" onClick={onDone}>
          Done for now
        </Button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * 14: New finds, on arrival
 * ------------------------------------------------------------------------------------------- */

function FindsOverlay({ state }: { state: DashboardState }) {
  const { open, close } = useLayers();
  const finds = state.finds;
  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <Celebration tone="deep">
          <SparkleIcon size={32} />
        </Celebration>
        <DialogTitle className="mb-2">{finds.length === 1 ? "1 new find" : `${finds.length} new finds`}</DialogTitle>
        <Lead className="mb-7">Add them to your record?</Lead>
      </div>
      <ul className="border-t border-line">
        {finds.map((find, index) => (
          <li key={find.id} className={`flex items-center gap-3.5 py-4 ${index < finds.length - 1 ? "border-b border-line" : ""}`}>
            <Monogram letters={find.monogram} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] text-ink">{find.name}</p>
              <p className="mt-0.5 truncate text-[13px] text-ink-soft">{[find.provider, amountText(find)].filter(Boolean).join(" · ")}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="h-7" />
      <Button variant="inkDeep" size="block" onClick={() => open("review", {}, { replace: true })}>
        Review them
      </Button>
      <QuietLink onClick={close} className="mt-3.5">
        Later
      </QuietLink>
    </Overlay>
  );
}

/* ---------------------------------------------------------------------------------------------
 * 03, 15, 16: Review one at a time, "Not mine" asking in place, then Saved
 * ------------------------------------------------------------------------------------------- */

const ghostButton = `inline-flex h-12 cursor-pointer items-center justify-center rounded-full border border-line bg-ground px-6 text-[15px] font-semibold text-ink hover:bg-card disabled:cursor-default disabled:opacity-40 ${pressable}`;

function ReviewOverlay({ state }: { state: DashboardState }) {
  const { close, param } = useLayers();
  const startId = param("find");
  const [total] = useState(() => state.finds.length);
  const [currentId, setCurrentId] = useState(() => startId ?? state.finds[0]?.id ?? null);
  const [phase, setPhase] = useState<"ask" | "confirm" | "saved">("ask");
  const [reason, setReason] = useState<"mine" | "ended">("mine");
  const [busy, setBusy] = useState<"add" | "leave" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Item | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const { reduced } = useMotionTokens();

  const find = state.finds.find((candidate) => candidate.id === currentId) ?? null;
  const next = state.finds.find((candidate) => candidate.id !== currentId) ?? null;
  const choices = useRef<HTMLDivElement>(null);
  const settled = useRef(phase);

  // The button that was pressed goes away, so focus moves to what replaced it.
  useEffect(() => {
    if (settled.current === phase) return;
    const from = settled.current;
    settled.current = phase;
    if (phase === "confirm") choices.current?.querySelector<HTMLElement>("[data-confirm] button")?.focus();
    if (phase === "ask" && from === "confirm") choices.current?.querySelector<HTMLElement>("[data-choices] button")?.focus();
  }, [phase]);

  // Nothing (left) to review: close.
  useEffect(() => {
    if (!find && phase !== "saved" && busy === null) close();
  }, [find, phase, busy, close]);

  async function add() {
    if (!find) return;
    setBusy("add");
    setError(null);
    try {
      setSaved(await addFind(find.id));
      setPhase("saved");
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(null);
    }
  }

  async function leave() {
    if (!find) return;
    setBusy("leave");
    setError(null);
    try {
      const after = next;
      await leaveOutFind(find.id);
      if (after) {
        setReviewed((count) => count + 1);
        setCurrentId(after.id);
        setPhase("ask");
      } else close();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(null);
    }
  }

  function goNext() {
    const upcoming = state.finds[0];
    if (!upcoming) return close();
    setReviewed((count) => count + 1);
    setCurrentId(upcoming.id);
    setSaved(null);
    setPhase("ask");
  }

  const bank = find?.bankId ? (getBankView(state, find.bankId)?.bank.name ?? null) : null;
  const shown = phase === "saved" ? saved : find;
  const position = Math.min(reviewed, Math.max(total - 1, 0));

  return (
    <Overlay kind="focus" width={520} center onClose={close}>
      <Step id={phase === "saved" ? `saved-${saved?.id}` : `ask-${currentId}`}>
        {phase === "saved" && saved ? (
          <SavedStep item={saved} state={state} next={state.finds[0] ?? null} onNext={goNext} onDone={close} />
        ) : shown ? (
          <div>
            {total > 1 && (
              <div aria-hidden="true" className="mb-8 flex justify-center gap-1.5">
                {Array.from({ length: total }, (_, dot) => (
                  <span key={dot} className={`h-2 rounded-full ${dot === position ? "w-[22px] bg-ink-deep" : "w-2 bg-line"}`} />
                ))}
              </div>
            )}
            <div className="mb-5 flex justify-center">
              <Monogram letters={shown.monogram} size="xl" />
            </div>
            <div className="text-center">
              <p className="mb-2.5 text-[13px]/normal text-ink-soft">{bank ? `New · found in ${bank}` : "New"}</p>
              <DialogTitle className="mb-2">{shown.name}</DialogTitle>
              <Lead className="mb-9">
                {[shown.provider, amountText(shown), shown.since ? `since ${shown.since.slice(0, 4)}` : null].filter(Boolean).join(" · ")}
              </Lead>
            </div>
            <Button variant="inkDeep" size="block" loading={busy === "add"} loadingLabel="Adding" disabled={busy !== null} onClick={add}>
              Yes, add it
            </Button>
            <div ref={choices}>
            <Collapse show={phase === "ask"}>
              <div data-choices className="grid grid-cols-2 gap-2.5 pt-3">
                <button
                  type="button"
                  disabled={busy !== null}
                  className={ghostButton}
                  onClick={() => {
                    setReason("mine");
                    setPhase("confirm");
                  }}
                >
                  Not mine
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  className={ghostButton}
                  onClick={() => {
                    setReason("ended");
                    setPhase("confirm");
                  }}
                >
                  It’s ended
                </button>
              </div>
            </Collapse>
            <Collapse show={phase === "confirm"}>
              <div data-confirm className="pt-3">
                <motion.div
                  initial={reduced ? false : { scale: 0.98 }}
                  animate={{ scale: 1 }}
                  transition={transition("base")}
                  className="rounded-panel border border-alert/18 bg-alert/6 p-4"
                >
                  <p className="mb-3 text-center text-sm/[normal] text-ink">
                    {reason === "mine" ? "Not yours? We’ll leave it out." : "Ended? We’ll leave it out."}
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button variant="alert" className="h-11 px-4" loading={busy === "leave"} loadingLabel="Leaving it out" disabled={busy !== null} onClick={leave}>
                      Leave it out
                    </Button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => setPhase("ask")}
                      className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-full text-[15px] font-semibold text-ink hover:bg-card disabled:opacity-40 ${pressable}`}
                    >
                      Undo
                    </button>
                  </div>
                </motion.div>
              </div>
            </Collapse>
            </div>
            <FormNote error={error} />
          </div>
        ) : null}
      </Step>
    </Overlay>
  );
}

/* ---------------------------------------------------------------------------------------------
 * 17: Add something
 * ------------------------------------------------------------------------------------------- */

const optionClasses = `group flex w-full cursor-pointer items-center gap-4 rounded-panel border border-line bg-ground px-5 py-[18px] text-left transition-[border-color,box-shadow] duration-[var(--motion-fast)] hover:border-ink-deep hover:shadow-[inset_0_0_0_0.5px_var(--color-ink-deep)] ${pressable}`;

function AddOverlay() {
  const { open, close, param } = useLayers();
  const category = param("category");
  const picker = useDocumentPicker(() => open("scan", { category: null, via: null }, { replace: true }));

  return (
    <Overlay kind="modal" width={520} onClose={close}>
      {picker.input}
      <div className="text-center">
        <DialogTitle className="mb-2">Add something</DialogTitle>
        <Lead className="mb-7">We’ll sort it into the right place.</Lead>
      </div>
      <button type="button" className={`${optionClasses} mb-3`} onClick={picker.pick}>
        <Square size={44}>
          <CameraIcon size={22} />
        </Square>
        <span className="block min-w-0 flex-1">
          <span className="block text-[15px] text-ink">Snap or upload a document</span>
          <span className="mt-0.5 block text-[13px] text-ink-soft">We read it and fill in the details</span>
        </span>
        <ChevronRightIcon size={16} className="flex-none text-ink-soft/70" />
      </button>
      <button type="button" className={optionClasses} onClick={() => open("type", { via: "add", category }, { replace: true })}>
        <Square size={44}>
          <PencilIcon size={22} />
        </Square>
        <span className="block min-w-0 flex-1">
          <span className="block text-[15px] text-ink">Type it in</span>
          <span className="mt-0.5 block text-[13px] text-ink-soft">Just the name is enough to start</span>
        </span>
        <ChevronRightIcon size={16} className="flex-none text-ink-soft/70" />
      </button>
    </Overlay>
  );
}

/* ---------------------------------------------------------------------------------------------
 * 18, 27, 35: Type it in. 26: Where does it go? 30: the date picker.
 * ------------------------------------------------------------------------------------------- */

function WhereGrid({ value, onPick }: { value: CategoryId; onPick: (id: CategoryId) => void }) {
  return (
    <div role="radiogroup" aria-label="Where does it go?" className="mb-6 grid grid-cols-2 gap-2.5">
      {getPickerCategories().map((category) => {
        const selected = category.id === value;
        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onPick(category.id)}
            className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-panel border p-3.5 text-left transition-[background-color,border-color,box-shadow] duration-[var(--motion-fast)] ${pressable} ${
              selected ? "border-ink-deep bg-mist shadow-[inset_0_0_0_0.5px_var(--color-ink-deep)]" : "border-line bg-ground hover:bg-card"
            }`}
          >
            <Square size={32} tone={selected ? "card" : "mist"}>
              <CategoryGlyph icon={category.icon} size={16} />
            </Square>
            <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{category.label}</span>
            {selected && <CheckIcon size={16} strokeWidth={2.4} className="flex-none text-ink-deep" />}
          </button>
        );
      })}
    </div>
  );
}

function TypeOverlay({ state }: { state: DashboardState }) {
  const { open, close, param, layer, openLayer, closeLayer } = useLayers();
  const mobile = useMobile();
  const preset = getCategory(param("category"))?.id ?? null;
  const via = param("via");
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<CategoryId | null>(preset);
  const [amount, setAmount] = useState<number | null>(null);
  const [value, setValue] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [since, setSince] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Item | null>(null);

  const guess = guessCategory(name);
  const categoryId = picked ?? guess?.category ?? null;
  const category = getCategory(categoryId);
  const subtype = picked && picked !== guess?.category ? null : (guess?.subtype ?? null);
  const where = layer === "where";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !category) return;
    setSaving(true);
    setError(null);
    try {
      const item = await addItem({
        name: name.trim(),
        category: category.id,
        kind: category.kind,
        amount,
        frequency,
        value,
        since,
      });
      setSaved(item);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setSaving(false);
    }
  }

  const form = (
    <form onSubmit={onSubmit} noValidate>
      <DialogTitle className="mb-7 text-center">Type it in</DialogTitle>
      <fieldset disabled={saving} className="min-w-0">
        <TextField
          label="What is it?"
          labelStyle="form"
          value={name}
          autoComplete="off"
          data-autofocus
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
        />
        <Collapse show={Boolean(category)}>
          {category && (
            <div className="pt-5">
              <div className="mb-5 flex items-center gap-3 rounded-panel border border-line bg-ground px-4 py-3.5">
                <Square size={32}>
                  <CategoryGlyph icon={category.icon} size={16} />
                </Square>
                <div className="min-w-0 flex-1" aria-live="polite">
                  <p className="text-xs/[normal] text-ink-soft">Goes in</p>
                  <p className="mt-px truncate text-[15px] text-ink">{subtype ? `${category.label} · ${subtype}` : category.label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openLayer("where")}
                  className={`min-h-11 cursor-pointer px-1 text-sm/[normal] font-semibold text-ink-soft hover:text-ink ${pressable}`}
                >
                  Change
                </button>
              </div>
              <div className="grid grid-cols-1 gap-x-3 gap-y-5 min-[400px]:grid-cols-2">
                {category.kind === "own" ? (
                  <>
                    <MoneyField key="worth" label="Worth about" pence={value} onChange={setValue} disabled={saving} />
                    <DateField
                      name="since"
                      label="Since"
                      value={since}
                      onChange={setSince}
                      initial={since ?? "2020-03-01"}
                      max={todayIso()}
                      placeholder="Choose"
                      disabled={saving}
                    />
                  </>
                ) : (
                  <>
                    <MoneyField key="amount" label="Amount" pence={amount} onChange={setAmount} withPence disabled={saving} />
                    <SelectField
                      label="How often"
                      value={frequency}
                      onChange={(next) => setFrequency(next as Frequency)}
                      options={frequencies.map((option) => ({ value: option.id, label: option.label }))}
                      disabled={saving}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </Collapse>
      </fieldset>
      <div className="h-6" />
      <Button type="submit" variant="inkDeep" size="block" loading={saving} loadingLabel="Adding" disabled={!name.trim() || !category}>
        Add to my record
      </Button>
      <FormNote error={error} />
    </form>
  );

  const whereStep = category && (
    <div>
      <DialogTitle className="mb-7 text-center">Where does it go?</DialogTitle>
      <WhereGrid value={category.id} onPick={setPicked} />
      <Button variant="inkDeep" size="block" onClick={closeLayer}>
        Done
      </Button>
    </div>
  );

  return (
    <Overlay
      kind="focus"
      width={saved ? 520 : 560}
      onClose={close}
      onBack={via === "add" && !saved ? () => open("add", { via: null }, { replace: true }) : undefined}
      center={Boolean(saved)}
    >
      <Step id={saved ? "saved" : where && !mobile ? "where" : "form"}>
        {saved ? <SavedStep item={saved} state={state} onDone={close} /> : where && !mobile ? whereStep : form}
      </Step>
      {mobile && (
        <PhoneSheet open={where && !saved} onClose={closeLayer} label="Where does it go?">
          {whereStep}
        </PhoneSheet>
      )}
    </Overlay>
  );
}

/* ---------------------------------------------------------------------------------------------
 * 09: Finding the details. 10: Check the details. Then Saved (new) or back to the item.
 * ------------------------------------------------------------------------------------------- */

const checklist: Record<DetailField, string> = {
  policyNumber: "Policy number",
  renews: "Renewal date",
  covers: "What it covers",
  address: "Address",
  accountNumber: "Account number",
};

const docLines = ["w-[55%]", "w-[90%]", "w-[70%]", "w-[85%]", "w-[95%]", "w-[60%]", "w-[80%]", "w-[45%]", "w-3/4"];

function Scanning({ fields }: { fields: DetailField[] }) {
  const { grow, reduced } = useMotionTokens();
  const hits = fields.slice(0, 2);
  const ticks = [1, 2.2, 2.6];
  const [now, setNow] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const timer = setInterval(() => setNow((performance.now() - start) / 1000), 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center">
      <div aria-hidden="true" className="relative mx-auto mb-8 h-60 w-[190px] overflow-hidden rounded-field bg-card px-[22px] py-[26px] text-left shadow-card">
        {docLines.map((width, index) => (
          <span key={index} className={`mb-[11px] block h-[7px] rounded-full bg-line ${width}`} />
        ))}
        {hits.map((field, index) => (
          <motion.span
            key={field}
            initial={{ opacity: 0, scale: grow(0.96) }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduced ? transition("base", ticks[index]) : { type: "spring", stiffness: 420, damping: 24, delay: ticks[index] }}
            className={`absolute inset-x-3.5 h-6 rounded-field bg-positive/6 shadow-[inset_0_0_0_1.5px_var(--color-positive)] ${index === 0 ? "top-[42px]" : "top-[132px]"}`}
          >
            <span className="absolute -top-[11px] -right-1.5 inline-flex h-5 items-center rounded-full bg-positive px-2 text-[11px] font-semibold whitespace-nowrap text-on-night">
              {detailLabels[field]}
            </span>
          </motion.span>
        ))}
        <span className="ab-beam" />
      </div>
      <DialogTitle className="mb-5">Finding the details</DialogTitle>
      <ul className="mx-auto w-[220px] text-left" aria-live="polite">
        {fields.slice(0, 3).map((field, index) => {
          const done = now >= (ticks[index] ?? 2.6);
          return (
            <li key={field} className="flex items-center gap-2.5 py-2.5 text-[15px] text-ink">
              <span className="flex size-4 flex-none items-center justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  {done ? (
                    <motion.span key="done" initial={{ opacity: 0, scale: grow(0.6) }} animate={{ opacity: 1, scale: 1 }} transition={transition("fast")}>
                      <CheckIcon size={16} strokeWidth={2.4} className="text-positive" />
                    </motion.span>
                  ) : (
                    <motion.span key="wait" exit={{ opacity: 0 }} className="flex text-ink-soft">
                      <Spinner />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              {checklist[field]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const SCAN_ORDER: DetailField[] = ["policyNumber", "renews", "covers", "address", "accountNumber"];

function ScanOverlay({ state }: { state: DashboardState }) {
  const { close, param } = useLayers();
  const itemId = param("item");
  const item = itemId ? (state.items.find((candidate) => candidate.id === itemId) ?? null) : null;
  const typedIn = param("step") === "check";
  const [result] = useState(() => (typedIn ? null : scanFor(item)));
  const [phase, setPhase] = useState<"scanning" | "check" | "saved">(typedIn ? "check" : "scanning");
  const fields: DetailField[] = item
    ? Array.from(new Set([...detailFields[item.category], ...(result?.fields.map((field) => field.key) ?? [])]))
    : (result?.fields.map((field) => field.key) ?? []);
  const [values, setValues] = useState<Partial<Record<DetailField, string>>>(() => ({
    ...(item?.details ?? {}),
    ...Object.fromEntries((result?.fields ?? []).map((field) => [field.key, field.value])),
  }));
  const found = new Set(result?.fields.map((field) => field.key) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Item | null>(null);

  useEffect(() => {
    if (phase !== "scanning") return;
    const timer = setTimeout(() => setPhase("check"), 2900);
    return () => clearTimeout(timer);
  }, [phase]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const next = await saveDetails(item?.id ?? null, values);
      if (item) close();
      else {
        setSaved(next);
        setPhase("saved");
      }
    } catch (caught) {
      setError(message(caught));
    } finally {
      setSaving(false);
    }
  }

  const foundMark = (
    <span className="inline-flex items-center gap-1 text-xs/[normal] text-positive">
      <CheckIcon size={12} strokeWidth={2.4} />
      Found
    </span>
  );

  const scanFields = [...fields].sort((a, b) => SCAN_ORDER.indexOf(a) - SCAN_ORDER.indexOf(b));

  return (
    <Overlay kind="focus" width={phase === "check" ? 560 : 520} center={phase !== "check"} onClose={close}>
      <Step id={phase}>
        {phase === "scanning" && <Scanning fields={scanFields} />}
        {phase === "check" && (
          <form onSubmit={onSubmit} noValidate>
            <div className="text-center">
              <DialogTitle className="mb-2">Check the details</DialogTitle>
              {result && <Lead className="mb-7">From your {result.provider} schedule. Change anything that’s wrong.</Lead>}
              {!result && <div className="h-5" />}
            </div>
            <fieldset disabled={saving} className="min-w-0 space-y-3.5">
              {fields.map((field) =>
                field === "renews" ? (
                  <DateField
                    key={field}
                    name="renews"
                    label={detailLabels[field]}
                    value={values.renews ?? null}
                    onChange={(iso) => setValues((current) => ({ ...current, renews: iso }))}
                    aside={found.has(field) ? foundMark : undefined}
                    disabled={saving}
                  />
                ) : (
                  <TextField
                    key={field}
                    label={detailLabels[field]}
                    labelStyle="form"
                    labelAside={found.has(field) ? foundMark : undefined}
                    value={values[field] ?? ""}
                    autoComplete="off"
                    onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
                  />
                ),
              )}
            </fieldset>
            <div className="h-6" />
            <Button type="submit" variant="inkDeep" size="block" loading={saving} loadingLabel="Saving">
              Save
            </Button>
            <FormNote error={error} />
          </form>
        )}
        {phase === "saved" && saved && <SavedStep item={saved} state={state} onDone={close} />}
      </Step>
    </Overlay>
  );
}

/* ---------------------------------------------------------------------------------------------
 * 04, 22: Who should know (instead)? 05: Invite sent.
 * ------------------------------------------------------------------------------------------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function InviteOverlay({ state }: { state: DashboardState }) {
  const { close, param } = useLayers();
  const replacingId = param("replace");
  const replacing = state.people.find((person) => person.id === replacingId) ?? null;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState(relations[0]);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setEmailError("Enter a full email address.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const person = await invite({ name, email, relation }, replacing?.id);
      setSent(firstName(person.name));
    } catch (caught) {
      setError(message(caught));
    } finally {
      setSending(false);
    }
  }

  return (
    <Overlay kind="focus" width={520} center={Boolean(sent)} onClose={close}>
      <Step id={sent ? "sent" : "form"}>
        {sent ? (
          <div className="text-center">
            <RoundIcon tone="positive">
              <MailIcon size={26} />
            </RoundIcon>
            <DialogTitle className="mb-2">Invite sent to {sent}</DialogTitle>
            <Lead className="mb-8">We’ll let you know when {sent} accepts.</Lead>
            <Button variant="inkDeep" size="block" onClick={close}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="text-center">
              <RoundIcon>
                <PersonAddIcon size={26} />
              </RoundIcon>
              <DialogTitle className="mb-2">{replacing ? "Who should know instead?" : "Who should know?"}</DialogTitle>
              <Lead className="mb-8">
                {replacing
                  ? `${firstName(replacing.name)} won’t be your trusted person anymore.`
                  : "They’ll get an email from you. They see nothing until it matters."}
              </Lead>
            </div>
            <fieldset disabled={sending} className="min-w-0 space-y-4">
              <TextField label="Name" labelStyle="form" value={name} autoComplete="off" data-autofocus onChange={(event) => setName(event.target.value)} />
              <TextField
                label="Email"
                labelStyle="form"
                type="email"
                inputMode="email"
                autoComplete="off"
                value={email}
                error={emailError}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailError(null);
                }}
              />
              <SelectField
                label="They are your"
                value={relation}
                onChange={setRelation}
                options={relations.map((option) => ({ value: option, label: option }))}
              />
            </fieldset>
            <div className="h-6" />
            <Button
              type="submit"
              variant="inkDeep"
              size="block"
              loading={sending}
              loadingLabel="Sending"
              disabled={!name.trim() || !email.trim()}
            >
              Send invite
            </Button>
            <FormNote error={error} />
            {!replacing && (
              <div className="mt-6 flex items-center gap-3 rounded-panel border border-line bg-ground px-4 py-3.5">
                <PeopleIcon size={18} className="flex-none text-ink-soft" />
                <p className="flex-1 text-[13px]/[1.45] text-ink-soft">More people, and sharing now, come with the Family plan.</p>
                <Pill tone="soonCard">Soon</Pill>
              </div>
            )}
          </form>
        )}
      </Step>
    </Overlay>
  );
}

/* ---------------------------------------------------------------------------------------------
 * 21: Replace Ada? 32: Ada accepted. 29: Disconnect Monzo?
 * ------------------------------------------------------------------------------------------- */

function ReplaceOverlay({ state }: { state: DashboardState }) {
  const { open, close, param } = useLayers();
  const person = state.people.find((candidate) => candidate.id === param("replace")) ?? state.people[0] ?? null;

  useEffect(() => {
    if (!person) close();
  }, [person, close]);
  if (!person) return null;
  const first = firstName(person.name);

  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <div className="mb-5 flex justify-center">
          <Monogram letters={initials(person.name)} size="lg" />
        </div>
        <DialogTitle className="mb-2">Replace {first}?</DialogTitle>
        <Lead className="mb-8">{first} will no longer be your trusted person.</Lead>
      </div>
      <Button variant="inkDeep" size="block" onClick={() => open("invite", { replace: person.id }, { replace: true })}>
        Replace
      </Button>
      <QuietLink onClick={close} className="mt-3.5">
        Keep {first}
      </QuietLink>
    </Overlay>
  );
}

function AcceptedOverlay({ state }: { state: DashboardState }) {
  const { close, param } = useLayers();
  const person = state.people.find((candidate) => candidate.id === param("item")) ?? state.people[0] ?? null;
  const first = person ? firstName(person.name) : "";
  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <Celebration tone="positive">
          <CheckIcon size={32} strokeWidth={2.4} />
        </Celebration>
        <DialogTitle className="mb-2">{first} accepted</DialogTitle>
        <Lead className="mb-7">{first} can find your record when it matters.</Lead>
      </div>
      <Button variant="inkDeep" size="block" onClick={close}>
        Done
      </Button>
    </Overlay>
  );
}

function DisconnectOverlay({ state }: { state: DashboardState }) {
  const { close, closeTo, param } = useLayers();
  const router = useRouter();
  const view = getBankView(state, param("item") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kept] = useState(view);
  const shown = view ?? kept;

  useEffect(() => {
    router.prefetch("/settings");
  }, [router]);

  useEffect(() => {
    if (!shown) close();
  }, [shown, close]);
  if (!shown) return null;
  const { bank, found } = shown;

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectBank(bank.id);
      closeTo("/settings");
    } catch (caught) {
      setError(message(caught));
      setBusy(false);
    }
  }

  const lose = [`No new finds from ${bank.name}`, "No reminders before payments", "We can’t check cancellations"];

  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <div className="mb-5 flex justify-center">
          <Monogram letters={bank.monogram} size="lg" />
        </div>
        <DialogTitle className="mb-6">Disconnect {bank.name}?</DialogTitle>
      </div>
      <ul>
        {lose.map((line) => (
          <li key={line} className="flex items-center gap-3 py-3 text-[15px] text-ink">
            <BanIcon size={17} className="flex-none text-alert" />
            {line}
          </li>
        ))}
        <li className="flex items-center gap-3 py-3 text-[15px] text-ink">
          <CheckIcon size={17} strokeWidth={2.4} className="flex-none text-positive" />
          Your {found} saved {found === 1 ? "thing stays" : "things stay"}
        </li>
      </ul>
      <div className="h-6" />
      <Button variant="alert" size="block" loading={busy} loadingLabel="Disconnecting" onClick={disconnect}>
        Disconnect
      </Button>
      <FormNote error={error} />
      <QuietLink onClick={close} className="mt-3.5">
        Keep it connected
      </QuietLink>
    </Overlay>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Which overlay the URL asks for, and the two that open by themselves.
 * ------------------------------------------------------------------------------------------- */

const overlays: Record<string, (props: { state: DashboardState }) => ReactNode> = {
  finds: FindsOverlay,
  review: ReviewOverlay,
  add: AddOverlay,
  type: TypeOverlay,
  scan: ScanOverlay,
  invite: InviteOverlay,
  replace: ReplaceOverlay,
  accepted: AcceptedOverlay,
  disconnect: DisconnectOverlay,
};

export default function Overlays() {
  const state = useDashboardState();
  const loaded = useLoaded();
  const pathname = usePathname();
  const { sheet, open } = useLayers();

  // New finds open once per session on arriving at Home; an acceptance celebrates once, anywhere.
  useEffect(() => {
    if (!state || !loaded || sheet) return;
    if (pathname === "/home" && state.finds.length > 0 && !state.findsPrompted) {
      markFindsPrompted();
      open("finds");
      return;
    }
    const accepted = state.people.find((person) => person.status === "accepted" && !person.celebrated);
    if (accepted) {
      markCelebrated(accepted.id);
      open("accepted", { item: accepted.id });
    }
  }, [state, loaded, sheet, pathname, open]);

  const Current = sheet && state && loaded ? overlays[sheet] : undefined;

  return <AnimatePresence>{Current && state ? <Current key={sheet} state={state} /> : null}</AnimatePresence>;
}
