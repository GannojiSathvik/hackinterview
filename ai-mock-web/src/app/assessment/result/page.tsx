"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RotateCcw, Home, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { AssessmentResult } from "@/types/assessment";
import { SESSION_STORAGE_KEY } from "@/constants/assessment";
import { useAssessmentSession } from "@/contexts/AssessmentSessionContext";
import ResultSummary from "@/components/assessment/ResultSummary";
import PerformanceSummary from "@/components/assessment/PerformanceSummary";
import RecommendationList from "@/components/assessment/RecommendationList";
import AssessmentStatistics from "@/components/assessment/AssessmentStatistics";

export default function AssessmentResultPage() {
  const router = useRouter();
  const { startAttempt } = useAssessmentSession();
  const [mounted, setMounted] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    setMounted(true);

    // Route guard: redirect if no valid result in sessionStorage
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) {
        router.replace("/assessment");
        return;
      }
      const parsed: AssessmentResult = JSON.parse(stored);
      // Basic validation
      if (
        typeof parsed.totalQuestions !== "number" ||
        typeof parsed.scorePercentage !== "number"
      ) {
        router.replace("/assessment");
        return;
      }
      setResult(parsed);
    } catch {
      router.replace("/assessment");
    }
  }, [router]);

  if (!mounted || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleRetake = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    startAttempt();
    router.push("/assessment/test");
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
              <span className="text-primary-foreground font-bold text-xl">
                H
              </span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              HackInterview
            </span>
          </Link>

          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-accent/20 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-foreground/80" />
            ) : (
              <Moon className="w-5 h-5 text-foreground/80" />
            )}
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 px-6 max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary mb-3">
            Assessment Completed
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s how you performed on the Aptitude Assessment.
          </p>
        </div>

        {/* Result Summary */}
        <ResultSummary result={result} />

        {/* V1.1 additions */}
        <PerformanceSummary scorePercentage={result.scorePercentage} />
        <RecommendationList scorePercentage={result.scorePercentage} />
        <AssessmentStatistics result={result} />

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
          <button
            onClick={handleRetake}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-medium text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retake Assessment
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
