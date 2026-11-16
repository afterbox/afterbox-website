import HowItWorksPlayer from "./HowItWorksPlayer";

/*
  Three steps on an 18s loop (6s each), with a phone acting each one out. All motion
  is CSS (hw-* keyframes in globals.css); HowItWorksPlayer only jumps, pauses and swipes.
  Desktop: step list with progress lines beside the framed phone. Below 768px: three
  progress segments, a smaller phone, and only the active step's text.

  Without motion nothing advances: the phone shows the chosen step fully built (step 1
  to begin with), and clicking or tapping a step switches to it instantly.
*/

const steps = [
  {
    title: "We find your money.",
    body: "Connect your bank. We find forgotten accounts, old policies and subscriptions you don't need.",
  },
  {
    title: "We know what it's worth.",
    body: "Your home, investments and important documents. Send a photo, and we fill in the details and keep the value current.",
  },
  {
    title: "Share it with anyone you trust.",
    body: "They see it right away, with a step-by-step guide for each item, so they know exactly what to do when it matters.",
  },
];

// Literal class names so Tailwind can see them, one per step.
const stepAnimations = [
  "motion-safe:animate-hw-st0",
  "motion-safe:animate-hw-st1",
  "motion-safe:animate-hw-st2",
];
const progressAnimations = [
  "motion-safe:animate-hw-pr0",
  "motion-safe:animate-hw-pr1",
  "motion-safe:animate-hw-pr2",
];
const mobileTextAnimations = [
  "motion-safe:animate-hwm-st0",
  "motion-safe:animate-hwm-st1",
  "motion-safe:animate-hwm-st2",
];

// Reduced motion: what the chosen step (data-step on the player) shows.
const shownWhenChosen = [
  "motion-reduce:opacity-0 motion-reduce:group-data-[step=0]/hw:opacity-100",
  "motion-reduce:opacity-0 motion-reduce:group-data-[step=1]/hw:opacity-100",
  "motion-reduce:opacity-0 motion-reduce:group-data-[step=2]/hw:opacity-100",
];
const dimmedUnlessChosen = [
  "motion-reduce:opacity-38 motion-reduce:group-data-[step=0]/hw:opacity-100",
  "motion-reduce:opacity-38 motion-reduce:group-data-[step=1]/hw:opacity-100",
  "motion-reduce:opacity-38 motion-reduce:group-data-[step=2]/hw:opacity-100",
];
const filledWhenChosen = [
  "motion-reduce:scale-x-0 motion-reduce:group-data-[step=0]/hw:scale-x-100",
  "motion-reduce:scale-x-0 motion-reduce:group-data-[step=1]/hw:scale-x-100",
  "motion-reduce:scale-x-0 motion-reduce:group-data-[step=2]/hw:scale-x-100",
];

// Soft glow behind the phone, fading out to the page.
const glow =
  "bg-[radial-gradient(ellipse_58%_52%_at_50%_52%,color-mix(in_oklab,var(--color-haze)_85%,transparent)_0%,color-mix(in_oklab,var(--color-glass)_50%,transparent)_40%,color-mix(in_oklab,var(--color-mist)_18%,transparent)_68%,transparent_85%)]";

// The phone's own UI.
const scene = "absolute inset-x-4 top-[62px] flex flex-col gap-2.5";
const card = "rounded-[14px] bg-white px-3.5 py-3 shadow-[0_4px_14px_rgb(21_26_36/0.08)]";
const cardLabel = "mb-0.5 text-[11px] font-semibold";
const cardText = "text-[13px]/[18px]";
const note = "text-[12px] text-ink-soft";

const check = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0 stroke-positive"
  >
    <path d="M5 12l5 5 9-10" />
  </svg>
);

const guide = [
  "Call Aviva and quote policy AV-48211",
  "Send the documents. They're ready in afterbox.",
  "Track it here until it's paid.",
];

