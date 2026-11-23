"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { CheckIcon, FingerprintIcon, KeyIcon, PeopleIcon } from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import { BackLink, Lead, PageTitle, Pill, SectionLabel, Square } from "@/components/ui/dashboard/bits";
import { useLayers } from "@/components/ui/dashboard/Layer";
import Page from "@/components/ui/dashboard/Page";
import Ready from "@/components/ui/dashboard/Ready";
import { SettingsSkeleton } from "@/components/ui/dashboard/Skeleton";
import { DeviceGlyph } from "@/components/security/UnlockScreens";
import type { SecurityOverview } from "@/lib/api/types";
import { pressable, transition } from "@/lib/motion";
import { lastUsed } from "@/lib/security/deviceInfo";
import { useMotionTokens } from "@/lib/useMotionTokens";
import { useSecurityOverview } from "@/store/security";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** What 14 and 15 both count: devices that can open the record, and the ways back in that are on. */
export function accessSummary(overview: SecurityOverview) {
  const devices = overview.devices;
  const others = devices.filter((device) => !device.thisDevice);
  const helper = overview.trustedPerson?.status === "accepted" ? overview.trustedPerson : null;
  const ways = {
    thisDevice: devices.some((device) => device.thisDevice),
    anotherDevice: others.length > 0,
    trustedPerson: Boolean(helper),
    backupCode: overview.backupCode,
  };
  return {
    devices,
    others,
    helper,
    ways,
    line: `${plural(devices.length, "device", "devices")} · ${plural(Object.values(ways).filter(Boolean).length, "way", "ways")} back in`,
  };
}

export function useAccessLine() {
  const overview = useSecurityOverview();
  return overview.data ? accessSummary(overview.data).line : null;
}

const rowClasses = "flex items-center gap-3.5 py-4";
// The tap area reaches past the text without making the row taller than its 40px square.
const actionClasses = `-my-2 inline-flex cursor-pointer items-center py-2 text-sm/[normal] font-semibold ${pressable}`;

function Row({ icon, title, sub, children }: { icon: ReactNode; title: string; sub: string; children?: ReactNode }) {
  return (
    <div className={rowClasses}>
      <Square size={40}>{icon}</Square>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-ink">{title}</p>
        <p className="mt-0.5 text-[13px] text-ink-soft">{sub}</p>
      </div>
      {children}
    </div>
  );
}

function On() {
  return (
    <span className="inline-flex flex-none items-center gap-[5px] text-[13px] font-semibold text-positive">
      <CheckIcon size={14} strokeWidth={2.4} />
      On
    </span>
  );
}

/* The questions: one open at a time, the first open, like the landing page's. */

function faqs(helper: string | null) {
  return [
    {
      question: "Can afterbox open my record?",
      answer: "No. Your record opens with any two of three parts: yours, ours and your trusted person’s. Ours alone can’t open it.",
    },
    {
      question: "What if I lose my phone or laptop?",
      answer: helper
        ? "Sign in on any device, then approve it from another one, use your backup code, or ask your trusted person."
        : "Sign in on any device, then approve it from another one or use your backup code.",
    },
    {
      question: "Can my trusted person help me get back in?",
      answer: helper
        ? `Yes. ${helper} can approve a request from you. You’ll get an email every time, so it never happens quietly.`
        : "Yes. Your trusted person can approve a request from you. You’ll get an email every time, so it never happens quietly. Add someone in People to turn this on.",
    },
    {
      question: "Do you see my fingerprint or face?",
      answer: "Never. It stays on your device. We only receive a yes.",
    },
  ];
}

const bar = "absolute inset-x-[3px] top-1/2 h-[1.5px] -translate-y-1/2 rounded-full bg-ink-soft";

