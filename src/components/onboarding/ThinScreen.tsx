import Button from "@/components/ui/Button";
import { DocumentIcon } from "@/components/ui/icons";
import IconBadge, { BADGE_ICON } from "@/components/ui/onboarding/IconBadge";
import OnboardingCard from "@/components/ui/onboarding/OnboardingCard";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import ScreenTitle, { ScreenLead } from "@/components/ui/onboarding/ScreenTitle";

/** 11: the read ended with fewer than 20 transactions (`reason: "few_transactions"`). */
export default function ThinScreen() {
  return (
    <OnboardingCard>
      <IconBadge>
        <DocumentIcon size={BADGE_ICON} />
      </IconBadge>
      <ScreenTitle className="mb-2">Not much to read here</ScreenTitle>
      <ScreenLead className="mb-[34px]">This account has very few transactions. Try the one you use every day.</ScreenLead>
      <Button href="/connect/bank?another=1" name="thin-another-bank" variant="inkDeep" size="block">
        Connect another bank
      </Button>
      <QuietLink href="/found" name="thin-found" className="mt-4">
        See what we found
      </QuietLink>
    </OnboardingCard>
  );
}
