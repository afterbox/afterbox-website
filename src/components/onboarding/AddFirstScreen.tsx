import { Link } from "@/components/ui/Links";
import { CameraIcon, CardIcon, DocumentIcon, HomeIcon, MoneyIcon, TrendIcon, UmbrellaIcon } from "@/components/ui/icons";
import IconSquare from "@/components/ui/onboarding/IconSquare";
import { Rise } from "@/components/ui/onboarding/Motion";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import ScreenTitle from "@/components/ui/onboarding/ScreenTitle";
import { liftable, pressable, stagger } from "@/lib/motion";

/**
 * Each tile starts a record by hand: the record is locked first (/secure: everything added is encrypted to it),
 * then the dashboard's add form opens for that kind.
 */
const lockThen = (next: string) => `/secure?next=${encodeURIComponent(next)}`;

const kinds: { label: string; Icon: typeof HomeIcon; href: string }[] = [
  { label: "Home", Icon: HomeIcon, href: lockThen("/home?sheet=type&category=property") },
  { label: "Investment", Icon: TrendIcon, href: lockThen("/home?sheet=type&category=investments") },
  { label: "Pension", Icon: MoneyIcon, href: lockThen("/home?sheet=type&category=pensions") },
  { label: "Insurance", Icon: UmbrellaIcon, href: lockThen("/home?sheet=type&category=insurance") },
  { label: "Bank account", Icon: CardIcon, href: lockThen("/home?sheet=type&category=bank-accounts") },
  { label: "Document", Icon: DocumentIcon, href: lockThen("/home?sheet=add") },
];

/** 13: pick what to add by hand. */
export default function AddFirstScreen() {
  return (
    <OnboardingCard>
      <ScreenTitle className="mb-[34px]">What do you want to add first?</ScreenTitle>
      <ul className="mb-8 grid grid-cols-2 gap-3">
        {kinds.map(({ label, Icon, href }, index) => (
          <Rise as="li" key={label} delay={(index + 1) * stagger.base}>
            <Link
              href={href}
              name={`add-first-${label.toLowerCase().replace(" ", "-")}`}
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
