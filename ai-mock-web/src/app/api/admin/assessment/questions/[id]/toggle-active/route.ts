import { NextRequest, NextResponse } from "next/server";
import { forwardToAdminBackend } from "../../../../_lib/adminAuth";

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const backendResponse = await forwardToAdminBackend(
    `/api/admin/assessment/questions/${id}/toggle-active`,
    { method: "PATCH" }
  );
  const data = await backendResponse.json().catch(() => null);
  return NextResponse.json(data, { status: backendResponse.status });
}
