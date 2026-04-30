import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  FileCode2,
  GitCommitHorizontal,
  GitPullRequest,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import { pullsApi } from "../../../services/api/pull";
import { reposApi } from "../../../services/api/repos";
import type { Branch, CompareFileDiff, PullRequestCompareResult } from "../../../types";

interface PullRequestComparePageProps {
  repoId: string;
  repoName: string;
  repoOwner: string;
  branches: Branch[];
  defaultBaseBranch: string;
  defaultHeadBranch: string;
  compareRange: string;
  onSelectCompareRefs: (baseRef: string, headRef: string) => void;
}

function parseCompareRange(compareRange: string): { baseRef: string; headRef: string } | null {
  const normalized = compareRange.trim();
  if (!normalized) {
    return null;
  }

  const parts = normalized.split("...");
  if (parts.length !== 2) {
    return null;
  }

  const baseRef = (parts[0] || "").trim();
  const headRef = (parts[1] || "").trim();
  if (!baseRef || !headRef) {
    return null;
  }

  return { baseRef, headRef };
}

function toRelativeTime(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return "just now";
  }

  const elapsedMs = Date.now() - parsed.getTime();
  const minutes = Math.max(0, Math.floor(elapsedMs / 60000));
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPatchLineClass(line: string): string {
  if (line.startsWith("@@")) {
    return "text-[var(--text-link)] bg-[var(--surface-subtle)]";
  }

  if (line.startsWith("+") && !line.startsWith("+++")) {
    return "text-[var(--fgColor-open,#1a7f37)] bg-[var(--surface-success-subtle)]";
  }

  if (line.startsWith("-") && !line.startsWith("---")) {
    return "text-[var(--text-danger)] bg-[var(--surface-danger-subtle)]";
  }

  return "text-[var(--text-primary)]";
}

function mergeRefOptions(branches: Branch[], fallbackBase: string, fallbackHead: string): string[] {
  const optionSet = new Set<string>();

  for (const branch of branches) {
    const name = (branch.name || "").trim();
    if (name) {
      optionSet.add(name);
    }
  }

  if (fallbackBase.trim()) {
    optionSet.add(fallbackBase.trim());
  }

  if (fallbackHead.trim()) {
    optionSet.add(fallbackHead.trim());
  }

  return Array.from(optionSet.values());
}

