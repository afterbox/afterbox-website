"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ApproveDeviceOverlay,
  BackupCodeOverlay,
  HelpAlertOverlay,
  HelpRequestOverlay,
  RemoveDeviceOverlay,
} from "@/components/security/SecurityOverlays";
import { DeleteAccountOverlay } from "@/components/dashboard/AccountOverlays";
import { DeleteItemOverlay, DocumentOverlay, ItemCategoryOverlay } from "@/components/dashboard/ItemOverlays";
import WhereGrid from "@/components/ui/dashboard/WhereGrid";
import Button from "@/components/ui/Button";
import GroupGlyph from "@/components/ui/GroupGlyph";
import { BanIcon, CameraIcon, CheckIcon, ChevronRightIcon, KeyIcon, MailIcon, PencilIcon, PeopleIcon, PersonAddIcon, SparkleIcon } from "@/components/ui/icons";
import Monogram from "@/components/ui/onboarding/Monogram";
import { AnimatedNumber, Collapse } from "@/components/ui/onboarding/Motion";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import Spinner from "@/components/ui/Spinner";
import TextField from "@/components/ui/TextField";
import { CategoryGlyph, Celebration, Lead, Pill, RoundIcon, Square } from "@/components/ui/dashboard/bits";
import { DateField, FormNote, MoneyField, SelectField } from "@/components/ui/dashboard/fields";
import { useDocumentPicker } from "@/components/ui/dashboard/home";
import { DialogTitle, Overlay, PhoneSheet, Step, useLayers } from "@/components/ui/dashboard/Layer";
import { Sk } from "@/components/ui/dashboard/Skeleton";
import { useMobile } from "@/components/ui/dashboard/useMedia";
import { useMe } from "@/store/me";
import { anyErrorCopy, isApiError } from "@/lib/api/errors";
import type { CategoryId, DetailField, Frequency, Item, Relation, ScanField } from "@/lib/api/types";
import { categoryInfo, fieldLabels, frequencies, groupInfo, groupLabelFor, guessCategory, pickerOrder, relations } from "@/lib/categories";
import { formatList, todayIso } from "@/lib/dashboard/format";
import { itemAmount, itemTitle, merchantName } from "@/lib/dashboard/items";
import { pressable, transition } from "@/lib/motion";
import { PASSKEY_ERROR, PasskeyError } from "@/lib/security/keychain";
import { useMotionTokens } from "@/lib/useMotionTokens";
import { useAccount } from "@/store/account";
import { useBank, useDisconnectBank } from "@/store/banks";
import { clearScanSession, useConfirmDocument, useScanSession, useStartScan } from "@/store/documents";
import { useAddFind, useChangeFindCategory, useFinds, useLeaveOutFind } from "@/store/finds";
import { useHome } from "@/store/home";
import { useCategories } from "@/store/meta";
import { useInvitePerson, usePeople, useReplacePerson } from "@/store/people";
import { useRealtimeEvent } from "@/store/realtime";
import { useAddItem, useItem, useSaveDetails } from "@/store/record";

const failure = (error: unknown) => (error instanceof PasskeyError ? PASSKEY_ERROR : anyErrorCopy(error));
const firstName = (name: string) => name.split(" ")[0];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join("");

/** The picker's categories in the API's order (pickerOrder), with the static table as the fallback. */
function usePickerCategories() {
  const meta = useCategories();
  const order = meta.data?.pickerOrder ?? pickerOrder;
  return order.map((id) => categoryInfo(id));
}

/* ---------------------------------------------------------------------------------------------
 * 16: Saved. Every add ends here. `count` is the API's own count after the add.
 * ------------------------------------------------------------------------------------------- */

