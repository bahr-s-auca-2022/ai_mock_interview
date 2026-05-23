"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Trash2,
  Copy,
  Check,
  BookOpen,
  Tag,
  X,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteQuestion } from "@/lib/actions/questionBank.action";

interface QuestionBankClientProps {
  initialQuestions: SavedQuestion[];
  availableTags: string[];
  userName: string;
}

export function QuestionBankClient({
  initialQuestions,
  availableTags,
  userName,
}: QuestionBankClientProps) {
  const [questions, setQuestions] = useState<SavedQuestion[]>(initialQuestions);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let result = questions;

    if (activeTag) {
      result = result.filter((q) => q.tags.includes(activeTag));
    }

    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (q) =>
          q.question.toLowerCase().includes(lower) ||
          q.interviewRole.toLowerCase().includes(lower) ||
          q.tags.some((t) => t.includes(lower)),
      );
    }

    return result;
  }, [questions, activeTag, searchQuery]);

  const handleDelete = (questionId: string, questionText: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));

    startTransition(async () => {
      const result = await deleteQuestion(questionId);
      if (!result.success) {
        setQuestions(initialQuestions);
        toast.error(result.error ?? "Failed to delete question.");
      } else {
        toast.success("Question removed from bank.");
      }
    });
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Question copied to clipboard.");
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-light-400 hover:text-white transition-colors text-sm mb-4"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white">Question Bank</h1>
          <p className="text-light-400 text-sm mt-1">
            {questions.length === 0
              ? `Welcome, ${userName}. Save questions from your feedback pages to start building your bank.`
              : `${questions.length} saved ${questions.length === 1 ? "question" : "questions"} · ${availableTags.length} ${availableTags.length === 1 ? "tag" : "tags"}`}
          </p>
        </div>

        {questions.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent-mustard/10 border border-accent-mustard/20 text-accent-mustard text-sm font-medium">
            <BookOpen size={16} aria-hidden="true" />
            <span>{questions.length} saved</span>
          </div>
        )}
      </div>

      {questions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 rounded-3xl border border-white/5 bg-dark-300/20 text-center">
          <BookOpen
            size={48}
            className="text-light-400/30 mb-4"
            aria-hidden="true"
          />
          <h2 className="text-white text-xl font-semibold mb-2">
            Your bank is empty
          </h2>
          <p className="text-light-400 text-sm max-w-sm mb-6">
            After completing a practice interview, click the{" "}
            <strong className="text-white">Save</strong> bookmark button next to
            any question on the feedback page to add it here.
          </p>
          <Link
            href="/"
            className="bg-accent-mustard text-dark-100 font-bold px-6 py-3 rounded-full hover:bg-accent-mustard/90 transition-colors"
          >
            Start a Practice Interview
          </Link>
        </div>
      )}

      {questions.length > 0 && (
        <>
          {/* Search bar */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-light-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions, roles, or tags..."
              aria-label="Search your saved questions"
              className="w-full bg-dark-200/60 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder:text-light-400/50 focus:outline-none focus:border-accent-mustard/40 transition-colors text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-light-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Tag filters */}
          {availableTags.length > 0 && (
            <div
              role="group"
              aria-label="Filter by tag"
              className="flex items-center gap-2 flex-wrap"
            >
              <Filter
                size={14}
                className="text-light-400 shrink-0"
                aria-hidden="true"
              />
              <span className="text-light-400 text-xs uppercase tracking-widest font-medium mr-1">
                Tags:
              </span>

              <button
                onClick={() => setActiveTag(null)}
                aria-pressed={activeTag === null}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                  activeTag === null
                    ? "bg-white text-dark-100 border-white"
                    : "bg-white/5 text-light-400 border-white/10 hover:border-white/20 hover:text-white",
                )}
              >
                All
              </button>

              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  aria-pressed={activeTag === tag}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                    activeTag === tag
                      ? "bg-accent-mustard/20 text-accent-mustard border-accent-mustard/40"
                      : "bg-white/5 text-light-400 border-white/10 hover:border-accent-mustard/20 hover:text-accent-mustard",
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* No results from filter */}
          {filtered.length === 0 && (
            <div className="text-center py-16 rounded-3xl border border-white/5 bg-dark-300/20">
              <p className="text-light-400 text-sm">
                No questions match your current filter.{" "}
                <button
                  onClick={() => {
                    setActiveTag(null);
                    setSearchQuery("");
                  }}
                  className="text-accent-mustard hover:underline"
                >
                  Clear filters
                </button>
              </p>
            </div>
          )}

          {/* ── Question list ──────────────────────────────────────────────── */}
          {filtered.length > 0 && (
            <ul
              className="space-y-3"
              aria-label={`${filtered.length} questions`}
            >
              {filtered.map((q, index) => (
                <li
                  key={q.id}
                  className="group rounded-2xl border border-white/5 bg-dark-200/40 hover:bg-dark-200/70 hover:border-white/10 transition-all p-5"
                >
                  <div className="flex items-start gap-4">
                    {/* Question number */}
                    <span
                      className="shrink-0 size-7 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-light-400 mt-0.5"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <p className="text-white text-sm leading-relaxed">
                        {q.question}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Role badge */}
                        <span className="text-[10px] font-medium text-light-400 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full">
                          {q.interviewRole}
                        </span>

                        {/* Tags */}
                        {q.tags.length > 0 && (
                          <div
                            className="flex items-center gap-1.5 flex-wrap"
                            aria-label={`Tags: ${q.tags.join(", ")}`}
                          >
                            <Tag
                              size={10}
                              className="text-accent-mustard/60"
                              aria-hidden="true"
                            />
                            {q.tags.map((tag) => (
                              <button
                                key={tag}
                                onClick={() => setActiveTag(tag)}
                                className="text-[10px] text-accent-mustard/80 hover:text-accent-mustard transition-colors"
                                aria-label={`Filter by tag: ${tag}`}
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Date */}
                        <span className="text-[10px] text-light-400/50 ml-auto shrink-0">
                          {formatDate(q.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons — visible on hover */}
                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Copy */}
                      <button
                        onClick={() => handleCopy(q.id, q.question)}
                        aria-label="Copy question text"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-light-400 hover:text-white transition-all"
                      >
                        {copiedId === q.id ? (
                          <Check
                            size={14}
                            className="text-green-400"
                            aria-hidden="true"
                          />
                        ) : (
                          <Copy size={14} aria-hidden="true" />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(q.id, q.question)}
                        disabled={isPending}
                        aria-label="Remove question from bank"
                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-light-400 hover:text-red-400 transition-all disabled:opacity-30"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
