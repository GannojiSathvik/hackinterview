import { AssessmentSessionProvider } from "@/contexts/AssessmentSessionContext";

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AssessmentSessionProvider>{children}</AssessmentSessionProvider>;
}
