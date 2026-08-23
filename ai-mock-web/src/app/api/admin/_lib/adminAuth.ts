/**
 * Server-side proxy helper for the admin API (V2.4). This is the ONLY
 * place that talks to FastAPI's /api/admin/assessment/** routes.
 *
 * Why a proxy at all: the backend has no way to verify a NextAuth session
 * on its own (no shared JWT secret, no cookie forwarding — see
 * interview-backend/routes/admin_assessment.py's docstring). So identity
 * is resolved here, server-side, from the real verified session via
 * auth() — something the browser cannot forge — and forwarded to FastAPI
 * with a shared secret the browser never sees. FastAPI re-checks both the
 * secret and the role; this proxy is a convenience layer, not the sole
 * enforcement point.
 */
import { auth } from "@/auth";
import { API_BASE } from "@/app/lib/api";
import { isAdminEmail } from "@/app/lib/adminEmails";

const ADMIN_PROXY_SECRET = process.env.ADMIN_PROXY_SECRET;

interface ForwardOptions {
  method: string;
  body?: unknown;
  searchParams?: URLSearchParams;
}

export async function forwardToAdminBackend(path: string, options: ForwardOptions): Promise<Response> {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return Response.json({ detail: "Not authenticated" }, { status: 401 });
  }
  if (!ADMIN_PROXY_SECRET) {
    return Response.json({ detail: "Admin API is not configured on the server" }, { status: 500 });
  }

  const role = isAdminEmail(email) ? "admin" : "user";
  const qs = options.searchParams?.toString();
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ""}`;

  return fetch(url, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Admin-Secret": ADMIN_PROXY_SECRET,
      "X-Admin-Role": role,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
}
