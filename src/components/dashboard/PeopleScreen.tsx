"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import FormMessage from "@/components/ui/FormMessage";
import { CheckIcon, EyeIcon, MailIcon, MoreIcon, PeopleIcon, PersonAddIcon, TrashIcon } from "@/components/ui/icons";
import Monogram from "@/components/ui/onboarding/Monogram";
import Spinner from "@/components/ui/Spinner";
import { Lead, PageTitle, Pill, Square } from "@/components/ui/dashboard/bits";
import { PersonCard } from "@/components/ui/dashboard/home";
import { PhoneSheet, useLayers } from "@/components/ui/dashboard/Layer";
import Page from "@/components/ui/dashboard/Page";
import Ready from "@/components/ui/dashboard/Ready";
import { PeopleSkeleton } from "@/components/ui/dashboard/Skeleton";
import { showToast } from "@/components/ui/dashboard/toast";
import { useMobile } from "@/components/ui/dashboard/useMedia";
import { anyErrorCopy } from "@/lib/api/errors";
import { useIsDemo } from "@/store/me";
import type { PeopleList, Person } from "@/lib/api/types";
import { pressable, transition } from "@/lib/motion";
import { PASSKEY_ERROR, PasskeyError } from "@/lib/security/keychain";
import { usePeople, useRemovePerson, useResendInvite } from "@/store/people";
import { useMotionTokens } from "@/lib/useMotionTokens";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join("");

/** Desktop: a small menu under the ··· button. Esc or a click outside closes it; arrows move between items. */
function MenuPopover({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const { grow } = useMotionTokens();

  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[role=menuitem]:not([disabled])")?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.parentElement?.contains(event.target as Node)) close.current();
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  function onKeyDown(event: KeyboardEvent) {
    const items = [...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled])") ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(at + step + items.length) % items.length]?.focus();
    }
  }

  return (
    <motion.div
      ref={ref}
      role="menu"
      onKeyDown={onKeyDown}
      initial={{ opacity: 0, scale: grow(0.97), y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: grow(0.97), transition: transition("fast") }}
      transition={transition("fast")}
      className="absolute top-full right-0 z-20 mt-2 w-60 origin-top-right rounded-panel bg-card p-1.5 shadow-pop ring-1 ring-line"
    >
      {children}
    </motion.div>
  );
}

const menuItem = `flex h-11 w-full cursor-pointer items-center gap-3 rounded-field px-3 text-left text-[15px] text-ink hover:bg-ground focus-visible:bg-ground focus-visible:outline-none disabled:cursor-default ${pressable}`;
const sheetItem = `flex w-full cursor-pointer items-center gap-3.5 px-1 py-4 text-left text-base text-ink ${pressable}`;

