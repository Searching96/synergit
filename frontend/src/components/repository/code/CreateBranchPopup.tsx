import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { OcticonCopy } from "../../icons/Octicons";
import { GitBranchIcon } from "@primer/octicons-react";
import { reposApi } from "../../../services/api/repos";
import type { Branch } from "../../../types";

interface CreateBranchPopupProps {
  repoId: string;
  branches: Branch[];
  defaultSourceName?: string;
  onClose: () => void;
  onCreated: (created: Branch) => void;
}

export default function CreateBranchPopup({
  repoId,
  branches,
  defaultSourceName,
  onClose,
  onCreated,
}: CreateBranchPopupProps) {
  const initialSource =
    defaultSourceName ||
    branches.find((b) => b.is_default)?.name ||
    branches[0]?.name ||
    "master";

  const [name, setName] = useState("");
  const [sourceBranch, setSourceBranch] = useState(initialSource);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Branch name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await reposApi.createBranch(repoId, {
        name: trimmed,
        from_branch: sourceBranch || undefined,
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create branch");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && !!name.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close create branch dialog"
        onClick={() => {
          if (!submitting) onClose();
        }}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative w-full max-w-[480px] mx-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Create a branch</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-7 w-7 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-center disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">New branch name</label>
            <div className="flex items-center">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSubmit();
                  }
                }}
                disabled={submitting}
                className="flex-1 h-9 px-3 rounded-l-md border border-[var(--text-link)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(name)}
                disabled={!name}
                className="h-9 w-9 rounded-r-md border border-[var(--border-default)] bg-[var(--surface-canvas)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-center disabled:opacity-50"
                aria-label="Copy branch name"
              >
                <OcticonCopy size={14} className="text-[var(--text-secondary)]" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Source</label>
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setSourceMenuOpen((v) => !v)}
                disabled={submitting}
                className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2 hover:bg-[var(--surface-subtle)] disabled:opacity-50"
              >
                <GitBranchIcon size={14} className="text-[var(--text-secondary)]" />
                <span className="font-mono text-xs">{sourceBranch || "master"}</span>
                <ChevronDown size={14} className="text-[var(--text-secondary)]" />
              </button>
              {sourceMenuOpen ? (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSourceMenuOpen(false)} />
                  <div className="absolute z-20 left-0 top-[calc(100%+4px)] min-w-[200px] max-h-60 overflow-y-auto rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg py-1">
                    {branches.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-[var(--text-secondary)]">No branches</p>
                    ) : (
                      branches.map((b) => (
                        <button
                          key={b.name}
                          type="button"
                          onClick={() => {
                            setSourceBranch(b.name);
                            setSourceMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-sm font-mono text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] ${
                            b.name === sourceBranch ? "bg-[var(--surface-subtle)]" : ""
                          }`}
                        >
                          {b.name}
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="text-xs text-[var(--accent-danger,#cf222e)]">{error}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border-default)]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="h-8 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-medium hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create new branch"}
          </button>
        </div>
      </div>
    </div>
  );
}