function SavedStep({ item, count, next, onNext, onDone }: { item: Item; count: number; next?: Item | null; onNext?: () => void; onDone: () => void }) {
  const { grow, reduced } = useMotionTokens();
  const home = useHome();
  const tile = home.data?.categories.find((category) => category.id === item.category);
  const category = categoryInfo(item.category);
  const inCategory = tile?.count ?? 1;

  return (
    <div className="text-center">
      <Celebration tone="positive">
        <CheckIcon size={32} strokeWidth={2.4} />
      </Celebration>
      <DialogTitle className="mb-2">Saved to your record</DialogTitle>
      <Lead className="mb-7">
        {itemTitle(item)} is safe with everything else. <AnimatedNumber value={count} from={Math.max(0, count - 1)} delay={0.3} /> in your record.
      </Lead>
      <div className="mb-7 flex items-center gap-3.5 rounded-panel border border-line bg-ground px-[18px] py-4 text-left">
        <Square size={40}>
          <CategoryGlyph icon={category.icon} size={20} />
        </Square>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] text-ink">{category.label}</p>
          <p className="mt-0.5 truncate text-[13px] text-ink-soft">{formatList([...new Set((tile?.providers ?? [itemTitle(item)]).map(merchantName))])}</p>
        </div>
        <span className="text-[22px] tracking-[-0.02em] text-ink tabular-nums">
          <AnimatedNumber value={inCategory} from={Math.max(0, inCategory - 1)} delay={0.3} />
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

function FindsOverlay() {
  const { open, close } = useLayers();
  const finds = useFinds();
  const list = finds.data?.finds ?? [];

  useEffect(() => {
    if (finds.isSuccess && list.length === 0) close();
  }, [close, finds.isSuccess, list.length]);

  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <Celebration tone="deep">
          <SparkleIcon size={32} />
        </Celebration>
        <DialogTitle className="mb-2">{list.length === 1 ? "1 new find" : `${list.length || ""} new finds`}</DialogTitle>
        <Lead className="mb-7">Add them to your record?</Lead>
      </div>
      <ul className="border-t border-line">
        {list.map((find, index) => (
          <li key={find.id} className={`flex items-center gap-3.5 py-4 ${index < list.length - 1 ? "border-b border-line" : ""}`}>
            <Monogram letters={find.monogram} group={find.group} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] text-ink">{find.name}</p>
              <p className="mt-0.5 truncate text-[13px] text-ink-soft">{[find.provider, itemAmount(find)].filter(Boolean).join(" · ")}</p>
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
 * 03, 15, 16: Review one at a time: Yes, add it · Not mine / It's ended (the API needs the reason) ·
 * "Not right? Change category" (Where does it go?), then Saved.
 * ------------------------------------------------------------------------------------------- */

const ghostButton = `inline-flex h-12 cursor-pointer items-center justify-center rounded-full border border-line bg-ground px-6 text-[15px] font-semibold text-ink hover:bg-card disabled:cursor-default disabled:opacity-40 ${pressable}`;

function ReviewOverlay() {
  const { close, param, layer, openLayer, closeLayer } = useLayers();
  const mobile = useMobile();
  const finds = useFinds();
  const home = useHome();
  const addFind = useAddFind();
  const leaveOut = useLeaveOutFind();
  const changeCategory = useChangeFindCategory();
  const list = finds.data?.finds ?? [];
  const startId = param("find");
  const [total, setTotal] = useState<number | null>(null);
  if (total === null && finds.data) setTotal(finds.data.finds.length);
  const [currentId, setCurrentId] = useState<string | null>(startId);
  const [phase, setPhase] = useState<"ask" | "confirm" | "saved">("ask");
  const [reason, setReason] = useState<"not-mine" | "ended">("not-mine");
  const [saved, setSaved] = useState<{ item: Item; count: number; next: Item | null } | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const { reduced } = useMotionTokens();
  const picker = usePickerCategories();

  const find = list.find((candidate) => candidate.id === currentId) ?? list[0] ?? null;
  const choices = useRef<HTMLDivElement>(null);
  const settled = useRef(phase);
  const busy = addFind.isPending || leaveOut.isPending;
  const error = addFind.error ?? leaveOut.error ?? changeCategory.error;

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
    if (finds.isSuccess && !find && phase !== "saved" && !busy) close();
  }, [find, finds.isSuccess, phase, busy, close]);

  function add() {
    if (!find) return;
    addFind.mutate(find.id, {
      onSuccess: (reply) => {
        setSaved({ item: reply.item, count: reply.count, next: reply.next });
        setPhase("saved");
      },
    });
  }

  function leave() {
    if (!find) return;
    leaveOut.mutate(
      { id: find.id, reason },
      {
        onSuccess: ({ next }) => {
          if (next) {
            setReviewed((count) => count + 1);
            setCurrentId(next.id);
            setPhase("ask");
          } else close();
        },
      },
    );
  }

  function goNext() {
    const upcoming = saved?.next ?? list[0];
    if (!upcoming) return close();
    setReviewed((count) => count + 1);
    setCurrentId(upcoming.id);
    setSaved(null);
    setPhase("ask");
  }

  if (finds.isPending) {
    return (
      <Overlay kind="focus" width={520} center onClose={close}>
        <div className="text-center" aria-busy="true">
          <Sk round className="mx-auto mb-5 size-16" />
          <Sk className="mx-auto mb-3 h-3 w-24" />
          <Sk className="mx-auto mb-2 h-8 w-48" />
          <Sk className="mx-auto mb-9 h-4 w-56" />
          <Sk round className="h-[52px] w-full" />
        </div>
      </Overlay>
    );
  }

  const bank = find?.bankId ? (home.data?.banks.find((candidate) => candidate.id === find.bankId)?.name ?? null) : null;
  const shown = find;
  const count = total ?? list.length;
  const position = Math.min(reviewed, Math.max(count - 1, 0));
  const where = layer === "where";
  const category = shown ? categoryInfo(shown.category) : null;
  // Named beside the category unless the find is already called that ("Union membership").
  const shownGroup = shown && groupLabelFor(shown) ? groupInfo(shown.group) : null;

  const whereStep = shown && (
    <div>
      <DialogTitle className="mb-7 text-center">Where does it go?</DialogTitle>
      <WhereGrid
        categories={picker}
        value={shown.category}
        onPick={(id) => {
          changeCategory.mutate({ id: shown.id, category: id });
          closeLayer();
        }}
      />
      <Button variant="ground" size="block" onClick={closeLayer}>
        Keep {category?.label}
      </Button>
    </div>
  );

  return (
    <Overlay kind="focus" width={520} center onClose={close}>
      <Step id={phase === "saved" ? `saved-${saved?.item.id}` : where && !mobile ? `where-${currentId}` : `ask-${shown?.id}`}>
        {phase === "saved" && saved ? (
          <SavedStep item={saved.item} count={saved.count} next={saved.next} onNext={goNext} onDone={close} />
        ) : where && !mobile ? (
          whereStep
        ) : shown ? (
          <div>
            {count > 1 && (
              <div aria-hidden="true" className="mb-8 flex justify-center gap-1.5">
                {Array.from({ length: count }, (_, dot) => (
                  <span key={dot} className={`h-2 rounded-full ${dot === position ? "w-[22px] bg-ink-deep" : "w-2 bg-line"}`} />
                ))}
              </div>
            )}
            <div className="mb-5 flex justify-center">
              <Monogram letters={shown.monogram} group={shown.group} size="xl" />
            </div>
            <div className="text-center">
              <p className="mb-2.5 text-[13px]/normal text-ink-soft">{bank ? `New · found in ${bank}` : "New"}</p>
              <DialogTitle className="mb-2">{shown.name === "Rental income" ? "Rental income: you may let out a property" : shown.name}</DialogTitle>
              <Lead className="mb-3">{[shown.provider, itemAmount(shown), shown.since ? `since ${shown.since.slice(0, 4)}` : null].filter(Boolean).join(" · ")}</Lead>
              <p className="mb-8 flex items-center justify-center gap-1.5 text-[13px] text-ink-soft">
                <CategoryGlyph icon={category!.icon} size={14} />
                {category!.label}
                {shownGroup && (
                  <>
                    <span aria-hidden="true">·</span>
                    <GroupGlyph icon={shownGroup.icon} size={14} />
                    {shownGroup.label}
                  </>
                )}
                <span aria-hidden="true">·</span>
                <button type="button" onClick={() => openLayer("where")} disabled={busy} className={`cursor-pointer font-semibold text-ink-soft underline-offset-3 hover:text-ink hover:underline ${pressable}`}>
                  Not right? Change category
                </button>
              </p>
            </div>
            <Button variant="inkDeep" size="block" loading={addFind.isPending} loadingLabel="Adding" disabled={busy} onClick={add}>
              Yes, add it
            </Button>
            <div ref={choices}>
              <Collapse show={phase === "ask"}>
                <div data-choices className="grid grid-cols-2 gap-2.5 pt-3">
                  <button
                    type="button"
                    disabled={busy}
                    className={ghostButton}
                    onClick={() => {
                      setReason("not-mine");
                      setPhase("confirm");
                    }}
                  >
                    Not mine
                  </button>
                  <button
                    type="button"
                    disabled={busy}
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
                      {reason === "not-mine" ? "Not yours? We’ll leave it out." : "Ended? We’ll leave it out."}
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Button variant="alert" className="h-11 px-4" loading={leaveOut.isPending} loadingLabel="Leaving it out" disabled={busy} onClick={leave}>
                        Leave it out
                      </Button>
                      <button
                        type="button"
                        disabled={busy}
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
            <FormNote error={error ? failure(error) : null} />
          </div>
        ) : null}
      </Step>
      {mobile && (
        <PhoneSheet open={where && phase !== "saved"} onClose={closeLayer} label="Where does it go?">
          {whereStep}
        </PhoneSheet>
      )}
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
  const startScan = useStartScan();
  const picker = useDocumentPicker((file) => {
    startScan(file);
    open("scan", { category: null, via: null }, { replace: true });
  });

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

function TypeOverlay() {
  const { open, close, param, layer, openLayer, closeLayer } = useLayers();
  const mobile = useMobile();
  const picker = usePickerCategories();
  const addItem = useAddItem();
  // Typed-in amounts are in the member's home currency (the API adds it).
  const currency = useMe().data?.homeCurrency;
  const presetParam = param("category");
  const preset = presetParam && picker.some((category) => category.id === presetParam) ? (presetParam as CategoryId) : null;
  const via = param("via");
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<CategoryId | null>(preset);
  const [amount, setAmount] = useState<number | null>(null);
  const [value, setValue] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [since, setSince] = useState<string | null>(null);

  const guess = guessCategory(name);
  const categoryId = picked ?? guess?.category ?? null;
  const category = categoryId ? categoryInfo(categoryId) : null;
  const subtype = picked && picked !== guess?.category ? null : (guess?.subtype ?? null);
  const where = layer === "where";
  const saving = addItem.isPending;
  const saved = addItem.data ?? null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !category) return;
    addItem.mutate(
      category.kind === "own"
        ? { name: name.trim(), category: category.id, value: value === null ? null : { minor: value }, since }
        : { name: name.trim(), category: category.id, amount: amount === null ? null : { minor: amount }, frequency: amount === null ? null : frequency },
    );
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
            addItem.reset();
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
                    {currency && <MoneyField key="worth" label="Worth about" pence={value} currency={currency} onChange={setValue} disabled={saving} />}
                    <DateField name="since" label="Since" value={since} onChange={setSince} initial={since ?? "2020-03-01"} max={todayIso()} placeholder="Choose" disabled={saving} />
                  </>
                ) : (
                  <>
                    {currency && <MoneyField key="amount" label="Amount" pence={amount} currency={currency} onChange={setAmount} withPence disabled={saving} />}
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
      <FormNote error={addItem.isError ? failure(addItem.error) : null} />
    </form>
  );

  const whereStep = category && (
    <div>
      <DialogTitle className="mb-7 text-center">Where does it go?</DialogTitle>
      <WhereGrid categories={picker} value={category.id} onPick={setPicked} />
      <Button variant="inkDeep" size="block" onClick={closeLayer}>
        Done
      </Button>
    </div>
  );

  return (
    <Overlay kind="focus" width={saved ? 520 : 560} onClose={close} onBack={via === "add" && !saved ? () => open("add", { via: null }, { replace: true }) : undefined} center={Boolean(saved)}>
      <Step id={saved ? "saved" : where && !mobile ? "where" : "form"}>
        {saved ? <SavedStep item={saved.item} count={saved.count} onDone={close} /> : where && !mobile ? whereStep : form}
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
 * 09: Finding the details (the real read, up to ~25 s). 10: Check the details. Then Saved (new) or back to the item.
 * ------------------------------------------------------------------------------------------- */

const checklist: Record<DetailField, string> = {
  policyNumber: "Policy number",
  renews: "Renewal date",
  covers: "What it covers",
  address: "Address",
  accountNumber: "Account number",
};

const docLines = ["w-[55%]", "w-[90%]", "w-[70%]", "w-[85%]", "w-[95%]", "w-[60%]", "w-[80%]", "w-[45%]", "w-3/4"];

/** The animation keeps running until the response: ticks come in as reading goes on, the last waits for the answer. */
function Scanning({ fields }: { fields: DetailField[] }) {
  const { grow, reduced } = useMotionTokens();
  const hits = fields.slice(0, 2);
  const ticks = [2, 6];
  const [now, setNow] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const timer = setInterval(() => setNow((performance.now() - start) / 1000), 200);
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
              {fieldLabels[field]}
            </span>
          </motion.span>
        ))}
        <span className="ab-beam" />
      </div>
      <DialogTitle className="mb-5">Finding the details</DialogTitle>
      <ul className="mx-auto w-[220px] text-left" aria-live="polite">
        {fields.slice(0, 3).map((field, index) => {
          const done = index < 2 && now >= ticks[index];
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

function ScanFailed({ error, onRetry, onType }: { error: unknown; onRetry: (() => void) | null; onType: () => void }) {
  const unreadable = isApiError(error) && error.code === "SCAN_FAILED" && error.status === 422;
  return (
    <div className="text-center">
      <RoundIcon>
        <CameraIcon size={26} />
      </RoundIcon>
      <DialogTitle className="mb-2">{unreadable ? "We couldn’t read this one" : "That didn’t go through"}</DialogTitle>
      <Lead className="mb-8">{unreadable ? "Type it in instead? It only takes a moment." : failure(error)}</Lead>
      {onRetry && !unreadable ? (
        <>
          <Button variant="inkDeep" size="block" onClick={onRetry}>
            Try again
          </Button>
          <QuietLink onClick={onType} className="mt-3.5">
            Type it in instead
          </QuietLink>
        </>
      ) : (
        <Button variant="inkDeep" size="block" onClick={onType}>
          Type it in
        </Button>
      )}
    </div>
  );
}

function ScanOverlay() {
  const { open, close, param } = useLayers();
  const itemId = param("item");
  const typedIn = param("step") === "check";
  const itemView = useItem(itemId ?? "", { enabled: Boolean(itemId) });
  const item = itemId ? (itemView.data?.item ?? null) : null;
  const scanning = useScanSession();
  const startScan = useStartScan();
  const confirm = useConfirmDocument();
  const saveDetails = useSaveDetails();
  const picker = usePickerCategories();
  const retryPicker = useDocumentPicker((file) => startScan(file, itemId ?? undefined));
  const result = typedIn ? null : scanning?.status === "done" ? (scanning.result ?? null) : null;
  const [values, setValues] = useState<Partial<Record<DetailField, string>>>({});
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [saved, setSaved] = useState<{ item: Item; count: number } | null>(null);

  // Nothing being read and nothing to type in: there's no scan to show.
  useEffect(() => {
    if (!typedIn && !scanning) close();
  }, [close, scanning, typedIn]);

  // Done with the scan only when the person closes the sheet or finishes: the sheet itself may remount.
  const finish = () => {
    clearScanSession();
    close();
  };

  // The answer arrives: fill the form from it, once.
  const [filledFrom, setFilledFrom] = useState<string | null>(null);
  if (result && filledFrom !== result.documentId) {
    setFilledFrom(result.documentId);
    setValues(Object.fromEntries(result.fields.map((field) => [field.key, field.value])));
    setName(result.provider ? `${result.provider} ${result.category ? categoryInfo(result.category).unit[0] : ""}`.trim() : "");
    setCategory(result.category);
  }

  // Typing the details in: start from what the item already has, once it has loaded.
  const [seeded, setSeeded] = useState(false);
  if (typedIn && item && !seeded) {
    setSeeded(true);
    setValues({ ...item.details });
  }

  const phase: "scanning" | "failed" | "check" | "saved" = saved ? "saved" : typedIn ? "check" : scanning?.status === "failed" ? "failed" : result ? "check" : "scanning";
  const targetCategory = item?.category ?? category;
  const fields: DetailField[] = Array.from(
    new Set([...(targetCategory ? categoryInfo(targetCategory).fields : []), ...(result?.fields.map((field) => field.key) ?? [])]),
  ).sort((a, b) => SCAN_ORDER.indexOf(a) - SCAN_ORDER.indexOf(b));
  const found = new Set(result?.fields.map((field) => field.key) ?? []);
  const saving = confirm.isPending || saveDetails.isPending;
  const saveError = confirm.error ?? saveDetails.error;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const sent: ScanField[] = fields.flatMap((key) => (values[key] !== undefined ? [{ key, value: values[key] ?? "" }] : []));
    if (typedIn && item) {
      const details = Object.fromEntries(sent.map((field) => [field.key, field.value]));
      saveDetails.mutate({ id: item.id, details }, { onSuccess: finish });
      return;
    }
    if (!result) return;
    if (item) {
      confirm.mutate({ documentId: result.documentId, body: { fields: sent } }, { onSuccess: finish });
      return;
    }
    if (!name.trim() || !category) return;
    const info = categoryInfo(category);
    confirm.mutate(
      {
        documentId: result.documentId,
        body: {
          item: {
            name: name.trim(),
            category,
            ...(result.provider ? { provider: result.provider } : {}),
            ...(info.kind === "pay" && result.amount && result.frequency ? { amount: { minor: result.amount.minor, currency: result.amount.currency }, frequency: result.frequency } : {}),
          },
          fields: sent,
        },
      },
      { onSuccess: (reply) => setSaved(reply) },
    );
  }

  const foundMark = (
    <span className="inline-flex items-center gap-1 text-xs/[normal] text-positive">
      <CheckIcon size={12} strokeWidth={2.4} />
      Found
    </span>
  );

  return (
    <Overlay kind="focus" width={phase === "check" ? 560 : 520} center={phase !== "check"} onClose={finish}>
      {retryPicker.input}
      <Step id={phase}>
        {phase === "scanning" && <Scanning fields={fields.length ? fields : ["policyNumber", "renews", "covers"]} />}
        {phase === "failed" && (
          <ScanFailed
            error={scanning?.error}
            onRetry={() => retryPicker.pick()}
            onType={() => open(item ? "scan" : "type", item ? { item: item.id, step: "check" } : { via: null }, { replace: true })}
          />
        )}
        {phase === "check" && (
          <form onSubmit={onSubmit} noValidate>
            <div className="text-center">
              <DialogTitle className="mb-2">Check the details</DialogTitle>
              {result?.provider ? <Lead className="mb-7">From your {result.provider} document. Change anything that’s wrong.</Lead> : <div className="h-5" />}
            </div>
            <fieldset disabled={saving || confirm.isSuccess} className="min-w-0 space-y-3.5">
              {!item && result && (
                <>
                  <TextField label="What is it?" labelStyle="form" value={name} autoComplete="off" onChange={(event) => setName(event.target.value)} />
                  {!category && (
                    <div>
                      <p className="mb-2.5 text-sm/[normal] font-semibold text-ink">Where does it go?</p>
                      <WhereGrid categories={picker} value={category ?? ("" as CategoryId)} onPick={setCategory} />
                    </div>
                  )}
                </>
              )}
              {fields.map((field) =>
                field === "renews" ? (
                  <DateField
                    key={field}
                    name="renews"
                    label={fieldLabels[field]}
                    value={values.renews || null}
                    onChange={(iso) => setValues((current) => ({ ...current, renews: iso ?? "" }))}
                    aside={found.has(field) ? foundMark : undefined}
                    disabled={saving}
                  />
                ) : (
                  <TextField
                    key={field}
                    label={fieldLabels[field]}
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
            <Button
              type="submit"
              variant="inkDeep"
              size="block"
              loading={saving}
              loadingLabel="Saving"
              disabled={confirm.isSuccess || (!item && !typedIn && (!name.trim() || !category))}
            >
              Save
            </Button>
            <FormNote error={saveError ? failure(saveError) : null} />
          </form>
        )}
        {phase === "saved" && saved && <SavedStep item={saved.item} count={saved.count} onDone={finish} />}
      </Step>
    </Overlay>
  );
}

/* ---------------------------------------------------------------------------------------------
 * 04, 22: Who should know (instead)? 05: Invite sent. `fromName` is the member's own name.
 * ------------------------------------------------------------------------------------------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function InviteOverlay() {
  const { close, param } = useLayers();
  const people = usePeople();
  const account = useAccount();
  const invite = useInvitePerson();
  const replace = useReplacePerson();
  const replacingId = param("replace");
  const replacing = people.data?.people.find((person) => person.id === replacingId) ?? null;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState<Relation>(relations[0]);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const sending = invite.isPending || replace.isPending;
  const error = invite.error ?? replace.error;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setEmailError("Enter a full email address.");
      return;
    }
    const fromName = account.data?.name?.trim() || undefined;
    const body = { name: name.trim(), email: email.trim(), relation, ...(fromName ? { fromName } : {}) };
    const onSuccess = () => setSent(firstName(name.trim()));
    if (replacing) replace.mutate({ personId: replacing.id, body }, { onSuccess });
    else invite.mutate(body, { onSuccess });
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
                {replacing ? `${firstName(replacing.name)} won’t be your trusted person anymore.` : "They’ll get an email from you. They see nothing until it matters."}
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
                onChange={(next) => setRelation(next as Relation)}
                options={relations.map((option) => ({ value: option, label: option }))}
              />
            </fieldset>
            <div className={`transition-[height] duration-[var(--motion-base)] ease-[var(--motion-ease)] ${name.trim() ? "h-5" : "h-6"}`} />
            <Collapse show={Boolean(name.trim())}>
              <div className="pb-5">
                <div className="flex items-center gap-3 rounded-panel border border-line bg-ground px-4 py-3.5">
                  <KeyIcon size={18} className="flex-none text-ink-deep" />
                  <p className="flex-1 text-[13px]/[1.45] text-ink">{firstName(name.trim())} can also help you get back in if you ever lose your devices.</p>
                </div>
              </div>
            </Collapse>
            <Button type="submit" variant="inkDeep" size="block" loading={sending} loadingLabel="Sending" disabled={!name.trim() || !email.trim()}>
              Send invite
            </Button>
            <FormNote error={error ? failure(error) : null} />
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

function ReplaceOverlay() {
  const { open, close, param } = useLayers();
  const people = usePeople();
  const person = people.data?.people.find((candidate) => candidate.id === param("replace")) ?? people.data?.people[0] ?? null;

  useEffect(() => {
    if (people.isSuccess && !person) close();
  }, [close, people.isSuccess, person]);
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

function AcceptedOverlay() {
  const { close, param } = useLayers();
  const people = usePeople();
  const person = people.data?.people.find((candidate) => candidate.id === param("item")) ?? null;
  const first = person ? firstName(person.name) : "Your trusted person";
  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <Celebration tone="positive">
          <CheckIcon size={32} strokeWidth={2.4} />
        </Celebration>
        <DialogTitle className="mb-2">{first} accepted</DialogTitle>
        <Lead className="mb-7">{person ? first : "They"} can find your record when it matters.</Lead>
      </div>
      <Button variant="inkDeep" size="block" onClick={close}>
        Done
      </Button>
    </Overlay>
  );
}

function DisconnectOverlay() {
  const { close, closeTo, param } = useLayers();
  const router = useRouter();
  const bankId = param("item") ?? "";
  const bank = useBank(bankId);
  const disconnect = useDisconnectBank();
  const [kept, setKept] = useState(bank.data ?? null);
  if (bank.data && bank.data !== kept) setKept(bank.data);
  const shown = bank.data ?? kept;

  useEffect(() => {
    router.prefetch("/home/settings");
  }, [router]);

  useEffect(() => {
    if (bank.isError && !shown) close();
  }, [bank.isError, close, shown]);
  if (!shown) return null;

  const lose = [`No new finds from ${shown.name}`, "No reminders before payments", "We can’t check cancellations"];
  const unreachable = isApiError(disconnect.error) && disconnect.error.status === 503;

  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <div className="mb-5 flex justify-center">
          <Monogram letters={shown.name.charAt(0).toUpperCase()} size="lg" />
        </div>
        <DialogTitle className="mb-6">Disconnect {shown.name}?</DialogTitle>
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
          Your {shown.found} saved {shown.found === 1 ? "thing stays" : "things stay"}
        </li>
      </ul>
      <div className="h-6" />
      <Button variant="alert" size="block" loading={disconnect.isPending} loadingLabel="Disconnecting" onClick={() => disconnect.mutate(shown.id, { onSuccess: () => closeTo("/home/settings") })}>
        Disconnect
      </Button>
      <FormNote error={disconnect.isError ? (unreachable ? `We couldn’t reach ${shown.name}, so nothing changed. Try again in a minute.` : failure(disconnect.error)) : null} />
      <QuietLink onClick={close} className="mt-3.5">
        Keep it connected
      </QuietLink>
    </Overlay>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Which overlay the URL asks for, and the ones that open by themselves (new finds once per session on Home;
 * realtime: a device asking to be approved, a help request, a trusted person accepting).
 * ------------------------------------------------------------------------------------------- */

const overlays: Record<string, () => ReactNode> = {
  finds: FindsOverlay,
  review: ReviewOverlay,
  add: AddOverlay,
  type: TypeOverlay,
  scan: ScanOverlay,
  invite: InviteOverlay,
  replace: ReplaceOverlay,
  accepted: AcceptedOverlay,
  disconnect: DisconnectOverlay,
  "approve-device": ApproveDeviceOverlay,
  "help-request": HelpRequestOverlay,
  "help-alert": HelpAlertOverlay,
  "remove-device": RemoveDeviceOverlay,
  "backup-code": BackupCodeOverlay,
  "item-category": ItemCategoryOverlay,
  "delete-item": DeleteItemOverlay,
  document: DocumentOverlay,
  "delete-account": DeleteAccountOverlay,
};

let findsPrompted = false;

export default function Overlays() {
  const pathname = usePathname();
  const { sheet, open } = useLayers();
  const home = useHome();
  const newFinds = home.data?.newFinds.count ?? 0;

  useEffect(() => {
    if (sheet || pathname !== "/home" || findsPrompted || newFinds === 0) return;
    findsPrompted = true;
    open("finds");
  }, [newFinds, open, pathname, sheet]);

  useRealtimeEvent("device.approval_requested", ({ approvalId }) => open("approve-device", { approval: approvalId }));
  useRealtimeEvent("help.requested", ({ requestId }) => open("help-request", { request: requestId }));
  useRealtimeEvent("help.alert", ({ requestId }) => open("help-alert", { request: requestId }));
  useRealtimeEvent("person.accepted", ({ personId }) => open("accepted", { item: personId }));

  const Current = sheet ? overlays[sheet] : undefined;
  return <AnimatePresence>{Current ? <Current key={sheet} /> : null}</AnimatePresence>;
}
