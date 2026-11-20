import Button from "@/components/ui/Button";
import ResponsiveImage from "@/components/ui/ResponsiveImage";

/*
  Closing photo card, then the footer proper.

  The colour rises behind the lower part of the card: ground → dusk → ink-deep →
  night. The card starts at the top of the footer and has a fixed height at each
  breakpoint, so the design's stops stay locked to it at every width.
*/
const rise =
  "bg-[linear-gradient(in_oklab_180deg,var(--color-ground)_260px,var(--color-dusk)_480px,var(--color-ink-deep)_600px,var(--color-night)_900px)] md:bg-[linear-gradient(in_oklab_180deg,var(--color-ground)_340px,var(--color-dusk)_640px,var(--color-ink-deep)_820px,var(--color-night)_1260px)]";

export default function Footer() {
  return (
    <footer className={`pb-8 text-on-night md:pb-10 [&_:focus-visible]:outline-on-night ${rise}`}>
      <div className="relative mx-2 flex h-[520px] items-end rounded-card bg-ink md:mx-gutter md:h-[700px]">
        <ResponsiveImage
          src="/images/closing.webp"
          width={1920}
          height={950}
          mobileSrc="/images/closing-mobile.webp"
          mobileWidth={640}
          mobileHeight={888}
          alt="A smiling man in warm evening light."
          className="object-[50%_25%] md:object-[42%_20%]"
        />
        {/*
          Scrim behind the heading: a bottom-up gradient, plus the hero's left-to-right
          gradient from 768px (on mobile, as in the hero, only the bottom one).
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-card bg-[linear-gradient(0deg,rgb(10_16_32/0.55)_0%,rgb(10_16_32/0)_50%)] md:bg-[linear-gradient(90deg,rgb(10_16_32/0.45)_0%,rgb(10_16_32/0)_60%),linear-gradient(0deg,rgb(10_16_32/0.55)_0%,rgb(10_16_32/0)_50%)]"
        />
        <div className="relative mx-auto w-full max-w-[1416px] px-5 pb-7 md:flex md:items-end md:justify-between md:gap-8 md:px-9 md:pb-11">
          <h2 className="mb-5 text-[36px]/[40px] tracking-[-0.04em] text-shadow-[0_2px_24px_rgb(10_16_32/0.35)] md:mb-0 md:max-w-[620px] md:text-[56px]/[60px]">
            Start your record today.
          </h2>
          <Button href="/signup" name="footer-signup" variant="light" size="lg" className="w-full md:w-auto">
            Start your record
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-5 pt-60 md:px-page md:pt-[360px]">
        <div className="md:flex md:items-end md:justify-between md:gap-12">
          <div>
            <p className="mb-3 text-[48px]/none tracking-[-0.05em] md:mb-4 md:text-[64px]/none">
              afterbox
            </p>
            <p className="mb-8 text-[15px]/[22px] text-on-night-soft md:mb-0 md:text-base/6">
              Everything you own, in one place.
            </p>
          </div>

          <form
            // TODO: connect. Until then, method="dialog" outside a <dialog> makes
            // submitting do nothing, without any client JavaScript.
            method="dialog"
            className="flex flex-col gap-2.5 md:w-[400px]"
          >
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
                className="min-w-0 flex-1 bg-transparent text-base text-on-night outline-none placeholder:text-on-night-soft"
              />
              <Button type="submit" variant="light" size="sm">
                Join
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-10 flex justify-between gap-6 border-t border-on-night/15 pt-5 text-xs/[18px] text-on-night-soft md:mt-16 md:pt-6 md:text-[13px]/5">
          <span>© 2026 afterbox Ltd</span>
          <span>hello@afterbox.co.uk</span>
        </div>
      </div>
    </footer>
  );
}
