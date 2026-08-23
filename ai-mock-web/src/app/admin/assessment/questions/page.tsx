import { auth } from "@/auth";
import { isAdminEmail } from "@/app/lib/adminEmails";
import QuestionsAdminClient from "./QuestionsAdminClient";

/**
 * Server component gate: resolves the real, verified session server-side
 * and checks it against ADMIN_EMAILS before rendering anything interactive.
 * A non-admin never receives the admin client bundle's data-fetching logic
 * — just this access-denied message.
 */
export default async function AdminAssessmentQuestionsPage() {
  const session = await auth();
  const email = session?.user?.email;

  if (!isAdminEmail(email)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-md max-w-sm">
          <h1 className="text-lg font-bold text-foreground mb-2">Access denied</h1>
          <p className="text-sm text-muted-foreground">
            {email
              ? "Your account doesn't have admin access to the question bank."
              : "Sign in with an admin account to manage the question bank."}
          </p>
        </div>
      </div>
    );
  }

  return <QuestionsAdminClient />;
}
