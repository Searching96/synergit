import { AlertTriangle, ChevronDown, File, GitMerge } from "lucide-react";
import { useState } from "react";
import { reposApi } from "../../../services/api/repos";
import type { ConflictFile, PullRequest } from "../../../types";
import { SpinnerPlaceholder } from "../../../components/shared/LoadingPlaceholders";

interface MergeOperationPanelProps {
  repoId: string;
  status: PullRequest["status"];
  sourceBranch: string;
  pullNumber: number;
  currentUsername: string;
  canMerge: boolean;
  updating: boolean;
  isLoading?: boolean;
  conflictFiles: ConflictFile[];
  onMerge: (commitMessage?: string, description?: string) => void;
  onOpenConflicts: () => void;
  onBranchDeleted?: () => void;
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
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5 .75 .75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5 .75 .75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
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

function CheckOcticon({ size = 16 }: { size?: number }) {
  return (
    <svg
      data-component="Octicon"
      aria-hidden="true"
      focusable="false"
      className="octicon octicon-check fill-current"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="currentColor"
      display="inline-block"
      overflow="visible"
      style={{ verticalAlign: "text-bottom" }}
    >
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

export default function MergeOperationPanel({
  repoId,
  status,
  sourceBranch,
  pullNumber,
  currentUsername,
  canMerge,
  updating,
  isLoading,
  conflictFiles,
  onMerge,
  onOpenConflicts,
  onBranchDeleted,
}: MergeOperationPanelProps) {
  const isClosed = status === "CLOSED";
  const isMerged = status === "MERGED";
  const hasConflicts = status === "OPEN" && conflictFiles.length > 0;
  const [deletingBranch, setDeletingBranch] = useState(false);
  const [branchDeleted, setBranchDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [mergeCommitMessage, setMergeCommitMessage] = useState("");
  const [mergeDescription, setMergeDescription] = useState("");

  const defaultMergeMessage = `Merge pull request #${pullNumber} from ${currentUsername}/${sourceBranch}`;
  const displayedCommitMessage = mergeCommitMessage || defaultMergeMessage;

  const handleDeleteBranch = async () => {
    if (!sourceBranch) return;
    if (!window.confirm(`Delete branch "${sourceBranch}"? This action cannot be undone.`)) return;
    setDeletingBranch(true);
    setDeleteError(null);
    try {
      await reposApi.deleteBranch(repoId, sourceBranch);
      setBranchDeleted(true);
      onBranchDeleted?.();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete branch");
    } finally {
      setDeletingBranch(false);
    }
  };

  if (isLoading) {
    return (
      <div className="relative pl-16">
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-4 py-8 flex flex-col items-center justify-center">
          <SpinnerPlaceholder size={24} className="text-[var(--text-secondary)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative pl-16">
      <span className={`absolute left-0 top-0 h-9.5 w-9.5 rounded-md text-white inline-flex items-center justify-center ${
        isMerged
          ? "bg-[var(--text-accent-purple)]"
          : isClosed || hasConflicts
            ? "bg-[var(--text-secondary)]"
            : "bg-[var(--fgColor-open,#1a7f37)]"
      }`}>
        {isClosed ? <GitPullRequestOcticon size={18} /> : <GitMergeReadyOcticon size={22} />}
      </span>

      {isMerged ? (
        <div className="rounded-md border border-[var(--text-accent-purple)] bg-[var(--surface-canvas)] px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)]">Pull request successfully merged and closed</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {branchDeleted ? (
                <>The <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{sourceBranch}</span> branch was deleted.</>
              ) : (
                <>You&apos;re all set — the{" "}
                  <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">
                    {sourceBranch}
                  </span>{" "}
                  branch can be safely deleted.</>
              )}
            </p>
            {deleteError ? (
              <p className="mt-1 text-xs text-[var(--accent-danger,#cf222e)]">{deleteError}</p>
            ) : null}
          </div>
          {!branchDeleted ? (
            <button
              type="button"
              onClick={() => void handleDeleteBranch()}
              disabled={deletingBranch}
              className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-60"
            >
              {deletingBranch ? "Deleting..." : "Delete branch"}
            </button>
          ) : null}
        </div>
      ) : isClosed ? (
        <div className="rounded-md border border-[var(--text-secondary)] bg-[var(--surface-canvas)] px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)]">Closed with unmerged commits</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {branchDeleted ? (
                <>The <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{sourceBranch}</span> branch was deleted.</>
              ) : (
                <>This pull request is closed, but the{" "}
                  <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">
                    {sourceBranch}
                  </span>{" "}
                  branch has unmerged commits.</>
              )}
            </p>
            {deleteError ? (
              <p className="mt-1 text-xs text-[var(--accent-danger,#cf222e)]">{deleteError}</p>
            ) : null}
          </div>
          {!branchDeleted ? (
            <button
              type="button"
              onClick={() => void handleDeleteBranch()}
              disabled={deletingBranch}
              className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-60"
            >
              {deletingBranch ? "Deleting..." : "Delete branch"}
            </button>
          ) : null}
        </div>
      ) : (
        <div className={`rounded-md border ${
          canMerge
            ? "border-[var(--fgColor-open,#1a7f37)]"
            : "border-[var(--text-secondary)]"
        } bg-[var(--surface-canvas)] overflow-hidden`}>
          <div className="px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex items-start gap-3">
              <span className={`mt-0.5 h-7 w-7 rounded-full text-white inline-flex items-center justify-center ${
                canMerge ? "bg-[var(--fgColor-open,#1a7f37)]" : "bg-[var(--text-secondary)]"
              }`}>
                {canMerge ? <CheckOcticon size={16} /> : <AlertTriangle size={17} />}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text-primary)]">
                  {hasConflicts ? "This branch has conflicts that must be resolved" : "No conflicts with base branch"}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {hasConflicts ? (
                    <>
                      Use the{" "}
                      <button type="button" onClick={onOpenConflicts} className="text-[var(--text-link)] hover:underline">
                        web editor
                      </button>{" "}
                      or the command line to resolve conflicts before continuing.
                    </>
                  ) : (
                    "Merging can be performed automatically."
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
              !showConfirmForm ? (
                <div className="inline-flex self-start">
                  <button
                    type="button"
                    disabled={updating || !canMerge}
                    onClick={() => setShowConfirmForm(true)}
                    className="h-9 px-4 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-secondary)] disabled:opacity-100 disabled:cursor-not-allowed"
                  >
                    Merge pull request
                  </button>
                </div>
              ) : (
                <div className="w-full space-y-3 py-2">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">Commit message</label>
                    <input
                      type="text"
                      value={displayedCommitMessage}
                      onChange={(e) => setMergeCommitMessage(e.target.value)}
                      placeholder="Merge pull request"
                      className="w-full h-9 px-3 rounded-md border border-[var(--text-link)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">Extended description</label>
                    <textarea
                      value={mergeDescription}
                      onChange={(e) => setMergeDescription(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] resize-y focus:outline-none focus:border-[var(--text-link)]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => {
                        onMerge(displayedCommitMessage || undefined, mergeDescription || undefined);
                      }}
                      className="h-9 px-4 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating ? "Merging..." : "Confirm merge"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmForm(false)}
                      disabled={updating}
                      className="h-9 px-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            ) : (
              <span className="text-sm font-semibold text-[var(--text-accent-purple)] inline-flex items-center gap-2">
                <GitMerge size={15} />
                Pull request merged
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
