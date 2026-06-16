import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSetPageReady } from "../contexts/PageReadyContext";
import type { Repository } from "../types";
import { Avatar } from "../components/shared/Avatar";
import { RepoForkedIcon, CheckCircleFillIcon, AlertFillIcon, InfoIcon } from "@primer/octicons-react";
import { reposApi, type ForkRepositoryPayload } from "../services/api/repos";

interface CreateForkPageProps {
  ownerName: string;
  sourceRepo: Repository;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onCreateFork: (payload: ForkRepositoryPayload) => Promise<void>;
}

export default function CreateForkPage({
  ownerName,
  sourceRepo,
  submitting,
  error,
  onCancel,
  onCreateFork,
}: CreateForkPageProps) {
  const [repoName, setRepoName] = useState(sourceRepo.name);
  const [description, setDescription] = useState(sourceRepo.description || "");
  const [defaultBranchOnly, setDefaultBranchOnly] = useState(true);
  const [existingRepos, setExistingRepos] = useState<string[]>([]);

  useSetPageReady(true);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    reposApi.getRepos().then(repos => {
      setExistingRepos(repos.filter(r => r.owner === ownerName).map(r => r.name.toLowerCase()));
    }).catch(() => {});
  }, [ownerName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const isNameTaken = existingRepos.includes(repoName.trim().toLowerCase());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onCreateFork({
      name: repoName,
      description,
      default_branch_only: defaultBranchOnly,
    });
  };

  return (
    <div className="flex-1 bg-[var(--surface-canvas)] font-sans text-[var(--text-primary)] min-h-screen">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 border-b border-[var(--border-default)] pb-6">
          <h1 className="text-2xl font-semibold">Create a new fork</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            A fork is a copy of a repository. Forking a repository allows you to freely experiment with changes without affecting the original project. <a href="#" className="text-[var(--text-link)] hover:underline">View existing forks.</a>
          </p>
        </div>

        <p className="mb-4 text-xs text-[var(--text-secondary)]">Required fields are marked with an asterisk (*).</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500 flex items-start gap-2">
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)_16px_minmax(0,2fr)] items-start gap-2">
            <div className="space-y-1">
              <label className="block text-sm font-semibold">Owner</label>
              <div className="flex h-8 items-center justify-between rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-3 text-sm shadow-sm cursor-default">
                <div className="flex items-center gap-2">
                  <Avatar username={ownerName} size={20} />
                  <span>{ownerName}</span>
                </div>
              </div>
            </div>

            <div className="flex h-8 items-center justify-center text-xl font-light text-[var(--text-muted)] mt-6">
              /
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold">
                Repository name <span className="text-red-500">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                required
                className={`h-8 w-full rounded-md border bg-[var(--surface-subtle)] px-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                  repoName.trim() === "" ? "border-[var(--border-default)] focus:border-[var(--text-link)] focus:ring-[var(--text-link)]" :
                  isNameTaken ? "border-red-500 focus:border-red-500 focus:ring-red-500" :
                  "border-green-500 focus:border-green-500 focus:ring-green-500"
                }`}
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
              />
              {repoName.trim() !== "" && (
                <div className={`mt-1 text-xs font-semibold flex items-center gap-1 ${isNameTaken ? "text-[#cf222e]" : "text-[#1a7f37]"}`}>
                  {isNameTaken ? (
                    <>
                      <AlertFillIcon size={14} /> The repository {repoName} already exists on this account
                    </>
                  ) : (
                    <>
                      <CheckCircleFillIcon size={14} /> {repoName} is available.
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            By default, forks are named the same as their upstream repository. You can customize the name to distinguish it further.
          </p>

          <div className="space-y-1">
            <label className="block text-sm font-semibold">Description <span className="text-xs font-normal text-[var(--text-secondary)]">(optional)</span></label>
            <input
              type="text"
              maxLength={350}
              className="h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-2 text-sm shadow-sm focus:border-[var(--text-link)] focus:outline-none focus:ring-1 focus:ring-[var(--text-link)]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{description.length} / 350 characters</p>
          </div>

          <div className="border-t border-[var(--border-default)] pt-6">
            <div className="space-y-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 accent-[var(--text-link)] cursor-pointer"
                  checked={defaultBranchOnly}
                  onChange={(e) => setDefaultBranchOnly(e.target.checked)}
                />
                <div>
                  <span className="block text-sm font-semibold">
                    Copy the <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs font-medium mx-1">master</span> branch only
                  </span>
                  <span className="block text-xs text-[var(--text-secondary)] mt-1">
                    Contribute back to {sourceRepo.owner}/{sourceRepo.name} by adding your own branch. <a href="#" className="text-[var(--text-link)] hover:underline">Learn more.</a>
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-[var(--border-default)] pt-6 pb-2">
            <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
              <InfoIcon size={16} /> You are creating a fork in your personal account.
            </p>
          </div>

          <div className="border-t border-[var(--border-default)] pt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="h-8 rounded-md bg-transparent px-4 text-sm font-medium text-[var(--text-link)] hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !repoName.trim()}
              className="h-8 rounded-md bg-[#238636] px-4 text-sm font-medium text-white hover:bg-[#2ea043] disabled:opacity-50 inline-flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Creating fork...
                </>
              ) : (
                <>
                  <RepoForkedIcon size={16} /> Create fork
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
