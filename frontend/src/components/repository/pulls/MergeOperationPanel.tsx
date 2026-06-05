import { AlertTriangle, ChevronDown, File, GitMerge } from "lucide-react";
import type { ConflictFile, PullRequest } from "../../../types";

interface MergeOperationPanelProps {
  status: PullRequest["status"];
  sourceBranch: string;
  canMerge: boolean;
  updating: boolean;
  conflictFiles: ConflictFile[];
  onMerge: () => void;
  onOpenConflicts: () => void;
}

function GitPullRequestOcticon({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      data-component="Octicon"
      height={size}
      viewBox="0 0 16 16"
      version="1.1"
      width={size}
      data-view-component="true"
      className="octicon octicon-git-pull-request color-fg-inherit fill-current"
    >
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
    </svg>
  );
}

function GitMergeReadyOcticon({ size = 24 }: { size?: number }) {
  return (
    <svg
      data-component="Octicon"
      focusable="false"
      aria-label="Ready to merge"
      className="octicon octicon-git-merge fgColor-onEmphasis fill-current"
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      display="inline-block"
      overflow="visible"
      style={{ verticalAlign: "text-bottom" }}
    >
      <path d="M15 13.25a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm-12.5 6a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm0-14.5a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0ZM5.75 6.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 6.5Zm0 14.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 21Zm12.5-6a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 18.25 15Z" />
      <path d="M6.5 7.25c0 2.9 2.35 5.25 5.25 5.25h4.5V14h-4.5A6.75 6.75 0 0 1 5 7.25Z" />
      <path d="M5.75 16.75A.75.75 0 0 1 5 16V8a.75.75 0 0 1 1.5 0v8a.75.75 0 0 1-.75.75Z" />
    </svg>
  );
}

export default function MergeOperationPanel({
  status,
  sourceBranch,
  canMerge,
  updating,
  conflictFiles,
  onMerge,
  onOpenConflicts,
}: MergeOperationPanelProps) {
  const isClosed = status === "CLOSED";
  const isMerged = status === "MERGED";
  const hasConflicts = status === "OPEN" && !canMerge;

  return (
    <li className="relative pl-16">
      <span className={`absolute left-1 top-1 z-10 h-8 w-8 rounded-md text-white inline-flex items-center justify-center ${
        isMerged
          ? "bg-[var(--text-accent-purple)]"
          : isClosed || hasConflicts
            ? "bg-[var(--text-secondary)]"
            : "bg-[var(--fgColor-open,#1a7f37)]"
      }`}>
        {isClosed ? <GitPullRequestOcticon size={18} /> : <GitMergeReadyOcticon size={22} />}
      </span>

      {isMerged ? (
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)]">Pull request successfully merged and closed</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              You&apos;re all set — the{" "}
              <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">
                {sourceBranch}
              </span>{" "}
              branch can be safely deleted.
            </p>
          </div>
          <button
            type="button"
            className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
          >
            Delete branch
          </button>
        </div>
      ) : isClosed ? (
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)]">Closed with unmerged commits</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              This pull request is closed, but the{" "}
              <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">
                {sourceBranch}
              </span>{" "}
              branch has unmerged commits.
            </p>
          </div>
          <button
            type="button"
            className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
          >
            Delete branch
          </button>
        </div>
      ) : (
        <div className={`rounded-md border ${
          canMerge
            ? "border-[var(--border-success-muted)]"
            : "border-[var(--border-default)]"
        } bg-[var(--surface-canvas)] overflow-hidden`}>
          <div className="px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex items-start gap-3">
              <span className={`mt-0.5 h-7 w-7 rounded-full text-white inline-flex items-center justify-center ${
                canMerge ? "bg-[var(--fgColor-open,#1a7f37)]" : "bg-[var(--text-secondary)]"
              }`}>
                {canMerge ? <GitMergeReadyOcticon size={20} /> : <AlertTriangle size={17} />}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text-primary)]">
                  {canMerge ? "No conflicts with base branch" : "This branch has conflicts that must be resolved"}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {canMerge ? (
                    "Merging can be performed automatically."
                  ) : (
                    <>
                      Use the{" "}
                      <button type="button" onClick={onOpenConflicts} className="text-[var(--text-link)] hover:underline">
                        web editor
                      </button>{" "}
                      or the command line to resolve conflicts before continuing.
                    </>
                  )}
                </p>
                {hasConflicts && conflictFiles.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {conflictFiles.map((file) => (
                      <div key={file.path} className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                        <File size={14} className="text-[var(--text-secondary)]" />
                        <span className="truncate">{file.path}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {hasConflicts ? (
              <button
                type="button"
                onClick={onOpenConflicts}
                className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-semibold text-[var(--text-primary)] inline-flex items-center justify-center gap-2 hover:bg-[var(--surface-subtle)]"
              >
                Resolve conflicts
                <ChevronDown size={14} />
              </button>
            ) : null}
          </div>

          <div className="border-t border-[var(--border-muted)] bg-[var(--surface-subtle)] px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            {status === "OPEN" ? (
              <div className="inline-flex self-start">
                <button
                  type="button"
                  disabled={updating || !canMerge}
                  onClick={onMerge}
                  className="h-9 px-4 rounded-l-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-secondary)] disabled:opacity-100 disabled:cursor-not-allowed"
                >
                  Merge pull request
                </button>
              </div>
            ) : (
              <span className="text-sm font-semibold text-[var(--text-accent-purple)] inline-flex items-center gap-2">
                <GitMerge size={15} />
                Pull request merged
              </span>
            )}
            <span className="text-xs text-[var(--text-secondary)]">
              You can also merge this with the command line.{" "}
              <span className="text-[var(--text-link)] underline-offset-2 hover:underline">View command line instructions.</span>
            </span>
          </div>
        </div>
      )}
    </li>
  );
}
