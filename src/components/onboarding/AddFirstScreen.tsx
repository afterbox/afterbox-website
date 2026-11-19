import Link from "next/link";
import { CameraIcon, CardIcon, DocumentIcon, HomeIcon, MoneyIcon, TrendIcon, UmbrellaIcon } from "@/components/ui/icons";
import IconSquare from "@/components/ui/onboarding/IconSquare";
import { Rise } from "@/components/ui/onboarding/Motion";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import ScreenTitle from "@/components/ui/onboarding/ScreenTitle";
import { liftable, pressable, stagger } from "@/lib/motion";

const kinds: { label: string; Icon: typeof HomeIcon }[] = [
  { label: "Home", Icon: HomeIcon },
  { label: "Investment", Icon: TrendIcon },
  { label: "Pension", Icon: MoneyIcon },
  { label: "Insurance", Icon: UmbrellaIcon },
  { label: "Bank account", Icon: CardIcon },
  { label: "Document", Icon: DocumentIcon },
];

/** 13: pick what to add by hand. Every tile goes home until the add forms exist. */
export default function AddFirstScreen() {
  return (
    <OnboardingCard>
      <ScreenTitle className="mb-[34px]">What do you want to add first?</ScreenTitle>
      <ul className="mb-8 grid grid-cols-2 gap-3">
        {kinds.map(({ label, Icon }, index) => (
          <Rise as="li" key={label} delay={(index + 1) * stagger.base}>
            <Link
              href="/"
              className={`flex flex-col gap-3.5 rounded-panel border border-line bg-ground p-[18px] text-sm/[normal] text-ink hover:bg-card sm:text-[15px] ${pressable} ${liftable}`}
            >
              <IconSquare size="md">
                <Icon size={18} />
              </IconSquare>
              {label}
            </Link>
          </Rise>
        ))}
      </ul>
      <p className="flex items-center justify-center gap-[7px] text-[13px] text-ink-soft">
        <CameraIcon size={15} />
        Send a photo, we’ll fill in the details
      </p>
    </OnboardingCard>
  );
}
