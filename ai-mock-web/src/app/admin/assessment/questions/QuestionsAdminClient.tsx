"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardList, Plus, RotateCcw } from "lucide-react";

import {
  AdminAssessmentApiError,
  createQuestion,
  deleteQuestion,
  getCategories,
  getQuestions,
  toggleQuestion,
  updateQuestion,
  type AdminCategory,
  type AdminQuestion,
  type QuestionFormInput,
} from "@/app/lib/adminAssessmentApi";
import QuestionFilters, {
  type QuestionFiltersValue,
} from "@/components/admin-assessment/QuestionFilters";
import QuestionTable from "@/components/admin-assessment/QuestionTable";
import QuestionFormModal from "@/components/admin-assessment/QuestionFormModal";
import DeleteQuestionModal from "@/components/admin-assessment/DeleteQuestionModal";
import UserMenu from "@/components/UserMenu";

type PageStatus = "loading" | "ready" | "error";

const EMPTY_FILTERS: QuestionFiltersValue = { search: "", categoryId: "", difficulty: "", active: "" };

export default function QuestionsAdminClient() {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [filters, setFilters] = useState<QuestionFiltersValue>(EMPTY_FILTERS);

  const [formModal, setFormModal] = useState<{ mode: "create" | "edit"; question?: AdminQuestion } | null>(
    null
  );
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminQuestion | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setLoadError(null);

    Promise.all([
      getQuestions({
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined,
        difficulty: filters.difficulty || undefined,
        active: filters.active === "" ? undefined : filters.active === "true",
      }),
      getCategories(),
    ])
      .then(([questionsData, categoriesData]) => {
        setQuestions(questionsData.questions);
        setCategories(categoriesData);
        setStatus("ready");
      })
      .catch((err) => {
        setStatus("error");
        setLoadError(
          err instanceof AdminAssessmentApiError
            ? err.message
            : "Something went wrong while loading the question bank."
        );
      });
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFormSubmit = async (input: QuestionFormInput) => {
    if (!formModal) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (formModal.mode === "create") {
        await createQuestion(input);
      } else if (formModal.question) {
        await updateQuestion(formModal.question.id, input);
      }
      setFormModal(null);
      load();
    } catch (err) {
      setFormError(
        err instanceof AdminAssessmentApiError ? err.message : "Couldn't save this question."
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (question: AdminQuestion) => {
    setBusyId(question.id);
    try {
      await toggleQuestion(question.id);
      load();
    } catch (err) {
      setLoadError(
        err instanceof AdminAssessmentApiError ? err.message : "Couldn't update this question."
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteQuestion(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteError(
        err instanceof AdminAssessmentApiError ? err.message : "Couldn't delete this question."
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  const hasActiveFilters = useMemo(
    () => filters.search || filters.categoryId || filters.difficulty || filters.active,
    [filters]
  );

  return (
    <div className="min-h-screen">
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
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-foreground/80 hover:text-primary transition-colors"
            >
              Dashboard
            </Link>
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary mb-2">
              Question Bank
            </h1>
            <p className="text-muted-foreground text-sm">
              Create, edit, disable, or delete assessment questions.
            </p>
          </div>
          <button
            onClick={() => {
              setFormError(null);
              setFormModal({ mode: "create" });
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 self-start"
          >
            <Plus className="w-4 h-4" />
            New Question
          </button>
        </div>

        <div className="mb-6">
          <QuestionFilters categories={categories} value={filters} onChange={setFilters} />
        </div>

        {status === "loading" && (
          <div className="h-64 rounded-2xl bg-muted/40 border border-border animate-pulse" />
        )}

        {status === "error" && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-md">
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-5 mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Couldn&apos;t load the question bank</h2>
            <p className="text-sm text-muted-foreground mb-6">{loadError}</p>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {status === "ready" && questions.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-md">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-5 mx-auto">
              <ClipboardList className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              {hasActiveFilters ? "No questions match these filters" : "No questions yet"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Try clearing a filter."
                : "Create your first question to populate the bank."}
            </p>
          </div>
        )}

        {status === "ready" && questions.length > 0 && (
          <QuestionTable
            questions={questions}
            busyId={busyId}
            onEdit={(q) => {
              setFormError(null);
              setFormModal({ mode: "edit", question: q });
            }}
            onDelete={(q) => {
              setDeleteError(null);
              setDeleteTarget(q);
            }}
            onToggleActive={handleToggleActive}
          />
        )}
      </div>

      {formModal && (
        <QuestionFormModal
          mode={formModal.mode}
          categories={categories}
          initial={formModal.question}
          submitting={formSubmitting}
          error={formError}
          onClose={() => (formSubmitting ? undefined : setFormModal(null))}
          onSubmit={handleFormSubmit}
        />
      )}

      {deleteTarget && (
        <DeleteQuestionModal
          question={deleteTarget}
          busy={deleteBusy}
          error={deleteError}
          onCancel={() => (deleteBusy ? undefined : setDeleteTarget(null))}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
