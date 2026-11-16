import Button from "@/components/ui/Button";
import FloatingCard from "@/components/ui/FloatingCard";
import ResponsiveImage from "@/components/ui/ResponsiveImage";

const cardPadding = "px-4 py-3.5 md:px-5 md:py-[18px]";
const cardLabel = "mb-0.5 text-xs font-semibold md:mb-1 md:text-[13px]";
const cardText = "text-[15px]/[21px] md:text-base/[23px]";

// Longer card copy that only the desktop design carries.
const desktopOnly = "max-md:hidden";

export default function UsefulToday() {
  return (
    <section id="useful" className="scroll-mt-6 pt-24 pb-[72px] md:pt-section md:pb-[120px]">
      <div
        data-rise
        className="mx-auto max-w-[1440px] px-5 pb-8 md:px-page md:pb-14 lg:flex lg:items-end lg:justify-between lg:gap-16"
      >
        <h2 className="mb-4 text-[38px]/[40px] tracking-[-0.04em] md:mb-6 md:text-display-l lg:mb-0 lg:max-w-[760px]">
          Useful today. Priceless when it matters.
        </h2>
        <div className="md:max-w-[400px] lg:shrink-0">
          <p className="mb-6 text-base/[25px] text-ink-soft md:text-body-l">
            Find your pensions, policies and accounts automatically, and keep them up to date
            without lifting a finger.
          </p>
          <Button href="/start">Start your record</Button>
        </div>
      </div>

      <div data-rise className="relative mx-2 md:mx-gutter">
        <div className="relative aspect-[3/2] rounded-card bg-line md:aspect-auto md:h-[780px]">
          {/* Mobile shows the whole photo. From 768px it is positioned so her face, the mug and the phone stay in frame at every width. */}
          <ResponsiveImage
            src="/images/useful-today.webp"
            width={1920}
            height={1280}
            alt="A woman relaxing at home with a mug of tea, looking at her phone."
            className="md:object-[center_65%]"
          />
        </div>

        {/*
          Below 768px the cards sit under the photo, overlapping its bottom edge by 32px,
          so they never cover her face, the mug or the phone. From 768px they float over
          the top right of the photo, as in the desktop design.
        */}
        <div className="relative -mt-8 flex flex-col gap-2 px-4 md:absolute md:top-24 md:right-8 md:mt-0 md:w-[400px] md:gap-3.5 md:px-0 lg:right-16">
          <FloatingCard className={cardPadding}>
            <p className={`${cardLabel} text-positive`}>Pension found</p>
            <p className={cardText}>
              Old workplace pension<span className={desktopOnly}>, Scottish Widows</span> · £18,400
            </p>
          </FloatingCard>
          <FloatingCard className={`md:ml-10 ${cardPadding}`}>
            <p className={`${cardLabel} text-warn`}>Renews in 14 days</p>
            <p className={cardText}>
              Home insurance went up £96.
              <span className={desktopOnly}> Compare before it renews.</span>
            </p>
          </FloatingCard>
          <FloatingCard className={cardPadding}>
            <p className={`${cardLabel} text-alert`}>Needs a look</p>
            <p className={cardText}>
              <span className="md:hidden">Life</span>
              <span className={desktopOnly}>Your life</span> cover still names a past partner.
            </p>
          </FloatingCard>
        </div>
      </div>
    </section>
  );
}
