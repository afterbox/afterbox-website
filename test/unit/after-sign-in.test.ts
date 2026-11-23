import { afterEach, describe, expect, it, vi } from "vitest";
import { safeNext } from "@/components/security/SecureScreen";
import { rememberAfterSignIn, safePath, takeAfterSignIn, withNext } from "@/lib/afterSignIn";

describe("the page to come back to after signing in", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it.each([
    "/home",
    "/home?sheet=help-request&request=0193abcd",
    "/home/settings?sheet=approve-device&approval=0193abcd",
    "/home/record/pensions/0193abcd",
    "/invite/abc123",
  ])("keeps our own record and invite pages: %s", (path) => {
    expect(safePath(path)).toBe(path);
    expect(safeNext(path)).toBe(path);
  });

  it.each([
    null,
    "",
    "https://evil.example/home",
    "//evil.example/home",
    "/\\evil.example",
    "/home\\@evil.example",
    "/homepage",
    "/login",
    "/unlock?next=/home",
    "/invite/",
    "javascript:alert(1)",
    "home",
  ])("refuses anything else: %s", (path) => {
    expect(safePath(path)).toBeNull();
    expect(safeNext(path)).toBe("/home");
  });

  it("adds next to a link only when it's safe", () => {
    expect(withNext("/login", "/home?sheet=help-request&request=r1")).toBe("/login?next=%2Fhome%3Fsheet%3Dhelp-request%26request%3Dr1");
    expect(withNext("/verify?email=a%40b.co&from=login", "/home/settings")).toBe("/verify?email=a%40b.co&from=login&next=%2Fhome%2Fsettings");
    expect(withNext("/login", "//evil.example")).toBe("/login");
    expect(withNext("/login", null)).toBe("/login");
  });

  it("keeps it for this tab across Google sign-in, once", () => {
    rememberAfterSignIn("/home?sheet=help-request&request=r1");
    expect(takeAfterSignIn()).toBe("/home?sheet=help-request&request=r1");
    expect(takeAfterSignIn()).toBeNull();
  });

  it("doesn't keep an unsafe path, or one from a sign-in abandoned over 30 minutes ago", () => {
    rememberAfterSignIn("https://evil.example/home");
    expect(takeAfterSignIn()).toBeNull();

    vi.useFakeTimers();
    rememberAfterSignIn("/home");
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(takeAfterSignIn()).toBeNull();
  });

  it("still takes what an older build stored (a bare path), with the same check", () => {
    sessionStorage.setItem("afterbox.after-sign-in", "/invite/abc123");
    expect(takeAfterSignIn()).toBe("/invite/abc123");
    sessionStorage.setItem("afterbox.after-sign-in", "//evil.example");
    expect(takeAfterSignIn()).toBeNull();
  });
});
