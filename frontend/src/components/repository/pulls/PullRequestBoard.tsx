import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { QueryInput } from "../../shared/QueryInput";
import type { Label, PullRequest, RepoCollaborator } from "../../../types";
import { pullsApi } from "../../../services/api/pull";
import { collaboratorsApi, labelsApi } from "../../../services/api";
import {
  Check,
  CheckCircle2,
  GitMerge,
  MessageSquare,
  Milestone,
  Search,
  Tag,
  Users,
} from "lucide-react";
import { OcticonGitPullRequest, OcticonGitPullRequestClosed } from "../../icons/Octicons";

interface PullRequestBoardProps {
  repoId: string;
  currentUsername: string;
  onOpenCompare: () => void;
  onOpenPullRequest: (pullNumber: number) => void;
}

function labelTextColor(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return "#1f2328";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? "#1f2328" : "#ffffff";
}

function replaceStateQueryToken(query: string, nextStatus: "OPEN" | "CLOSED"): string {
  const stripped = query
    .replace(/\bis:pr\b/gi, "")
    .replace(/\bstate:(open|closed)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const prefix = `is:pr state:${nextStatus.toLowerCase()}`;
  return stripped ? `${prefix} ${stripped}` : prefix;
}

function extractStateQueryToken(query: string): "OPEN" | "CLOSED" | null {
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
        <span className="inline-block w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-current align-middle ml-0.5" />
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
  children,
  width,
}: {
  icon: ReactNode;
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
        className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
      >
        {icon}
        {label}
        <span className="inline-block w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-current align-middle ml-0.5" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} aria-hidden />
          <div
            className={`absolute right-0 mt-1 z-20 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg ${width || "w-56"}`}
          >
            {children}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function PullRequestBoard({
  repoId,
  currentUsername,
  onOpenCompare,
  onOpenPullRequest,
}: PullRequestBoardProps) {
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [collaborators, setCollaborators] = useState<RepoCollaborator[]>([]);
  const [repoLabels, setRepoLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFiltersMenu, setShowFiltersMenu] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<"OPEN" | "CLOSED">("OPEN");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [searchInput, setSearchInput] = useState<string>("is:pr state:open");
  const [appliedSearch, setAppliedSearch] = useState<string>("is:pr state:open");
  const [selectedPullIds, setSelectedPullIds] = useState<Set<string>>(new Set());
  const [labelFilter, setLabelFilter] = useState<string>("");
  const [labelsByPullId, setLabelsByPullId] = useState<Record<string, Label[]>>({});
  const [assigneesByPullId, setAssigneesByPullId] = useState<Record<string, Array<{ user_id: string }>>>({});
  const [openMenu, setOpenMenu] = useState<
    "mark" | "filter-author" | "filter-label" | "filter-project" | "filter-milestone" | "filter-review" | "filter-assignee" | "filter-sort" | null
  >(null);
  const [showMaintainerTip, setShowMaintainerTip] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPulls = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        setError(null);
        const data = await pullsApi.list(repoId);
        const pullList = Array.isArray(data) ? data : [];
        setPulls(pullList);

        const labelEntries = await Promise.all(
          pullList.map(async (pull) => {
            try {
              const labels = await pullsApi.listPRLabels(repoId, pull.id);
              return [pull.id, labels || []] as const;
            } catch {
              return [pull.id, []] as const;
            }
          }),
        );
        setLabelsByPullId(Object.fromEntries(labelEntries));

        const assigneeEntries = await Promise.all(
          pullList.map(async (pull) => {
            try {
              const assignees = await pullsApi.listPRAssignees(repoId, pull.id);
              return [pull.id, assignees || []] as const;
            } catch {
              return [pull.id, []] as const;
            }
          }),
        );
        setAssigneesByPullId(Object.fromEntries(assigneeEntries));
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
    void collaboratorsApi.list(repoId).then((list) => setCollaborators(list || [])).catch(() => setCollaborators([]));
    void labelsApi.listForRepo(repoId).then((labels) => setRepoLabels(labels || [])).catch(() => setRepoLabels([]));
    setShowFiltersMenu(false);
    setError(null);
    setActiveFilter("OPEN");
    setSortOrder("newest");
    setSearchInput("is:pr state:open");
    setAppliedSearch("is:pr state:open");
    setSelectedPullIds(new Set());
    setLabelFilter("");
    setOpenMenu(null);
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

  const collaboratorNameById = useMemo(() => {
    const map: Record<string, string> = {};
    collaborators.forEach((collaborator) => {
      if (collaborator.username) {
        map[collaborator.user_id] = collaborator.username;
      }
    });
    return map;
  }, [collaborators]);

  const queryFilter = useMemo(() => {
    const query = appliedSearch.toLowerCase();

    const queryState = extractStateQueryToken(query) ?? activeFilter;
    const author = extractQueryTokenValues(appliedSearch, "author")[0] || "";
    const assignee = extractQueryTokenValues(appliedSearch, "assignee")[0] || "";
    const review = extractQueryTokenValues(appliedSearch, "review")[0] || "";
    const sort = extractQueryTokenValues(appliedSearch, "sort")[0] || "";

    const freeText = query
      .replace(/\bis:pr\b/gi, "")
      .replace(/\bis:(open|closed)\b/gi, "")
      .replace(/\bstate:(open|closed)\b/gi, "")
      .replace(/\bauthor:(?:"(?:[^"\\]|\\.)*"|\S+)/gi, "")
      .replace(/\bassignee:(?:"(?:[^"\\]|\\.)*"|\S+)/gi, "")
      .replace(/\breview:(?:"(?:[^"\\]|\\.)*"|\S+)/gi, "")
      .replace(/\blabel:(?:"(?:[^"\\]|\\.)*"|\S+)/gi, "")
      .replace(/\bproject:(?:"(?:[^"\\]|\\.)*"|\S+)/gi, "")
      .replace(/\bmilestone:(?:"(?:[^"\\]|\\.)*"|\S+)/gi, "")
      .replace(/\bsort:(?:"(?:[^"\\]|\\.)*"|\S+)/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return { queryState, freeText, author, assignee, review, sort };
  }, [activeFilter, appliedSearch]);

  const filteredPulls = useMemo(() => {
    const matched = pulls.filter((pull) => {
      if (queryFilter.queryState === "OPEN" && pull.status !== "OPEN") {
        return false;
      }
      if (queryFilter.queryState === "CLOSED" && pull.status === "OPEN") {
        return false;
      }

      if (queryFilter.author) {
        const creatorName = (collaboratorNameById[pull.creator_id] || "").toLowerCase();
        if (creatorName !== queryFilter.author) {
          return false;
        }
      }

      if (queryFilter.assignee || queryFilter.review) {
        return false;
      }

      if (!queryFilter.freeText) {
        return true;
      }

      const searchable = `${pull.title} ${pull.description || ""} ${pull.source_branch} ${pull.target_branch}`.toLowerCase();
      return searchable.includes(queryFilter.freeText);
    });

    return matched.sort((a, b) => {
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
  }, [collaboratorNameById, pulls, queryFilter, sortOrder]);

  const allVisibleSelected = useMemo(
    () => filteredPulls.length > 0 && filteredPulls.every((pull) => selectedPullIds.has(pull.id)),
    [filteredPulls, selectedPullIds],
  );

  const applyFilter = (status: "OPEN" | "CLOSED") => {
    setActiveFilter(status);
    const nextQuery = replaceStateQueryToken(searchInput, status);
    setSearchInput(nextQuery);
    setAppliedSearch(nextQuery);
  };

  const applySearch = () => {
    const normalized = searchInput.trim() || "is:pr state:open";
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

  const toggleMenu = (menu: NonNullable<typeof openMenu>) =>
    setOpenMenu((prev) => (prev === menu ? null : menu));

  const applySearchToken = (key: "author" | "label" | "assignee" | "review", value: string) => {
    const baseQuery = searchInput || appliedSearch || "is:pr state:open";
    const tokenSelected = extractQueryTokenValues(baseQuery, key).includes(value.trim().toLowerCase());
    const nextQuery = tokenSelected
      ? stripQueryToken(baseQuery, key)
      : appendQueryToken(baseQuery, key, value, { replace: true });

    setSearchInput(nextQuery);
    setAppliedSearch(nextQuery);
    setOpenMenu(null);
  };

  const applySortToken = (nextSortOrder: "newest" | "oldest") => {
    const baseQuery = searchInput || appliedSearch || "is:pr state:open";
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

  const selectedVisible = useMemo(
    () => filteredPulls.filter((pull) => selectedPullIds.has(pull.id)),
    [filteredPulls, selectedPullIds],
  );
  const selectionActive = selectedVisible.length > 0;

  const pullAuthorOptions = useMemo(() => {
    const names = new Set<string>();
    pulls.forEach((pull) => {
      const name = collaboratorNameById[pull.creator_id];
      if (name) {
        names.add(name);
      }
    });

    if (currentUsername) {
      names.add(currentUsername);
    }

    return [...names].sort((a, b) => a.localeCompare(b));
  }, [collaboratorNameById, currentUsername, pulls]);

  const hasQueryValue = (key: string, value: string) =>
    extractQueryTokenValues(appliedSearch, key).includes(value.trim().toLowerCase());

  const visibleLabels = repoLabels.filter((label) =>
    (label.name ?? "").toLowerCase().includes(labelFilter.trim().toLowerCase()),
  );

  const bulkMarkAs = async (target: "OPEN" | "CLOSED") => {
    setOpenMenu(null);
    try {
      setError(null);
      await Promise.all(
        selectedVisible
          .filter((pull) => {
            if (target === "OPEN") {
              return pull.status === "CLOSED";
            }
            return pull.status === "OPEN";
          })
          .map((pull) => target === "OPEN" ? pullsApi.reopen(repoId, pull.id) : pullsApi.close(repoId, pull.id)),
      );
      setSelectedPullIds(new Set());
      await fetchPulls(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update pull requests");
    }
  };

  const [checkedLabels, setCheckedLabels] = useState<Set<string>>(new Set());
  const [checkedAssignees, setCheckedAssignees] = useState<Set<string>>(new Set());

  const togglePRLabel = async (labelId: string) => {
    const isChecked = checkedLabels.has(labelId);
    console.log("togglePRLabel", { labelId, isChecked, selectedVisible: selectedVisible.map(p => p.id) });
    try {
      setError(null);
      if (isChecked) {
        await Promise.all(selectedVisible.map((pull) => pullsApi.removePRLabel(repoId, pull.id, labelId)));
        setCheckedLabels((prev) => { const next = new Set(prev); next.delete(labelId); return next; });
      } else {
        await Promise.all(selectedVisible.map((pull) => pullsApi.addPRLabel(repoId, pull.id, labelId)));
        setCheckedLabels((prev) => new Set(prev).add(labelId));
      }
      await fetchPulls(true);
      console.log("togglePRLabel success");
    } catch (err: unknown) {
      console.error("togglePRLabel error", err);
      setError(err instanceof Error ? err.message : "Failed to update labels");
    }
  };

  const togglePRAssignee = async (userId: string) => {
    const isChecked = checkedAssignees.has(userId);
    try {
      setError(null);
      if (isChecked) {
        await Promise.all(selectedVisible.map((pull) => pullsApi.removePRAssignee(repoId, pull.id, userId)));
        setCheckedAssignees((prev) => { const next = new Set(prev); next.delete(userId); return next; });
      } else {
        await Promise.all(selectedVisible.map((pull) => pullsApi.addPRAssignee(repoId, pull.id, userId)));
        setCheckedAssignees((prev) => new Set(prev).add(userId));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update assignees");
    }
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

      {showMaintainerTip ? (
        <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4 text-center relative">
          <button
            type="button"
            onClick={() => setShowMaintainerTip(false)}
            className="absolute top-0 right-1 text-sm text-[var(--text-link)] hover:underline"
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
              <span className="inline-block w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-current align-middle ml-0.5" />
            </button>

            {showFiltersMenu ? (
              <div className="absolute left-0 mt-1 z-20 w-[260px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg p-1 text-sm">
                {[
                  { label: "Open pull requests", value: "is:pr state:open" },
                  { label: "Closed pull requests", value: "is:pr state:closed" },
                  { label: "Your pull requests", value: `is:pr state:open author:${currentUsername}` },
                  { label: "Assigned to you", value: `is:pr state:open assignee:${currentUsername}` },
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

          <QueryInput
            value={searchInput}
            onChange={setSearchInput}
            onEnter={applySearch}
            placeholder="Search all pull requests"
            aria-label="Search all pull requests"
            containerClassName="flex-1 min-w-0 h-9 border-y border-[var(--border-default)] bg-[var(--surface-canvas)]"
          />

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
            className="h-9 px-3 rounded-md border border-transparent bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold inline-flex items-center gap-2 hover:bg-[var(--accent-primary-hover)]"
          >
            New pull request
          </button>
        </div>
      </div>

      <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] overflow-visible">
        <div className="px-4 py-3 border-b border-[var(--border-muted)] flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          {selectionActive ? (
            <>
              <div className="flex items-center gap-3 text-sm min-w-0">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all pull requests"
                  className="h-4 w-4"
                />
                <span className="font-semibold text-[var(--text-primary)]">
                  {selectedVisible.length} of {filteredPulls.length} selected
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ToolbarDropdown
                  icon={<OcticonGitPullRequest size={14} />}
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
                        <OcticonGitPullRequest size={16} className="text-[var(--fgColor-open,#1a7f37)]" />
                        Open
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => void bulkMarkAs("CLOSED")}
                        className="w-full px-3 py-2 text-left inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                      >
                        <OcticonGitPullRequestClosed size={16} className="text-[var(--text-danger)]" />
                        Closed
                      </button>
                    </li>
                  </ul>
                </ToolbarDropdown>

                <ToolbarDropdown
                  icon={<Tag size={14} />}
                  label="Label"
                  open={openMenu === "filter-label"}
                  onToggle={() => toggleMenu("filter-label")}
                  width="w-80"
                >
                  <div className="p-2">
                    <p className="px-1 pb-1 text-xs font-semibold text-[var(--text-secondary)]">Apply labels</p>
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
                              onClick={() => void togglePRLabel(label.id)}
                              className="w-full px-2 py-1.5 text-left inline-flex items-start gap-2 hover:bg-[var(--surface-hover)]"
                            >
                              <input type="checkbox" readOnly checked={checkedLabels.has(label.id)} className="mt-0.5 h-4 w-4" />
                              <span className="mt-1 h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                              <span className="min-w-0 flex-1">
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
                  icon={<Milestone size={14} />}
                  label="Milestone"
                  open={openMenu === "filter-milestone"}
                  onToggle={() => toggleMenu("filter-milestone")}
                >
                  <div className="p-3 text-sm">
                    <p className="font-semibold text-[var(--text-primary)]">Set milestone</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">No milestones are available.</p>
                  </div>
                </ToolbarDropdown>

                <ToolbarDropdown
                  icon={<Users size={14} />}
                  label="Assign"
                  open={openMenu === "filter-assignee"}
                  onToggle={() => toggleMenu("filter-assignee")}
                >
                  <div className="p-2">
                    <p className="px-1 pb-1 text-xs font-semibold text-[var(--text-secondary)]">Assign to</p>
                    {collaborators.length === 0 ? (
                      <p className="px-2 py-2 text-xs text-[var(--text-secondary)]">No collaborators found</p>
                    ) : (
                      collaborators.map((collaborator) => {
                        const name = collaborator.username ?? collaborator.user_id;
                        return (
                          <button
                            key={collaborator.user_id}
                            type="button"
                            onClick={() => void togglePRAssignee(collaborator.user_id)}
                            className="w-full px-2 py-1.5 text-left inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                          >
                            <input type="checkbox" readOnly checked={checkedAssignees.has(collaborator.user_id)} className="h-4 w-4" />
                            <span className="h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[10px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
                              {name.charAt(0)}
                            </span>
                            <span className="flex-1 text-sm text-[var(--text-primary)]">{name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </ToolbarDropdown>
              </div>
            </>
          ) : (
            <>
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
                  <OcticonGitPullRequest size={14} />
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
                <FilterDropdown
                  label="Author"
                  open={openMenu === "filter-author"}
                  onToggle={() => toggleMenu("filter-author")}
                >
                  <div className="p-2">
                    <p className="px-1 pb-1 text-xs font-semibold text-[var(--text-secondary)]">Filter by author</p>
                    <ul className="max-h-72 overflow-auto">
                      {pullAuthorOptions.length === 0 ? (
                        <li className="px-2 py-2 text-xs text-[var(--text-secondary)]">No authors found</li>
                      ) : (
                        pullAuthorOptions.map((author) => (
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
                  label="Label"
                  open={openMenu === "filter-label"}
                  onToggle={() => toggleMenu("filter-label")}
                  width="w-80"
                >
                  <div className="p-2">
                    <p className="px-1 pb-1 text-xs font-semibold text-[var(--text-secondary)]">Filter by label</p>
                    <input
                      value={labelFilter}
                      onChange={(event) => setLabelFilter(event.target.value)}
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
                              onClick={() => applySearchToken("label", label.name)}
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
                  label="Reviews"
                  open={openMenu === "filter-review"}
                  onToggle={() => toggleMenu("filter-review")}
                >
                  <div className="p-2">
                    <p className="px-1 pb-1 text-xs font-semibold text-[var(--text-secondary)]">Filter by review state</p>
                    {[
                      { label: "Review required", value: "required" },
                      { label: "Approved", value: "approved" },
                      { label: "Changes requested", value: "changes-requested" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => applySearchToken("review", item.value)}
                        className="w-full px-2 py-1.5 text-left inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                      >
                        <span className="flex-1 text-sm text-[var(--text-primary)]">{item.label}</span>
                        {hasQueryValue("review", item.value) ? <CheckCircle2 size={14} className="text-[var(--fgColor-open,#1a7f37)]" /> : null}
                      </button>
                    ))}
                  </div>
                </FilterDropdown>

                <FilterDropdown
                  label="Assignee"
                  open={openMenu === "filter-assignee"}
                  onToggle={() => toggleMenu("filter-assignee")}
                >
                  <div className="p-2">
                    <p className="px-1 pb-1 text-xs font-semibold text-[var(--text-secondary)]">Filter by assignee</p>
                    {collaborators.length === 0 ? (
                      <p className="px-2 py-2 text-xs text-[var(--text-secondary)]">No collaborators found</p>
                    ) : (
                      collaborators.map((collaborator) => {
                        const name = collaborator.username ?? collaborator.user_id;
                        return (
                          <button
                            key={collaborator.user_id}
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
                        );
                      })
                    )}
                  </div>
                </FilterDropdown>

                <FilterDropdown
                  label={`Sort: ${sortOrder === "newest" ? "Newest" : "Oldest"}`}
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

        {loading ? null : filteredPulls.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <OcticonGitPullRequest size={26} className="mx-auto text-[var(--text-muted)]" />
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
              const creatorName = collaboratorNameById[pull.creator_id] || "Someone";
              const statusIcon =
                pull.status === "OPEN" ? (
                  <OcticonGitPullRequest size={16} className="text-[var(--fgColor-open,#1a7f37)]" />
                ) : pull.status === "MERGED" ? (
                  <GitMerge size={16} className="text-[var(--text-accent-purple)]" />
                ) : (
                  <OcticonGitPullRequestClosed size={16} className="text-[var(--text-danger)]" />
                );

              const isSelected = selectedPullIds.has(pull.id);

              return (
                <div key={pull.id} className="px-4 py-2 hover:bg-[var(--surface-subtle)]">
                  <div className="grid grid-cols-[16px_16px_minmax(0,1fr)_160px] gap-3 items-start">
                    <label className="hidden md:flex items-center h-6">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectPull(pull.id)}
                        aria-label={`Select pull request ${pull.title}`}
                        className="h-4 w-4"
                      />
                    </label>

                    <div className="pt-1">{statusIcon}</div>

                    <div className="min-w-0 pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenPullRequest(pullNo)}
                        title={pull.title}
                        className="text-left text-base font-semibold text-[var(--text-primary)] hover:text-[var(--text-link)]"
                      >
                        {pull.title.length > 50 ? `${pull.title.slice(0, 50)}...` : pull.title}
                      </button>
                      {(labelsByPullId[pull.id] || []).map((label) => (
                        <span
                          key={label.id}
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight"
                          style={{ backgroundColor: label.color, color: labelTextColor(label.color) }}
                        >
                          {label.name}
                        </span>
                      ))}
                      </div>

                      <div className="mt-1 text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-1.5">
                        <span>#{pullNo}</span>
                        <span>opened</span>
                        <span>{formatPullDate(pull.created_at)}</span>
                        <span>by</span>
                        <button
                          type="button"
                          className="text-[var(--text-primary)] hover:text-[var(--text-link)]"
                        >
                          {creatorName}
                        </button>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center justify-end gap-3 pt-1 text-xs text-[var(--text-secondary)]">
                      {(assigneesByPullId[pull.id] || []).length > 0 ? (
                        <span className="inline-flex items-center -space-x-1">
                          {(assigneesByPullId[pull.id] || []).map((a) => {
                            const name = collaboratorNameById[a.user_id] || a.user_id;
                            return (
                              <span
                                key={a.user_id}
                                title={name}
                                className="h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[9px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)] ring-1 ring-[var(--surface-canvas)]"
                              >
                                {name.charAt(0)}
                              </span>
                            );
                          })}
                        </span>
                      ) : null}
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
