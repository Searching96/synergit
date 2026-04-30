import { useCallback, useEffect, useMemo, useState } from "react";
import type { PullRequest } from "../../../types";
import { pullsApi } from "../../../services/api/pull";
import {
  Check,
  ChevronDown,
  GitMerge,
  GitPullRequest,
  MessageSquare,
  Milestone,
  Plus,
  Search,
  Tag,
  XCircle,
} from "lucide-react";

interface PullRequestListProps {
  repoId: string;
  currentUsername: string;
  onOpenCompare: () => void;
}

function replaceStateQueryToken(query: string, nextStatus: "OPEN" | "CLOSED"): string {
  const stripped = query
    .replace(/\bis:(open|closed)\b/gi, "")
    .replace(/\bstate:(open|closed)\b/gi, "")
    .trim();

  const prefix = `is:pr is:${nextStatus.toLowerCase()}`;
  return stripped ? `${prefix} ${stripped}` : prefix;
}

function extractStateQueryToken(query: string): "OPEN" | "CLOSED" | null {
  const normalized = query.toLowerCase();
  if (normalized.includes("is:closed") || normalized.includes("state:closed")) {
    return "CLOSED";
  }
  if (normalized.includes("is:open") || normalized.includes("state:open")) {
    return "OPEN";
  }

  return null;
}

