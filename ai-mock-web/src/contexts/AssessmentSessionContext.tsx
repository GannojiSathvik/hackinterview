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
import {
  startAssessmentAttempt,
  submitAssessmentAttempt,
  AssessmentApiError,
} from "@/app/lib/assessmentApi";
import type {
  AnswerMap,
  AssessmentResult,
  AttemptQuestion,
  Question,
  ScorableQuestion,
  ShuffledAttemptQuestion,
} from "@/types/assessment";
import {
  ASSESSMENT_DURATION_SECONDS,
  ASSESSMENT_SOURCE,
  SESSION_STORAGE_KEY,
  TOTAL_QUESTIONS,
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

/** Normalizes a mock Question into the same shape API-sourced questions use,
 * so the rest of the context/components never need to know which source a
 * question came from. */
function mockQuestionToAttemptQuestion(q: Question): AttemptQuestion {
  return {
    id: String(q.id),
    question: q.question,
    category: q.category,
    difficulty: q.difficulty,
    options: q.options.map((text, idx) => ({ id: String(idx), text })),
    correctAnswer: q.correctAnswer,
  };
}

interface LoadedAttempt {
  /** Non-null only in API mode — the server-side attempt id needed to
   * submit answers later. Mock mode never persists anything server-side. */
  attemptId: string | null;
  questions: AttemptQuestion[];
}

async function loadAttemptQuestions(): Promise<LoadedAttempt> {
  if (ASSESSMENT_SOURCE === "api") {
    const started = await startAssessmentAttempt({ questionCount: TOTAL_QUESTIONS });
    return { attemptId: started.attemptId, questions: started.questions };
  }
  return {
    attemptId: null,
    questions: mockAptitudeQuestions.map(mockQuestionToAttemptQuestion),
  };
}

function buildAttemptOrder(questions: AttemptQuestion[]): ShuffledAttemptQuestion[] {
  return shuffle(questions).map((question) => ({
    question,
    optionOrder: shuffle(question.options.map((_, i) => i)),
  }));
}

interface Attempt {
  attemptId: string | null;
  order: ShuffledAttemptQuestion[];
  currentIndex: number;
  answers: AnswerMap;
  visited: Set<number>;
  endAt: number;
  isFinalized: boolean;
}

type AttemptStatus = "idle" | "loading" | "ready" | "submitting" | "error";

interface AssessmentSessionApi {
  attempt: Attempt | null;
  attemptStatus: AttemptStatus;
  attemptError: string | null;
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
  const [attemptStatus, setAttemptStatus] = useState<AttemptStatus>("idle");
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const finalizingRef = useRef(false);
  // Caps the timer-driven auto-submit-on-expiry to exactly one attempt, so a
  // failed automatic submission doesn't retry every second forever — further
  // attempts require the user to press the manual Retry banner.
  const timeoutAutoSubmitAttemptedRef = useRef(false);

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
    timeoutAutoSubmitAttemptedRef.current = false;
    setAttempt(null);
    setAttemptError(null);
    setAttemptStatus("loading");

    loadAttemptQuestions()
      .then(({ attemptId, questions }) => {
        setAttempt({
          attemptId,
          order: buildAttemptOrder(questions),
          currentIndex: 0,
          answers: {},
          visited: new Set([0]),
          endAt: Date.now() + ASSESSMENT_DURATION_SECONDS * 1000,
          isFinalized: false,
        });
        setAttemptStatus("ready");
      })
      .catch((err) => {
        setAttemptStatus("error");
        setAttemptError(
          err instanceof AssessmentApiError
            ? err.message
            : "Something went wrong while starting the assessment."
        );
      });
  }, []);

  const finalizeAndSubmit = useCallback(async () => {
    if (finalizingRef.current) return;

    const prev = attemptRef.current;
    if (!prev || prev.isFinalized) return;

    const timeTakenSeconds = Math.max(
      0,
      ASSESSMENT_DURATION_SECONDS -
        Math.max(0, Math.ceil((prev.endAt - Date.now()) / 1000))
    );
    const questions = prev.order.map((o) => o.question);

    const persistAndNavigate = (result: AssessmentResult) => {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(result));
      } catch {
        // sessionStorage unavailable — nothing else we can do client-side.
      }
      setAttempt((p) => (p ? { ...p, isFinalized: true } : p));
      router.push("/assessment/result");
    };

    if (
      questions.every(
        (q): q is ScorableQuestion => q.correctAnswer !== undefined
      )
    ) {
      // Mock mode — scoring happens client-side exactly as before, since the
      // answer key is legitimately present on the question objects.
      finalizingRef.current = true;
      persistAndNavigate(calculateScore(prev.answers, questions, timeTakenSeconds));
      return;
    }

    // API mode — the client never knows the answer key, so scoring MUST
    // happen server-side. Submit only the selected option per question.
    if (!prev.attemptId) {
      setAttemptStatus("error");
      setAttemptError("This attempt can't be submitted (missing attempt id).");
      return;
    }

    finalizingRef.current = true;
    setAttemptStatus("submitting");
    setAttemptError(null);

    const answers = prev.order.map((entry, sessionIndex) => {
      const selectedPosition = prev.answers[sessionIndex];
      return {
        questionId: entry.question.id,
        selectedOptionId:
          selectedPosition !== undefined
            ? entry.question.options[selectedPosition].id
            : null,
      };
    });

    try {
      const server = await submitAssessmentAttempt(
        prev.attemptId,
        answers,
        timeTakenSeconds
      );
      const totalQuestions = questions.length;
      const answeredCount = Object.keys(prev.answers).length;
      persistAndNavigate({
        totalQuestions,
        correctAnswers: server.correctAnswers,
        wrongAnswers: server.wrongAnswers,
        answeredCount,
        unansweredCount: server.unansweredAnswers,
        accuracyRate: server.accuracyPercentage,
        timeTakenSeconds: server.timeTakenSeconds,
        scorePercentage: server.scorePercentage,
        answers: prev.answers,
        timestamp: new Date().toISOString(),
        scoringUnavailable: false,
      });
    } catch (err) {
      // Do NOT clear/finalize the attempt — answers stay intact so the user
      // can retry without losing anything.
      finalizingRef.current = false;
      setAttemptStatus("error");
      setAttemptError(
        err instanceof AssessmentApiError
          ? err.message
          : "Failed to submit the assessment."
      );
    }
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
        if (!timeoutAutoSubmitAttemptedRef.current) {
          timeoutAutoSubmitAttemptedRef.current = true;
          finalizeAndSubmit();
        }
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
      attemptStatus,
      attemptError,
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
      attemptStatus,
      attemptError,
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
