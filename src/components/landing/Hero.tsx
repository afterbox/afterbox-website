import Button from "@/components/ui/Button";
import HeroVideo from "./HeroVideo";

/** Exactly one screen tall (100svh, falling back to 100vh), with the video inset by the media gutter. */
export default function Hero() {
  return (
    <section className="h-[100vh] min-h-[420px] p-2 supports-[height:100svh]:h-svh md:p-gutter">
      <div className="relative flex h-full flex-col overflow-hidden rounded-card bg-ink text-on-night">
        <HeroVideo />
        {/*
          Scrim, so the nav and headline stay readable over the video. Mobile: one
          bottom-up gradient. From 768px: a lighter bottom-up gradient plus one from the
          left, behind the headline.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(0deg,rgb(10_16_32/0.8)_0%,rgb(10_16_32/0.38)_38%,rgb(10_16_32/0.06)_65%,rgb(10_16_32/0.3)_100%)] md:bg-[linear-gradient(0deg,rgb(10_16_32/0.72)_0%,rgb(10_16_32/0.38)_38%,rgb(10_16_32/0.06)_65%,rgb(10_16_32/0.3)_100%),linear-gradient(90deg,rgb(10_16_32/0.45)_0%,rgb(10_16_32/0)_60%)]"
        />

        <div className="relative mx-auto mt-auto w-full max-w-[1416px] px-5 pb-8 md:px-9 md:pb-16">
          <h1 className="mb-4 text-[48px]/[48px] tracking-[-0.04em] text-shadow-[0_2px_24px_rgb(10_16_32/0.35)] md:mb-5 md:max-w-[900px] md:text-display-l lg:text-display-xl">
            Everything you own, in one place.
          </h1>
          <p className="mb-7 text-[17px]/[26px] text-shadow-[0_2px_24px_rgb(10_16_32/0.35)] md:mb-9 md:text-lead">
            So the people you trust can find it when it matters.
          </p>
          <Button href="/start" variant="light" size="lg" className="w-full md:w-auto">
            Start your record
          </Button>
        </div>
      </div>
    </section>
  );
}
