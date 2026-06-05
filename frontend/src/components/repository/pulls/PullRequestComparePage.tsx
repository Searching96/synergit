import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  AtSign,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Code,
  Copy,
  FileDiff,
  GitCompare,
  GitCommitHorizontal,
  Heading,
  Italic,
  Link,
  List,
  ListOrdered,
  Loader2,
  Minus,
  MoreHorizontal,
  Paperclip,
  Plus,
  Settings,
  Users,
  X,
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
  onOpenPullRequest: (pullNumber: number) => void;
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

function formatShortDate(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return "an unknown date";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function stripMergeStatusPrefix(message: string, mergeable: boolean): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return "";
  }

  const statusPrefixes = mergeable
    ? [/^able to merge\.?\s*/i]
    : [/^unable to merge\.?\s*/i, /^not mergeable\.?\s*/i, /^review required\.?\s*/i];

  return statusPrefixes.reduce((current, prefix) => current.replace(prefix, ""), trimmed).trim();
}

function getMergeStatusCopy(message: string | undefined, mergeable: boolean): { label: string; description: string } {
  const fallbackDescription = mergeable
    ? "These branches can be automatically merged."
    : "Review this comparison before creating a pull request.";
  const rawMessage = message || "";
  const description = stripMergeStatusPrefix(rawMessage, mergeable) || fallbackDescription;

  if (mergeable) {
    return { label: "Able to merge.", description };
  }

  const normalizedMessage = rawMessage.trim().toLowerCase();
  const label = normalizedMessage.startsWith("unable to merge") || normalizedMessage.startsWith("not mergeable")
    ? "Unable to merge."
    : "Review required.";

  return { label, description };
}

type DiffRowKind = "hunk" | "addition" | "deletion" | "context";

type ParsedDiffRow = {
  kind: DiffRowKind;
  oldDisplay: string;
  newDisplay: string;
  text: string;
};

type SplitDiffRow =
  | { kind: "hunk"; text: string }
  | { kind: "pair"; oldRow?: ParsedDiffRow; newRow?: ParsedDiffRow };

function parsePatchRows(patch: string): ParsedDiffRow[] {
  let oldLineNumber = 0;
  let newLineNumber = 0;

  return patch.split("\n").map((line) => {
    const isHunk = line.startsWith("@@");
    const isAddition = line.startsWith("+") && !line.startsWith("+++");
    const isDeletion = line.startsWith("-") && !line.startsWith("---");
    const isContext = !isHunk && !isAddition && !isDeletion;
    const hunkMatch = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);

    if (hunkMatch) {
      oldLineNumber = Number(hunkMatch[1]);
      newLineNumber = Number(hunkMatch[2]);
    }

    const oldDisplay = isHunk
      ? "..."
      : isAddition
        ? ""
        : String(oldLineNumber);
    const newDisplay = isHunk
      ? "..."
      : isDeletion
        ? ""
        : String(newLineNumber);
    const kind: DiffRowKind = isHunk ? "hunk" : isAddition ? "addition" : isDeletion ? "deletion" : "context";
    const marker = isAddition ? "+" : isDeletion ? "-" : " ";
    const text = isHunk ? line : `${marker} ${line.slice(1) || " "}`;

    if (!isHunk) {
      if (isAddition) {
        newLineNumber += 1;
      } else if (isDeletion) {
        oldLineNumber += 1;
      } else if (isContext) {
        oldLineNumber += 1;
        newLineNumber += 1;
      }
    }

    return { kind, oldDisplay, newDisplay, text };
  });
}

function toSplitDiffRows(rows: ParsedDiffRow[]): SplitDiffRow[] {
  const splitRows: SplitDiffRow[] = [];
  let index = 0;

  while (index < rows.length) {
    const row = rows[index];

    if (row.kind === "hunk") {
      splitRows.push({ kind: "hunk", text: row.text });
      index += 1;
      continue;
    }

    if (row.kind === "context") {
      splitRows.push({ kind: "pair", oldRow: row, newRow: row });
      index += 1;
      continue;
    }

    if (row.kind === "deletion") {
      const deletions: ParsedDiffRow[] = [];
      const additions: ParsedDiffRow[] = [];

      while (rows[index]?.kind === "deletion") {
        deletions.push(rows[index]);
        index += 1;
      }

      while (rows[index]?.kind === "addition") {
        additions.push(rows[index]);
        index += 1;
      }

      const pairCount = Math.max(deletions.length, additions.length);
      for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
        splitRows.push({ kind: "pair", oldRow: deletions[pairIndex], newRow: additions[pairIndex] });
      }
      continue;
    }

    splitRows.push({ kind: "pair", newRow: row });
    index += 1;
  }

  return splitRows;
}

