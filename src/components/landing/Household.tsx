import Button from "@/components/ui/Button";
import FloatingCard from "@/components/ui/FloatingCard";
import ResponsiveImage from "@/components/ui/ResponsiveImage";

// Below 768px the frame takes the photo's own ratio, so the whole photo shows. The
// photos are 2× (1414×1334), so they are scaled down into the frame rather than up.
const photo =
  "relative aspect-[1414/1334] rounded-card bg-line md:aspect-auto md:h-[560px] lg:h-[660px]";

// Below 768px each card sits under its photo, overlapping the bottom edge by 32px,
// so it never covers faces. From 768px it floats over the photo.
const card =
  "relative mx-4 -mt-8 px-[18px] py-4 md:absolute md:right-4 md:bottom-5 md:mx-0 md:mt-0 md:w-[340px] md:max-w-[calc(100%-2rem)] md:px-6 md:py-[22px] lg:right-10 lg:bottom-10";
const cardTitle = "text-[15px]/5 font-semibold md:text-[17px]/[22px]";
const row = "border-t border-line py-2 text-sm/[18px] last:pb-0 md:py-2.5 md:text-[15px]/5";

// Detail that only the desktop design carries.
const desktopOnly = "max-md:hidden";

const household = [
  { who: "You", things: "22 things" },
  { who: "Sam, partner", things: "17 things" },
  { who: "Mum", things: "9 things" },
];

export default function Household() {
  return (
    <section className="pt-[140px] pb-24 md:pt-[190px] md:pb-section">
      <div
        data-rise
        className="mx-auto max-w-[1440px] px-5 pb-8 md:px-page md:pb-14 lg:flex lg:items-end lg:justify-between lg:gap-16"
      >
        <h2 className="mb-4 text-[38px]/[40px] tracking-[-0.04em] md:mb-6 md:text-display-l lg:mb-0 lg:max-w-[760px]">
          One plan for the people you share a life with.
        </h2>
        <div className="md:max-w-[400px] lg:shrink-0">
          <p className="mb-6 text-base/[25px] text-ink-soft md:text-body-l">
            Add your partner, your parents or your grown-up kids. Everyone keeps their own record
            and chooses what to share.
          </p>
          <Button href="/start">Start your record</Button>
        </div>
      </div>

      <div
        data-rise
        className="mx-2 flex flex-col gap-2 md:mx-gutter md:grid md:grid-cols-2 md:gap-2.5"
      >
        <div className="relative">
          <div className={photo}>
            <ResponsiveImage
              src="/images/household-family.webp"
              width={1414}
              height={1334}
              alt="Three generations of a family around the table at home, clapping as a sparkler burns on a birthday cake."
              className="md:object-[50%_35%]"
            />
          </div>
          {/* Bottom right, because faces fill the top of this photo. */}
          <FloatingCard className={card}>
            <p className={`${cardTitle} mb-2.5 md:mb-4`}>Your household</p>
            {household.map((member, i) => (
              <div
                key={member.who}
                className={`flex justify-between ${row} ${i === household.length - 1 ? "max-md:pb-0" : ""}`}
              >
                <span>{member.who}</span>
                <span className="text-ink-soft">{member.things}</span>
              </div>
            ))}
            <div className={`flex justify-between ${row} ${desktopOnly}`}>
              <span>Tobi, 24</span>
              <span className="text-ink-soft">5 things</span>
            </div>
          </FloatingCard>
        </div>

        <div className="relative">
          <div className={photo}>
            <ResponsiveImage
              src="/images/household-shared.webp"
              width={1414}
              height={1334}
              alt="A smiling couple in their kitchen, arms around each other as they cook."
              className="md:object-[0%_20%]"
            />
          </div>
          {/* Top right from 1280px, as designed. Narrower than that it would cover his face, so it stays bottom right. */}
          <FloatingCard className={`${card} xl:top-10 xl:bottom-auto`}>
            <p className={`${cardTitle} mb-0.5 md:mb-1`}>Sam shared with you</p>
            <p className="mb-2.5 text-xs text-positive md:mb-3.5 md:text-[13px]">
              You can see these anytime
            </p>
            <div className={row}>Aviva pension</div>
            <div className={row}>
              Life cover<span className={desktopOnly}> with Legal &amp; General</span>
            </div>
            <div className={row}>Mortgage documents</div>
          </FloatingCard>
        </div>
      </div>
    </section>
  );
}
