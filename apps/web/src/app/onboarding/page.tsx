import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { isAuthDisabled } from "@/shared/config";

export const metadata = { title: "شروع · Nutivo" };

/** First run. Editing later uses /me/profile (the plain form, filled with the saved numbers). */
export default function OnboardingPage() {
  return (
    <main className="mx-auto grid max-w-md gap-6 px-4 py-8">
      <OnboardingWizard local={isAuthDisabled()} />
    </main>
  );
}
