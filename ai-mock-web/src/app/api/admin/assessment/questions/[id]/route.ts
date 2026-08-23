import { NextRequest, NextResponse } from "next/server";
import { forwardToAdminBackend } from "../../../_lib/adminAuth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const backendResponse = await forwardToAdminBackend(`/api/admin/assessment/questions/${id}`, {
    method: "GET",
  });
  const data = await backendResponse.json().catch(() => null);
  return NextResponse.json(data, { status: backendResponse.status });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const backendResponse = await forwardToAdminBackend(`/api/admin/assessment/questions/${id}`, {
    method: "PUT",
    body,
  });
  const data = await backendResponse.json().catch(() => null);
  return NextResponse.json(data, { status: backendResponse.status });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const backendResponse = await forwardToAdminBackend(`/api/admin/assessment/questions/${id}`, {
    method: "DELETE",
  });
  if (backendResponse.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const data = await backendResponse.json().catch(() => null);
  return NextResponse.json(data, { status: backendResponse.status });
}
