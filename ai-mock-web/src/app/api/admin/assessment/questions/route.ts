import { NextRequest, NextResponse } from "next/server";
import { forwardToAdminBackend } from "../../_lib/adminAuth";

export async function GET(request: NextRequest) {
  const backendResponse = await forwardToAdminBackend("/api/admin/assessment/questions", {
    method: "GET",
    searchParams: request.nextUrl.searchParams,
  });
  const data = await backendResponse.json().catch(() => null);
  return NextResponse.json(data, { status: backendResponse.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const backendResponse = await forwardToAdminBackend("/api/admin/assessment/questions", {
    method: "POST",
    body,
  });
  const data = await backendResponse.json().catch(() => null);
  return NextResponse.json(data, { status: backendResponse.status });
}
