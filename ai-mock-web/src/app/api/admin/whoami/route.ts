import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/adminEmails";

/** Lets client components (e.g. the dashboard nav) know whether to show
 * admin links, without ever exposing the ADMIN_EMAILS allowlist itself. */
export async function GET() {
  const session = await auth();
  return NextResponse.json({ isAdmin: isAdminEmail(session?.user?.email) });
}
