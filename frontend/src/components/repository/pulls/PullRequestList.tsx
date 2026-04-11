import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Branch, PullRequest } from "../../../types";
import { pullsApi } from "../../../services/api/pull";
import {
  CircleDot,
  GitMerge,
  GitPullRequest,
  Milestone,
  Plus,
  Search,
  Tag,
  XCircle,
} from "lucide-react";

interface PullRequestListProps {
  repoId: string;
  branches: Branch[];
  defaultSourceBranch: string;
}

export default function PullRequestList({ repoId, branches, defaultSourceBranch }: PullRequestListProps) {
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creatingPR, setCreatingPR] = useState<boolean>(false);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<"OPEN" | "CLOSED">("OPEN");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [prTitle, setPrTitle] = useState("");
  const [prDescription, setPrDescription] = useState("");
  const [prSourceBranch, setPrSourceBranch] = useState("");
  const [prTargetBranch, setPrTargetBranch] = useState("");

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
    setShowCreateForm(false);
    setMessage(null);
    setError(null);
    setActiveFilter("OPEN");
    setPrTitle("");
    setPrDescription("");
  }, [repoId, fetchPulls]);

  useEffect(() => {
    if (branches.length === 0) {
      setPrSourceBranch("");
      setPrTargetBranch("");
      return;
    }

    const defaultSource =
      defaultSourceBranch && branches.some((branch) => branch.name === defaultSourceBranch)
        ? defaultSourceBranch
        : branches[0].name;
    const defaultTarget = branches.find((branch) => branch.is_default)?.name || branches[0].name;

    setPrSourceBranch(defaultSource);
    setPrTargetBranch(defaultTarget);
  }, [branches, defaultSourceBranch, repoId]);

  const sortedPulls = useMemo(
    () => [...pulls].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [pulls],
  );

  const pullNumberMap = useMemo(() => {
    const mapping = new Map<string, number>();
    sortedPulls.forEach((pull, index) => {
      mapping.set(pull.id, sortedPulls.length - index);
    });
    return mapping;
  }, [sortedPulls]);

  const openCount = useMemo(
    () => pulls.filter((pull) => pull.status === "OPEN").length,
    [pulls],
  );

  const closedCount = useMemo(
    () => pulls.filter((pull) => pull.status !== "OPEN").length,
    [pulls],
  );

  const filteredPulls = useMemo(
    () =>
      sortedPulls.filter((pull) =>
        activeFilter === "OPEN" ? pull.status === "OPEN" : pull.status !== "OPEN",
      ),
    [sortedPulls, activeFilter],
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

  const handleCreatePR = async (e: FormEvent) => {
    e.preventDefault();
    if (!prTitle.trim() || !prSourceBranch || !prTargetBranch) return;

    if (prSourceBranch === prTargetBranch) {
      setError("Source and target branches must be different");
      return;
    }

    try {
      setCreatingPR(true);
      setError(null);
      setMessage(null);

      await pullsApi.create(repoId, {
        title: prTitle.trim(),
        description: prDescription.trim(),
        source_branch: prSourceBranch,
        target_branch: prTargetBranch,
      });

      setPrTitle("");
      setPrDescription("");
      setShowCreateForm(false);
      setMessage("Pull request created successfully.");
      await fetchPulls(true);
      setActiveFilter("OPEN");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create pull request");
    } finally {
      setCreatingPR(false);
    }
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

      <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4 text-center">
        <p className="text-[34px] leading-[1.25] font-semibold text-[var(--text-primary)]">
          Label issues and pull requests for new contributors
        </p>
        <p className="mt-2 text-lg text-[var(--text-secondary)]">
          Now, GitHub will help potential first-time contributors discover issues labeled with good first issue.
        </p>
      </section>

      <div className="flex flex-col xl:flex-row xl:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            readOnly
            value="is:pr is:open"
            className="h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-9 pr-3 text-sm text-[var(--text-secondary)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:shrink-0">
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
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="h-9 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold inline-flex items-center gap-2 hover:bg-[var(--accent-primary-hover)]"
          >
            <Plus size={14} />
            New pull request
          </button>
        </div>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreatePR} className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Create a pull request</h3>
          <input
            value={prTitle}
            onChange={(e) => setPrTitle(e.target.value)}
            placeholder="Title"
            className="w-full h-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
            required
          />
          <textarea
            value={prDescription}
            onChange={(e) => setPrDescription(e.target.value)}
            placeholder="Description"
            className="w-full min-h-24 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select
              value={prSourceBranch}
              onChange={(e) => setPrSourceBranch(e.target.value)}
              className="h-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-2 text-sm text-[var(--text-primary)]"
            >
              {branches.map((branch) => (
                <option key={`source-${branch.name}`} value={branch.name}>
                  from: {branch.name}
                </option>
              ))}
            </select>
            <select
              value={prTargetBranch}
              onChange={(e) => setPrTargetBranch(e.target.value)}
              className="h-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-2 text-sm text-[var(--text-primary)]"
            >
              {branches.map((branch) => (
                <option key={`target-${branch.name}`} value={branch.name}>
                  into: {branch.name}
                </option>
              ))}
            </select>
          </div>
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
              disabled={creatingPR || branches.length < 2}
              className="h-8 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
            >
              {creatingPR ? "Creating..." : "Create pull request"}
            </button>
          </div>
        </form>
      )}

      <section className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-muted)] flex items-center gap-4 text-sm">
          <button
            type="button"
            onClick={() => setActiveFilter("OPEN")}
            className={`${activeFilter === "OPEN" ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
          >
            Open <span className="ml-1 rounded-full bg-[var(--surface-badge)] px-2 py-0.5 text-xs">{openCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("CLOSED")}
            className={`${activeFilter === "CLOSED" ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
          >
            Closed <span className="ml-1 rounded-full bg-[var(--surface-badge)] px-2 py-0.5 text-xs">{closedCount}</span>
          </button>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-[var(--text-secondary)]">Loading pull requests...</div>
        ) : filteredPulls.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <GitPullRequest size={26} className="mx-auto text-[var(--text-muted)]" />
            <p className="text-[40px] leading-[1.2] font-semibold text-[var(--text-primary)]">
              There aren&apos;t any {activeFilter === "OPEN" ? "open" : "closed"} pull requests.
            </p>
            <p className="text-lg text-[var(--text-secondary)]">
              You could search all pull requests or try an advanced search.
            </p>
          </div>
        ) : (
          <ul>
            {filteredPulls.map((pull) => {
              const pullNo = pullNumberMap.get(pull.id) || 0;
              const statusBadge =
                pull.status === "OPEN"
                  ? "bg-[var(--surface-green-emphasis)] text-[var(--accent-line)]"
                  : pull.status === "MERGED"
                    ? "bg-[var(--status-purple-subtle)] text-[var(--text-accent-purple)]"
                    : "bg-[var(--surface-danger-subtle)] text-[var(--text-danger)]";

              return (
                <li key={pull.id} className="border-t border-[var(--border-muted)] first:border-t-0 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-[var(--text-primary)] hover:text-[var(--text-link)] truncate">{pull.title}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)] flex items-center gap-2 flex-wrap">
                        {pull.status === "OPEN" ? (
                          <CircleDot size={14} className="text-[var(--accent-line)]" />
                        ) : pull.status === "MERGED" ? (
                          <GitMerge size={14} className="text-[var(--text-accent-purple)]" />
                        ) : (
                          <XCircle size={14} className="text-[var(--text-danger)]" />
                        )}
                        <span>
                          #{pullNo} {pull.status === "OPEN" ? "opened" : "updated"} {toRelativeTime(pull.created_at)}
                        </span>
                        <span>
                          {pull.source_branch} into {pull.target_branch}
                        </span>
                      </p>
                    </div>

                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${statusBadge}`}>
                      {pull.status}
                    </span>
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

