"use client";

import Link from "next/link";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import AssessmentCard from "@/components/assessment/AssessmentCard";
import WhyAssessmentSection from "@/components/assessment/WhyAssessmentSection";

export default function AssessmentLandingPage() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

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

          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground/80 hover:text-primary transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
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
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
        {/* Page header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary mb-4">
            Online Assessment
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Prepare for placement aptitude tests with timed practice
            assessments. Track your performance and improve with every attempt.
          </p>
        </div>

        {/* Why take this assessment */}
        <WhyAssessmentSection />

        {/* Section title */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-1">
            Assessment Categories
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose an assessment to begin practicing.
          </p>
        </div>

        {/* Card grid — single card for V1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AssessmentCard />
        </div>
      </div>
    </div>
  );
}
