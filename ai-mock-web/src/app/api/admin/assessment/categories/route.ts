import { NextResponse } from "next/server";
import { forwardToAdminBackend } from "../../_lib/adminAuth";

export async function GET() {
  const backendResponse = await forwardToAdminBackend("/api/admin/assessment/categories", {
    method: "GET",
  });
  const data = await backendResponse.json().catch(() => null);
  return NextResponse.json(data, { status: backendResponse.status });
}
