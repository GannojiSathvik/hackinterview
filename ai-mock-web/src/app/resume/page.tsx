"use client";

import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Moon,
  Sun,
  UploadCloud,
  FileCheck2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { API_BASE } from "../lib/api";
import UserMenu from "@/components/UserMenu";

export default function ResumeUploadPage() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [yearsOfExperience, setYearsOfExperience] = useState<number | ''>('');
  const [jobRole, setJobRole] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [planPreview, setPlanPreview] = useState<
    | {
        inferred_role: string;
        inferred_years_of_experience: number;
        inferred_company: string;
        rounds: { title: string; type: string; question_count: number; estimated_minutes: number }[];
        total_questions: number;
        total_estimated_minutes: number;
        is_ai_generated: boolean;
        generation_source: string;
      }
    | null
  >(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load saved form data on component mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('interviewData');
      if (saved) {
        const data = JSON.parse(saved);
        setJobRole(data.jobRole || '');
        setCompanyName(data.companyName || '');
        setYearsOfExperience(data.yearsOfExperience || '');
        setJobDescription(data.jobDescription || '');
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (
        file.type !== "application/pdf" &&
        file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        setError("Please upload a PDF or DOCX file.");
        setResumeFile(null);
      } else {
        setResumeFile(file);
        setError(null);
      }
    }
  };

  const handlePreviewPlan = async () => {
    setError(null);
    if (!jobRole || yearsOfExperience === '' || !companyName) {
      setError("Please provide Role, Years of Experience, and Company to preview the plan.");
      return;
    }

    setIsPreviewLoading(true);
    setPlanPreview(null);
    const formData = new FormData();
    if (resumeFile) formData.append("resumeFile", resumeFile);
    if (jobDescription) formData.append("jobDescription", jobDescription);
    formData.append("yearsOfExperience", String(yearsOfExperience || 0));
    formData.append("jobRole", jobRole);
    formData.append("companyName", companyName);

    try {
      const res = await fetch(`${API_BASE}/api/preview-plan`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to preview plan.');
      }
      const data = await res.json();
      setPlanPreview(data);
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : "Failed to preview plan.";
      setError(message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (yearsOfExperience === '' || !jobRole || !companyName) {
      setError("Please provide Role, Years of Experience, and Company.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    if (resumeFile) formData.append("resumeFile", resumeFile);
    if (jobDescription) formData.append("jobDescription", jobDescription);
    formData.append("yearsOfExperience", String(yearsOfExperience));
    formData.append("jobRole", jobRole);
    formData.append("companyName", companyName);

    try {
      const response = await fetch(`${API_BASE}/api/start-interview`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start interview session.');
      }

      const data = await response.json();
      console.log("Backend response:", data);
      // Persist session payload for Interview page to pick up immediately
      try {
        sessionStorage.setItem('interviewSession', JSON.stringify(data));
      } catch {}

      // Store form data in sessionStorage to avoid re-filling
      sessionStorage.setItem('interviewData', JSON.stringify({
        jobRole,
        companyName,
        yearsOfExperience,
        jobDescription
      }));

      router.push("/Interview");

    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
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
              href="/dashboard"
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
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 px-6 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary mb-3">
            Prepare for Your Interview
          </h1>
          <p className="text-muted-foreground">
            Upload your resume and the job details to get started.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-md">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Resume Upload Section */}
            <div>
              <label htmlFor="resume" className="block text-sm font-semibold text-foreground mb-2">
                1. Upload Your Resume (PDF or DOCX)
              </label>
              <div
                className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-colors ${
                  resumeFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  id="resume"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.docx"
                />
                <label
                  htmlFor="resume"
                  className="flex flex-col items-center justify-center w-full h-full text-center text-muted-foreground cursor-pointer gap-2"
                >
                  {resumeFile ? (
                    <>
                      <FileCheck2 className="w-6 h-6 text-primary" />
                      <p className="text-primary font-medium text-sm">{resumeFile.name} uploaded.</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6" />
                      <p className="text-sm">Drag and drop or click to upload</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Job Description Section */}
            <div>
              <label htmlFor="jobDescription" className="block text-sm font-semibold text-foreground mb-2">
                2. Paste Job Description
              </label>
              <textarea
                id="jobDescription"
                rows={8}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full p-4 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground bg-background border border-border"
                placeholder="Paste the job description here..."
              />
            </div>

            {/* Job Role, Years of Experience, Company Name */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="companyName" className="block text-sm font-semibold text-foreground mb-2">
                  3. Company Name
                </label>
                <select
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground bg-background border border-border"
                >
                  <option value="">Select a company</option>
                  <option>Amazon</option>
                  <option>Google</option>
                  <option>Microsoft</option>
                  <option>Meta</option>
                  <option>Apple</option>
                  <option>Netflix</option>
                  <option>Uber</option>
                  <option>Airbnb</option>
                  <option>Stripe</option>
                  <option>NVIDIA</option>
                  <option>OpenAI</option>
                  <option>Adobe</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="jobRole" className="block text-sm font-semibold text-foreground mb-2">
                  4. Your Job Role
                </label>
                <select
                  id="jobRole"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  className="w-full p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground bg-background border border-border"
                >
                  <option value="">Select a role</option>
                  <option>Software Engineer</option>
                  <option>SDE 1</option>
                  <option>SDE 2</option>
                  <option>Senior SDE</option>
                  <option>Frontend Engineer</option>
                  <option>Backend Engineer</option>
                  <option>Full Stack Engineer</option>
                  <option>Data Scientist</option>
                  <option>ML Engineer</option>
                  <option>DevOps Engineer</option>
                  <option>Product Manager</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="yearsOfExperience" className="block text-sm font-semibold text-foreground mb-2">
                  5. Years of Experience
                </label>
                <select
                  id="yearsOfExperience"
                  value={yearsOfExperience === '' ? '' : String(yearsOfExperience)}
                  onChange={(e) => setYearsOfExperience(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground bg-background border border-border"
                >
                  <option value="">Select years</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="10">10</option>
                  <option value="12">12</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl py-3 px-4">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border pt-6">
              <button
                type="button"
                onClick={handlePreviewPlan}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors duration-300 border ${
                  isPreviewLoading
                    ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                    : "bg-card border-border hover:bg-muted text-foreground"
                }`}
                disabled={isPreviewLoading}
              >
                {isPreviewLoading ? "Generating Plan..." : "Preview Interview Plan"}
              </button>
              <button
                type="submit"
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  isSubmitting
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40"
                }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Starting..." : "Start Interview"}
              </button>
            </div>
          </form>
        </div>

        {/* Interview Plan Preview */}
        {planPreview && (
          <div className="mt-8 bg-card border border-border rounded-2xl p-6 md:p-8 shadow-md">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              Interview Plan Preview
            </h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Role:</span> {planPreview.inferred_role || '—'} {" "}
              <span className="font-medium text-foreground ml-3">Experience:</span> {planPreview.inferred_years_of_experience} yrs {" "}
              <span className="font-medium text-foreground ml-3">Company:</span> {planPreview.inferred_company || '—'}
            </p>

            {/* Generation Source Indicator */}
            <div className="mt-4 p-3 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    planPreview.is_ai_generated ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    planPreview.is_ai_generated
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {planPreview.is_ai_generated ? "AI Generated" : "Fallback Plan"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{planPreview.generation_source}</p>
            </div>

            <div className="mt-4 space-y-3">
              {planPreview.rounds.map((r, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {r.title}{" "}
                      <span className="ml-2 text-xs uppercase tracking-wide text-primary bg-primary/10 rounded-full px-2 py-0.5">
                        {r.type}
                      </span>
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">Questions: {r.question_count}</p>
                  </div>
                  <p className="text-foreground font-medium text-sm shrink-0">~ {r.estimated_minutes} min</p>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
              <p className="font-medium text-foreground text-sm">Total Questions: {planPreview.total_questions}</p>
              <p className="font-semibold text-foreground text-sm">~ {planPreview.total_estimated_minutes} minutes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
