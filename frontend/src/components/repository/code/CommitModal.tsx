import { useState, useEffect } from "react";
import { X } from "lucide-react";

function GitBranchOcticon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`octicon octicon-git-branch fill-current ${className}`}
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="currentColor"
      style={{ overflow: "visible", verticalAlign: "text-bottom" }}
    >
      <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5 .75 .75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5 .75 .75 0 0 0 0-1.5Z" />
    </svg>
  );
}

interface CommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommit: (message: string, isNewBranch: boolean, newBranchName: string) => void;
  defaultCommitMessage: string;
  submitting: boolean;
  currentBranch: string;
  error?: string | null;
}

export function CommitModal({
  isOpen,
  onClose,
  onCommit,
  defaultCommitMessage,
  submitting,
  currentBranch,
  error,
}: CommitModalProps) {
  const [commitMessage, setCommitMessage] = useState("");
  const [extendedDescription, setExtendedDescription] = useState("");
  const [commitOption, setCommitOption] = useState<"direct" | "new_branch">("direct");
  const [newBranchName, setNewBranchName] = useState("");

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCommitMessage(defaultCommitMessage);
      setExtendedDescription("");
      setCommitOption("direct");
      setNewBranchName("");
    }
  }, [isOpen, defaultCommitMessage]);

  if (!isOpen) return null;

  const handleCommit = () => {
    const finalMsg = commitMessage.trim() || defaultCommitMessage;
    const finalMessage = extendedDescription.trim()
      ? `${finalMsg}\n\n${extendedDescription.trim()}`
      : finalMsg;
    onCommit(finalMessage, commitOption === "new_branch", newBranchName);
  };

  const canCommit = commitMessage.trim().length > 0 && 
    (commitOption === "direct" || newBranchName.trim().length > 0);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/35"
        onClick={() => {
          if (!submitting) onClose();
        }}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Commit changes</h3>
          <button
            type="button"
            onClick={() => {
              if (!submitting) onClose();
            }}
            disabled={submitting}
            className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">Commit message</label>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-1.5 text-sm text-[var(--text-primary)] shadow-sm focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              placeholder="Commit message"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">Extended description</label>
            <textarea
              value={extendedDescription}
              onChange={(e) => setExtendedDescription(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              placeholder="Add an optional extended description..."
            />
          </div>

          <div className="flex flex-col gap-3 py-2 border-t border-[var(--border-default)] mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="commit_option"
                value="direct"
                checked={commitOption === "direct"}
                onChange={() => setCommitOption("direct")}
                className="w-4 h-4 text-[var(--accent-primary)] border-[var(--border-default)] focus:ring-[var(--accent-primary)]"
              />
              <span className="text-sm text-[var(--text-primary)]">
                Commit directly to the <span className="font-semibold">{currentBranch}</span> branch
              </span>
            </label>
            
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="commit_option"
                  value="new_branch"
                  checked={commitOption === "new_branch"}
                  onChange={() => setCommitOption("new_branch")}
                  className="w-4 h-4 mt-0.5 shrink-0 text-[var(--accent-primary)] border-[var(--border-default)] focus:ring-[var(--accent-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">
                  Create a <span className="font-semibold">new branch</span> for this commit and start a pull request <a href="#" className="text-[var(--text-link)] hover:underline" onClick={(e) => e.preventDefault()}>Learn more about pull requests</a>
                </span>
              </label>
              
              {commitOption === "new_branch" && (
                <div className="ml-6 mt-1 flex items-center border border-[var(--border-default)] rounded-md shadow-sm overflow-hidden bg-[var(--surface-canvas)] focus-within:border-[var(--accent-primary)] focus-within:ring-1 focus-within:ring-[var(--accent-primary)] px-2">
                  <GitBranchOcticon size={16} className="text-[var(--text-secondary)] shrink-0" />
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="branch-name"
                    className="w-full bg-transparent px-2 py-1.5 text-sm font-medium text-[var(--text-primary)] outline-none"
                  />
                </div>
              )}
            </div>
            
            {error && (
              <p className="text-sm text-[var(--text-danger)] mt-1">{error}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-4 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={!canCommit || submitting}
            className="rounded-md border border-[var(--accent-primary)] bg-[var(--accent-primary)] px-4 py-1.5 text-sm font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
          >
            {submitting ? "Committing..." : "Commit changes"}
          </button>
        </div>
      </div>
    </>
  );
}