function formatPullDate(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return "on an unknown date";
  }

  return `on ${parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default function PullRequestList({
  repoId,
  currentUsername,
  onOpenCompare,
}: PullRequestListProps) {
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFiltersMenu, setShowFiltersMenu] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<"OPEN" | "CLOSED">("OPEN");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [searchInput, setSearchInput] = useState<string>("is:pr is:open");
  const [appliedSearch, setAppliedSearch] = useState<string>("is:pr is:open");
  const [selectedPullIds, setSelectedPullIds] = useState<Set<string>>(new Set());
  const [showMaintainerTip, setShowMaintainerTip] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPulls = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        setError(null);
        const data = await pullsApi.list(repoId);
        setPulls(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load pull requests");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [repoId],
  );

  useEffect(() => {
    void fetchPulls();
    setShowFiltersMenu(false);
    setMessage(null);
    setError(null);
    setActiveFilter("OPEN");
    setSortOrder("newest");
    setSearchInput("is:pr is:open");
    setAppliedSearch("is:pr is:open");
    setSelectedPullIds(new Set());
  }, [repoId, fetchPulls]);

  const sortedByCreatedAsc = useMemo(
    () => [...pulls].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)),
    [pulls],
  );

  const pullNumberMap = useMemo(() => {
    const mapping = new Map<string, number>();
    sortedByCreatedAsc.forEach((pull, index) => {
      mapping.set(pull.id, index + 1);
    });
    return mapping;
  }, [sortedByCreatedAsc]);

  const openCount = useMemo(
    () => pulls.filter((pull) => pull.status === "OPEN").length,
    [pulls],
  );

  const closedCount = useMemo(
    () => pulls.filter((pull) => pull.status !== "OPEN").length,
    [pulls],
  );

  const queryFilter = useMemo(() => {
    const query = appliedSearch.toLowerCase();

    const queryState = extractStateQueryToken(query) ?? activeFilter;

    const freeText = query
      .replace(/\bis:pr\b/gi, "")
      .replace(/\bis:(open|closed)\b/gi, "")
      .replace(/\bstate:(open|closed)\b/gi, "")
      .trim();

    return { queryState, freeText };
  }, [activeFilter, appliedSearch]);

  const filteredPulls = useMemo(() => {
    const matched = pulls.filter((pull) => {
      if (queryFilter.queryState === "OPEN" && pull.status !== "OPEN") {
        return false;
      }
      if (queryFilter.queryState === "CLOSED" && pull.status === "OPEN") {
        return false;
      }

      if (!queryFilter.freeText) {
        return true;
      }

      const searchable = `${pull.title} ${pull.description || ""} ${pull.source_branch} ${pull.target_branch}`.toLowerCase();
      return searchable.includes(queryFilter.freeText);
    });

    return matched.sort((a, b) => {
      if (sortOrder === "oldest") {
        return Date.parse(a.created_at) - Date.parse(b.created_at);
      }

      return Date.parse(b.created_at) - Date.parse(a.created_at);
    });
  }, [pulls, queryFilter, sortOrder]);

  const allVisibleSelected = useMemo(
    () => filteredPulls.length > 0 && filteredPulls.every((pull) => selectedPullIds.has(pull.id)),
    [filteredPulls, selectedPullIds],
  );

  const toRelativeTime = (timestamp: string) => {
    const msDiff = Date.now() - Date.parse(timestamp);
    const minutes = Math.floor(msDiff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };

  const applyFilter = (status: "OPEN" | "CLOSED") => {
    setActiveFilter(status);
    const nextQuery = replaceStateQueryToken(searchInput, status);
    setSearchInput(nextQuery);
    setAppliedSearch(nextQuery);
  };

  const applySearch = () => {
    const normalized = searchInput.trim() || "is:pr is:open";
    setAppliedSearch(normalized);

    const queryState = extractStateQueryToken(normalized);
    if (queryState) {
      setActiveFilter(queryState);
    }
  };

  const toggleSelectAll = () => {
    setSelectedPullIds((prev) => {
      const next = new Set(prev);

      if (allVisibleSelected) {
        filteredPulls.forEach((pull) => {
          next.delete(pull.id);
        });
        return next;
      }

      filteredPulls.forEach((pull) => {
        next.add(pull.id);
      });
      return next;
    });
  };

  const toggleSelectPull = (pullId: string) => {
    setSelectedPullIds((prev) => {
      const next = new Set(prev);
      if (next.has(pullId)) {
        next.delete(pullId);
      } else {
        next.add(pullId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-sm border border-[var(--border-danger-soft)] bg-[var(--surface-danger-subtle)] text-[var(--text-danger)] rounded-md">
          {error}
        </div>
      )}

      {message && (
        <div className="p-3 text-sm border border-[var(--border-info-muted)] bg-[var(--surface-info-subtle)] text-[var(--text-link)] rounded-md">
          {message}
        </div>
      )}

      {showMaintainerTip ? (
        <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4 text-center relative">
          <button
            type="button"
            onClick={() => setShowMaintainerTip(false)}
            className="absolute top-3 right-3 text-sm text-[var(--text-link)] hover:underline"
          >
            Dismiss
          </button>
          <p className="text-[30px] leading-[1.25] font-semibold text-[var(--text-primary)]">
            Label issues and pull requests for new contributors
          </p>
          <p className="mt-2 text-base text-[var(--text-secondary)]">
            GitHub-style contributor discovery starts with clear labels such as good first issue.
          </p>
        </section>
      ) : null}

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div className="flex items-stretch gap-0 w-full md:flex-1 md:min-w-0" role="search" aria-label="Pull requests search">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFiltersMenu((prev) => !prev)}
              className="h-9 px-3 rounded-l-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] inline-flex items-center gap-1"
            >
              Filters
              <ChevronDown size={14} />
            </button>

            {showFiltersMenu ? (
              <div className="absolute left-0 mt-1 z-20 w-[260px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg p-1 text-sm">
                {[
                  { label: "Open pull requests", value: "is:pr is:open" },
                  { label: "Closed pull requests", value: "is:pr is:closed" },
                  { label: "Your pull requests", value: "is:pr is:open author:@me" },
                  { label: "Assigned to you", value: "is:pr is:open assignee:@me" },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setSearchInput(item.value);
                      setAppliedSearch(item.value);
                      const queryState = extractStateQueryToken(item.value);
                      if (queryState) {
                        setActiveFilter(queryState);
                      }
                      setShowFiltersMenu(false);
                    }}
                    className="w-full px-2 py-1.5 text-left rounded hover:bg-[var(--surface-subtle)] inline-flex items-center justify-between"
                  >
                    <span>{item.label}</span>
                    {appliedSearch === item.value ? <Check size={14} className="text-[var(--text-secondary)]" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applySearch();
                }
              }}
              className="h-9 w-full border-y border-[var(--border-default)] bg-[var(--surface-canvas)] pl-9 pr-3 text-sm text-[var(--text-primary)]"
              placeholder="Search all pull requests"
              aria-label="Search all pull requests"
            />
          </div>

          <button
            type="button"
            onClick={applySearch}
            className="h-9 w-10 rounded-r-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-hover)]"
            aria-label="Search"
          >
            <Search size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto md:justify-end">
          <button
            type="button"
            className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2"
          >
            <Tag size={14} />
            Labels
          </button>
          <button
            type="button"
            className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2"
          >
            <Milestone size={14} />
            Milestones
          </button>
          <button
            type="button"
            onClick={onOpenCompare}
            className="h-9 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold inline-flex items-center gap-2 hover:bg-[var(--accent-primary-hover)]"
          >
            <Plus size={14} />
            New pull request
          </button>
        </div>
      </div>

      <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-muted)] flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-sm min-w-0">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              aria-label="Select all pull requests"
              className="h-4 w-4"
            />

            <button
              type="button"
              onClick={() => applyFilter("OPEN")}
              className={`inline-flex items-center gap-2 ${activeFilter === "OPEN" ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              <GitPullRequest size={14} />
              {openCount} Open
            </button>

            <button
              type="button"
              onClick={() => applyFilter("CLOSED")}
              className={`inline-flex items-center gap-2 ${activeFilter === "CLOSED" ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              <Check size={14} />
              {closedCount} Closed
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
            {["Author", "Label", "Projects", "Milestones", "Reviews", "Assignee"].map((label) => (
              <button
                key={label}
                type="button"
                className="h-8 px-2 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
              >
                {label}
                <ChevronDown size={14} />
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
              className="h-8 px-2 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
            >
              Sort: {sortOrder === "newest" ? "Newest" : "Oldest"}
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-[var(--text-secondary)]">Loading pull requests...</div>
        ) : filteredPulls.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <GitPullRequest size={26} className="mx-auto text-[var(--text-muted)]" />
            <p className="text-[36px] leading-[1.2] font-semibold text-[var(--text-primary)]">
              There aren&apos;t any {activeFilter === "OPEN" ? "open" : "closed"} pull requests.
            </p>
            <p className="text-lg text-[var(--text-secondary)]">
              You could search all pull requests or try an advanced search.
            </p>
          </div>
        ) : (
          <div role="group" aria-label="Pull requests" className="divide-y divide-[var(--border-muted)]">
            {filteredPulls.map((pull) => {
              const pullNo = pullNumberMap.get(pull.id) || 0;
              const statusIcon =
                pull.status === "OPEN" ? (
                  <GitPullRequest size={16} className="text-[var(--fgColor-open,#1a7f37)]" />
                ) : pull.status === "MERGED" ? (
                  <GitMerge size={16} className="text-[var(--text-accent-purple)]" />
                ) : (
                  <XCircle size={16} className="text-[var(--text-danger)]" />
                );

              const isSelected = selectedPullIds.has(pull.id);

              return (
                <div key={pull.id} className="px-3 py-2 hover:bg-[var(--surface-subtle)]">
                  <div className="grid grid-cols-[22px_18px_minmax(0,1fr)_160px] gap-3 items-start">
                    <label className="pt-1 hidden md:block">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectPull(pull.id)}
                        aria-label={`Select pull request ${pull.title}`}
                      />
                    </label>

                    <div className="pt-1">{statusIcon}</div>

                    <div className="min-w-0 pr-2">
                      <button
                        type="button"
                        className="text-left text-base font-semibold text-[var(--text-primary)] hover:text-[var(--text-link)] truncate w-full"
                      >
                        {pull.title}
                      </button>

                      <div className="mt-1 text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-1.5">
                        <span>#{pullNo}</span>
                        <span>opened</span>
                        <span>{toRelativeTime(pull.created_at)}</span>
                        <span>({formatPullDate(pull.created_at)})</span>
                        <span>by</span>
                        <span className="text-[var(--text-primary)]">{currentUsername}</span>
                        <span className="px-1.5 py-0.5 border border-[var(--border-default)] rounded text-[10px] text-[var(--text-secondary)]">Owner</span>
                        <span className="ml-1">{pull.source_branch} into {pull.target_branch}</span>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center justify-end gap-3 pt-1 text-xs text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare size={13} />
                        0
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-center text-sm text-[var(--text-secondary)]">
        ProTip! Get @{currentUsername} mentions with query <span className="text-[var(--text-link)]">mentions:{currentUsername}</span>.
      </p>
    </div>
  );
}

