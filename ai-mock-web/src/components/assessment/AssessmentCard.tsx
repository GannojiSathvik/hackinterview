"use client";

import Link from "next/link";
import { Clock, HelpCircle, BarChart3, BookOpen } from "lucide-react";
import {
  ASSESSMENT_DURATION_MINUTES,
  TOTAL_QUESTIONS,
  TOPICS_COVERED,
} from "@/constants/assessment";

export default function AssessmentCard() {
  return (
    <div className="bg-card border border-border rounded-[20px] p-8 shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
          <BookOpen className="w-7 h-7 text-primary" />
        </div>
        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 rounded-full px-3 py-1">
          Aptitude
        </span>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-foreground mb-2">
        Aptitude Assessment
      </h3>

      {/* Description */}
      <p className="text-muted-foreground text-sm leading-relaxed mb-6">
        Test your quantitative, logical, and data interpretation skills with a
        timed placement-style assessment.
      </p>

      {/* Topics */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Topics Covered
        </p>
        <div className="flex flex-wrap gap-2">
          {TOPICS_COVERED.map((topic) => (
            <span
              key={topic}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/5 text-foreground/80 border border-border"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {ASSESSMENT_DURATION_MINUTES} Min
        </span>
        <span className="flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4" />
          {TOTAL_QUESTIONS} Questions
        </span>
        <span className="flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4" />
          Mixed
        </span>
      </div>

      {/* CTA */}
      <div className="mt-auto">
        <Link
          href="/assessment/test"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold rounded-xl text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
        >
          Start Aptitude Test
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