function PersonRow({ person }: { person: Person }) {
  const mobile = useMobile();
  const { open } = useLayers();
  const [menu, setMenu] = useState(false);
  const [resent, setResent] = useState(false);
  const resendInvite = useResendInvite();
  const removePerson = useRemovePerson();
  const sending = resendInvite.isPending || removePerson.isPending;
  const failed = resendInvite.error ?? removePerson.error;
  const error = failed ? (failed instanceof PasskeyError ? PASSKEY_ERROR : anyErrorCopy(failed)) : null;
  const moreRef = useRef<HTMLButtonElement>(null);
  const first = person.name.split(" ")[0];
  const invited = person.status === "invited";

  const closeMenu = () => {
    setMenu(false);
    if (!mobile) moreRef.current?.focus();
  };

  function resend() {
    setMenu(false);
    resendInvite.mutate(person.id, {
      onSuccess: () => {
        setResent(true);
        showToast(`Invite sent again to ${first}`);
      },
    });
  }

  /** Remove (S: the passkey is asked for). */
  function remove() {
    setMenu(false);
    removePerson.mutate(person.id, { onSuccess: () => showToast(`${first} removed`) });
  }

  function change() {
    setMenu(false);
    open("replace", { replace: person.id });
  }

  return (
    <div>
      <div className="rounded-panel bg-card p-4 ring-1 ring-line sm:p-5">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <Monogram letters={initials(person.name)} size="row" className="sm:size-11 sm:text-sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] text-ink">{person.name}</p>
            <p className="mt-0.5 truncate text-[13px] text-ink-soft">
              {person.relation}
              <span className="max-sm:hidden"> · {person.email}</span>
            </p>
          </div>
          <Pill tone={invited ? "invited" : "accepted"} />
          <div className="relative flex-none">
            <button
              ref={moreRef}
              type="button"
              aria-label={`More for ${person.name}`}
              aria-haspopup="menu"
              aria-expanded={menu}
              disabled={sending}
              onClick={() => setMenu((shown) => !shown)}
              className={`flex size-9 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-ground hover:text-ink ${pressable}`}
            >
              {sending ? <Spinner /> : <MoreIcon size={18} />}
              {sending && <span className="sr-only">Sending</span>}
            </button>
            {!mobile && (
              <AnimatePresence>
                {menu && (
                  <MenuPopover onClose={closeMenu}>
                    {invited &&
                      (resent ? (
                        <button type="button" role="menuitem" disabled className={`${menuItem} text-positive`}>
                          <CheckIcon size={17} strokeWidth={2.4} />
                          Sent again
                        </button>
                      ) : (
                        <button type="button" role="menuitem" onClick={resend} className={menuItem}>
                          <MailIcon size={17} className="text-ink-soft" />
                          Resend invite
                        </button>
                      ))}
                    <button type="button" role="menuitem" onClick={change} className={menuItem}>
                      <PersonAddIcon size={17} className="text-ink-soft" />
                      Change trusted person
                    </button>
                    <button type="button" role="menuitem" onClick={remove} className={`${menuItem} text-alert`}>
                      <TrashIcon size={17} />
                      Remove {first}
                    </button>
                  </MenuPopover>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
      <FormMessage message={error} align="start" />
      <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-soft">
        <EyeIcon size={15} className="flex-none" />
        <span className="sm:hidden">Sees nothing now. Everything when it matters.</span>
        <span className="max-sm:hidden">Sees nothing now. When it matters, {first} can find everything in your record.</span>
      </p>

      {mobile && (
        <PhoneSheet open={menu} onClose={closeMenu} overPage label={person.name}>
          <div className="mb-3 flex items-center gap-3">
            <Monogram letters={initials(person.name)} size="row" />
            <div className="min-w-0">
              <p className="truncate text-[15px] text-ink">{person.name}</p>
              <p className="mt-0.5 truncate text-[13px] text-ink-soft">{person.email}</p>
            </div>
          </div>
          {invited && (
            <button type="button" onClick={resend} className={`${sheetItem} border-b border-line`} data-autofocus>
              <MailIcon size={20} className="text-ink-soft" />
              Resend invite
            </button>
          )}
          <button type="button" onClick={change} className={`${sheetItem} border-b border-line`}>
            <PersonAddIcon size={20} className="text-ink-soft" />
            Change trusted person
          </button>
          <button type="button" onClick={remove} className={`${sheetItem} text-alert`}>
            <TrashIcon size={20} />
            Remove {first}
          </button>
        </PhoneSheet>
      )}
    </div>
  );
}

function People({ list }: { list: PeopleList }) {
  const demo = useIsDemo();
  // Trusted people here; a Family owner's family invitations belong to the family screen (billing work).
  const people = list.people.filter((person) => person.role === "trusted");
  const { open } = useLayers();

  return (
    <Page>
      <PageTitle className="mb-2">People</PageTitle>
      <Lead className="mb-6 sm:mb-10">Who can find your record when it matters.</Lead>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={people.length === 0 ? "nobody" : people.map((person) => person.id).join()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition("base")}
          className="space-y-6"
        >
          {people.length === 0 ? (
            <PersonCard eyebrow={false} onChoose={() => open("invite")} />
          ) : (
            people.map((person) => <PersonRow key={person.id} person={person} />)
          )}
        </motion.div>
      </AnimatePresence>

      {/* The Family plan teaser is an upgrade prompt: not in the demo, where plans are off. */}
      {!demo && (
        <div className="mt-7 flex items-center gap-3.5 rounded-panel border border-dashed border-line p-4 sm:px-5 sm:py-[18px]">
          <Square size={36} tone="ground" className="sm:size-10">
            <PeopleIcon size={18} className="sm:size-5" />
          </Square>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-ink">Family plan</p>
            <p className="mt-0.5 text-[13px] text-ink-soft">Add more people, and share your record with them now.</p>
          </div>
          <Pill tone="soonGround">Soon</Pill>
        </div>
      )}
    </Page>
  );
}

export default function PeopleScreen() {
  const query = usePeople();
  return (
    <Ready query={query} skeleton={<PeopleSkeleton />}>
      {(list) => <People list={list} />}
    </Ready>
  );
}
