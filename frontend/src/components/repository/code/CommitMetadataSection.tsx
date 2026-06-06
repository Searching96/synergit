import { Copy, FileIcon } from "lucide-react";
import { GitBranchIcon } from "@primer/octicons-react";
import type { Commit } from "../../../types";

interface CommitMetadataSectionProps {
  commit: Commit | null;
  commitHash: string;
  fileCount: number;
  totalAdditions: number;
  totalDeletions: number;
  onBrowseFiles?: (commitHash: string) => void;
}

export default function CommitMetadataSection({
  commit,
  commitHash,
  fileCount,
  totalAdditions,
  totalDeletions,
  onBrowseFiles,
}: CommitMetadataSectionProps) {
  const shortHash = commitHash.slice(0, 7);

  return (
    <div className="p-3 border-b border-[var(--border-default)]">
      <div className="flex items-start justify-between gap-4">
        <div className="mb-2">
          <h1 className="text-xl font-mono font-semibold text-[var(--text-primary)]">
            Commit <span className="bg-[var(--surface-subtle)] rounded px-1.5 py-0.5">{shortHash}</span>
          </h1>
          {commit && (
            <p className="mt-2 text-sm text-[var(--text-secondary)] flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[10px] font-semibold text-[var(--text-primary)] inline-flex items-center justify-center shrink-0">
                {commit.author.charAt(0).toUpperCase()}
              </span>
              <span className="font-semibold text-[var(--text-primary)]">{commit.author}</span>
              <span>committed on {new Date(commit.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onBrowseFiles?.(commitHash)}
          className="shrink-0 h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2 hover:bg-[var(--surface-subtle)]"
        >
          <FileIcon size={14} className="text-[var(--text-secondary)]" />
          Browse files
        </button>
      </div>

      {commit && (
        <div className="rounded-t-md border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-primary)] font-mono whitespace-pre-wrap">
          {commit.message}
        </div>
      )}

      <div className="flex items-center justify-between border-x border-b border-[var(--border-default)] p-3 text-sm">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <GitBranchIcon size={14} />
          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-link)]">master</span>
          <span className="text-xs">commit {shortHash}</span>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(commitHash)}
            className="h-5 w-5 rounded border border-[var(--border-default)] bg-[var(--surface-canvas)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-center"
            aria-label="Copy full SHA"
          >
            <Copy size={10} className="text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      <div className="p-3 flex items-center justify-between border-x border-b border-[var(--border-default)] rounded-b-md">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {fileCount} file{fileCount !== 1 ? "s" : ""} changed
        </p>
        <span className="text-xs font-mono">
          <span className="text-green-600 font-semibold">+{totalAdditions}</span>{" "}
          <span className="text-red-600 font-semibold">-{totalDeletions}</span>
        </span>
      </div>
    </div>
  );
}
