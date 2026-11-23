"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/ui/auth/AuthCard";
import AuthTitle from "@/components/ui/auth/AuthTitle";
import BrandMark from "@/components/ui/BrandMark";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import { CheckIcon, KeyIcon, PeopleIcon } from "@/components/ui/icons";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import { Sk } from "@/components/ui/dashboard/Skeleton";
import { anyErrorCopy, isApiError } from "@/lib/api/errors";
import { rememberAfterSignIn } from "@/lib/afterSignIn";
import { useAcceptInvite, useInvite } from "@/store/invites";
import { useMe } from "@/store/me";
import { endLocalSession, useSignOut } from "@/store/sessions";

function Badge({ tone = "brand", children }: { tone?: "brand" | "positive"; children: React.ReactNode }) {
  return (
    <span className={`mx-auto mb-6 flex size-14 items-center justify-center rounded-full ${tone === "positive" ? "bg-positive text-on-night" : "bg-mist text-ink-deep"}`}>
      {children}
    </span>
  );
}

/**
 * The invite page (new: no design existed; the auth card's layout). `GET /v1/invites/<token>` is public. Accepting
 * needs the invited email signed in with its own record locked: signed out → sign up or log in, then back here;
 * not locked → /secure, then back; then `POST …/accept`.
 */
export default function InviteScreen({ token }: { token: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const invite = useInvite(token);
  const me = useMe();
  const accept = useAcceptInvite();
  const signOut = useSignOut();
  const here = `/invite/${encodeURIComponent(token)}`;
  const signedOut = me.isError && isApiError(me.error) && me.error.status === 401;
  const first = invite.data?.inviterFirstName ?? null;
  const family = invite.data?.role === "family_member";
  const who = first ?? "Someone you know";

  function signIn(mode: "signup" | "login") {
    rememberAfterSignIn(here);
    router.push(`/${mode}`);
  }

  function acceptNow() {
    accept.mutate(token, {
      onError: (error) => {
        if (isApiError(error) && error.code === "KEYS_REQUIRED") router.push(`/secure?next=${encodeURIComponent(here)}`);
      },
    });
  }

  if (invite.isPending || (me.isPending && !signedOut)) {
    return (
      <AuthCard>
        <BrandMark />
        <div aria-busy="true" className="text-center">
          <Sk round className="mx-auto mb-6 size-14" />
          <Sk className="mx-auto mb-3 h-8 w-60" />
          <Sk className="mx-auto mb-8 h-4 w-52" />
          <Sk round className="h-[52px] w-full" />
        </div>
      </AuthCard>
    );
  }

  if (invite.isError || !invite.data || invite.data.status === "expired" || invite.data.status === "revoked") {
    return (
      <AuthCard>
        <BrandMark />
        <AuthTitle title="This link has expired">
          {isApiError(invite.error) && invite.error.status === 429 ? anyErrorCopy(invite.error) : "Ask the person who invited you to send it again."}
        </AuthTitle>
        <Button href="/" name="invite-home" variant="ground" size="block">
          About afterbox
        </Button>
      </AuthCard>
    );
  }

  if (invite.data.status === "accepted" || accept.isSuccess) {
    return (
      <AuthCard>
        <BrandMark />
        <Badge tone="positive">
          <CheckIcon size={26} strokeWidth={2.6} />
        </Badge>
        <span role="status" className="sr-only">
          Accepted
        </span>
        <AuthTitle title={family ? "You’ve joined the Family plan" : `You’re ${first ? `${first}’s` : "their"} trusted person`}>
          {family ? "Everyone on it can help each other when it matters." : `You see nothing now. When it matters, you can help ${first ?? "them"} find everything.`}
        </AuthTitle>
        <Button href="/home" name="invite-done" variant="inkDeep" size="block">
          Go to my record
        </Button>
      </AuthCard>
    );
  }

  const wrongEmail = isApiError(accept.error) && accept.error.code === "FORBIDDEN";
  const needsLock = me.data && !me.data.keysReady;

  return (
    <AuthCard>
      <BrandMark />
      <Badge>{family ? <PeopleIcon size={26} /> : <KeyIcon size={26} />}</Badge>
      <AuthTitle title={family ? `${who} invited you to their Family plan` : `${who} has chosen you`}>
        {family
          ? "Join to keep your own record, and help each other when it matters."
          : `As ${first ? `${first}’s` : "their"} trusted person, you’ll be able to help find everything in their record when it matters. You see nothing until then.`}
      </AuthTitle>

      {signedOut ? (
        <>
          <Button variant="inkDeep" size="block" onClick={() => signIn("signup")}>
            Start your record to accept
          </Button>
          <QuietLink onClick={() => signIn("login")} className="mt-4">
            I already have an account
          </QuietLink>
        </>
      ) : needsLock ? (
        <>
          <p className="mb-6 text-center text-sm/normal text-ink-soft">First, lock your own record. It keeps what you’re trusted with safe.</p>
          <Button href={`/secure?next=${encodeURIComponent(here)}`} name="invite-lock" variant="inkDeep" size="block">
            Lock my record
          </Button>
        </>
      ) : (
        <>
          <Button variant="inkDeep" size="block" loading={accept.isPending} loadingLabel="Accepting" onClick={acceptNow}>
            Accept
          </Button>
          <FormMessage
            message={
              accept.isError && !(isApiError(accept.error) && accept.error.code === "KEYS_REQUIRED")
                ? wrongEmail
                  ? "This invite was sent to another email. Sign in with that one."
                  : anyErrorCopy(accept.error)
                : null
            }
            gapClassName="pt-3"
          />
          {wrongEmail && (
            <QuietLink
              onClick={() =>
                signOut.mutate(undefined, {
                  onSettled: () => {
                    endLocalSession(client);
                    signIn("login");
                  },
                })
              }
              className="mt-4"
            >
              Sign in with another email
            </QuietLink>
          )}
        </>
      )}
    </AuthCard>
  );
}
