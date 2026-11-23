/**
 * Where to go after signing in, when a page sent someone to sign in first (an invite link). A path on this site
 * only, kept for this tab; never record data.
 */
const KEY = "afterbox.after-sign-in";

export function rememberAfterSignIn(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // Without it, signing in lands on the usual page.
  }
}

export function takeAfterSignIn(): string | null {
  try {
    const path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return path && path.startsWith("/") && !path.startsWith("//") ? path : null;
  } catch {
    return null;
  }
}