export default function PullRequestComparePage({
  repoId,
  repoName,
  repoOwner,
  branches,
  defaultBaseBranch,
  defaultHeadBranch,
  compareRange,
  onSelectCompareRefs,
}: PullRequestComparePageProps) {
  const [baseRef, setBaseRef] = useState<string>("");
  const [headRef, setHeadRef] = useState<string>("");
  const [compareData, setCompareData] = useState<PullRequestCompareResult | null>(null);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(true);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [creatingPullRequest, setCreatingPullRequest] = useState<boolean>(false);
  const [pullTitle, setPullTitle] = useState<string>("");
  const [pullDescription, setPullDescription] = useState<string>("");
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const fallbackBase = useMemo(() => {
    const defaultBranch = branches.find((branch) => branch.is_default)?.name || "";
    return (defaultBaseBranch || defaultBranch || branches[0]?.name || "master").trim() || "master";
  }, [branches, defaultBaseBranch]);

  const fallbackHead = useMemo(() => {
    const preferred = (defaultHeadBranch || "").trim();
    if (preferred) {
      return preferred;
    }

    const firstDifferent = branches.find((branch) => branch.name !== fallbackBase)?.name || "";
    return (firstDifferent || fallbackBase).trim();
  }, [branches, defaultHeadBranch, fallbackBase]);

  const refOptions = useMemo(() => {
    return mergeRefOptions(branches, fallbackBase, fallbackHead);
  }, [branches, fallbackBase, fallbackHead]);

  useEffect(() => {
    const parsed = parseCompareRange(compareRange);

    if (parsed) {
      setBaseRef(parsed.baseRef);
      setHeadRef(parsed.headRef);
      return;
    }

    setBaseRef(fallbackBase);
    setHeadRef(fallbackHead || fallbackBase);
  }, [compareRange, fallbackBase, fallbackHead]);

  useEffect(() => {
    if (!headRef || !baseRef) {
      return;
    }

    setPullTitle(`Merge ${headRef} into ${baseRef}`);
  }, [baseRef, headRef]);

  const fetchCompare = useCallback(async () => {
    if (!baseRef || !headRef) {
      return;
    }

    try {
      setLoadingCompare(true);
      setCompareError(null);
      const data = await reposApi.getCompare(repoId, baseRef, headRef);
      setCompareData(data);
    } catch (err: unknown) {
      setCompareData(null);
      setCompareError(err instanceof Error ? err.message : "Failed to compare refs");
    } finally {
      setLoadingCompare(false);
    }
  }, [baseRef, headRef, repoId]);

  useEffect(() => {
    void fetchCompare();
  }, [fetchCompare]);

  useEffect(() => {
    const files = compareData?.files || [];
    if (files.length === 0) {
      setExpandedFiles(new Set());
      return;
    }

    setExpandedFiles(new Set(files.slice(0, 2).map((file) => file.path)));
  }, [compareData]);

  const hasChanges = !!compareData?.can_compare;

  const relatedPullRequests = compareData?.related_pull_requests || [];

  const handleBaseRefChange = (value: string) => {
    const nextBase = value.trim();
    const nextHead = (headRef || fallbackHead || nextBase).trim();

    setBaseRef(nextBase);
    setHeadRef(nextHead);
    setCreateMessage(null);
    onSelectCompareRefs(nextBase, nextHead);
  };

  const handleHeadRefChange = (value: string) => {
    const nextHead = value.trim();
    const nextBase = (baseRef || fallbackBase || nextHead).trim();

    setHeadRef(nextHead);
    setBaseRef(nextBase);
    setCreateMessage(null);
    onSelectCompareRefs(nextBase, nextHead);
  };

  const toggleFileExpansion = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const handleCreatePullRequest = async () => {
    if (!baseRef || !headRef || !pullTitle.trim()) {
      setCreateError("Title, base, and head refs are required.");
      return;
    }

    if (baseRef === headRef) {
      setCreateError("Choose different refs for base and compare.");
      return;
    }

    try {
      setCreateError(null);
      setCreateMessage(null);
      setCreatingPullRequest(true);

      await pullsApi.create(repoId, {
        title: pullTitle.trim(),
        description: pullDescription.trim() || undefined,
        source_branch: headRef,
        target_branch: baseRef,
      });

      setCreateMessage("Pull request created successfully.");
      setPullDescription("");
      await fetchCompare();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create pull request");
    } finally {
      setCreatingPullRequest(false);
    }
  };

  const renderPatch = (file: CompareFileDiff) => {
    const patch = (file.patch || "").trim();
    if (!patch) {
      return (
        <div className="p-4 text-sm text-[var(--text-secondary)] bg-[var(--surface-subtle)]">
          Patch preview is unavailable for this file.
        </div>
      );
    }

    return (
      <pre className="overflow-auto text-xs leading-5 font-mono border-t border-[var(--border-muted)]">
        {patch.split("\n").map((line, index) => (
          <div key={`${file.path}-${index}`} className={`px-4 py-0.5 ${getPatchLineClass(line)}`}>
            {line || " "}
          </div>
        ))}
      </pre>
    );
  };

  return (
    <div className="space-y-4">
      <section className="bg-[var(--surface-canvas)] p-4 md:p-5 space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-[30px] leading-tight font-semibold text-[var(--text-primary)]">
            {hasChanges ? "Comparing changes" : "Compare changes"}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Compare two refs to review commits and changed files before opening a pull request.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">base:</span>
            <div className="relative min-w-[170px]">
              <select
                value={baseRef}
                onChange={(event) => handleBaseRefChange(event.target.value)}
                className="h-9 w-full appearance-none rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 pr-8 text-sm text-[var(--text-primary)]"
              >
                {refOptions.map((option) => (
                  <option key={`base-${option}`} value={option}>
                    {repoOwner}/{repoName}:{option}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            </div>
            <div data-view-component="true" className="flex flex-col items-center leading-tight">
              <svg aria-label="Three-dot diff: changes since branches diverged" role="img" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" className="fill-current">
                <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z"></path>
              </svg>
              <span className="-mt-2">
                ...
              </span>
            </div>
            <span className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">compare:</span>
            <div className="relative min-w-[170px]">
              <select
                value={headRef}
                onChange={(event) => handleHeadRefChange(event.target.value)}
                className="h-9 w-full appearance-none rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 pr-8 text-sm text-[var(--text-primary)]"
              >
                {refOptions.map((option) => (
                  <option key={`head-${option}`} value={option}>
                    {repoOwner}/{repoName}:{option}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            </div>
          </div>
        </div>
      </section>

      {loadingCompare ? (
        <div className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] px-4 py-10 text-sm text-[var(--text-secondary)] inline-flex items-center gap-2 w-full justify-center">
          <Loader2 size={16} className="animate-spin" />
          Loading compare details...
        </div>
      ) : null}

      {!loadingCompare && compareError ? (
        <div className="border border-[var(--border-danger-soft)] rounded-md bg-[var(--surface-danger-subtle)] px-4 py-3 text-sm text-[var(--text-danger)]">
          {compareError}
        </div>
      ) : null}

      {!loadingCompare && !compareError && compareData ? (
        <>
          <section
            className={`rounded-md border px-4 py-3 text-sm flex items-center justify-between gap-3 ${
              hasChanges && compareData.mergeable
                ? "border-[var(--border-success-muted)] bg-[var(--surface-success-subtle)] text-[var(--fgColor-open,#1a7f37)]"
                : hasChanges
                  ? "border-[var(--border-warning-muted)] bg-[var(--surface-warning-subtle)] text-[var(--text-warning)]"
                  : "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {hasChanges && compareData.mergeable ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
              {compareData.merge_message || "Comparison result is ready."}
            </span>
            <button
              type="button"
              disabled={!hasChanges || creatingPullRequest}
              onClick={handleCreatePullRequest}
              className="h-8 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-xs font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-45 disabled:cursor-not-allowed"
            >
              Create pull request
            </button>
          </section>

          {hasChanges ? (
            <>
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Commits</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {compareData.summary.commit_count}
                  </p>
                </div>
                <div className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Files changed</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {compareData.summary.files_changed}
                  </p>
                </div>
                <div className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Additions</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--fgColor-open,#1a7f37)]">
                    +{compareData.summary.additions}
                  </p>
                </div>
                <div className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Deletions</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--text-danger)]">
                    -{compareData.summary.deletions}
                  </p>
                </div>
              </section>

              <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
                    <GitPullRequest size={18} />
                    Open a pull request
                  </h2>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {compareData.summary.contributor_count} contributor{compareData.summary.contributor_count === 1 ? "" : "s"}
                  </span>
                </div>

                <input
                  value={pullTitle}
                  onChange={(event) => setPullTitle(event.target.value)}
                  className="w-full h-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
                  placeholder="Pull request title"
                />

                <textarea
                  value={pullDescription}
                  onChange={(event) => setPullDescription(event.target.value)}
                  className="w-full min-h-24 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  placeholder="Describe your changes"
                />

                {createError ? (
                  <div className="text-sm text-[var(--text-danger)] border border-[var(--border-danger-soft)] bg-[var(--surface-danger-subtle)] rounded-md px-3 py-2">
                    {createError}
                  </div>
                ) : null}

                {createMessage ? (
                  <div className="text-sm text-[var(--fgColor-open,#1a7f37)] border border-[var(--border-success-muted)] bg-[var(--surface-success-subtle)] rounded-md px-3 py-2">
                    {createMessage}
                  </div>
                ) : null}

                {relatedPullRequests.length > 0 ? (
                  <div className="rounded-md border border-[var(--border-muted)] bg-[var(--surface-subtle)]">
                    <div className="px-3 py-2 text-xs uppercase tracking-wide text-[var(--text-secondary)] border-b border-[var(--border-muted)]">
                      Existing pull requests for this branch pair
                    </div>
                    <div className="divide-y divide-[var(--border-muted)]">
                      {relatedPullRequests.map((pull) => (
                        <div key={pull.id} className="px-3 py-2 text-sm flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--text-primary)] truncate">{pull.title}</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                              {pull.source_branch} into {pull.target_branch}
                            </p>
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)]">
                            {pull.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] overflow-hidden">
                <header className="px-4 py-3 border-b border-[var(--border-muted)] flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
                    <GitCommitHorizontal size={16} />
                    {compareData.commits.length} commit{compareData.commits.length === 1 ? "" : "s"}
                  </h2>
                </header>
                <div className="divide-y divide-[var(--border-muted)]">
                  {compareData.commits.map((commit) => (
                    <div key={commit.hash} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{commit.message || "Untitled commit"}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {commit.author || "Unknown"} committed {toRelativeTime(commit.date)}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-[var(--text-secondary)] border border-[var(--border-default)] rounded px-2 py-1">
                        {commit.hash.slice(0, 7)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] overflow-hidden">
                <header className="px-4 py-3 border-b border-[var(--border-muted)] flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
                    <FileCode2 size={16} />
                    Files changed
                  </h2>
                  <span className="text-xs text-[var(--text-secondary)]">
                    +{compareData.summary.additions} / -{compareData.summary.deletions}
                  </span>
                </header>

                <div className="divide-y divide-[var(--border-muted)]">
                  {compareData.files.map((file) => {
                    const isExpanded = expandedFiles.has(file.path);

                    return (
                      <article key={file.path} className="bg-[var(--surface-canvas)]">
                        <button
                          type="button"
                          onClick={() => toggleFileExpansion(file.path)}
                          className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--surface-subtle)]"
                        >
                          <div className="min-w-0 flex items-center gap-2 text-left">
                            {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            <span className="text-sm font-medium text-[var(--text-primary)] truncate">{file.path}</span>
                            {file.previous_path ? (
                              <span className="text-xs text-[var(--text-secondary)] truncate">(from {file.previous_path})</span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)]">
                              {file.status}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[var(--fgColor-open,#1a7f37)]">
                              <Plus size={12} />
                              {file.additions}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[var(--text-danger)]">
                              <Minus size={12} />
                              {file.deletions}
                            </span>
                          </div>
                        </button>

                        {isExpanded ? renderPatch(file) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-6 text-center space-y-3">
              <CircleAlert size={24} className="mx-auto text-[var(--text-secondary)]" />
              <p className="text-2xl font-semibold text-[var(--text-primary)]">There isn&apos;t anything to compare</p>
              <p className="text-sm text-[var(--text-secondary)] max-w-[640px] mx-auto">
                {compareData.merge_message || "Choose different branches or refs to inspect incoming changes."}
              </p>
              <div className="text-left max-w-[640px] mx-auto border border-[var(--border-muted)] rounded-md bg-[var(--surface-subtle)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)] mb-1">Try these examples</p>
                <ul className="text-sm text-[var(--text-primary)] space-y-1">
                  {refOptions.slice(0, 4).map((option) => (
                    <li key={`example-${option}`}>{fallbackBase}...{option}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
