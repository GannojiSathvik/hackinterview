/**
 * Assessment Scoring Utility
 * Pure function — no side effects, no DOM access.
 */

import type { AnswerMap, AssessmentResult, Question } from "@/types/assessment";

/**
 * Calculate the assessment result from the user's answers and the question set.
 *
 * @param answers  Map of sessionQuestionIndex → selected (original, pre-shuffle) option index
 * @param questions  The full list of questions in the assessment, in session order
 * @param timeTakenSeconds  How long the attempt took, in seconds
 * @returns A complete AssessmentResult ready for sessionStorage
 */
export function calculateScore(
  answers: AnswerMap,
  questions: Question[],
  timeTakenSeconds: number
): AssessmentResult {
  const totalQuestions = questions.length;
  let correctAnswers = 0;
  let answeredCount = 0;

  questions.forEach((q, index) => {
    const selected = answers[index];
    if (selected === undefined) return;
    answeredCount++;
    if (selected === q.correctAnswer) correctAnswers++;
  });

  const unansweredCount = totalQuestions - answeredCount;
  const wrongAnswers = answeredCount - correctAnswers;
  const accuracyRate =
    answeredCount > 0 ? Math.round((correctAnswers / answeredCount) * 100) : 0;
  const scorePercentage =
    totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  return {
    totalQuestions,
    correctAnswers,
    wrongAnswers,
    answeredCount,
    unansweredCount,
    accuracyRate,
    timeTakenSeconds,
    scorePercentage,
    answers,
    timestamp: new Date().toISOString(),
  };
}
