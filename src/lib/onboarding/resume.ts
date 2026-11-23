/** Where onboarding carries on from `GET /v1/me`'s `onboardingStep` (the furthest step reached). Null: here. */
export function resumeFrom(step: string | null, keysReady: boolean): string | null {
  if (keysReady) return "/home";
  switch (step) {
    case "country":
      return "/connect";
    case "connect":
    case "found":
      return "/found";
    case "added":
    case "keys":
    case "backup":
      return "/secure";
    default:
      return null;
  }
}
