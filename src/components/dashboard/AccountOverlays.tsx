"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { BankIcon, ClockIcon, MailIcon, TrashIcon } from "@/components/ui/icons";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import { Lead } from "@/components/ui/dashboard/bits";
import { FormNote } from "@/components/ui/dashboard/fields";
import { DialogTitle, Overlay, useLayers } from "@/components/ui/dashboard/Layer";
import { anyErrorCopy, isApiError } from "@/lib/api/errors";
import { SUPPORT_EMAIL } from "@/lib/security/backupActions";
import { PASSKEY_ERROR, PasskeyError } from "@/lib/security/keychain";
import { useDeleteAccount } from "@/store/account";

/**
 * Delete my account (S). New screen (no design existed): 07's calm modal, with the copy from INTEGRATION.md.
 * 503 means nothing changed; on success the cookies are cleared, the browser forgets the member, and /login shows.
 */
export function DeleteAccountOverlay() {
  const { close } = useLayers();
  const router = useRouter();
  const remove = useDeleteAccount();
  const error = remove.error
    ? remove.error instanceof PasskeyError
      ? PASSKEY_ERROR
      : isApiError(remove.error) && remove.error.status === 503
        ? "Something’s not answering, so nothing changed. Try again in a minute."
        : anyErrorCopy(remove.error)
    : null;

  const lines = [
    { icon: <ClockIcon size={17} className="flex-none text-ink-soft" />, text: "Your account is closed now and permanently deleted within 30 days." },
    { icon: <BankIcon size={17} className="flex-none text-ink-soft" />, text: "Your banks are disconnected and any subscription is cancelled at once." },
    { icon: <MailIcon size={17} className="flex-none text-ink-soft" />, text: `Changed your mind? Email ${SUPPORT_EMAIL} before the date in the email we send you.` },
  ];

  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <span aria-hidden="true" className="mx-auto mb-5 flex size-14 items-center justify-center rounded-field bg-alert/8 text-alert">
          <TrashIcon size={26} />
        </span>
        <DialogTitle className="mb-2">Delete your account?</DialogTitle>
        <Lead className="mb-6">Everything in your record goes with it.</Lead>
      </div>
      <ul className="mb-7 space-y-3">
        {lines.map((line) => (
          <li key={line.text} className="flex gap-3 text-sm/normal text-ink">
            <span className="mt-0.5">{line.icon}</span>
            {line.text}
          </li>
        ))}
      </ul>
      <Button
        variant="alert"
        size="block"
        loading={remove.isPending}
        loadingLabel="Deleting"
        onClick={() => remove.mutate(undefined, { onSuccess: () => router.replace("/login?closed=1") })}
      >
        Delete my account
      </Button>
      <FormNote error={error} />
      <QuietLink onClick={close} className="mt-[18px]">
        Keep my account
      </QuietLink>
    </Overlay>
  );
}
