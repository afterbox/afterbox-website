"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { isApiError, retryAfterText } from "@/lib/api/errors";
import { isValidEmail } from "@/lib/auth";
import { useJoinUpdates } from "@/store/updates";

/**
 * "Get updates as we launch": POST /v1/updates. `website` is a honeypot: in the form, hidden from people (off-screen,
 * tabindex -1, no autocomplete) and sent empty. The answer never says whether the email was already there.
 */
export default function UpdatesForm() {
  const join = useJoinUpdates();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [invalid, setInvalid] = useState(false);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    join.mutate({ email, website });
  }

  const message = invalid
    ? "Enter a full email address."
    : join.isSuccess
      ? "Thanks, we’ll be in touch."
      : join.isError
        ? isApiError(join.error) && join.error.status === 429
          ? `Too many tries. ${retryAfterText(join.error.retryAfter)}`
          : isApiError(join.error) && join.error.status === 400
            ? "Enter a full email address."
            : "Something’s not available right now. Please try again soon."
        : null;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-2.5 md:w-[400px]">
      <label htmlFor="updates-email" className="text-sm text-on-night-soft">
        Get updates as we launch
      </label>
      <div className="flex rounded-full border border-on-night/35 py-1 pr-1 pl-[18px] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-on-night md:pl-5">
        <input
          id="updates-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Your email"
          value={email}
          disabled={join.isPending || join.isSuccess}
          aria-describedby={message ? "updates-message" : undefined}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setInvalid(false);
            if (join.isError) join.reset();
          }}
          className="min-w-0 flex-1 bg-transparent text-base text-on-night outline-none placeholder:text-on-night-soft"
        />
        <Button type="submit" variant="light" size="sm" loading={join.isPending} loadingLabel="Joining" disabled={join.isSuccess}>
          {join.isSuccess ? "Joined" : "Join"}
        </Button>
      </div>
      {/* Hidden from people; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[10000px] size-px overflow-hidden">
        <label htmlFor="updates-website">Website</label>
        <input id="updates-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </div>
      <p id="updates-message" role="status" className="min-h-5 text-[13px] text-on-night-soft">
        {message}
      </p>
    </form>
  );
}