function GitBranchOcticon({ className = "" }: { className?: string }) {
  return (
    <svg
      data-component="Octicon"
      aria-hidden="true"
      focusable="false"
      className={`octicon octicon-git-branch fill-current ${className}`}
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="currentColor"
      display="inline-block"
      overflow="visible"
      style={{ verticalAlign: "text-bottom" }}
    >
      <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75.75 0 0 0 0-1.5Z" />
    </svg>
  );
}

function GitPullRequestOcticon({ className = "", size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      data-component="Octicon"
      height={size}
      viewBox="0 0 16 16"
      version="1.1"
      width={size}
      data-view-component="true"
      className={`octicon octicon-git-pull-request fill-current ${className}`}
    >
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
    </svg>
  );
}

function HistoryOcticon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      data-component="Octicon"
      height="16"
      viewBox="0 0 16 16"
      version="1.1"
      width="16"
      data-view-component="true"
      className={`octicon octicon-history flex-shrink-0 color-fg-muted fill-current ${className}`}
    >
      <path d="m.427 1.927 1.215 1.215a8.002 8.002 0 1 1-1.6 5.685.75.75 0 1 1 1.493-.154 6.5 6.5 0 1 0 1.18-4.458l1.358 1.358A.25.25 0 0 1 3.896 6H.25A.25.25 0 0 1 0 5.75V2.104a.25.25 0 0 1 .427-.177ZM7.75 4a.75.75 0 0 1 .75.75v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5A.75.75 0 0 1 7.75 4Z" />
    </svg>
  );
}

