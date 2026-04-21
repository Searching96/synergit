import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  ChevronDown,
  CircleDot,
  MessageSquare,
  Milestone,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import { issuesApi } from "../../../services/api";
import type { Issue, IssueAssignee, IssueStatus } from "../../../types";

interface IssueBoardProps {
  repoId: string;
  repoName: string;
  repoOwner: string;
}

function formatIssueDate(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return "on an unknown date";
  }

  return `on ${parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function replaceStateQueryToken(query: string, nextStatus: IssueStatus): string {
  const stripped = query.replace(/\bstate:(open|closed)\b/gi, "").trim();
  const prefix = `is:issue state:${nextStatus.toLowerCase()}`;
  return stripped ? `${prefix} ${stripped}` : prefix;
}

function extractStateQueryToken(query: string): IssueStatus | null {
  const normalized = query.toLowerCase();
  if (normalized.includes("state:closed")) {
    return "CLOSED";
  }
  if (normalized.includes("state:open")) {
    return "OPEN";
  }

  return null;
}

export default function IssueBoard({ repoId, repoName, repoOwner }: IssueBoardProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [assigneesByIssueId, setAssigneesByIssueId] = useState<Record<string, IssueAssignee[]>>({});
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [creatingIssue, setCreatingIssue] = useState<boolean>(false);
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<IssueStatus>("OPEN");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [searchInput, setSearchInput] = useState<string>("is:issue state:open");
  const [appliedSearch, setAppliedSearch] = useState<string>("is:issue state:open");
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);

  const [createTitle, setCreateTitle] = useState<string>('');
  const [createDescription, setCreateDescription] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadIssues = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setListLoading(true);
      }
      setError(null);
      const data = await issuesApi.list(repoId);
      setIssues(data || []);

      const assigneeEntries = await Promise.all(
        (data || []).map(async (issue) => {
          try {
            const assignees = await issuesApi.listAssignees(repoId, issue.id);
            return [issue.id, assignees || []] as const;
          } catch {
            return [issue.id, issue.assignees || []] as const;
          }
        }),
      );

      setAssigneesByIssueId(Object.fromEntries(assigneeEntries));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to load issues';
      setError(errMsg);
    } finally {
      if (!silent) {
        setListLoading(false);
      }
    }
  }, [repoId]);

  useEffect(() => {
    setIssues([]);
    setError(null);
    setMessage(null);
    setCreateTitle('');
    setCreateDescription('');
    setShowCreateForm(false);
    setActiveFilter("OPEN");
    setSearchInput("is:issue state:open");
    setAppliedSearch("is:issue state:open");
    setSelectedIssueIds(new Set());
    void loadIssues();
  }, [repoId, loadIssues]);

  const sortedByCreatedAsc = useMemo(
    () => [...issues].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)),
    [issues],
  );

  const issueNumberMap = useMemo(() => {
    const mapping = new Map<string, number>();
    sortedByCreatedAsc.forEach((issue, index) => {
      mapping.set(issue.id, index + 1);
    });
    return mapping;
  }, [sortedByCreatedAsc]);

  const openCount = useMemo(
    () => issues.filter((issue) => issue.status === "OPEN").length,
    [issues],
  );

  const closedCount = useMemo(
    () => issues.filter((issue) => issue.status === "CLOSED").length,
    [issues],
  );

  const queryFilter = useMemo(() => {
    const query = appliedSearch.toLowerCase();

    const queryState = query.includes("state:closed")
      ? "CLOSED"
      : query.includes("state:open")
        ? "OPEN"
        : activeFilter;

    const freeText = query
      .replace(/\bis:issue\b/gi, "")
      .replace(/\bstate:(open|closed)\b/gi, "")
      .trim();

    return { queryState, freeText };
  }, [activeFilter, appliedSearch]);

  const filteredIssues = useMemo(() => {
    const matches = issues.filter((issue) => {
      if (issue.status !== queryFilter.queryState) {
        return false;
      }

      if (!queryFilter.freeText) {
        return true;
      }

      const searchable = `${issue.title} ${issue.description || ""}`.toLowerCase();
      return searchable.includes(queryFilter.freeText);
    });

    return matches.sort((a, b) => {
      if (sortOrder === "oldest") {
        return Date.parse(a.created_at) - Date.parse(b.created_at);
      }

      return Date.parse(b.created_at) - Date.parse(a.created_at);
    });
  }, [issues, queryFilter, sortOrder]);

  const allVisibleSelected = useMemo(
    () => filteredIssues.length > 0 && filteredIssues.every((issue) => selectedIssueIds.has(issue.id)),
    [filteredIssues, selectedIssueIds],
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

  const handleCreateIssue = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!createTitle.trim()) return;

    try {
      setCreatingIssue(true);
      setError(null);
      setMessage(null);

      const createdIssue = await issuesApi.create(repoId, {
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
      });

      setCreateTitle('');
      setCreateDescription('');
      setShowCreateForm(false);
      setSelectedIssueIds(new Set());
      setMessage('Issue created successfully.');

      await loadIssues(true);
      setActiveFilter(createdIssue.status);
      setSearchInput(replaceStateQueryToken(searchInput, createdIssue.status));
      setAppliedSearch(replaceStateQueryToken(appliedSearch, createdIssue.status));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to create issue';
      setError(errMsg);
    } finally {
      setCreatingIssue(false);
    }
  };

  const handleToggleIssueStatus = async (issue: Issue) => {
    const nextStatus: IssueStatus = issue.status === 'OPEN' ? 'CLOSED' : 'OPEN';

    try {
      setUpdatingIssueId(issue.id);
      setError(null);
      setMessage(null);

      await issuesApi.updateStatus(repoId, issue.id, { status: nextStatus });
      await loadIssues(true);

      setMessage(`Issue marked as ${nextStatus.toLowerCase()}.`);
      setSelectedIssueIds((prev) => {
        const next = new Set(prev);
        next.delete(issue.id);
        return next;
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update issue status';
      setError(errMsg);
    } finally {
      setUpdatingIssueId(null);
    }
  };

  const applyFilter = (status: IssueStatus) => {
    setActiveFilter(status);
    const nextQuery = replaceStateQueryToken(searchInput, status);
    setSearchInput(nextQuery);
    setAppliedSearch(nextQuery);
  };

  const toggleSelectAll = () => {
    setSelectedIssueIds((prev) => {
      const next = new Set(prev);

      if (allVisibleSelected) {
        filteredIssues.forEach((issue) => {
          next.delete(issue.id);
        });
        return next;
      }

      filteredIssues.forEach((issue) => {
        next.add(issue.id);
      });
      return next;
    });
  };

  const toggleSelectIssue = (issueId: string) => {
    setSelectedIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  };

  const applySearch = () => {
    const normalized = searchInput.trim() || "is:issue state:open";
    setAppliedSearch(normalized);

    const queryState = extractStateQueryToken(normalized);
    if (queryState) {
      setActiveFilter(queryState);
    }
  };

  return (
    <div className="space-y-4 max-w-none">
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

      <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border-muted)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
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
                    placeholder="Search Issues"
                    className="h-9 w-full rounded-l-md border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-9 pr-3 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <button
                  type="button"
                  onClick={applySearch}
                  className="h-9 w-10 rounded-r-md border border-l-0 border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-hover)]"
                  aria-label="Search"
                >
                  <Search size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:shrink-0">
              <button type="button" className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2">
                <Tag size={14} />
                Labels
              </button>
              <button type="button" className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2">
                <Milestone size={14} />
                Milestones
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm((prev) => !prev)}
                className="h-9 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold inline-flex items-center gap-2 hover:bg-[var(--accent-primary-hover)]"
              >
                <Plus size={14} />
                New issue
              </button>
            </div>
          </div>
        </div>

        {showCreateForm ? (
          <form onSubmit={handleCreateIssue} className="p-4 border-b border-[var(--border-muted)] bg-[var(--surface-subtle)] space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Create a new issue</h3>
            <input
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Title"
              className="w-full h-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
              required
            />
            <textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Description"
              className="w-full min-h-24 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingIssue || !createTitle.trim()}
                className="h-8 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
              >
                {creatingIssue ? 'Creating...' : 'Create issue'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="px-4 py-3 border-b border-[var(--border-muted)] flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              aria-label="Select all issues"
              className="h-4 w-4"
            />

            <button
              type="button"
              onClick={() => applyFilter("OPEN")}
              className={`inline-flex items-center gap-2 ${activeFilter === "OPEN" ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              Open
              <span className="rounded-full bg-[var(--surface-badge)] px-2 py-0.5 text-xs">{openCount}</span>
            </button>

            <button
              type="button"
              onClick={() => applyFilter("CLOSED")}
              className={`inline-flex items-center gap-2 ${activeFilter === "CLOSED" ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              Closed
              <span className="rounded-full bg-[var(--surface-badge)] px-2 py-0.5 text-xs">{closedCount}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {['Author', 'Labels', 'Projects', 'Milestones', 'Assignees'].map((actionLabel) => (
              <button
                key={actionLabel}
                type="button"
                className="h-8 px-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] inline-flex items-center gap-1"
              >
                {actionLabel}
                <ChevronDown size={14} />
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
              className="h-8 px-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] inline-flex items-center gap-1"
            >
              {sortOrder === "newest" ? "Newest" : "Oldest"}
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {listLoading ? (
          <div className="p-5 text-sm text-[var(--text-secondary)]">Loading issues...</div>
        ) : filteredIssues.length === 0 ? (
          <div className="py-16 text-center">
            <CircleDot size={24} className="mx-auto text-[var(--text-muted)]" />
            <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">No {activeFilter.toLowerCase()} issues found</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Create an issue or adjust the search and filters.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-muted)]">
            {filteredIssues.map((issue) => {
              const issueNo = issueNumberMap.get(issue.id) || 0;
              const assigneeCount = (assigneesByIssueId[issue.id] || []).length;
              const isSelected = selectedIssueIds.has(issue.id);

              return (
                <li key={issue.id} className="px-4 py-3 hover:bg-[var(--surface-subtle)]">
                  <div className="grid grid-cols-[20px_20px_minmax(0,1fr)_auto] items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectIssue(issue.id)}
                      aria-label={`Select issue ${issue.title}`}
                      className="mt-1 h-4 w-4"
                    />

                    <span className="mt-1">
                      {issue.status === 'OPEN' ? (
                        <CircleDot size={16} className="text-[var(--fgColor-open,#1a7f37)]" />
                      ) : (
                        <CheckCircle2 size={16} className="text-[var(--text-accent-purple)]" />
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{issue.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-1.5">
                        <span>#{issueNo}</span>
                        <span>·</span>
                        <span>In {repoOwner}/{repoName}</span>
                        <span>·</span>
                        <span>{issue.status === 'OPEN' ? 'opened' : 'closed'} {toRelativeTime(issue.created_at)}</span>
                        <span>({formatIssueDate(issue.created_at)})</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1" aria-label="Comments">
                        <MessageSquare size={13} />
                        0
                      </span>
                      <span className="inline-flex items-center gap-1" aria-label="Assignees">
                        <CircleDot size={13} />
                        {assigneeCount}
                      </span>

                      <button
                        type="button"
                        disabled={updatingIssueId === issue.id}
                        onClick={() => void handleToggleIssueStatus(issue)}
                        className="h-7 px-2.5 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-xs text-[var(--text-primary)] hover:bg-[var(--surface-button-muted)] disabled:opacity-50"
                      >
                        {issue.status === 'OPEN' ? 'Close' : 'Reopen'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

