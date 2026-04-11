import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, CircleDot, MessageSquare, Milestone, Plus, Search, Tag } from "lucide-react";
import { issuesApi } from "../../../services/api";
import type { Issue, IssueStatus } from "../../../types";

interface IssueBoardProps {
  repoId: string;
}

export default function IssueBoard({ repoId }: IssueBoardProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [creatingIssue, setCreatingIssue] = useState<boolean>(false);
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<IssueStatus>("OPEN");
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
    void loadIssues();
  }, [repoId, loadIssues]);

  const sortedIssues = useMemo(
    () => [...issues].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [issues],
  );

  const issueNumberMap = useMemo(() => {
    const mapping = new Map<string, number>();
    sortedIssues.forEach((issue, index) => {
      mapping.set(issue.id, sortedIssues.length - index);
    });
    return mapping;
  }, [sortedIssues]);

  const openCount = useMemo(
    () => issues.filter((issue) => issue.status === "OPEN").length,
    [issues],
  );

  const closedCount = useMemo(
    () => issues.filter((issue) => issue.status === "CLOSED").length,
    [issues],
  );

  const filteredIssues = useMemo(
    () => sortedIssues.filter((issue) => issue.status === activeFilter),
    [sortedIssues, activeFilter],
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
      setMessage('Issue created successfully.');

      await loadIssues(true);
      setActiveFilter(createdIssue.status);
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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update issue status';
      setError(errMsg);
    } finally {
      setUpdatingIssueId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-sm border border-[#ff818266] bg-[#ffebe9] text-[#cf222e] rounded-md">
          {error}
        </div>
      )}

      {message && (
        <div className="p-3 text-sm border border-[#d0ebff] bg-[#ddf4ff] text-[#0969da] rounded-md">
          {message}
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c959f]" />
          <input
            type="text"
            readOnly
            value="is:issue state:open"
            className="h-9 w-full rounded-md border border-[#d1d9e0] bg-white pl-9 pr-3 text-sm text-[#57606a]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:shrink-0">
          <button type="button" className="h-9 px-3 rounded-md border border-[#d1d9e0] bg-[#f6f8fa] text-sm text-[#24292f] inline-flex items-center gap-2">
            <Tag size={14} />
            Labels
          </button>
          <button type="button" className="h-9 px-3 rounded-md border border-[#d1d9e0] bg-[#f6f8fa] text-sm text-[#24292f] inline-flex items-center gap-2">
            <Milestone size={14} />
            Milestones
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="h-9 px-3 rounded-md bg-[#2da44e] text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#2c974b]"
          >
            <Plus size={14} />
            New issue
          </button>
        </div>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateIssue} className="border border-[#d8dee4] rounded-md bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[#24292f]">Create a new issue</h3>
          <input
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="Title"
            className="w-full h-9 rounded-md border border-[#d1d9e0] bg-white px-3 text-sm text-[#24292f]"
            required
          />
          <textarea
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            placeholder="Description"
            className="w-full min-h-24 rounded-md border border-[#d1d9e0] bg-white px-3 py-2 text-sm text-[#24292f]"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="h-8 px-3 rounded-md border border-[#d1d9e0] bg-white text-sm text-[#24292f]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingIssue || !createTitle.trim()}
              className="h-8 px-3 rounded-md bg-[#2da44e] text-white text-sm font-semibold hover:bg-[#2c974b] disabled:opacity-50"
            >
              {creatingIssue ? 'Creating...' : 'Create issue'}
            </button>
          </div>
        </form>
      )}

      <section className="border border-[#d8dee4] rounded-md bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-[#d8dee4] flex items-center gap-4 text-sm">
          <button
            type="button"
            onClick={() => setActiveFilter("OPEN")}
            className={`${activeFilter === "OPEN" ? "text-[#24292f] font-semibold" : "text-[#57606a] hover:text-[#24292f]"}`}
          >
            Open <span className="ml-1 rounded-full bg-[#eaeef2] px-2 py-0.5 text-xs">{openCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("CLOSED")}
            className={`${activeFilter === "CLOSED" ? "text-[#24292f] font-semibold" : "text-[#57606a] hover:text-[#24292f]"}`}
          >
            Closed <span className="ml-1 rounded-full bg-[#eaeef2] px-2 py-0.5 text-xs">{closedCount}</span>
          </button>
        </div>

        {listLoading ? (
          <div className="p-5 text-sm text-[#57606a]">Loading issues...</div>
        ) : filteredIssues.length === 0 ? (
          <div className="py-16 text-center">
            <CircleDot size={24} className="mx-auto text-[#8c959f]" />
            <p className="mt-3 text-2xl font-semibold text-[#24292f]">No {activeFilter.toLowerCase()} issues found</p>
            <p className="text-sm text-[#57606a] mt-1">Create an issue or switch filters to see other results.</p>
          </div>
        ) : (
          <ul>
            {filteredIssues.map((issue) => {
              const issueNo = issueNumberMap.get(issue.id) || 0;
              return (
                <li key={issue.id} className="border-t border-[#d8dee4] first:border-t-0 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-[#24292f] hover:text-[#0969da] truncate">
                        {issue.title}
                      </p>
                      <p className="mt-1 text-sm text-[#57606a] flex items-center gap-2 flex-wrap">
                        {issue.status === 'OPEN' ? (
                          <CircleDot size={14} className="text-[#1f883d]" />
                        ) : (
                          <CheckCircle2 size={14} className="text-[#8250df]" />
                        )}
                        <span>
                          #{issueNo} {issue.status === 'OPEN' ? 'opened' : 'closed'} {toRelativeTime(issue.created_at)}
                        </span>
                        <span>by you</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        disabled={updatingIssueId === issue.id}
                        onClick={() => void handleToggleIssueStatus(issue)}
                        className="h-7 px-2.5 rounded-md border border-[#d1d9e0] bg-[#f6f8fa] text-xs text-[#24292f] hover:bg-[#eef1f4] disabled:opacity-50"
                      >
                        {issue.status === 'OPEN' ? 'Close' : 'Reopen'}
                      </button>
                      <span className="text-xs text-[#57606a] inline-flex items-center gap-1">
                        <MessageSquare size={13} />
                        {issue.assignees?.length || 0}
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
