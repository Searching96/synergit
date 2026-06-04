import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  AtSign,
  Bold,
  Check,
  CheckCircle2,
  ChevronDown,
  Code,
  FileDiff,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  Heading,
  Italic,
  Link,
  List,
  ListOrdered,
  MessageSquare,
  MoreHorizontal,
  Settings,
  Users,
  XCircle,
} from "lucide-react";
import { collaboratorsApi } from "../../../services/api";
import { pullsApi } from "../../../services/api/pull";
import { reposApi } from "../../../services/api/repos";
import type { PullRequest, PullRequestCompareResult, RepoCollaborator } from "../../../types";

interface PullRequestDetailPageProps {
  repoId: string;
  currentUsername: string;
  pullNumber: string;
  onBack: () => void;
}

function relativeTime(timestamp: string): string {
  const diff = Date.now() - Date.parse(timestamp);
  if (Number.isNaN(diff)) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function fullTime(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function statusCopy(status: PullRequest["status"]) {
  if (status === "MERGED") {
    return { label: "Merged", color: "#8250df", icon: <GitMerge size={15} /> };
  }
  if (status === "CLOSED") {
    return { label: "Closed", color: "#cf222e", icon: <XCircle size={15} /> };
  }
  return { label: "Open", color: "#1a7f37", icon: <GitPullRequest size={15} /> };
}

function formatCommitDate(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "an unknown date";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PullRequestDetailPage({
  repoId,
  currentUsername,
  pullNumber,
  onBack,
}: PullRequestDetailPageProps) {
  const [pull, setPull] = useState<PullRequest | null>(null);
  const [compareData, setCompareData] = useState<PullRequestCompareResult | null>(null);
  const [collaborators, setCollaborators] = useState<RepoCollaborator[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [commentBody, setCommentBody] = useState<string>("");
  const [commentPreview, setCommentPreview] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    collaborators.forEach((collaborator) => {
      if (collaborator.username) {
        map[collaborator.user_id] = collaborator.username;
      }
    });
    return map;
  }, [collaborators]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [pulls, collabs] = await Promise.all([
        pullsApi.list(repoId),
        collaboratorsApi.list(repoId).catch(() => []),
      ]);
      setCollaborators(collabs || []);

      const sorted = [...(pulls || [])].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      const resolved = sorted[Number(pullNumber) - 1] || null;
      setPull(resolved);

      if (!resolved) {
        setCompareData(null);
        return;
      }

      const [freshPull, compare] = await Promise.all([
        pullsApi.get(repoId, resolved.id).catch(() => resolved),
        reposApi.getCompare(repoId, resolved.target_branch, resolved.source_branch).catch(() => null),
      ]);
      setPull(freshPull);
      setCompareData(compare);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load pull request");
    } finally {
      setLoading(false);
    }
  }, [pullNumber, repoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const creatorName = pull ? nameById[pull.creator_id] || currentUsername || "Someone" : currentUsername;
  const copy = pull ? statusCopy(pull.status) : statusCopy("OPEN");
  const commitCount = compareData?.summary.commit_count || compareData?.commits.length || 0;
  const fileCount = compareData?.summary.files_changed || compareData?.files.length || 0;
  const additions = compareData?.summary.additions || 0;
  const deletions = compareData?.summary.deletions || 0;
  const contributorCount = compareData?.summary.contributor_count || 1;
  const canMerge = pull?.status === "OPEN" && (compareData?.mergeable ?? true);

  const updatePull = async (action: "merge" | "close" | "reopen") => {
    if (!pull) return;
    try {
      setUpdating(true);
      setError(null);
      setMessage(null);
      if (action === "merge") {
        await pullsApi.merge(repoId, pull.id);
        setMessage("Pull request merged.");
      } else if (action === "close") {
        await pullsApi.close(repoId, pull.id);
        setMessage("Pull request closed.");
      } else {
        await pullsApi.reopen(repoId, pull.id);
        setMessage("Pull request reopened.");
      }
      setCommentBody("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action} pull request`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-5 text-sm text-[var(--text-secondary)]">Loading pull request...</div>;
  }

  if (!pull) {
    return (
      <div className="p-5 text-sm text-[var(--text-secondary)]">
        Pull request not found.{" "}
        <button type="button" onClick={onBack} className="text-[var(--text-link)] hover:underline">
          Back to pull requests
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {error ? (
        <div className="mb-3 p-3 text-sm border border-[var(--border-danger-soft)] bg-[var(--surface-danger-subtle)] text-[var(--text-danger)] rounded-md">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mb-3 p-3 text-sm border border-[var(--border-success-muted)] bg-[var(--surface-success-subtle)] text-[var(--fgColor-open,#1a7f37)] rounded-md">
          {message}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl text-[var(--text-primary)]">
            {pull.title} <span className="text-[var(--text-secondary)] font-light">#{pullNumber}</span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ backgroundColor: copy.color }}>
              {copy.icon}
              {copy.label}
            </span>
            <span>
              <span className="font-semibold text-[var(--text-primary)]">{creatorName}</span> wants to merge{" "}
              <span>{commitCount} commit{commitCount === 1 ? "" : "s"}</span> into{" "}
              <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{pull.target_branch}</span>{" "}
              from{" "}
              <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{pull.source_branch}</span>
            </span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className={`h-8 px-3 rounded-md border text-sm font-semibold inline-flex items-center gap-2 ${
            canMerge
              ? "border-[var(--border-default)] bg-[var(--surface-canvas)] text-[var(--fgColor-open,#1a7f37)]"
              : "border-[var(--border-danger-soft)] bg-[var(--surface-danger-subtle)] text-[var(--text-danger)]"
          }`}>
            {canMerge ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {canMerge ? "Ready to merge" : pull.status === "OPEN" ? "Review required" : copy.label}
          </span>
          <button type="button" className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm inline-flex items-center gap-2">
            Code <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <nav className="mt-5 border-b border-[var(--border-muted)] flex items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { label: "Conversation", count: 0, icon: MessageSquare },
            { label: "Commits", count: commitCount, icon: GitCommitHorizontal },
            { label: "Checks", count: 0, icon: Check },
            { label: "Files changed", count: fileCount, icon: FileDiff },
          ].map((tab, index) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.label}
                type="button"
                className={`h-10 px-3 text-sm border rounded-t-md inline-flex items-center gap-2 ${
                  index === 0
                    ? "border-[var(--border-muted)] border-b-[var(--surface-canvas)] bg-[var(--surface-canvas)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon size={15} />
                {tab.label}
                <span className="rounded-full bg-[var(--surface-badge)] px-1.5 text-xs">{tab.count}</span>
              </button>
            );
          })}
        </div>
        <div className="hidden md:flex items-center gap-1 text-xs font-semibold">
          <span className="text-[var(--fgColor-open,#1a7f37)]">+{additions}</span>
          <span className="text-[var(--text-danger)]">-{deletions}</span>
        </div>
      </nav>

      <div className="flex flex-col gap-6 lg:flex-row pt-5">
        <div className="flex-1 min-w-0" style={{ "--rail": "85px" } as CSSProperties}>
          <div className="relative pl-16">
            <span className="absolute left-0 top-0 h-10 w-10 rounded-full bg-[var(--surface-badge)] text-sm inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
              {creatorName.charAt(0)}
            </span>
            <div className="rounded-md ml-[calc(var(--rail)_-_85px)] border border-[var(--border-info-muted,#54aeff)]">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-info-muted,#54aeff)] bg-[var(--surface-info-subtle)] text-sm">
                <span>
                  <span className="font-semibold text-[var(--text-primary)]">{creatorName}</span>{" "}
                  <span className="text-[var(--text-secondary)]">commented <span title={fullTime(pull.created_at)} className="hover:underline">{relativeTime(pull.created_at)}</span></span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="rounded-full border border-[var(--border-default)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">Owner</span>
                  <MoreHorizontal size={16} className="text-[var(--text-secondary)]" />
                </span>
              </div>
              <div className="px-3 py-4 text-sm text-[var(--text-primary)] whitespace-pre-wrap min-h-16">
                {pull.description?.trim() || <span className="italic text-[var(--text-secondary)]">No description provided.</span>}
              </div>
            </div>
          </div>

          <div className="relative mt-4">
            <span className="absolute left-[var(--rail)] -top-4 -bottom-6 w-0.5 bg-[var(--border-muted)]" aria-hidden />
            <ul className="space-y-4">
              <li className="relative pl-[calc(var(--rail)_+_17px)]">
                <span className="absolute left-[calc(var(--rail)_-_11px)] top-1 z-10 h-6 w-6 rounded-full border border-[var(--border-muted)] bg-[var(--surface-canvas)] text-[var(--text-secondary)] inline-flex items-center justify-center">
                  <GitCommitHorizontal size={14} />
                </span>
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">{creatorName}</span> added {commitCount} commit{commitCount === 1 ? "" : "s"}{" "}
                  <span title={fullTime(pull.created_at)} className="hover:underline">{relativeTime(pull.created_at)}</span>
                </p>
              </li>

              {(compareData?.commits || []).map((commit) => (
                <li key={commit.hash} className="relative pl-[calc(var(--rail)_+_34px)]">
                  <span className="absolute left-[calc(var(--rail)_+_18px)] top-3 h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[9px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
                    {(commit.author || creatorName).charAt(0)}
                  </span>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-mono text-[var(--text-primary)] underline-offset-2 hover:underline">
                      {commit.message || "Untitled commit"}
                    </span>
                    <span className="shrink-0 inline-flex items-center gap-3">
                      <span className="hidden sm:inline-flex rounded-full border border-[var(--border-success-muted)] bg-[var(--surface-canvas)] px-2 py-0.5 text-xs text-[var(--fgColor-open,#1a7f37)]">
                        Verified
                      </span>
                      <span className="font-mono text-xs text-[var(--text-secondary)]">{commit.hash.slice(0, 7)}</span>
                    </span>
                  </div>
                </li>
              ))}

              {pull.status === "CLOSED" ? (
                <li className="relative pl-[calc(var(--rail)_+_17px)] flex items-center text-sm">
                  <span className="absolute left-[calc(var(--rail)_-_11px)] top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-[#cf222e] text-white inline-flex items-center justify-center">
                    <XCircle size={14} />
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--text-primary)]">{creatorName}</span> closed this {relativeTime(pull.updated_at)}
                  </span>
                </li>
              ) : null}

              <li className="relative pl-[calc(var(--rail)_+_17px)]">
                <span className="absolute left-[calc(var(--rail)_-_16px)] top-1 z-10 h-8 w-8 rounded-md bg-[var(--fgColor-open,#1a7f37)] text-white inline-flex items-center justify-center">
                  <GitPullRequest size={18} />
                </span>
                <div className={`rounded-md border ${
                  canMerge
                    ? "border-[var(--border-success-muted)]"
                    : "border-[var(--border-danger-soft)]"
                } bg-[var(--surface-canvas)] overflow-hidden`}>
                  <div className="px-4 py-4 inline-flex items-start gap-3">
                    <span className={`mt-0.5 h-7 w-7 rounded-full text-white inline-flex items-center justify-center ${
                      canMerge ? "bg-[var(--fgColor-open,#1a7f37)]" : "bg-[var(--text-danger)]"
                    }`}>
                      {canMerge ? <Check size={17} /> : <XCircle size={17} />}
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {canMerge ? "No conflicts with base branch" : "This pull request cannot be merged automatically"}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {canMerge ? "Merging can be performed automatically." : "Resolve conflicts before merging this pull request."}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-[var(--border-muted)] bg-[var(--surface-subtle)] px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    {pull.status === "OPEN" ? (
                      <button
                        type="button"
                        disabled={updating || !canMerge}
                        onClick={() => void updatePull("merge")}
                        className="h-9 px-4 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Merge pull request
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => void updatePull("reopen")}
                        className="h-9 px-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-50"
                      >
                        Reopen pull request
                      </button>
                    )}
                    <span className="text-xs text-[var(--text-secondary)]">
                      You can also merge this with the command line.
                    </span>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div className="relative pl-16 mt-6 ml-[calc(var(--rail)_-_85px)]">
            <span className="absolute left-0 top-0 h-10 w-10 rounded-full bg-[var(--surface-badge)] text-sm inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
              {(currentUsername || "?").charAt(0)}
            </span>
            <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Add a comment</h3>
            <div className="rounded-md border border-[var(--border-default)] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--border-muted)] px-2">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setCommentPreview(false)}
                    className={`h-9 px-3 text-sm ${!commentPreview ? "border-b-2 border-[var(--accent-primary)] font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommentPreview(true)}
                    className={`h-9 px-3 text-sm ${commentPreview ? "border-b-2 border-[var(--accent-primary)] font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
                  >
                    Preview
                  </button>
                </div>
                <div className="hidden md:flex items-center gap-1 text-[var(--text-secondary)]">
                  {[Heading, Bold, Italic, ListOrdered, Code, Link, List, AtSign].map((Icon, i) => (
                    <span key={i} className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-[var(--surface-hover)]">
                      <Icon size={15} />
                    </span>
                  ))}
                </div>
              </div>
              {commentPreview ? (
                <div className="min-h-28 px-3 py-2 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                  {commentBody.trim() || "Nothing to preview"}
                </div>
              ) : (
                <textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Add your comment here..."
                  className="w-full min-h-28 px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--surface-canvas)] resize-y"
                />
              )}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              {pull.status === "OPEN" ? (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => void updatePull("close")}
                  className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-danger)] hover:bg-[var(--surface-subtle)] disabled:opacity-50"
                >
                  Close pull request
                </button>
              ) : null}
              <button
                type="button"
                disabled={!commentBody.trim()}
                onClick={() => setMessage("Pull request comments need a backend endpoint before they can be saved.")}
                className="h-8 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
              >
                Comment
              </button>
            </div>
          </div>
        </div>

        <aside className="w-full lg:w-72 lg:shrink-0 space-y-4 text-sm">
          {[
            ["Reviewers", "Copilot", "Request"],
            ["Assignees", "No one-assigned", ""],
            ["Labels", "None yet", ""],
            ["Projects", "None yet", ""],
            ["Milestone", "No milestone", ""],
            ["Development", "Successfully merging this pull request may close these issues.", ""],
            ["Notifications", "You're receiving notifications because you modified the open/close state.", "Customize"],
          ].map(([title, body, action]) => (
            <div key={title} className="pb-4 border-b border-[var(--border-muted)]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--text-primary)]">{title}</span>
                <span className="inline-flex items-center gap-2">
                  {action ? <span className="text-xs text-[var(--text-link)]">{action}</span> : null}
                  <Settings size={14} className="text-[var(--text-secondary)]" />
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">{body}</p>
            </div>
          ))}
          <div className="pb-4 border-b border-[var(--border-muted)]">
            <p className="font-semibold text-[var(--text-primary)]">1 participant</p>
            <div className="mt-2 h-6 w-6 rounded-full bg-[var(--surface-badge)] text-[10px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
              {creatorName.charAt(0)}
            </div>
          </div>
          <div className="text-xs text-[var(--text-secondary)] inline-flex items-center gap-2">
            <Users size={14} />
            {contributorCount} contributor{contributorCount === 1 ? "" : "s"}
          </div>
          {compareData?.commits[0] ? (
            <p className="text-xs text-[var(--text-secondary)]">Latest commit on {formatCommitDate(compareData.commits[0].date)}</p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
