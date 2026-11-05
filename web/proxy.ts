import { NextResponse, type NextRequest } from "next/server";

/** Maintenance switch: set MAINTENANCE_MODE=1 and restart. The admin stays open so the team can work. */
export function proxy(req: NextRequest) {
  if (process.env.MAINTENANCE_MODE !== "1") return NextResponse.next();
  return NextResponse.rewrite(new URL("/maintenance", req.url));
}

// API routes stay out: large uploads must not be buffered here, and those routes check the switch themselves.
export const config = { matcher: ["/((?!api|_next|assets|admin|maintenance|favicon).*)"] };
