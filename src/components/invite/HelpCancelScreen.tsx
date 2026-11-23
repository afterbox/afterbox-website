"use client";

import { useSearchParams } from "next/navigation";
import AuthCard from "@/components/ui/auth/AuthCard";
import AuthTitle from "@/components/ui/auth/AuthTitle";
import BrandMark from "@/components/ui/BrandMark";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import { CheckIcon } from "@/components/ui/icons";
import { anyErrorCopy, isApiError } from "@/lib/api/errors";
import { useCancelHelp } from "@/store/help";

/**
 * "This wasn't me", from the member's email: `/help/cancel?request=<id>&token=<token>`. Works signed out (the link's
 * token, once). Cancelling changes no keys and signs the asking device out. New: no design existed.
 */
export default function HelpCancelScreen() {
  const params = useSearchParams();
  const requestId = params.get("request");
  const token = params.get("token");
  const cancel = useCancelHelp();
  const valid = Boolean(requestId && token && /^[A-Za-z0-9_-]{43}$/.test(token));

  if (cancel.isSuccess) {
    return (
      <AuthCard>
        <BrandMark />
        <span className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-positive text-on-night">
          <CheckIcon size={26} strokeWidth={2.6} />
        </span>
        <span role="status" className="sr-only">
          Stopped
        </span>
        <AuthTitle title="We’ve stopped it">That device has been signed out, and nothing in your record changed.</AuthTitle>
        <Button href="/login" name="help-cancel-login" variant="ground" size="block">
          Sign in to afterbox
        </Button>
      </AuthCard>
    );
  }

  const ended = isApiError(cancel.error) && (cancel.error.status === 404 || cancel.error.status === 409);

  return (
    <AuthCard>
      <BrandMark />
      <AuthTitle title={valid && !ended ? "Stop this request?" : "This link has expired"}>
        {valid && !ended
          ? "Someone asked your trusted person to let a new device open your record. If it wasn’t you, stop it here."
          : isApiError(cancel.error) && cancel.error.status === 409
            ? cancel.error.message
            : "This link has expired or was already used."}
      </AuthTitle>
      {valid && !ended && (
        <>
          <Button variant="alert" size="block" loading={cancel.isPending} loadingLabel="Stopping it" onClick={() => cancel.mutate({ requestId: requestId!, token: token! })}>
            This wasn’t me
          </Button>
          <FormMessage message={cancel.isError ? anyErrorCopy(cancel.error) : null} gapClassName="pt-3" />
        </>
      )}
    </AuthCard>
  );
}