function Phone() {
  return (
    <div className="relative h-[610px] w-[300px] shrink-0 rounded-[46px] bg-ink p-2 shadow-[0_30px_60px_rgb(21_26_36/0.22)] max-md:scale-60">
      <div className="relative size-full overflow-hidden rounded-[38px] bg-ground leading-[normal] text-ink">
        <div className="flex items-center justify-between px-5 pt-[22px] pb-2.5 text-[14px] font-semibold tracking-[-0.02em]">
          <span>afterbox</span>
          <span className="flex size-[26px] items-center justify-center rounded-full bg-ink-deep text-[11px] text-on-night">
            J
          </span>
        </div>

        {/* 1. We find your money */}
        <div className={`${scene} ${shownWhenChosen[0]}`}>
          <div className={`${card} flex items-center gap-2.5 motion-safe:animate-hw-a1`}>
            <span className="flex size-[30px] items-center justify-center rounded-[9px] bg-mist text-[12px] font-semibold text-ink-deep">
              B
            </span>
            <span className="flex-1 text-[13px]">Your bank</span>
            <span className="flex items-center gap-1 text-[12px] text-positive">
              {check}
              Connected
            </span>
          </div>
          <p className={`mx-0.5 mt-2 ${note} motion-safe:animate-hw-a2`}>Found for you</p>
          <div className={`${card} motion-safe:animate-hw-a3`}>
            <p className={`${cardLabel} text-positive`}>Forgotten savings account</p>
            <p className={cardText}>Halifax · £2,340</p>
          </div>
          <div className={`${card} motion-safe:animate-hw-a4`}>
            <p className={`${cardLabel} text-positive`}>Old life policy</p>
            <p className={cardText}>Aviva · Still active</p>
          </div>
          <div className={`${card} motion-safe:animate-hw-a5`}>
            <p className={`${cardLabel} text-warn`}>3 similar subscriptions</p>
            <p className={cardText}>£31.97 a month · Need all three?</p>
          </div>
          <span className="mt-1.5 self-center rounded-full bg-ink-deep px-3 py-1.5 text-[12px] font-semibold text-on-night motion-safe:animate-hw-a6">
            3 things found
          </span>
        </div>

        {/* 2. We know what it's worth */}
        <div className={`${scene} ${shownWhenChosen[1]}`}>
          <div className="relative h-[170px] overflow-hidden rounded-[14px] border border-line bg-card p-4 motion-safe:animate-hw-doc motion-reduce:opacity-35">
            <p className="mb-2.5 text-[10px] font-semibold tracking-[0.06em] text-ink-soft">
              TITLE DEED
            </p>
            {["w-[80%]", "w-[92%]", "w-[70%]", "w-[86%]", "w-[60%]"].map((width, i, lines) => (
              <div
                key={width}
                className={`h-1.5 rounded-[3px] bg-line ${i < lines.length - 1 ? "mb-2" : ""} ${width}`}
              />
            ))}
            <div className="absolute inset-x-0 h-0.5 bg-dusk opacity-0 shadow-[0_0_14px_4px_rgb(74_95_143/0.45)] motion-safe:animate-hw-scan" />
          </div>
          <p className={`mx-0.5 mt-0.5 ${note} motion-safe:animate-hw-b4`}>
            Read and filled in for you
          </p>
          <div className={`${card} motion-safe:animate-hw-b2`}>
            <p className={`${cardLabel} text-ink-deep`}>Your home</p>
            <p className={cardText}>14 Elm Road, Croydon</p>
            <p className="mt-1.5 text-[20px] font-medium tracking-[-0.02em]">£412,000</p>
            <p className="text-[11px] text-ink-soft">Estimated value</p>
          </div>
          <div className={`${card} flex items-center justify-between motion-safe:animate-hw-b3`}>
            <div>
              <p className={`${cardLabel} text-ink-deep`}>Vanguard ISA</p>
              <p className={cardText}>£23,900</p>
            </div>
            <span className="text-[11px] text-positive">Updated today</span>
          </div>
        </div>

        {/* 3. Share it with anyone you trust */}
        <div className={`${scene} ${shownWhenChosen[2]}`}>
          <div className="flex items-center gap-2.5 px-0.5 pt-1 pb-1.5 motion-safe:animate-hw-c1">
            <span className="flex size-[38px] items-center justify-center rounded-full bg-haze font-semibold text-ink-deep">
              S
            </span>
            <div>
              <p className="text-[15px] font-semibold">Share with Sam</p>
              <p className={note}>Partner</p>
            </div>
          </div>
          <div className={`${card} flex items-center justify-between motion-safe:animate-hw-c2`}>
            <div>
              <p className={cardText}>Aviva life cover</p>
              <p className="text-[11px] text-positive">Sam can see this</p>
            </div>
            {check}
          </div>
          <p className={`mx-0.5 mt-2 ${note} motion-safe:animate-hw-c3`}>What Sam sees</p>
          <div className="rounded-[14px] bg-white px-3.5 pt-3.5 pb-1.5 shadow-[0_4px_14px_rgb(21_26_36/0.08)] motion-safe:animate-hw-c4">
            <p className={`${cardLabel} text-ink-deep`}>Aviva life cover</p>
            <p className="mb-1.5 text-[14px]/[19px] font-semibold">Your guide, step by step</p>
            {guide.map((step, i) => (
              <div key={step} className="flex gap-2.5 border-b border-line py-[9px] last:border-b-0">
                <span className="flex size-5 flex-none items-center justify-center rounded-full bg-mist text-[11px] font-semibold text-ink-deep">
                  {i + 1}
                </span>
                <p className="text-[12px]/[17px]">{step}</p>
              </div>
            ))}
          </div>
          <p className={`mx-0.5 mt-2.5 text-center ${note} motion-safe:animate-hw-c5`}>
            A clear next step for everything shared.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    // No background of its own: the FlowBackground blend shows through.
    <section id="how" className="scroll-mt-6 pt-10 pb-[143px] md:pt-12 md:pb-[152px]">
      {/* 1100px = the design's 1040px content column plus the side padding. */}
      <div className="mx-auto max-w-[1100px] px-5 md:pr-gutter md:pl-page">
        <h2
          data-rise
          className="mb-4 text-[40px]/[44px] tracking-[-0.04em] md:mb-14 md:text-display-m"
        >
          How it works
        </h2>

        {/* Columns are 460px and 520px at full width; below 1100px they shrink evenly. */}
        <HowItWorksPlayer className="md:grid md:grid-cols-[minmax(0,460px)_minmax(0,520px)] md:items-center md:gap-[60px]">
          {/* Mobile: one progress segment per step */}
          <div className="mb-3.5 flex gap-1.5 md:hidden">
            {steps.map((step, i) => (
              <button
                key={step.title}
                type="button"
                data-hw-step={i}
                aria-label={`Step ${i + 1}: ${step.title}`}
                className="-my-2.5 flex-1 cursor-pointer py-2.5"
              >
                <span className="block h-[3px] overflow-hidden rounded-[2px] bg-[#d9dde6]">
                  <span
                    className={`block h-full origin-left bg-ink-deep ${progressAnimations[i]} ${filledWhenChosen[i]}`}
                  />
                </span>
              </button>
            ))}
          </div>

          {/* Desktop: the step list */}
          <ol className="max-md:hidden">
            {steps.map((step, i) => (
              <li key={step.title}>
                <button
                  type="button"
                  data-hw-step={i}
                  className={`block w-full cursor-pointer py-[22px] text-left ${stepAnimations[i]} ${dimmedUnlessChosen[i]}`}
                >
                  <span className="mb-5 block h-0.5 overflow-hidden rounded-[2px] bg-line">
                    <span
                      className={`block h-full origin-left bg-ink-deep ${progressAnimations[i]} ${filledWhenChosen[i]}`}
                    />
                  </span>
                  <span className="mb-1.5 block text-[13px] leading-[normal] font-semibold text-dusk">
                    {`0${i + 1}`}
                  </span>
                  <span className="mb-2 block text-[30px]/[1.2] tracking-[-0.025em]">
                    {step.title}
                  </span>
                  <span className="block text-[17px]/[1.5] text-ink-soft">{step.body}</span>
                </button>
              </li>
            ))}
          </ol>

          <div
            aria-hidden="true"
            className={`-mx-3 flex h-[400px] items-center justify-center max-md:overflow-hidden md:-my-[35px] md:mx-0 md:h-[680px] ${glow}`}
          >
            <Phone />
          </div>

          {/* Mobile: only the active step's text, crossfading */}
          <div className="relative mt-5 h-[150px] md:hidden">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className={`absolute inset-0 ${mobileTextAnimations[i]} ${shownWhenChosen[i]}`}
              >
                <p className="mb-1.5 text-[13px] leading-[normal] font-semibold text-dusk">
                  {`0${i + 1} / 03`}
                </p>
                <p className="mb-2 text-[22px]/[1.2] tracking-[-0.025em]">{step.title}</p>
                <p className="text-[15px]/[1.5] text-ink-soft">{step.body}</p>
              </div>
            ))}
          </div>
        </HowItWorksPlayer>
      </div>
    </section>
  );
}
