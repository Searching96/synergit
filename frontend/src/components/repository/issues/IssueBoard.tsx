import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Bold,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  CircleSlash,
  Code,
  Heading,
  Italic,
  Link,
  List,
  ListOrdered,
  Milestone,
  Search,
  Settings,
  Tag,
  Users,
} from "lucide-react";
import { collaboratorsApi, issuesApi, labelsApi } from "../../../services/api";
import type { Issue, IssueAssignee, IssueCloseReason, IssueStatus, Label, RepoCollaborator } from "../../../types";

interface IssueBoardProps {
  repoId: string;
  repoName: string;
  repoOwner: string;
  currentUsername: string;
  isCreating: boolean;
  onOpenCreate: () => void;
  onCloseCreate: () => void;
  onOpenIssue: (issueNumber: number) => void;
}

function labelTextColor(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return "#1f2328";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? "#1f2328" : "#ffffff";
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

function quoteQueryValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/[\s"]/.test(trimmed)) {
    return `"${trimmed.replace(/"/g, '\\"')}"`;
  }

  return trimmed;
}

function stripQueryToken(query: string, key: string): string {
  return query
    .replace(new RegExp(`\\b${key}:(?:"(?:[^"\\\\]|\\\\.)*"|\\S+)`, "gi"), "")
    .replace(/\s+/g, " ")
    .trim();
}