function Questions({ helper }: { helper: string | null }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div className="border-t border-line">
      {faqs(helper).map((faq, index) => {
        const open = index === openIndex;
        return (
          <div key={faq.question} className="border-b border-line py-4">
            <h3>
              <button
                type="button"
                id={`security-question-${index}`}
                aria-expanded={open}
                aria-controls={`security-answer-${index}`}
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 text-left text-[15px] text-ink"
              >
                {faq.question}
                <span aria-hidden="true" className="relative size-4 flex-none">
                  <span className={bar} />
                  <span className={`${bar} transition-transform duration-300 ${open ? "" : "rotate-90"}`} />
                </span>
              </button>
            </h3>
            <div
              id={`security-answer-${index}`}
              role="region"
              aria-labelledby={`security-question-${index}`}
              inert={!open}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="pt-2 text-sm/[1.55] text-ink-soft">{faq.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* 15: Devices and access */

function DevicesAndAccess({ overview }: { overview: SecurityOverview }) {
  const { open } = useLayers();
  const { resize } = useMotionTokens();
  const { devices, others, helper, ways } = accessSummary(overview);
  const helperFirst = helper?.name ? helper.name.split(" ")[0] : null;

  return (
    <Page settings>
      <BackLink href="/home/settings" name="security-back" label="Settings" className="max-sm:hidden" />
      <PageTitle className="mb-2">Devices and access</PageTitle>
      <Lead className="mb-7 sm:mb-9">Where your record can be opened, and your ways back in.</Lead>

      <SectionLabel className="mb-1">DEVICES</SectionLabel>
      <div className="border-t border-line">
        <AnimatePresence initial={false}>
          {devices.map((device) => (
            <motion.div
              key={device.id}
              exit={{ opacity: 0, height: 0, transition: { ...transition("base"), height: resize("base") } }}
              className="overflow-hidden border-b border-line last:border-b-0"
            >
              <Row
                icon={<DeviceGlyph kind={device.kind} size={20} />}
                title={device.name}
                sub={device.thisDevice ? "Used now" : `Used ${lastUsed(device.lastUsedAt)}`}
              >
                {device.thisDevice ? (
                  <Pill tone="added">This device</Pill>
                ) : (
                  <button type="button" onClick={() => open("remove-device", { item: device.id })} className={`${actionClasses} text-alert hover:opacity-80`}>
                    Remove
                  </button>
                )}
              </Row>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <SectionLabel className="mt-8 mb-1 sm:mt-10">WAYS BACK IN</SectionLabel>
      <div className="border-t border-line [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-line">
        <Row icon={<FingerprintIcon size={20} />} title="This device" sub="Face, fingerprint or PIN">
          {ways.thisDevice && <On />}
        </Row>
        <Row icon={<DeviceGlyph kind="laptop" size={20} />} title="Another device" sub={ways.anotherDevice ? `${plural(others.length, "device", "devices")} can approve` : "Optional"}>
          {ways.anotherDevice && <On />}
        </Row>
        <Row icon={<PeopleIcon size={20} />} title="Your trusted person" sub={helper ? (helperFirst ? `${helperFirst} can help` : "They can help") : overview.trustedPerson ? "Invited" : "Optional"}>
          {ways.trustedPerson ? (
            <On />
          ) : overview.trustedPerson ? null : (
            <Link href="/home/people?sheet=invite" name="security-add-person" className={`${actionClasses} text-ink-deep hover:opacity-80`}>
              Add
            </Link>
          )}
        </Row>
        <Row icon={<KeyIcon size={20} />} title="Backup code" sub="Optional">
          {ways.backupCode ? (
            <span className="flex items-center gap-4">
              <button type="button" onClick={() => open("backup-code")} className={`${actionClasses} text-ink-deep hover:opacity-80`}>
                New code
              </button>
              <On />
            </span>
          ) : (
            <button type="button" onClick={() => open("backup-code")} className={`${actionClasses} min-w-8 justify-end text-ink-deep hover:opacity-80`}>
              Add
            </button>
          )}
        </Row>
      </div>

      <SectionLabel className="mt-8 mb-1 sm:mt-10">QUESTIONS</SectionLabel>
      <Questions helper={helperFirst} />
    </Page>
  );
}

export function SecuritySettingsScreen() {
  const query = useSecurityOverview();
  return (
    <Ready query={query} skeleton={<SettingsSkeleton title="Devices and access" />}>
      {(overview) => <DevicesAndAccess overview={overview} />}
    </Ready>
  );
}
