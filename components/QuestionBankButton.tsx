"use client";

import { useState, useEffect, useRef } from "react";
import { Bookmark, BookmarkCheck, Loader2, Tag, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  saveQuestion,
  deleteQuestion,
  isQuestionSaved,
} from "@/lib/actions/questionBank.action";

interface QuestionBankButtonProps {
  question: string;
  interviewRole: string;
  suggestedTags?: string[];
}

export function QuestionBankButton({
  question,
  interviewRole,
  suggestedTags = [],
}: QuestionBankButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [tags, setTags] = useState<string[]>(suggestedTags.slice(0, 3));
  const [tagInput, setTagInput] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    isQuestionSaved(question).then(({ saved, id }) => {
      if (cancelled) return;
      setIsSaved(saved);
      setSavedId(id ?? null);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [question]);

  useEffect(() => {
    if (!showTagPopover) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setShowTagPopover(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTagPopover]);

  useEffect(() => {
    if (showTagPopover) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showTagPopover]);

  const handleUnsave = async () => {
    if (!savedId) return;
    setIsLoading(true);
    const result = await deleteQuestion(savedId);
    if (result.success) {
      setIsSaved(false);
      setSavedId(null);
      toast.success("Removed from your question bank.");
    } else {
      toast.error(result.error ?? "Failed to remove question.");
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setShowTagPopover(false);
    const result = await saveQuestion({ question, tags, interviewRole });
    if (result.success && result.id) {
      setIsSaved(true);
      setSavedId(result.id);
      toast.success("Saved to your question bank!");
    } else {
      toast.error(result.error ?? "Failed to save question.");
    }
    setIsLoading(false);
  };

  const handleMainClick = () => {
    if (isLoading) return;
    if (isSaved) {
      handleUnsave();
    } else {
      setShowTagPopover((prev) => !prev);
    }
  };

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed) || tags.length >= 5) return;
    setTags((prev) => [...prev, trimmed]);
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    setTags((prev) => prev.filter((t) => t !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleMainClick}
        disabled={isLoading}
        aria-label={
          isLoading
            ? "Loading..."
            : isSaved
              ? "Remove from question bank"
              : "Save to question bank"
        }
        aria-pressed={isSaved}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
          isSaved
            ? "bg-accent-teal/15 border-accent-teal/40 text-accent-teal hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
            : "bg-white/5 border-white/10 text-light-400 hover:bg-accent-mustard/10 hover:border-accent-mustard/30 hover:text-accent-mustard",
          isLoading && "opacity-50 cursor-not-allowed",
        )}
      >
        {isLoading ? (
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        ) : isSaved ? (
          <BookmarkCheck size={12} aria-hidden="true" />
        ) : (
          <Bookmark size={12} aria-hidden="true" />
        )}
        <span>{isLoading ? "..." : isSaved ? "Saved" : "Save"}</span>
      </button>

      {showTagPopover && !isSaved && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Add tags before saving"
          className="absolute bottom-full left-0 mb-2 w-72 bg-dark-200 border border-white/10 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50"
        >
          <div
            className="absolute -bottom-1.5 left-5 w-3 h-3 bg-dark-200 border-b border-r border-white/10 rotate-45"
            aria-hidden="true"
          />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag
                size={14}
                className="text-accent-mustard"
                aria-hidden="true"
              />
              <p className="text-white text-sm font-semibold">Add tags</p>
              <span className="text-light-400 text-xs ml-auto">up to 5</span>
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-mustard/15 text-accent-mustard text-xs font-medium"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>

            {tags.length < 5 && (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="e.g. react, algorithms..."
                  aria-label="Type a tag and press Enter"
                  className="flex-1 bg-dark-300/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-light-400/50 focus:outline-none focus:border-accent-mustard/50 transition-colors"
                />
                <button
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                  aria-label="Add tag"
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-light-400 hover:text-white disabled:opacity-30 transition-all"
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>
            )}

            <p className="text-light-400 text-[10px]">
              Press{" "}
              <kbd className="bg-white/10 px-1 rounded text-[9px]">Enter</kbd>{" "}
              or <kbd className="bg-white/10 px-1 rounded text-[9px]">,</kbd> to
              add a tag
            </p>

            <button
              onClick={handleSave}
              className="w-full bg-accent-mustard text-dark-100 text-sm font-bold py-2 rounded-xl hover:bg-accent-mustard/90 transition-colors"
            >
              Save to Bank
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