function BranchRefDropdown({
  kind,
  selectedRef,
  branches,
  fallbackDefault,
  onSelect,
}: {
  kind: "base" | "compare";
  selectedRef: string;
  branches: Branch[];
  fallbackDefault: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [tab, setTab] = useState<"branches" | "tags">("branches");

  const branchNames = useMemo(() => {
    const names = new Set<string>();
    branches.forEach((branch) => {
      const name = (branch.name || "").trim();
      if (name) {
        names.add(name);
      }
    });
    if (fallbackDefault.trim()) {
      names.add(fallbackDefault.trim());
    }
    return Array.from(names);
  }, [branches, fallbackDefault]);

  const filteredBranches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return branchNames;
    }
    return branchNames.filter((name) => name.toLowerCase().includes(normalizedQuery));
  }, [branchNames, query]);

  const defaultBranch = branches.find((branch) => branch.is_default)?.name || fallbackDefault;
  const title = kind === "base" ? "Choose a base ref" : "Choose a head ref";
  const selectedDisplay = selectedRef || fallbackDefault;

  return (
    <div className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setQuery("");
          setTab("branches");
        }}
        className="h-8 w-full sm:w-auto rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-xs font-semibold text-[var(--text-primary)] inline-flex items-center justify-between gap-2 hover:bg-[var(--surface-subtle)]"
      >
        <span className="truncate">{kind}: {selectedDisplay}</span>
        <ChevronDown size={14} className="text-[var(--text-secondary)]" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full mt-1 z-40 w-[300px] max-w-[calc(100vw-2rem)] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg text-sm">
            <div className="h-10 px-3 border-b border-[var(--border-muted)] flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--text-secondary)]">{title}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-center"
                aria-label="Close branch picker"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-2 border-b border-[var(--border-muted)]">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a branch"
                className="h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--focus-border,#0969da)] focus:ring-2 focus:ring-[var(--focus-shadow,rgba(9,105,218,0.3))]"
              />
            </div>

            <div className="flex border-b border-[var(--border-muted)]">
              <button
                type="button"
                onClick={() => setTab("branches")}
                className={`h-11 px-4 text-sm border-r border-[var(--border-muted)] ${
                  tab === "branches"
                    ? "bg-[var(--surface-canvas)] font-semibold text-[var(--text-primary)] border-b-2 border-b-[var(--surface-canvas)]"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Branches
              </button>
              <button
                type="button"
                onClick={() => setTab("tags")}
                className={`h-11 px-4 text-sm ${
                  tab === "tags"
                    ? "bg-[var(--surface-canvas)] font-semibold text-[var(--text-primary)]"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Tags
              </button>
            </div>

            {tab === "branches" ? (
              <ul className="max-h-72 overflow-auto py-1">
                {filteredBranches.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-[var(--text-secondary)]">No branches found</li>
                ) : (
                  filteredBranches.map((branchName) => (
                    <li key={`${kind}-${branchName}`}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(branchName);
                          setOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-[var(--surface-subtle)] inline-flex items-center gap-2"
                      >
                        <span className="w-4 shrink-0 text-[var(--text-primary)]">
                          {branchName === selectedDisplay ? <Check size={16} /> : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-primary)]">{branchName}</span>
                        {branchName === defaultBranch ? (
                          <span className="shrink-0 rounded-full border border-[var(--border-default)] bg-[var(--surface-subtle)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                            default
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <div className="px-4 py-3 text-sm text-[var(--text-secondary)]">No tags found</div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function PullRequestComparePage({
  repoId,
  repoOwner,
  branches,
  defaultBaseBranch,
  defaultHeadBranch,
  compareRange,
  onSelectCompareRefs,
  onOpenPullRequest,
}: PullRequestComparePageProps) {
  const [baseRef, setBaseRef] = useState<string>("");
  const [headRef, setHeadRef] = useState<string>("");
  const [compareData, setCompareData] = useState<PullRequestCompareResult | null>(null);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [creatingPullRequest, setCreatingPullRequest] = useState<boolean>(false);
  const [openingPullRequest, setOpeningPullRequest] = useState<boolean>(false);
  const [pullTitle, setPullTitle] = useState<string>("");
  const [pullDescription, setPullDescription] = useState<string>("");
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [diffView, setDiffView] = useState<"split" | "unified">("unified");

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

  const parsedCompareRange = useMemo(() => parseCompareRange(compareRange), [compareRange]);
  const hasExplicitCompareRange = parsedCompareRange !== null;

  useEffect(() => {
    if (parsedCompareRange) {
      setBaseRef(parsedCompareRange.baseRef);
      setHeadRef(parsedCompareRange.headRef);
      return;
    }

    setBaseRef(fallbackBase);
    setHeadRef(fallbackBase);
    setCompareData(null);
    setCompareError(null);
    setLoadingCompare(false);
  }, [fallbackBase, parsedCompareRange]);

  useEffect(() => {
    if (!headRef || !baseRef) {
      return;
    }

    setPullTitle(`Merge ${headRef} into ${baseRef}`);
  }, [baseRef, headRef]);

  const fetchCompare = useCallback(async () => {
    if (!hasExplicitCompareRange) {
      setCompareData(null);
      setCompareError(null);
      setLoadingCompare(false);
      return;
    }

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
  }, [baseRef, hasExplicitCompareRange, headRef, repoId]);

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

  useEffect(() => {
    const firstCommitMessage = (compareData?.commits[0]?.message || "").trim();
    if (firstCommitMessage) {
      setPullTitle(firstCommitMessage);
    }
  }, [compareData]);

  const hasChanges = !!compareData?.can_compare;

  const relatedPullRequests = compareData?.related_pull_requests || [];
  const existingPullRequest = relatedPullRequests[0] || null;

  const commitGroups = useMemo(() => {
    const groups = new Map<string, PullRequestCompareResult["commits"]>();
    (compareData?.commits || []).forEach((commit) => {
      const dateLabel = formatShortDate(commit.date);
      groups.set(dateLabel, [...(groups.get(dateLabel) || []), commit]);
    });

    return Array.from(groups.entries()).map(([dateLabel, commits]) => ({ dateLabel, commits }));
  }, [compareData]);

  const handleBaseRefChange = (value: string) => {
    const nextBase = value.trim();
    const nextHead = (headRef || fallbackHead || nextBase).trim();

    setBaseRef(nextBase);
    setHeadRef(nextHead);
    setCreateMessage(null);
    if (nextBase && nextHead && nextBase !== nextHead) {
      onSelectCompareRefs(nextBase, nextHead);
    }
  };

  const handleHeadRefChange = (value: string) => {
    const nextHead = value.trim();
    const nextBase = (baseRef || fallbackBase || nextHead).trim();

    setHeadRef(nextHead);
    setBaseRef(nextBase);
    setCreateMessage(null);
    if (nextBase && nextHead && nextBase !== nextHead) {
      onSelectCompareRefs(nextBase, nextHead);
    }
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

  const handleOpenExistingPullRequest = async () => {
    if (!existingPullRequest) {
      return;
    }

    try {
      setCreateError(null);
      setOpeningPullRequest(true);
      const pulls = await pullsApi.list(repoId);
      const sorted = [...pulls].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      const existingIndex = sorted.findIndex((pull) => pull.id === existingPullRequest.id);

      if (existingIndex >= 0) {
        onOpenPullRequest(existingIndex + 1);
        return;
      }

      setCreateError("Could not find this pull request in the repository list.");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to open pull request");
    } finally {
      setOpeningPullRequest(false);
    }
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

      const createdPullRequest = await pullsApi.create(repoId, {
        title: pullTitle.trim(),
        description: pullDescription.trim() || undefined,
        source_branch: headRef,
        target_branch: baseRef,
      });

      setCreateMessage("Pull request created successfully.");
      setPullDescription("");
      const pulls = await pullsApi.list(repoId).catch(() => []);
      const sorted = [...pulls].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      const createdIndex = sorted.findIndex((pull) => pull.id === createdPullRequest.id);
      if (createdIndex >= 0) {
        onOpenPullRequest(createdIndex + 1);
        return;
      }
      await fetchCompare();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create pull request");
    } finally {
      setCreatingPullRequest(false);
    }
  };

  const exampleBranch = refOptions.find((option) => option !== fallbackBase) || "";
  const displayBaseRef = baseRef || fallbackBase;
  const displayHeadRef = headRef || fallbackBase;
  const showInlineCreateForm = !!compareData && !existingPullRequest && (
    compareData.summary.deletions > 0 ||
    compareData.summary.files_changed > 1 ||
    compareData.summary.commit_count > 1
  );
  const mergeStatusCopy = compareData ? getMergeStatusCopy(compareData.merge_message, compareData.mergeable) : null;

  const renderDefaultComparePage = () => (
    <div className="max-w-[1216px] mx-auto px-4 py-8 md:py-9 space-y-4">
      <section className="space-y-1">
        <h1 className="text-2xl leading-tight font-semibold text-[var(--text-primary)]">Compare changes</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Compare changes across branches, commits, tags, and more below. If you need to, you can also{" "}
          <span className="text-[var(--text-link)]">compare across forks</span>.
        </p>
      </section>

      <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 py-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <GitCompare size={18} className="hidden sm:block text-[var(--text-secondary)]" />
          <BranchRefDropdown
            kind="base"
            selectedRef={displayBaseRef}
            branches={branches}
            fallbackDefault={fallbackBase}
            onSelect={handleBaseRefChange}
          />

          <div className="hidden sm:flex flex-col items-center text-[var(--text-secondary)] leading-none">
            <ArrowLeft size={15} />
            <span className="-mt-1 text-xs">...</span>
          </div>

          <BranchRefDropdown
            kind="compare"
            selectedRef={displayHeadRef}
            branches={branches}
            fallbackDefault={fallbackBase}
            onSelect={handleHeadRefChange}
          />
        </div>
      </section>

      <section className="rounded-md border border-[var(--border-warning-muted,#d4a72c)] bg-[var(--surface-warning-subtle,#fff8c5)] px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-primary)]">
          Choose different branches or forks above to discuss and review changes.{" "}
          <span className="text-[var(--text-link)]">Learn about pull requests</span>
        </p>
        <button
          type="button"
          disabled
          className="h-8 px-4 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-xs font-semibold opacity-45 cursor-not-allowed"
        >
          Create pull request
        </button>
      </section>

      <section className="pt-6 text-center space-y-3">
        <GitPullRequestOcticon size={30} className="mx-auto text-[var(--text-secondary)]" />
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Compare and review just about anything</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Branches, tags, commit ranges, and time ranges. In the same repository and across forks.
          </p>
        </div>

        <div className="max-w-[544px] mx-auto rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] overflow-hidden text-left">
          <div className="px-4 py-2 text-sm text-[var(--text-primary)] bg-[var(--surface-subtle)] border-b border-[var(--border-muted)]">
            Example comparisons
          </div>
          <div className="divide-y divide-[var(--border-muted)]">
            <button
              type="button"
              disabled={!exampleBranch}
              onClick={() => {
                if (exampleBranch) {
                  onSelectCompareRefs(fallbackBase, exampleBranch);
                }
              }}
              className="w-full px-4 py-2 text-sm flex items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
              <span className="min-w-0 inline-flex items-center gap-2 text-[var(--text-link)]">
                <GitBranchOcticon className="text-[var(--text-secondary)]" />
                <span className="truncate">{exampleBranch || `${repoOwner}-patch-1`}</span>
              </span>
              <span className="shrink-0 italic text-[var(--text-primary)]">on Apr 12</span>
            </button>
            <div className="px-4 py-2 text-sm flex items-center justify-between gap-3">
              <span className="min-w-0 inline-flex items-center gap-2 text-[var(--text-link)]">
                <HistoryOcticon className="text-[var(--text-secondary)]" />
                <span className="truncate">{fallbackBase}@{"{1day}"}...{fallbackBase}</span>
              </span>
              <span className="shrink-0 italic text-[var(--text-primary)]">24 hours ago</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderPatch = (file: CompareFileDiff) => {
    const patch = (file.patch || "").trim();
    if (!patch) {
      return (
        <div className="p-4 text-sm text-[var(--text-secondary)] bg-[var(--surface-subtle)]">
          Patch preview is unavailable for this file.
        </div>
      );
    }

    const rows = parsePatchRows(patch);

    const renderUnifiedPatch = () => (
      <div className="overflow-auto border-t border-[var(--border-muted)] text-xs font-mono">
        {rows.map((row, index) => {
          const rowClass = row.kind === "hunk"
            ? "bg-[#ddf4ff] text-[var(--text-link)]"
            : row.kind === "addition"
              ? "bg-[#dafbe1] text-[var(--text-primary)]"
              : row.kind === "deletion"
                ? "bg-[#ffebe9] text-[var(--text-primary)]"
                : "bg-[var(--surface-canvas)] text-[var(--text-primary)]";
          const gutterClass = row.kind === "addition"
            ? "bg-[#aceebb]"
            : row.kind === "deletion"
              ? "bg-[#ffd7d5]"
              : row.kind === "hunk"
                ? "bg-[#b6e3ff]"
                : "bg-[var(--surface-canvas)]";

          return (
            <div key={`${file.path}-unified-${index}`} className={`grid grid-cols-[48px_48px_minmax(0,1fr)] leading-5 ${rowClass}`}>
              <span className={`px-2 text-right select-none text-[var(--text-secondary)] border-r border-[rgba(27,31,36,0.08)] ${gutterClass}`}>
                {row.oldDisplay}
              </span>
              <span className={`px-2 text-right select-none text-[var(--text-secondary)] border-r border-[rgba(27,31,36,0.08)] ${gutterClass}`}>
                {row.newDisplay}
              </span>
              <span className="px-2 whitespace-pre">{row.text}</span>
            </div>
          );
        })}
      </div>
    );

    const sideCellClass = (row: ParsedDiffRow | undefined, side: "old" | "new") => {
      if (!row) {
        return "bg-[var(--surface-canvas)]";
      }
      if (row.kind === "deletion") {
        return side === "old" ? "bg-[#ffebe9] text-[var(--text-primary)]" : "bg-[var(--surface-canvas)]";
      }
      if (row.kind === "addition") {
        return side === "new" ? "bg-[#dafbe1] text-[var(--text-primary)]" : "bg-[var(--surface-canvas)]";
      }
      return "bg-[var(--surface-canvas)] text-[var(--text-primary)]";
    };

    const sideGutterClass = (row: ParsedDiffRow | undefined, side: "old" | "new") => {
      if (!row) {
        return "bg-[var(--surface-canvas)]";
      }
      if (row.kind === "deletion") {
        return side === "old" ? "bg-[#ffd7d5]" : "bg-[var(--surface-canvas)]";
      }
      if (row.kind === "addition") {
        return side === "new" ? "bg-[#aceebb]" : "bg-[var(--surface-canvas)]";
      }
      return "bg-[var(--surface-canvas)]";
    };

    const renderSplitPatch = () => (
      <div className="overflow-auto border-t border-[var(--border-muted)] text-xs font-mono">
        {toSplitDiffRows(rows).map((row, index) => {
          if (row.kind === "hunk") {
            return (
              <div key={`${file.path}-split-hunk-${index}`} className="grid grid-cols-[48px_minmax(0,1fr)_48px_minmax(0,1fr)] leading-5 bg-[#ddf4ff] text-[var(--text-link)]">
                <span className="px-2 text-right select-none text-[var(--text-secondary)] border-r border-[rgba(27,31,36,0.08)] bg-[#b6e3ff]">...</span>
                <span className="px-2 whitespace-pre border-r border-[rgba(27,31,36,0.08)]">{row.text}</span>
                <span className="px-2 text-right select-none text-[var(--text-secondary)] border-r border-[rgba(27,31,36,0.08)] bg-[#b6e3ff]">...</span>
                <span className="px-2 whitespace-pre">{row.text}</span>
              </div>
            );
          }

          const oldRow = row.oldRow;
          const newRow = row.newRow;
          const oldText = oldRow ? oldRow.text : "";
          const newText = newRow ? newRow.text : "";

          return (
            <div key={`${file.path}-split-${index}`} className="grid grid-cols-[48px_minmax(0,1fr)_48px_minmax(0,1fr)] leading-5">
              <span className={`px-2 text-right select-none text-[var(--text-secondary)] border-r border-[rgba(27,31,36,0.08)] ${sideGutterClass(oldRow, "old")}`}>
                {oldRow?.oldDisplay || ""}
              </span>
              <span className={`px-2 whitespace-pre border-r border-[rgba(27,31,36,0.08)] ${sideCellClass(oldRow, "old")}`}>
                {oldText}
              </span>
              <span className={`px-2 text-right select-none text-[var(--text-secondary)] border-r border-[rgba(27,31,36,0.08)] ${sideGutterClass(newRow, "new")}`}>
                {newRow?.newDisplay || ""}
              </span>
              <span className={`px-2 whitespace-pre ${sideCellClass(newRow, "new")}`}>
                {newText}
              </span>
            </div>
          );
        })}
      </div>
    );

    return diffView === "split" ? renderSplitPatch() : renderUnifiedPatch();
  };

  if (!hasExplicitCompareRange) {
    return renderDefaultComparePage();
  }

  return (
    <div className="max-w-[1216px] mx-auto px-4 py-8 md:py-9 space-y-4">
      <section className="space-y-1">
        <div className="space-y-1">
          <h1 className="text-2xl leading-tight font-semibold text-[var(--text-primary)]">
            {hasChanges ? "Comparing changes" : "Compare changes"}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Choose two branches to see what&apos;s changed or to start a new pull request. If you need to, you can also{" "}
            <span className="text-[var(--text-link)]">compare across forks</span> or{" "}
            <span className="text-[var(--text-link)]">learn more about diff comparisons</span>.
          </p>
        </div>
      </section>

      <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 py-2.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex flex-col gap-2 sm:flex-row sm:items-center">
            <GitCompare size={18} className="hidden sm:block text-[var(--text-secondary)]" />
            <BranchRefDropdown
              kind="base"
              selectedRef={baseRef}
              branches={branches}
              fallbackDefault={fallbackBase}
              onSelect={handleBaseRefChange}
            />
            <div data-view-component="true" className="flex flex-col items-center leading-tight">
              <svg aria-label="Three-dot diff: changes since branches diverged" role="img" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" className="fill-current">
                <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z"></path>
              </svg>
              <span className="-mt-2">
                ...
              </span>
            </div>
            <BranchRefDropdown
              kind="compare"
              selectedRef={headRef}
              branches={branches}
              fallbackDefault={fallbackBase}
              onSelect={handleHeadRefChange}
            />
          </div>
          {!loadingCompare && compareData ? (
            <div className={`text-sm inline-flex items-center gap-2 ${compareData.mergeable ? "text-[var(--fgColor-open,#1a7f37)]" : "text-[var(--text-warning)]"}`}>
              {compareData.mergeable ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
              <span>
                <span className="font-semibold">{mergeStatusCopy?.label}</span>{" "}
                {mergeStatusCopy?.description}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {!loadingCompare && compareError ? (
        <div className="border border-[var(--border-danger-soft)] rounded-md bg-[var(--surface-danger-subtle)] px-4 py-3 text-sm text-[var(--text-danger)]">
          {compareError}
        </div>
      ) : null}

      {!loadingCompare && !compareError && compareData ? (
        <>
          {hasChanges && existingPullRequest ? (
            <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex items-start gap-2">
                <GitPullRequestOcticon size={17} className="mt-0.5 shrink-0 text-[var(--fgColor-open,#1a7f37)]" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {existingPullRequest.title} <span className="font-normal text-[var(--text-secondary)]">#{existingPullRequest.id.slice(0, 4)}</span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {existingPullRequest.description?.trim() || "No description available"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={openingPullRequest}
                onClick={handleOpenExistingPullRequest}
                className="h-9 px-4 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[var(--accent-primary-hover)] disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {openingPullRequest ? <Loader2 size={15} className="animate-spin" /> : <GitPullRequestOcticon size={15} />}
                {openingPullRequest ? "Opening..." : "View pull request"}
              </button>
            </section>
          ) : null}

          {hasChanges && showInlineCreateForm ? (
            <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6">
              <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--surface-badge)] text-sm font-semibold text-[var(--text-primary)] inline-flex items-center justify-center uppercase">
                  {repoOwner.charAt(0)}
                </div>
                <div className="min-w-0 space-y-3">
                  <label className="block text-base font-semibold text-[var(--text-primary)]">
                    Add a title *
                    <input
                      value={pullTitle}
                      onChange={(event) => setPullTitle(event.target.value)}
                      className="mt-1 h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm font-normal text-[var(--text-primary)]"
                      placeholder="Pull request title"
                    />
                  </label>

                  <div className="space-y-2">
                    <p className="text-base font-semibold text-[var(--text-primary)]">Add a description</p>
                    <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] overflow-hidden">
                      <div className="flex items-center justify-between border-b border-[var(--border-muted)] bg-[var(--surface-subtle)]">
                        <div className="inline-flex">
                          <button type="button" className="h-10 px-4 bg-[var(--surface-canvas)] border-r border-[var(--border-muted)] text-sm text-[var(--text-primary)]">
                            Write
                          </button>
                          <button type="button" className="h-10 px-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                            Preview
                          </button>
                        </div>
                        <div className="hidden md:flex items-center gap-1 px-2 text-[var(--text-secondary)]">
                          {[Heading, Check, Italic, Code, Link, ListOrdered, List, AtSign, Paperclip].map((Icon, index) => (
                            <button
                              key={index}
                              type="button"
                              className="h-8 w-8 rounded-md inline-flex items-center justify-center hover:bg-[var(--surface-hover)]"
                            >
                              <Icon size={15} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={pullDescription}
                        onChange={(event) => setPullDescription(event.target.value)}
                        className="block min-h-[210px] w-full resize-y border-0 bg-[var(--surface-canvas)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none"
                        placeholder="Add your description here..."
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center border-t border-[var(--border-muted)] bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                        <span className="font-semibold">Markdown is supported</span>
                        <span className="hidden sm:block h-4 w-px bg-[var(--border-muted)]" />
                        <span>Paste, drop, or click to add files</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={creatingPullRequest}
                      onClick={handleCreatePullRequest}
                      className="h-9 px-4 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      Create pull request
                    </button>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)]">
                    Remember, contributions to this repository should follow our{" "}
                    <span className="text-[var(--text-link)]">GitHub Community Guidelines</span>.
                  </p>
                </div>
              </div>

              <aside className="space-y-0 text-sm text-[var(--text-primary)]">
                {[
                  ["Reviewers", "Copilot", "Request"],
                  ["Assignees", "No one-assign yourself", ""],
                  ["Labels", "None yet", ""],
                  ["Projects", "None yet", ""],
                  ["Milestone", "No milestone", ""],
                  ["Development", "Use Closing keywords in the description to automatically close issues", ""],
                  ["Helpful resources", "GitHub Community Guidelines", ""],
                ].map(([title, body, action]) => (
                  <div key={title} className="border-b border-[var(--border-muted)] py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--text-secondary)]">{title}</p>
                      <Settings size={14} className="text-[var(--text-secondary)]" />
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-primary)]">
                      {body}
                      {action ? <span className="float-right text-[var(--text-link)]">{action}</span> : null}
                    </p>
                  </div>
                ))}
              </aside>
            </section>
          ) : null}

          {hasChanges && !showInlineCreateForm && !existingPullRequest ? (
            <section className="rounded-md border border-[var(--border-info-muted,#54aeff)] bg-[var(--surface-info-subtle,#ddf4ff)] px-4 py-5 text-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[var(--text-primary)]">
                Discuss and review the changes in this comparison with others.{" "}
                <span className="text-[var(--text-link)]">Learn about pull requests</span>
              </p>
              <button
                type="button"
                disabled={creatingPullRequest}
                onClick={handleCreatePullRequest}
                className="h-8 px-4 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-xs font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-45 disabled:cursor-not-allowed"
              >
                Create pull request
              </button>
            </section>
          ) : null}

          {hasChanges ? (
            <>
              <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] h-10 grid grid-cols-1 sm:grid-cols-3 text-sm text-[var(--text-primary)]">
                <div className="inline-flex items-center justify-center gap-1.5 border-b sm:border-b-0 sm:border-r border-[var(--border-muted)]">
                  <GitCommitHorizontal size={15} className="text-[var(--text-secondary)]" />
                  <span>{compareData.summary.commit_count} commit{compareData.summary.commit_count === 1 ? "" : "s"}</span>
                </div>
                <div className="inline-flex items-center justify-center gap-1.5 border-b sm:border-b-0 sm:border-r border-[var(--border-muted)]">
                  <FileDiff size={15} className="text-[var(--text-secondary)]" />
                  <span>{compareData.summary.files_changed} file{compareData.summary.files_changed === 1 ? "" : "s"} changed</span>
                </div>
                <div className="inline-flex items-center justify-center gap-1.5">
                  <Users size={15} className="text-[var(--text-secondary)]" />
                  <span>{compareData.summary.contributor_count} contributor{compareData.summary.contributor_count === 1 ? "" : "s"}</span>
                </div>
              </section>

              {(createError || createMessage) ? (
                <section className="rounded-md border border-[var(--border-muted)] bg-[var(--surface-canvas)] p-3 space-y-2">
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
                </section>
              ) : null}

              <section className="relative pl-10">
                <div className="absolute left-[14px] top-1 bottom-0 w-px bg-[var(--border-muted)]" />
                <div className="space-y-5">
                  {commitGroups.map((group) => (
                    <div key={group.dateLabel} className="relative space-y-2">
                      <div className="mb-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <span className="absolute -left-[33px] top-0.5 z-10 h-4 w-4 bg-[var(--surface-canvas)] text-[var(--text-secondary)] inline-flex items-center justify-center">
                          <GitCommitHorizontal size={16} />
                        </span>
                        <span>Commits on {group.dateLabel}</span>
                      </div>
                      <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] divide-y divide-[var(--border-muted)] overflow-hidden">
                        {group.commits.map((commit) => (
                          <div key={commit.hash} className="px-4 py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[var(--text-primary)] truncate underline-offset-2 hover:underline">
                                {commit.message || "Untitled commit"}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)] mt-1">
                                <span className="font-semibold text-[var(--text-primary)]">{commit.author || "Unknown"}</span>{" "}
                                authored on {formatShortDate(commit.date)}
                              </p>
                            </div>
                            <div className="shrink-0 inline-flex items-center gap-2">
                              <span className="hidden sm:inline-flex rounded-full border border-[var(--border-success-muted)] bg-[var(--surface-canvas)] px-3 py-1 text-xs text-[var(--fgColor-open,#1a7f37)]">
                                Verified
                              </span>
                              <button
                                type="button"
                                className="h-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-2 text-xs font-mono text-[var(--text-primary)] inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                              >
                                <Copy size={14} className="text-[var(--text-secondary)]" />
                                {commit.hash.slice(0, 7)}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[var(--text-primary)]">
                    Showing <span className="font-semibold">{compareData.summary.files_changed} changed file{compareData.summary.files_changed === 1 ? "" : "s"}</span>{" "}
                    with <span className="font-semibold">{compareData.summary.additions} addition{compareData.summary.additions === 1 ? "" : "s"}</span>{" "}
                    and <span className="font-semibold">{compareData.summary.deletions} deletion{compareData.summary.deletions === 1 ? "" : "s"}</span>.
                  </p>
                  <div className="inline-flex self-start rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs">
                    <button
                      type="button"
                      onClick={() => setDiffView("split")}
                      className={`px-3 py-1.5 rounded-l-md ${
                        diffView === "split"
                          ? "bg-[var(--surface-canvas)] text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Split
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiffView("unified")}
                      className={`px-3 py-1.5 rounded-r-md border-l border-[var(--border-muted)] ${
                        diffView === "unified"
                          ? "bg-[var(--surface-canvas)] text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Unified
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {compareData.files.map((file) => {
                    const isExpanded = expandedFiles.has(file.path);

                    return (
                      <article key={file.path} className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleFileExpansion(file.path)}
                          className="w-full px-4 py-2.5 flex items-center justify-between gap-3 bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)]"
                        >
                          <div className="min-w-0 flex items-center gap-2 text-left">
                            {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            <span className="text-xs text-[var(--text-secondary)]">{file.additions + file.deletions}</span>
                            <span className="hidden sm:inline-flex gap-0.5" aria-hidden>
                              {Array.from({ length: Math.min(5, Math.max(1, file.additions + file.deletions)) }).map((_, index) => (
                                <span key={index} className="h-2 w-2 bg-[var(--fgColor-open,#1a7f37)]" />
                              ))}
                            </span>
                            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{file.path}</span>
                            <Copy size={14} className="text-[var(--text-secondary)] shrink-0" />
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
                            <MoreHorizontal size={16} className="text-[var(--text-secondary)]" />
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
