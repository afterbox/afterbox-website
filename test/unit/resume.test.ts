import { describe, expect, it } from "vitest";
import { resumeFrom } from "@/lib/onboarding/resume";

describe("resuming onboarding from GET /v1/me's onboardingStep", () => {
  it.each([
    [null, null],
    ["country", "/connect"],
    ["connect", "/found"],
    ["found", "/found"],
    ["added", "/secure"],
    ["keys", "/secure"],
    ["backup", "/secure"],
    ["something-new", null],
  ])("%s → %s", (step, where) => {
    expect(resumeFrom(step, false)).toBe(where);
  });

  it("goes to the record once the keys are set up", () => {
    expect(resumeFrom("added", true)).toBe("/home");
    expect(resumeFrom(null, true)).toBe("/home");
  });
});