function removeQueryTokenValue(query: string, key: string, value: string): string {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) {
    return query.trim();
  }

  return query
    .replace(new RegExp(`\\b${key}:(?:"((?:[^"\\\\]|\\\\.)*)"|(\\S+))`, "gi"), (token, quotedValue, plainValue) => {
      const tokenValue = String(quotedValue ?? plainValue ?? "").replace(/\\"/g, '"').trim().toLowerCase();
      return tokenValue === normalizedValue ? "" : token;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function appendQueryToken(query: string, key: string, value: string, options?: { replace?: boolean }): string {
  const tokenValue = quoteQueryValue(value);
  if (!tokenValue) {
    return query.trim();
  }

  const base = options?.replace ? stripQueryToken(query, key) : query.trim();
  const token = `${key}:${tokenValue}`;

  return base ? `${base} ${token}` : token;
}

function extractQueryTokenValues(query: string, key: string): string[] {
  const values: string[] = [];
  const pattern = new RegExp(`\\b${key}:(?:"((?:[^"\\\\]|\\\\.)*)"|(\\S+))`, "gi");
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(query)) !== null) {
    values.push((match[1] ?? match[2] ?? "").replace(/\\"/g, '"').trim().toLowerCase());
  }

  return values.filter(Boolean);
}

function FilterDropdown({
  label,
  open,
  onToggle,
  children,
  width,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  width?: string;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="h-8 px-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] inline-flex items-center gap-1"
      >
        {label}
        <ChevronDown size={14} />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} aria-hidden />
          <div
            className={`absolute right-0 mt-1 z-20 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg ${width || "w-64"}`}
          >
            {children}
          </div>
        </>
      ) : null}
    </div>
  );
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

export default function IssueBoard({ repoId, repoName, repoOwner, currentUsername, isCreating, onOpenCreate, onCloseCreate, onOpenIssue }: IssueBoardProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [assigneesByIssueId, setAssigneesByIssueId] = useState<Record<string, IssueAssignee[]>>({});
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [creatingIssue, setCreatingIssue] = useState<boolean>(false);

  const [activeFilter, setActiveFilter] = useState<IssueStatus>("OPEN");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [searchInput, setSearchInput] = useState<string>("is:issue state:open");
  const [appliedSearch, setAppliedSearch] = useState<string>("is:issue state:open");
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());

  const [labelsByIssueId, setLabelsByIssueId] = useState<Record<string, Label[]>>({});
  const [repoLabels, setRepoLabels] = useState<Label[]>([]);
  const [collaborators, setCollaborators] = useState<RepoCollaborator[]>([]);
  const [openMenu, setOpenMenu] = useState<
    "mark" | "label" | "assign" | "filter-author" | "filter-label" | "filter-project" | "filter-milestone" | "filter-assignee" | "filter-sort" | null
  >(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [labelFilter, setLabelFilter] = useState<string>("");
  const [descriptionPreview, setDescriptionPreview] = useState<boolean>(false);
  const [createMore, setCreateMore] = useState<boolean>(false);
  const [createAssignees, setCreateAssignees] = useState<Set<string>>(new Set());
  const [createLabels, setCreateLabels] = useState<Set<string>>(new Set());
  const [createMenu, setCreateMenu] = useState<"assignees" | "labels" | null>(null);

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
    setActiveFilter("OPEN");
    setSearchInput("is:issue state:open");
    setAppliedSearch("is:issue state:open");
    setSelectedIssueIds(new Set());
    setLabelsByIssueId({});
    setOpenMenu(null);
    setAssigneeFilter("");
    setLabelFilter("");
    setCreateAssignees(new Set());
    setCreateLabels(new Set());
    setCreateMenu(null);
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

  const collaboratorNameById = useMemo(() => {
    const map: Record<string, string> = {};
    collaborators.forEach((c) => {
      if (c.username) map[c.user_id] = c.username;
    });
    return map;
  }, [collaborators]);

  const queryFilter = useMemo(() => {
    const query = appliedSearch.toLowerCase();

    const queryState = query.includes("state:closed")
      ? "CLOSED"
      : query.includes("state:open")
        ? "OPEN"
        : activeFilter;

    const author = extractQueryTokenValues(appliedSearch, "author")[0] || "";
    const labels = extractQueryTokenValues(appliedSearch, "label");
    const assignee = extractQueryTokenValues(appliedSearch, "assignee")[0] || "";
    const sort = extractQueryTokenValues(appliedSearch, "sort")[0] || "";

    const freeText = query
      .replace(/\bis:issue\b/gi, "")
      .replace(/\bis:(open|closed)\b/gi, "")
      .replace(/\bstate:(open|closed)\b/gi, "")
      .replace(/\bauthor:(?:"(?:[^"\\]|\\.)*"|\S+)/gi, "")
      .replace(/\blabel:(?:"(?:[^"\\]|\\.)*"|\S+)/gi, "")
      .replace(/\bassignee:(?:"(?:[^"\\]|\\.)*"|\S+)/gi, "")
      .replace(/\bproject:(?:"(?:[^"\\]|\\.)*"|\S+)/gi, "")
      .replace(/\bmilestone:(?:"(?:[^"\\]|\\.)*"|\S+)/gi, "")
      .replace(/\bsort:(?:"(?:[^"\\]|\\.)*"|\S+)/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return { queryState, freeText, author, labels, assignee, sort };
  }, [activeFilter, appliedSearch]);

  const filteredIssues = useMemo(() => {
    const matches = issues.filter((issue) => {
      if (issue.status !== queryFilter.queryState) {
        return false;
      }

      if (queryFilter.author) {
        const creatorName = (collaboratorNameById[issue.creator_id] || "").toLowerCase();
        if (creatorName !== queryFilter.author) {
          return false;
        }
      }

      if (queryFilter.assignee) {
        const assigneeNames = (assigneesByIssueId[issue.id] || []).map((assignee) =>
          (collaboratorNameById[assignee.user_id] || "").toLowerCase(),
        );
        if (!assigneeNames.includes(queryFilter.assignee)) {
          return false;
        }
      }

      if (queryFilter.labels.length > 0) {
        const issueLabelNames = (labelsByIssueId[issue.id] || []).map((label) => label.name.toLowerCase());
        if (!queryFilter.labels.every((labelName) => issueLabelNames.includes(labelName))) {
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
      const resolvedSortOrder = queryFilter.sort === "created-asc"
        ? "oldest"
        : queryFilter.sort === "created-desc"
          ? "newest"
          : sortOrder;

      if (resolvedSortOrder === "oldest") {
        return Date.parse(a.created_at) - Date.parse(b.created_at);
      }

      return Date.parse(b.created_at) - Date.parse(a.created_at);
    });
  }, [assigneesByIssueId, collaboratorNameById, issues, labelsByIssueId, queryFilter, sortOrder]);

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

      await Promise.all([
        ...[...createAssignees].map((userId) => issuesApi.assign(repoId, createdIssue.id, { user_id: userId })),
        ...[...createLabels].map((labelId) => labelsApi.add(repoId, createdIssue.id, { label_id: labelId })),
      ]);

      setCreateTitle('');
      setCreateDescription('');
      setDescriptionPreview(false);
      setCreateAssignees(new Set());
      setCreateLabels(new Set());
      setCreateMenu(null);
      setSelectedIssueIds(new Set());
      setMessage('Issue created successfully.');

      await loadIssues(true);

      if (!createMore) {
        setActiveFilter(createdIssue.status);
        setSearchInput(replaceStateQueryToken(searchInput, createdIssue.status));
        setAppliedSearch(replaceStateQueryToken(appliedSearch, createdIssue.status));
        onCloseCreate();
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to create issue';
      setError(errMsg);
    } finally {
      setCreatingIssue(false);
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

    const sortToken = extractQueryTokenValues(normalized, "sort")[0];
    if (sortToken === "created-asc") {
      setSortOrder("oldest");
    } else if (sortToken === "created-desc") {
      setSortOrder("newest");
    }
  };

  const applySearchToken = (key: "author" | "label" | "assignee" | "project" | "milestone", value: string, replace = true) => {
    const baseQuery = searchInput || appliedSearch || "is:issue state:open";
    const tokenSelected = extractQueryTokenValues(baseQuery, key).includes(value.trim().toLowerCase());
    const nextQuery = tokenSelected
      ? replace
        ? stripQueryToken(baseQuery, key)
        : removeQueryTokenValue(baseQuery, key, value)
      : appendQueryToken(baseQuery, key, value, { replace });

    setSearchInput(nextQuery);
    setAppliedSearch(nextQuery);
    setOpenMenu(null);
  };

  const applySortToken = (nextSortOrder: "newest" | "oldest") => {
    const baseQuery = searchInput || appliedSearch || "is:issue state:open";
    const sortValue = nextSortOrder === "newest" ? "created-desc" : "created-asc";
    const tokenSelected = extractQueryTokenValues(baseQuery, "sort").includes(sortValue);
    const nextQuery = tokenSelected
      ? stripQueryToken(baseQuery, "sort")
      : appendQueryToken(baseQuery, "sort", sortValue, { replace: true });

    setSortOrder(tokenSelected ? "newest" : nextSortOrder);
    setSearchInput(nextQuery);
    setAppliedSearch(nextQuery);
    setOpenMenu(null);
  };

  const selectedVisible = useMemo(
    () => filteredIssues.filter((issue) => selectedIssueIds.has(issue.id)),
    [filteredIssues, selectedIssueIds],
  );
  const selectionActive = selectedVisible.length > 0;

  const toggleMenu = (menu: NonNullable<typeof openMenu>) =>
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

  const toggleCreateAssignee = (userId: string) =>
    setCreateAssignees((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  const toggleCreateLabel = (labelId: string) =>
    setCreateLabels((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) next.delete(labelId);
      else next.add(labelId);
      return next;
    });

  const assignYourself = () => {
    const me = collaborators.find((c) => c.username === currentUsername);
    if (me) toggleCreateAssignee(me.user_id);
  };

  const visibleCollaborators = collaborators.filter((c) =>
    (c.username ?? "").toLowerCase().includes(assigneeFilter.trim().toLowerCase()),
  );
  const visibleLabels = repoLabels.filter((l) =>
    (l.name ?? "").toLowerCase().includes(labelFilter.trim().toLowerCase()),
  );

  const issueAuthorOptions = useMemo(() => {
    const names = new Set<string>();
    issues.forEach((issue) => {
      const name = collaboratorNameById[issue.creator_id];
      if (name) {
        names.add(name);
      }
    });

    if (currentUsername) {
      names.add(currentUsername);
    }

    return [...names].sort((a, b) => a.localeCompare(b));
  }, [collaboratorNameById, currentUsername, issues]);

  const hasQueryValue = (key: string, value: string) =>
    extractQueryTokenValues(appliedSearch, key).includes(value.trim().toLowerCase());


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

      {isCreating ? (
        <div className="w-full">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create new issue</h2>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            <form onSubmit={handleCreateIssue} className="flex-1 min-w-0 space-y-4">
              <div>
                <label className="block mb-1 text-sm font-semibold text-[var(--text-primary)]">
                  Add a title <span className="text-[var(--text-danger)]">*</span>
                </label>
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full h-10 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-semibold text-[var(--text-primary)]">Add a description</label>
                <div className="rounded-md border border-[var(--border-default)] overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[var(--border-muted)] bg-[var(--surface-canvas)] px-2">
                    <div className="flex">
                      <button
                        type="button"
                        onClick={() => setDescriptionPreview(false)}
                        className={`h-9 px-3 text-sm ${!descriptionPreview ? "border-b-2 border-[var(--accent-primary)] font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setDescriptionPreview(true)}
                        className={`h-9 px-3 text-sm ${descriptionPreview ? "border-b-2 border-[var(--accent-primary)] font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
                      >
                        Preview
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                      {[Heading, Bold, Italic, ListOrdered, Code, Link, List].map((Icon, i) => (
                        <span key={i} className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-[var(--surface-hover)]">
                          <Icon size={15} />
                        </span>
                      ))}
                    </div>
                  </div>
                  {descriptionPreview ? (
                    <div className="min-h-64 px-3 py-2 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                      {createDescription.trim() || "Nothing to preview"}
                    </div>
                  ) : (
                    <textarea
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      placeholder="Type your description here..."
                      className="w-full min-h-64 px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--surface-canvas)] resize-y"
                    />
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Paste, drop, or click to add files</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <label className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                  <input type="checkbox" checked={createMore} onChange={(e) => setCreateMore(e.target.checked)} className="h-4 w-4" />
                  Create more
                </label>
                <button
                  type="button"
                  onClick={onCloseCreate}
                  className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingIssue || !createTitle.trim()}
                  className="h-8 px-4 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
                >
                  {creatingIssue ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>

            <aside className="w-full lg:w-72 lg:shrink-0 space-y-4 text-sm">
              <div className="relative pb-4 border-b border-[var(--border-muted)]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-primary)]">Assignees</span>
                  <button
                    type="button"
                    aria-label="Edit assignees"
                    onClick={() => setCreateMenu((m) => (m === "assignees" ? null : "assignees"))}
                    className="h-6 w-6 inline-flex items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  >
                    <Settings size={14} />
                  </button>
                </div>
                {createAssignees.size === 0 ? (
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    No one
                    {collaborators.some((c) => c.username === currentUsername) ? (
                      <>
                        {" "}&mdash;{" "}
                        <button type="button" onClick={assignYourself} className="text-[var(--text-link)] hover:underline">
                          Assign yourself
                        </button>
                      </>
                    ) : null}
                  </p>
                ) : (
                  <div className="mt-2 space-y-1">
                    {[...createAssignees].map((userId) => {
                      const name = collaboratorNameById[userId] || userId;
                      return (
                        <div key={userId} className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[10px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
                            {name.charAt(0)}
                          </span>
                          <span className="font-medium text-[var(--text-primary)]">{name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {createMenu === "assignees" ? (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setCreateMenu(null)} aria-hidden />
                    <div className="absolute left-0 z-20 mt-1 w-80 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg">
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
                                  onClick={() => toggleCreateAssignee(collaborator.user_id)}
                                  className="w-full px-2 py-1.5 text-left inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                                >
                                  <input type="checkbox" readOnly checked={createAssignees.has(collaborator.user_id)} className="h-4 w-4" />
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
                    </div>
                  </>
                ) : null}
              </div>

              <div className="relative pb-4 border-b border-[var(--border-muted)]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-primary)]">Labels</span>
                  <button
                    type="button"
                    aria-label="Edit labels"
                    onClick={() => setCreateMenu((m) => (m === "labels" ? null : "labels"))}
                    className="h-6 w-6 inline-flex items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  >
                    <Settings size={14} />
                  </button>
                </div>
                {createLabels.size === 0 ? (
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">None yet</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {repoLabels
                      .filter((label) => createLabels.has(label.id))
                      .map((label) => (
                        <span
                          key={label.id}
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: label.color, color: labelTextColor(label.color) }}
                        >
                          {label.name}
                        </span>
                      ))}
                  </div>
                )}
                {createMenu === "labels" ? (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setCreateMenu(null)} aria-hidden />
                    <div className="absolute left-0 z-20 mt-1 w-80 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg">
                      <div className="p-2">
                        <p className="px-1 pb-1 text-xs font-semibold text-[var(--text-secondary)]">Apply labels to this issue</p>
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
                                  onClick={() => toggleCreateLabel(label.id)}
                                  className="w-full px-2 py-1.5 text-left inline-flex items-start gap-2 hover:bg-[var(--surface-hover)]"
                                >
                                  <input type="checkbox" readOnly checked={createLabels.has(label.id)} className="mt-0.5 h-4 w-4" />
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
                    </div>
                  </>
                ) : null}
              </div>

              {[
                { label: "Projects", value: "None yet" },
                { label: "Milestone", value: "No milestone" },
              ].map((section) => (
                <div key={section.label} className="pb-4 border-b border-[var(--border-muted)]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)]">{section.label}</span>
                    <Settings size={14} className="text-[var(--text-secondary)]" />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">{section.value}</p>
                </div>
              ))}
            </aside>
          </div>
        </div>
      ) : (
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
                onClick={onOpenCreate}
                className="h-9 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold inline-flex items-center gap-2 hover:bg-[var(--accent-primary-hover)]"
              >
                New issue
              </button>
            </div>
          </div>
        </div>

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

                <button
                  type="button"
                  className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                >
                  <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" className="inline-block">
                    <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16h-8.5a.75.75 0 0 1 0-1.5h8.5a.25.25 0 0 0 .25-.25V6.5h-13v1.75a.75.75 0 0 1-1.5 0ZM6.5 5h8V1.75a.25.25 0 0 0-.25-.25H6.5Zm-5 0H5V1.5H1.75a.25.25 0 0 0-.25.25Z" />
                    <path d="M1.5 13.737a2.25 2.25 0 0 1 2.262-2.25L4 11.49v1.938c0 .218.26.331.42.183l2.883-2.677a.25.25 0 0 0 0-.366L4.42 7.89a.25.25 0 0 0-.42.183V9.99l-.23-.001A3.75 3.75 0 0 0 0 13.738v1.012a.75.75 0 0 0 1.5 0v-1.013Z" />
                  </svg>
                  Project
                  <ChevronDown size={14} />
                </button>

                <button
                  type="button"
                  className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                >
                  <Milestone size={14} />
                  Milestone
                  <ChevronDown size={14} />
                </button>
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
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <FilterDropdown
              label="Author"
              open={openMenu === "filter-author"}
              onToggle={() => toggleMenu("filter-author")}
            >
              <div className="p-2">
                <p className="px-1 pb-1 text-xs font-semibold text-[var(--text-secondary)]">Filter by author</p>
                <ul className="max-h-72 overflow-auto">
                  {issueAuthorOptions.length === 0 ? (
                    <li className="px-2 py-2 text-xs text-[var(--text-secondary)]">No authors found</li>
                  ) : (
                    issueAuthorOptions.map((author) => (
                      <li key={author}>
                        <button
                          type="button"
                          onClick={() => applySearchToken("author", author)}
                          className="w-full px-2 py-1.5 text-left inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                        >
                          <span className="h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[10px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
                            {author.charAt(0)}
                          </span>
                          <span className="flex-1 text-sm text-[var(--text-primary)]">{author}</span>
                          {hasQueryValue("author", author) ? <CheckCircle2 size={14} className="text-[var(--fgColor-open,#1a7f37)]" /> : null}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </FilterDropdown>

            <FilterDropdown
              label="Labels"
              open={openMenu === "filter-label"}
              onToggle={() => toggleMenu("filter-label")}
              width="w-80"
            >
              <div className="p-2">
                <p className="px-1 pb-1 text-xs font-semibold text-[var(--text-secondary)]">Filter by label</p>
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
                          onClick={() => applySearchToken("label", label.name, false)}
                          className="w-full px-2 py-1.5 text-left inline-flex items-start gap-2 hover:bg-[var(--surface-hover)]"
                        >
                          <span className="mt-1 h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-[var(--text-primary)]">{label.name}</span>
                            {label.description ? (
                              <span className="block text-xs text-[var(--text-secondary)]">{label.description}</span>
                            ) : null}
                          </span>
                          {hasQueryValue("label", label.name) ? <CheckCircle2 size={14} className="mt-0.5 text-[var(--fgColor-open,#1a7f37)]" /> : null}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </FilterDropdown>

            <FilterDropdown
              label="Projects"
              open={openMenu === "filter-project"}
              onToggle={() => toggleMenu("filter-project")}
            >
              <div className="p-3 text-sm">
                <p className="font-semibold text-[var(--text-primary)]">Filter by project</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">No projects are available for this repository.</p>
              </div>
            </FilterDropdown>

            <FilterDropdown
              label="Milestones"
              open={openMenu === "filter-milestone"}
              onToggle={() => toggleMenu("filter-milestone")}
            >
              <div className="p-3 text-sm">
                <p className="font-semibold text-[var(--text-primary)]">Filter by milestone</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">No milestones are available for this repository.</p>
              </div>
            </FilterDropdown>

            <FilterDropdown
              label="Assignees"
              open={openMenu === "filter-assignee"}
              onToggle={() => toggleMenu("filter-assignee")}
            >
              <div className="p-2">
                <p className="px-1 pb-1 text-xs font-semibold text-[var(--text-secondary)]">Filter by assignee</p>
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
                    visibleCollaborators.map((collaborator) => {
                      const name = collaborator.username ?? collaborator.user_id;
                      return (
                        <li key={collaborator.user_id}>
                          <button
                            type="button"
                            onClick={() => applySearchToken("assignee", name)}
                            className="w-full px-2 py-1.5 text-left inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                          >
                            <span className="h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[10px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
                              {name.charAt(0)}
                            </span>
                            <span className="flex-1 text-sm text-[var(--text-primary)]">{name}</span>
                            {hasQueryValue("assignee", name) ? <CheckCircle2 size={14} className="text-[var(--fgColor-open,#1a7f37)]" /> : null}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </FilterDropdown>

            <FilterDropdown
              label={sortOrder === "newest" ? "Newest" : "Oldest"}
              open={openMenu === "filter-sort"}
              onToggle={() => toggleMenu("filter-sort")}
              width="w-44"
            >
              <ul className="py-1 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => applySortToken("newest")}
                    className="w-full px-3 py-2 text-left inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                  >
                    <span className="flex-1">Newest</span>
                    {sortOrder === "newest" ? <CheckCircle2 size={14} className="text-[var(--fgColor-open,#1a7f37)]" /> : null}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => applySortToken("oldest")}
                    className="w-full px-3 py-2 text-left inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                  >
                    <span className="flex-1">Oldest</span>
                    {sortOrder === "oldest" ? <CheckCircle2 size={14} className="text-[var(--fgColor-open,#1a7f37)]" /> : null}
                  </button>
                </li>
              </ul>
            </FilterDropdown>
          </div>
            </>
          )}
        </div>

        {listLoading ? null : filteredIssues.length === 0 ? (
          <div className="py-16 text-center">
            <CircleDot size={24} className="mx-auto text-[var(--text-muted)]" />
            <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">No {activeFilter.toLowerCase()} issues found</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Create an issue or adjust the search and filters.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-muted)]">
            {filteredIssues.map((issue) => {
              const issueNo = issueNumberMap.get(issue.id) || 0;
              const isSelected = selectedIssueIds.has(issue.id);
              const showNotPlanned = issue.status === "CLOSED" && issue.close_reason === "NOT_PLANNED";
              const issueLabels = labelsByIssueId[issue.id] || [];
              const creatorName = collaboratorNameById[issue.creator_id] || "Someone";
              const youCreated = creatorName === currentUsername;
              const youAssigned = (assigneesByIssueId[issue.id] || []).some((a) => collaboratorNameById[a.user_id] === currentUsername);
              const hoverNote =
                youCreated && youAssigned
                  ? "You are assigned to and opened this issue"
                  : youCreated
                    ? "You opened this issue"
                    : youAssigned
                      ? "You are assigned to this issue"
                      : `${creatorName} opened this issue`;
              const statusColor = issue.status === "OPEN" ? "#1a7f37" : showNotPlanned ? "#6e7781" : "#8250df";
              const statusLabel = issue.status === "OPEN" ? "Open" : showNotPlanned ? "Closed as not planned" : "Closed";

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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="relative group/card inline-block">
                          <span
                            onClick={() => onOpenIssue(issueNo)}
                            className="text-sm font-semibold text-[var(--text-primary)] cursor-pointer hover:text-[var(--text-link)] hover:underline"
                          >
                            {issue.title}
                          </span>
                          <div className="hidden group-hover/card:block absolute left-0 top-full z-30 mt-2 w-96 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg text-left font-normal">
                            <div className="p-3 border-b border-[var(--border-muted)]">
                              <p className="text-xs text-[var(--text-secondary)]">{repoOwner}/{repoName} {formatIssueDate(issue.created_at)}</p>
                              <p className="mt-1 text-sm">
                                <span className="font-semibold text-[var(--text-primary)]">{issue.title}</span>{" "}
                                <span className="text-[var(--text-secondary)]">#{issueNo}</span>
                              </p>
                              <span
                                className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                                style={{ backgroundColor: statusColor }}
                              >
                                {issue.status === "OPEN" ? <CircleDot size={13} /> : showNotPlanned ? <CircleSlash size={13} /> : <CheckCircle2 size={13} />}
                                {statusLabel}
                              </span>
                            </div>
                            <div className="p-3 text-sm text-[var(--text-secondary)] border-b border-[var(--border-muted)]">
                              {issue.description.trim() || "No description provided"}
                            </div>
                            {issueLabels.length > 0 ? (
                              <div className="px-3 py-2 flex flex-wrap gap-1 border-b border-[var(--border-muted)]">
                                {issueLabels.map((label) => (
                                  <span
                                    key={label.id}
                                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                    style={{ backgroundColor: label.color, color: labelTextColor(label.color) }}
                                  >
                                    {label.name}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <div className="px-3 py-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                              <span className="h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[10px] inline-flex items-center justify-center uppercase">
                                {creatorName.charAt(0)}
                              </span>
                              {hoverNote}
                            </div>
                          </div>
                        </span>
                        {(labelsByIssueId[issue.id] || []).map((label) => (
                          <span
                            key={label.id}
                            className="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight"
                            style={{ backgroundColor: label.color, color: labelTextColor(label.color) }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
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

                    <div className="flex items-center -space-x-1 shrink-0">
                      {(assigneesByIssueId[issue.id] || []).map((assignee) => {
                        const name = collaboratorNameById[assignee.user_id] || assignee.user_id;
                        return (
                          <span
                            key={assignee.user_id}
                            title={name}
                            className="h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[10px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)] ring-1 ring-[var(--surface-canvas)]"
                          >
                            {name.charAt(0)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      )}
    </div>
  );
}

