/**
 * Tink Link. The URL is built in the browser when the person is sent to their bank,
 * so the redirect follows whatever site they're on (localhost, previews, afterbox.co.uk).
 * Only the public client ID belongs here; the client secret stays on the server.
 */

const TINK_LINK_URL = "https://link.tink.com/1.0/transactions/connect-accounts/";
const STATE_KEY = "afterbox.tink-state";
export const CALLBACK_PATH = "/connect/callback";

function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function redirectOrigin() {
  const override = process.env.NEXT_PUBLIC_TINK_REDIRECT_ORIGIN?.trim();
  return (override || window.location.origin).replace(/\/+$/, "");
}

/** Builds the Tink Link URL and remembers a fresh `state` to check on the way back. */
export function buildTinkLinkUrl() {
  const clientId = process.env.NEXT_PUBLIC_TINK_CLIENT_ID?.trim();
  if (!clientId) throw new Error("NEXT_PUBLIC_TINK_CLIENT_ID is not set. Add it to .env.local.");

  const state = randomState();
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${redirectOrigin()}${CALLBACK_PATH}`,
    market: "GB",
    locale: "en_US",
    theme: "LIGHT",
    state,
  });
  return `${TINK_LINK_URL}?${params}`;
}

/** True when Tink sent back the state we stored. Each state works once. */
export function consumeTinkState(returned: string | null) {
  const saved = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return Boolean(saved && returned && saved === returned);
}
