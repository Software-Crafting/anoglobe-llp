import { redirect } from "next/navigation";
import { currentRegistration, isOpen } from "@/lib/onboarding";

export default async function OnboardingStart() {
  const reg = await currentRegistration();
  if (!reg) redirect("/onboarding/account");
  redirect(isOpen(reg) ? `/onboarding/${reg.step}` : "/onboarding/success");
}
