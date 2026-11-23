/**
 * Where to go after signing in and unlocking, when a link sent someone to sign in first: a help request or
 * approval link (`/home?sheet=…`), or an invite. Carried as `?next=` through /login, /verify, /unlock and
 * /secure; Google sign-in leaves the site, so it's kept for this tab in sessionStorage instead. Our own record
 * and invite pages only, never record data.
 */
const KEY = "afterbox.after-sign-in";
/** A sign-in abandoned this long ago doesn't redirect a later visit. */
const MAX_AGE_MS = 30 * 60 * 1000;

/** `path` when it's one of our own record or invite pages (same origin, no scheme or host), else null. */
export function safePath(path: string | null | undefined): string | null {
  if (!path || path.includes("\\")) return null;
  return /^\/(home(?=$|[/?#])|invite\/[^/])/.test(path) ? path : null;
}

/** `href` with `?next=` (or `&next=`) added when `next` is a safe path. */
export function withNext(href: string, next: string | null | undefined): string {
  const safe = safePath(next);
  return safe ? `${href}${href.includes("?") ? "&" : "?"}next=${encodeURIComponent(safe)}` : href;
}

export function rememberAfterSignIn(path: string) {
  const safe = safePath(path);
  if (!safe) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ path: safe, at: Date.now() }));
  } catch {
    // Without it, signing in lands on the usual page.
  }
}

export function takeAfterSignIn(): string | null {
  try {
    const stored = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!stored) return null;
    // A bare path: kept by an older build, just before this one was deployed.
    if (stored.startsWith("/")) return safePath(stored);
    const { path, at } = JSON.parse(stored) as { path?: unknown; at?: unknown };
    if (typeof path !== "string" || typeof at !== "number" || Date.now() - at > MAX_AGE_MS) return null;
    return safePath(path);
  } catch {
    return null;
  }
}
