"use client";

import { Clock, Zap, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    icon: Clock,
    title: "Timed Practice",
    description: "Simulate real placement test conditions.",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get immediate feedback after completion.",
  },
  {
    icon: TrendingUp,
    title: "Performance Tracking",
    description: "Track your aptitude improvement over time.",
  },
];

export default function WhyAssessmentSection() {
  return (
    <div className="mb-16">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-foreground mb-1">
          Why Take This Assessment?
        </h2>
        <p className="text-sm text-muted-foreground">
          Built to feel like the real thing, so you walk in prepared.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="bg-card p-6 rounded-xl border border-border hover:border-primary/30 transition-colors"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
