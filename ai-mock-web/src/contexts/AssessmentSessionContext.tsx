"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { mockAptitudeQuestions } from "@/data/mockAptitudeQuestions";
import type { AnswerMap, ShuffledAttemptQuestion } from "@/types/assessment";
import {
  ASSESSMENT_DURATION_SECONDS,
  SESSION_STORAGE_KEY,
} from "@/constants/assessment";
import { calculateScore } from "@/utils/calculateScore";

/** Fisher–Yates shuffle. Never mutates the input — always returns a new array. */
function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildAttemptOrder(): ShuffledAttemptQuestion[] {
  return shuffle(mockAptitudeQuestions).map((question) => ({
    question,
    optionOrder: shuffle([0, 1, 2, 3]),
  }));
}

interface Attempt {
  order: ShuffledAttemptQuestion[];
  currentIndex: number;
  answers: AnswerMap;
  visited: Set<number>;
  endAt: number;
  isFinalized: boolean;
}

interface AssessmentSessionApi {
  attempt: Attempt | null;
  timeRemaining: number;
  startAttempt: () => void;
  selectAnswer: (originalOptionIndex: number) => void;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  finalizeAndSubmit: () => void;
}

const AssessmentSessionContext = createContext<AssessmentSessionApi | null>(
  null
);

export function AssessmentSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [, setTick] = useState(0);
  const finalizingRef = useRef(false);

  // Mirrors `attempt` synchronously. Needed because finalizeAndSubmit can run
  // from a setInterval callback (outside React's event system), where a
  // setState functional-updater is NOT guaranteed to run synchronously —
  // reading state back out of it right after calling setState is unsafe.
  const attemptRef = useRef<Attempt | null>(null);
  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  const startAttempt = useCallback(() => {
    finalizingRef.current = false;
    setAttempt({
      order: buildAttemptOrder(),
      currentIndex: 0,
      answers: {},
      visited: new Set([0]),
      endAt: Date.now() + ASSESSMENT_DURATION_SECONDS * 1000,
      isFinalized: false,
    });
  }, []);

  const finalizeAndSubmit = useCallback(() => {
    if (finalizingRef.current) return;

    const prev = attemptRef.current;
    if (!prev || prev.isFinalized) return;
    finalizingRef.current = true;

    const timeTakenSeconds = Math.max(
      0,
      ASSESSMENT_DURATION_SECONDS -
        Math.max(0, Math.ceil((prev.endAt - Date.now()) / 1000))
    );
    const questions = prev.order.map((o) => o.question);
    const result = calculateScore(prev.answers, questions, timeTakenSeconds);

    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(result));
    } catch {
      // sessionStorage unavailable — nothing else we can do client-side.
    }

    setAttempt((p) => (p ? { ...p, isFinalized: true } : p));
    router.push("/assessment/result");
  }, [router]);

  const selectAnswer = useCallback((originalOptionIndex: number) => {
    setAttempt((prev) => {
      if (!prev || prev.isFinalized) return prev;
      return {
        ...prev,
        answers: { ...prev.answers, [prev.currentIndex]: originalOptionIndex },
      };
    });
  }, []);

  const goTo = useCallback((index: number) => {
    setAttempt((prev) => {
      if (!prev || prev.isFinalized) return prev;
      const clamped = Math.max(0, Math.min(prev.order.length - 1, index));
      const visited = new Set(prev.visited);
      visited.add(clamped);
      return { ...prev, currentIndex: clamped, visited };
    });
  }, []);

  const next = useCallback(() => {
    setAttempt((prev) => {
      if (!prev || prev.isFinalized) return prev;
      const clamped = Math.min(prev.order.length - 1, prev.currentIndex + 1);
      const visited = new Set(prev.visited);
      visited.add(clamped);
      return { ...prev, currentIndex: clamped, visited };
    });
  }, []);

  const prev = useCallback(() => {
    setAttempt((p) => {
      if (!p || p.isFinalized) return p;
      const clamped = Math.max(0, p.currentIndex - 1);
      const visited = new Set(p.visited);
      visited.add(clamped);
      return { ...p, currentIndex: clamped, visited };
    });
  }, []);

  // Single ticking interval, shared across /assessment/test and /assessment/review
  // since this provider lives at the /assessment layout level.
  useEffect(() => {
    if (!attempt || attempt.isFinalized) return;

    const interval = setInterval(() => {
      const remaining = Math.ceil((attempt.endAt - Date.now()) / 1000);
      if (remaining <= 0) {
        finalizeAndSubmit();
      } else {
        setTick((t) => t + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt, finalizeAndSubmit]);

  const timeRemaining = attempt
    ? Math.max(
        0,
        Math.min(
          ASSESSMENT_DURATION_SECONDS,
          Math.ceil((attempt.endAt - Date.now()) / 1000)
        )
      )
    : ASSESSMENT_DURATION_SECONDS;

  const api = useMemo<AssessmentSessionApi>(
    () => ({
      attempt,
      timeRemaining,
      startAttempt,
      selectAnswer,
      goTo,
      next,
      prev,
      finalizeAndSubmit,
    }),
    [
      attempt,
      timeRemaining,
      startAttempt,
      selectAnswer,
      goTo,
      next,
      prev,
      finalizeAndSubmit,
    ]
  );

  return (
    <AssessmentSessionContext.Provider value={api}>
      {children}
    </AssessmentSessionContext.Provider>
  );
}

export function useAssessmentSession() {
  const ctx = useContext(AssessmentSessionContext);
  if (!ctx) {
    throw new Error(
      "useAssessmentSession must be used within an AssessmentSessionProvider"
    );
  }
  return ctx;
}
