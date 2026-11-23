import { NextResponse, type NextRequest } from "next/server";

/**
 * A strict Content-Security-Policy with a fresh nonce per request (Next applies it to its own scripts while
 * rendering). Only our code runs: no 'unsafe-inline' or 'unsafe-eval' for scripts, 'strict-dynamic' so only
 * nonced scripts can load more. connect-src: our API, Ably and our own origin (the PostHog proxy at /ingest).
 * Static headers (HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP) are in next.config.ts for every path.
 */

const isDev = process.env.NODE_ENV === "development";
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

const ABLY = ["https://*.ably.io", "wss://*.ably.io", "https://*.ably-realtime.com", "wss://*.ably-realtime.com", "https://*.ably.net", "wss://*.ably.net"];

export function contentSecurityPolicy(nonce: string) {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'wasm-unsafe-eval' lets the Argon2id WebAssembly (backup code) compile; it doesn't allow eval of JS.
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", "'wasm-unsafe-eval'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src-elem": ["'self'", `'nonce-${nonce}'`],
    // React writes style attributes when it renders on the server (motion's first frame, CSS variables). They
    // can't run script; see docs/OPEN_QUESTIONS.md.
    "style-src-attr": ["'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", "https://cdn.tink.se"],
    "font-src": ["'self'"],
    "media-src": ["'self'"],
    "connect-src": ["'self'", API_URL, ...ABLY, ...(isDev ? ["ws://localhost:*", "ws://127.0.0.1:*"] : [])],
    // The document viewer shows a decrypted PDF from a blob: URL.
    "frame-src": ["'self'", "blob:"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    // Only where the API itself is https (production): locally it would upgrade http://localhost:8000.
    ...(API_URL.startsWith("https://") ? { "upgrade-insecure-requests": [] } : {}),
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|ingest|favicon.ico|icon.svg|apple-icon.png|videos|images|og-image.jpg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
