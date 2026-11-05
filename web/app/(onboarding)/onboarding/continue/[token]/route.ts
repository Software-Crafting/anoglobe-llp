import { seeOther } from "@/lib/http";
import { registrationFromToken, setSignupCookie } from "@/lib/onboarding";

/** The emailed resume link: puts the visitor back in their signup. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reg = await registrationFromToken(token);
  if (!reg) return seeOther("/onboarding/resume?expired=1");
  await setSignupCookie(token);
  return seeOther("/onboarding");
}
