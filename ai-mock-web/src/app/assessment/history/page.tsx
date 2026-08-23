"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Moon, RotateCcw, Sun, AlertTriangle, PieChart } from "lucide-react";
import { useTheme } from "next-themes";

import {
  getAttemptDetails,
  getCategoryPerformance,
  getHistory,
  getStatistics,
  getTrends,
  AssessmentHistoryApiError,
} from "@/app/lib/assessmentHistoryApi";
import type {
  AssessmentStatisticsSummary,
  AttemptDetails,
  AttemptHistoryItem,
  CategoryPerformance,
  ScoreTrendPoint,
} from "@/types/assessment";

import AssessmentStatisticsCards from "@/components/assessment/AssessmentStatisticsCards";
import AssessmentTrendChart from "@/components/assessment/AssessmentTrendChart";
import AssessmentHistoryTable from "@/components/assessment/AssessmentHistoryTable";
import AttemptDetailsModal from "@/components/assessment/AttemptDetailsModal";
import UserMenu from "@/components/UserMenu";

type PageStatus = "loading" | "ready" | "error";

export default function AssessmentHistoryPage() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const [status, setStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptHistoryItem[]>([]);
  const [statistics, setStatistics] = useState<AssessmentStatisticsSummary | null>(null);
  const [trend, setTrend] = useState<ScoreTrendPoint[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);

  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attemptDetails, setAttemptDetails] = useState<AttemptDetails | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);

    Promise.all([getHistory(), getStatistics(), getTrends(), getCategoryPerformance()])
      .then(([historyData, statisticsData, trendData, categoryData]) => {
        setAttempts(historyData);
        setStatistics(statisticsData);
        setTrend(trendData);
        setCategoryPerformance(categoryData);
        setStatus("ready");
      })
      .catch((err) => {
        setStatus("error");
        setError(
          err instanceof AssessmentHistoryApiError
            ? err.message
            : "Something went wrong while loading your assessment history."
        );
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleViewDetails = (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setAttemptDetails(null);
    setDetailsError(null);
    getAttemptDetails(attemptId)
      .then(setAttemptDetails)
      .catch((err) => {
        setDetailsError(
          err instanceof AssessmentHistoryApiError
            ? err.message
            : "Couldn't load this attempt's details."
        );
      });
  };

  const closeDetails = () => {
    setSelectedAttemptId(null);
    setAttemptDetails(null);
    setDetailsError(null);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
              <span className="text-primary-foreground font-bold text-xl">H</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              HackInterview
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <Link
              href="/assessment"
              className="flex items-center gap-2 text-foreground/80 hover:text-primary transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Assessment
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
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary mb-3">
            Assessment History
          </h1>
          <p className="text-muted-foreground">
            Track your performance across every completed assessment.
          </p>
        </div>

        {status === "loading" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-muted/40 border border-border animate-pulse"
                />
              ))}
            </div>
            <div className="h-72 rounded-2xl bg-muted/40 border border-border animate-pulse" />
            <div className="h-64 rounded-2xl bg-muted/40 border border-border animate-pulse" />
          </div>
        )}

        {status === "error" && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-md">
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-5 mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              Couldn&apos;t load your history
            </h2>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {status === "ready" && attempts.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-md">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-5 mx-auto">
              <ClipboardList className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              No assessment history yet
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Complete an assessment to start tracking your progress here.
            </p>
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
            >
              Take your first assessment
            </Link>
          </div>
        )}

        {status === "ready" && attempts.length > 0 && statistics && (
          <div className="space-y-6">
            <AssessmentStatisticsCards statistics={statistics} />
            {trend.length > 1 && <AssessmentTrendChart trend={trend} />}

            {categoryPerformance.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-md">
                <div className="flex items-center gap-2 mb-5">
                  <PieChart className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">
                    Category Performance
                  </h3>
                </div>
                <div className="space-y-4">
                  {categoryPerformance.map((cat) => (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-foreground">
                          {cat.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {cat.correctAnswers}/{cat.totalQuestions} correct ·{" "}
                          {cat.accuracyRate}% · {cat.attemptsSeen} attempt
                          {cat.attemptsSeen === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
                          style={{ width: `${Math.min(100, cat.accuracyRate)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <AssessmentHistoryTable attempts={attempts} onViewDetails={handleViewDetails} />
          </div>
        )}
      </div>

      {/* Attempt details modal */}
      {selectedAttemptId && (
        <>
          {attemptDetails ? (
            <AttemptDetailsModal details={attemptDetails} onClose={closeDetails} />
          ) : detailsError ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-background/70 backdrop-blur-sm"
                onClick={closeDetails}
              />
              <div className="relative bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center">
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">{detailsError}</p>
                <button
                  onClick={closeDetails}
                  className="px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-medium text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
              <div className="relative w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
