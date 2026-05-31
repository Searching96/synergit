import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronDown,
  CircleDot,
  CircleSlash,
  MessageSquare,
  Milestone,
  Plus,
  Search,
  Tag,
  Users,
} from "lucide-react";
import { collaboratorsApi, issuesApi, labelsApi } from "../../../services/api";
import type { Issue, IssueAssignee, IssueCloseReason, IssueStatus, Label, RepoCollaborator } from "../../../types";

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
  const stripped = query
    .replace(/\bis:issue\b/gi, "")
    .replace(/\bis:(open|closed)\b/gi, "")
    .replace(/\bstate:(open|closed)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
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

function ToolbarDropdown({
  icon,
  label,
  open,
  onToggle,
  width,
  children,
}: {
  icon: ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
  width?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
      >
        {icon}
        {label}
        <ChevronDown size={14} />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} aria-hidden />
          <div
            className={`absolute right-0 mt-1 z-20 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg ${width || "w-72"}`}
          >
            {children}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function IssueBoard({ repoId }: IssueBoardProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [assigneesByIssueId, setAssigneesByIssueId] = useState<Record<string, IssueAssignee[]>>({});
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [creatingIssue, setCreatingIssue] = useState<boolean>(false);

  const [activeFilter, setActiveFilter] = useState<IssueStatus>("OPEN");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [searchInput, setSearchInput] = useState<string>("is:issue state:open");
  const [appliedSearch, setAppliedSearch] = useState<string>("is:issue state:open");
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [closeReasonFilter, setCloseReasonFilter] = useState<IssueCloseReason | "ALL">("ALL");

  const [labelsByIssueId, setLabelsByIssueId] = useState<Record<string, Label[]>>({});
  const [repoLabels, setRepoLabels] = useState<Label[]>([]);
  const [collaborators, setCollaborators] = useState<RepoCollaborator[]>([]);
  const [openMenu, setOpenMenu] = useState<"mark" | "label" | "assign" | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [labelFilter, setLabelFilter] = useState<string>("");

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

      const labelEntries = await Promise.all(
        (data || []).map(async (issue) => {
          try {
            const labels = await labelsApi.listForIssue(repoId, issue.id);
            return [issue.id, labels || []] as const;
          } catch {
            return [issue.id, []] as const;
          }
        }),
      );

      setLabelsByIssueId(Object.fromEntries(labelEntries));
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
    setCloseReasonFilter("ALL");
    setLabelsByIssueId({});
    setOpenMenu(null);
    setAssigneeFilter("");
    setLabelFilter("");
    void loadIssues();

    void labelsApi.listForRepo(repoId).then(setRepoLabels).catch(() => setRepoLabels([]));
    void collaboratorsApi.list(repoId).then((list) => setCollaborators(list || [])).catch(() => setCollaborators([]));
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

  const closedNotPlannedCount = useMemo(
    () => issues.filter((issue) => issue.status === "CLOSED" && issue.close_reason === "NOT_PLANNED").length,
    [issues],
  );

  const closedCompletedCount = useMemo(
    () => closedCount - closedNotPlannedCount,
    [closedCount, closedNotPlannedCount],
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
      .replace(/\bis:(open|closed)\b/gi, "")
      .replace(/\bstate:(open|closed)\b/gi, "")
      .trim();

    return { queryState, freeText };
  }, [activeFilter, appliedSearch]);

  const filteredIssues = useMemo(() => {
    const matches = issues.filter((issue) => {
      if (issue.status !== queryFilter.queryState) {
        return false;
      }

      if (queryFilter.queryState === "CLOSED" && closeReasonFilter !== "ALL") {
        const reason = issue.close_reason || "COMPLETED";
        if (reason !== closeReasonFilter) {
          return false;
        }
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
  }, [closeReasonFilter, issues, queryFilter, sortOrder]);

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

  const applyFilter = (status: IssueStatus) => {
    setActiveFilter(status);
    setCloseReasonFilter("ALL");
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
      if (queryState === "OPEN") {
        setCloseReasonFilter("ALL");
      }
    }
  };

  const selectedVisible = useMemo(
    () => filteredIssues.filter((issue) => selectedIssueIds.has(issue.id)),
    [filteredIssues, selectedIssueIds],
  );
  const selectionActive = selectedVisible.length > 0;

  const toggleMenu = (menu: "mark" | "label" | "assign") =>
    setOpenMenu((prev) => (prev === menu ? null : menu));

  const bulkMarkAs = async (target: "OPEN" | IssueCloseReason) => {
    setOpenMenu(null);
    const payload =
      target === "OPEN"
        ? { status: "OPEN" as IssueStatus }
        : { status: "CLOSED" as IssueStatus, close_reason: target };
    const isNoOp = (issue: Issue) =>
      target === "OPEN"
        ? issue.status === "OPEN"
        : issue.status === "CLOSED" && (issue.close_reason || "COMPLETED") === target;

    try {
      setError(null);
      setMessage(null);
      await Promise.all(
        selectedVisible
          .filter((issue) => !isNoOp(issue))
          .map((issue) => issuesApi.updateStatus(repoId, issue.id, payload)),
      );
      setSelectedIssueIds(new Set());
      await loadIssues(true);
      setMessage("Issues updated.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update issues");
    }
  };

  const isAssigneeOnAll = (userId: string) =>
    selectedVisible.length > 0 &&
    selectedVisible.every((issue) =>
      (assigneesByIssueId[issue.id] || []).some((a) => a.user_id === userId),
    );

  const toggleAssignee = async (userId: string) => {
    const remove = isAssigneeOnAll(userId);
    try {
      setError(null);
      const tasks = selectedVisible.map((issue) => {
        const has = (assigneesByIssueId[issue.id] || []).some((a) => a.user_id === userId);
        if (remove && has) return issuesApi.unassign(repoId, issue.id, userId);
        if (!remove && !has) return issuesApi.assign(repoId, issue.id, { user_id: userId });
        return null;
      });
      await Promise.all(tasks.filter((t): t is Promise<{ message: string }> => t !== null));
      await loadIssues(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update assignees");
    }
  };

  const isLabelOnAll = (labelId: string) =>
    selectedVisible.length > 0 &&
    selectedVisible.every((issue) =>
      (labelsByIssueId[issue.id] || []).some((l) => l.id === labelId),
    );

  const toggleLabel = async (labelId: string) => {
    const remove = isLabelOnAll(labelId);
    try {
      setError(null);
      const tasks = selectedVisible.map((issue) => {
        const has = (labelsByIssueId[issue.id] || []).some((l) => l.id === labelId);
        if (remove && has) return labelsApi.remove(repoId, issue.id, labelId);
        if (!remove && !has) return labelsApi.add(repoId, issue.id, { label_id: labelId });
        return null;
      });
      await Promise.all(tasks.filter((t): t is Promise<{ message: string }> => t !== null));
      await loadIssues(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update labels");
    }
  };

  const visibleCollaborators = collaborators.filter((c) =>
    (c.username ?? "").toLowerCase().includes(assigneeFilter.trim().toLowerCase()),
  );
  const visibleLabels = repoLabels.filter((l) =>
    (l.name ?? "").toLowerCase().includes(labelFilter.trim().toLowerCase()),
  );


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

      <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)]">
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
          {selectionActive ? (
            <>
              <div className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all issues"
                  className="h-4 w-4"
                />
                <span className="font-semibold text-[var(--text-primary)]">
                  {selectedVisible.length} of {filteredIssues.length} selected
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ToolbarDropdown
                  icon={<CheckCircle2 size={14} />}
                  label="Mark as"
                  open={openMenu === "mark"}
                  onToggle={() => toggleMenu("mark")}
                  width="w-52"
                >
                  <ul className="py-1 text-sm">
                    <li>
                      <button
                        type="button"
                        onClick={() => void bulkMarkAs("OPEN")}
                        className="w-full px-3 py-2 text-left inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                      >
                        <CircleDot size={16} className="text-[var(--fgColor-open,#1a7f37)]" />
                        Open
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => void bulkMarkAs("COMPLETED")}
                        className="w-full px-3 py-2 text-left inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                      >
                        <CheckCircle2 size={16} className="text-[var(--text-accent-purple)]" />
                        Completed
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => void bulkMarkAs("NOT_PLANNED")}
                        className="w-full px-3 py-2 text-left inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                      >
                        <CircleSlash size={16} className="text-[var(--text-secondary)]" />
                        Not planned
                      </button>
                    </li>
                  </ul>
                </ToolbarDropdown>

                <ToolbarDropdown
                  icon={<Tag size={14} />}
                  label="Label"
                  open={openMenu === "label"}
                  onToggle={() => toggleMenu("label")}
                  width="w-80"
                >
                  <div className="p-2">
                    <p className="px-1 pb-1 text-xs font-semibold text-[var(--text-secondary)]">Apply labels to selected issues</p>
                    <input
                      value={labelFilter}
                      onChange={(e) => setLabelFilter(e.target.value)}
                      placeholder="Filter labels"
                      className="w-full h-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-2 text-sm text-[var(--text-primary)]"
                    />
                    <ul className="mt-1 max-h-72 overflow-auto">
                      {visibleLabels.length === 0 ? (
                        <li className="px-2 py-2 text-xs text-[var(--text-secondary)]">No labels found</li>
                      ) : (
                        visibleLabels.map((label) => (
                          <li key={label.id}>
                            <button
                              type="button"
                              onClick={() => void toggleLabel(label.id)}
                              className="w-full px-2 py-1.5 text-left inline-flex items-start gap-2 hover:bg-[var(--surface-hover)]"
                            >
                              <input type="checkbox" readOnly checked={isLabelOnAll(label.id)} className="mt-0.5 h-4 w-4" />
                              <span className="mt-1 h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-[var(--text-primary)]">{label.name}</span>
                                {label.description ? (
                                  <span className="block text-xs text-[var(--text-secondary)]">{label.description}</span>
                                ) : null}
                              </span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </ToolbarDropdown>

                <ToolbarDropdown
                  icon={<Users size={14} />}
                  label="Assign"
                  open={openMenu === "assign"}
                  onToggle={() => toggleMenu("assign")}
                  width="w-72"
                >
                  <div className="p-2">
                    <p className="px-1 pb-1 text-xs font-semibold text-[var(--text-secondary)]">Select assignees</p>
                    <input
                      value={assigneeFilter}
                      onChange={(e) => setAssigneeFilter(e.target.value)}
                      placeholder="Filter assignees"
                      className="w-full h-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-2 text-sm text-[var(--text-primary)]"
                    />
                    <ul className="mt-1 max-h-72 overflow-auto">
                      {visibleCollaborators.length === 0 ? (
                        <li className="px-2 py-2 text-xs text-[var(--text-secondary)]">No collaborators found</li>
                      ) : (
                        visibleCollaborators.map((collaborator) => (
                          <li key={collaborator.user_id}>
                            <button
                              type="button"
                              onClick={() => void toggleAssignee(collaborator.user_id)}
                              className="w-full px-2 py-1.5 text-left inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                            >
                              <input type="checkbox" readOnly checked={isAssigneeOnAll(collaborator.user_id)} className="h-4 w-4" />
                              <span className="h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[10px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
                                {(collaborator.username ?? "?").charAt(0)}
                              </span>
                              <span className="text-sm text-[var(--text-primary)]">{collaborator.username ?? collaborator.user_id}</span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </ToolbarDropdown>
              </div>
            </>
          ) : (
            <>
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

            {activeFilter === "CLOSED" ? (
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <button
                  type="button"
                  onClick={() => setCloseReasonFilter("ALL")}
                  className={`h-7 px-2 rounded-md border ${closeReasonFilter === "ALL" ? "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)]" : "border-transparent hover:bg-[var(--surface-hover)]"}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setCloseReasonFilter("COMPLETED")}
                  className={`h-7 px-2 rounded-md border ${closeReasonFilter === "COMPLETED" ? "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)]" : "border-transparent hover:bg-[var(--surface-hover)]"}`}
                >
                  Completed
                  <span className="ml-1 text-[10px]">{closedCompletedCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCloseReasonFilter("NOT_PLANNED")}
                  className={`h-7 px-2 rounded-md border ${closeReasonFilter === "NOT_PLANNED" ? "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)]" : "border-transparent hover:bg-[var(--surface-hover)]"}`}
                >
                  Not planned
                  <span className="ml-1 text-[10px]">{closedNotPlannedCount}</span>
                </button>
              </div>
            ) : null}
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
            </>
          )}
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
              const showNotPlanned = issue.status === "CLOSED" && issue.close_reason === "NOT_PLANNED";

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
                      ) : issue.close_reason === 'NOT_PLANNED' ? (
                        <CircleSlash size={16} className="text-[var(--text-secondary)]" />
                      ) : (
                        <CheckCircle2 size={16} className="text-[var(--text-accent-purple)]" />
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{issue.title}</p>
                      {(labelsByIssueId[issue.id] || []).length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(labelsByIssueId[issue.id] || []).map((label) => (
                            <span
                              key={label.id}
                              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] px-2 py-0.5 text-[11px] text-[var(--text-primary)]"
                            >
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                              {label.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-1 text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-1.5">
                        <span>#{issueNo}</span>
                        <span>·</span>
                        <span>{issue.status === 'OPEN' ? 'opened' : 'closed'} {toRelativeTime(issue.created_at)}</span>
                        {showNotPlanned ? (
                          <>
                            <span>·</span>
                            <span>not planned</span>
                          </>
                        ) : null}
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

