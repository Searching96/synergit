import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  AtSign,
  Bold,
  Check,
  ChevronDown,
  Code,
  FileDiff,
  GitCommitHorizontal,
  Heading,
  Italic,
  Link,
  List,
  ListOrdered,
  MessageSquare,
  MoreHorizontal,
  Settings,
  Users,
} from "lucide-react";
import { collaboratorsApi } from "../../../services/api";
import { pullsApi } from "../../../services/api/pull";
import { reposApi } from "../../../services/api/repos";
import { OcticonRepoPush, OcticonGitCommit } from "../../icons/Octicons";
import type { ConflictFile, PullRequest, PullRequestCompareResult, PullRequestEvent, RepoCollaborator } from "../../../types";
import MergeOperationPanel from "./MergeOperationPanel";

interface PullRequestDetailPageProps {
  repoId: string;
  currentUsername: string;
  pullNumber: string;
  onBack: () => void;
  onOpenConflicts: () => void;
  onOpenPullRequest: (pullNumber: number) => void;
  onOpenCommitDiff?: (commitHash: string) => void;
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
    return { label: "Merged", color: "#8250df", icon: <GitMergeReadyOcticon size={15} /> };
  }
  if (status === "CLOSED") {
    return { label: "Closed", color: "#cf222e", icon: <GitPullRequestClosedOcticon size={15} /> };
  }
  return { label: "Open", color: "#1a7f37", icon: <GitPullRequestOcticon size={15} /> };
}

function formatCommitDate(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "an unknown date";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function pullEventText(type: string): string {
  switch (type) {
    case "closed":
      return "closed this";
    case "reopened":
      return "reopened this";
    case "merged":
      return "merged this";
    default:
      return type;
  }
}

function GitPullRequestClosedOcticon({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      data-component="Octicon"
      height={size}
      viewBox="0 0 16 16"
      version="1.1"
      width={size}
      data-view-component="true"
      className="octicon octicon-git-pull-request-closed color-fg-inherit fill-current"
    >
      <path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 5.5a.75.75 0 0 1 .75.75v3.378a2.251 2.251 0 1 1-1.5 0V7.25a.75.75 0 0 1 .75-.75Zm-2.03-5.273a.75.75 0 0 1 1.06 0l.97.97.97-.97a.748.748 0 0 1 1.265.332.75.75 0 0 1-.205.729l-.97.97.97.97a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-.97-.97-.97.97a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l.97-.97-.97-.97a.75.75 0 0 1 0-1.06ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm9.5 0a.75.75 0 1 0 0 1.5.75.75.75 0 0 0 0-1.5Z" />
    </svg>
  );
}

function GitPullRequestOcticon({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      data-component="Octicon"
      height={size}
      viewBox="0 0 16 16"
      version="1.1"
      width={size}
      data-view-component="true"
      className="octicon octicon-git-pull-request color-fg-inherit fill-current"
    >
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
    </svg>
  );
}

function GitMergeReadyOcticon({ size = 24 }: { size?: number }) {
  return (
    <svg
      data-component="Octicon"
      focusable="false"
      aria-label="Ready to merge"
      className="octicon octicon-git-merge fgColor-onEmphasis fill-current"
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      display="inline-block"
      overflow="visible"
      style={{ verticalAlign: "text-bottom" }}
    >
      <path d="M15 13.25a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm-12.5 6a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm0-14.5a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0ZM5.75 6.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 6.5Zm0 14.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 21Zm12.5-6a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 18.25 15Z" />
      <path d="M6.5 7.25c0 2.9 2.35 5.25 5.25 5.25h4.5V14h-4.5A6.75 6.75 0 0 1 5 7.25Z" />
      <path d="M5.75 16.75A.75.75 0 0 1 5 16V8a.75.75 0 0 1 1.5 0v8a.75.75 0 0 1-.75.75Z" />
    </svg>
  );
}

export default function PullRequestDetailPage({
  repoId,
  currentUsername,
  pullNumber,
  onBack,
  onOpenConflicts,
  onOpenPullRequest,
  onOpenCommitDiff,
}: PullRequestDetailPageProps) {
  const [pull, setPull] = useState<PullRequest | null>(null);
  const [compareData, setCompareData] = useState<PullRequestCompareResult | null>(null);
  const [conflictFiles, setConflictFiles] = useState<ConflictFile[]>([]);
  const [events, setEvents] = useState<PullRequestEvent[]>([]);
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
      setCompareData(null);
      setConflictFiles([]);
      setEvents([]);
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
        setConflictFiles([]);
        setEvents([]);
        return;
      }

      const [freshPull, compare, pullEvents, conflicts] = await Promise.all([
        pullsApi.get(repoId, resolved.id).catch(() => resolved),
        reposApi.getCompare(
          repoId,
          resolved.status === "MERGED" && resolved.target_commit_hash
            ? `${resolved.target_commit_hash}^1`
            : resolved.status === "OPEN"
              ? resolved.target_branch
              : (resolved.target_commit_hash || resolved.target_branch),
          resolved.status === "OPEN" ? resolved.source_branch : (resolved.source_commit_hash || resolved.source_branch),
        ).catch(() => null),
        pullsApi.listEvents(repoId, resolved.id).catch(() => []),
        pullsApi.getConflicts(repoId, resolved.id).catch(() => []),
      ]);
      setPull(freshPull);
      setCompareData(compare);
      setEvents(pullEvents || []);
      setConflictFiles(conflicts || []);
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
  const hasRemainingConflicts = conflictFiles.length > 0;
  const canMerge = pull?.status === "OPEN" && (
    (compareData?.mergeable ?? true) ||
    (!!compareData?.can_compare && !hasRemainingConflicts)
  );
  const mergedEvent = events.find((event) => event.event_type === "merged") || null;
  const mergedTime = mergedEvent?.created_at || pull?.updated_at || "";
  const mergeCommitHash = compareData?.commits.find((commit) => commit.message.toLowerCase().includes("merge"))?.hash ||
    compareData?.commits[0]?.hash ||
    pull?.source_commit_hash ||
    "";

  const updatePull = async (action: "merge" | "close" | "reopen", commitMessage?: string, description?: string) => {
    if (!pull) return;
    try {
      setUpdating(true);
      setError(null);
      setMessage(null);
      if (action === "merge") {
        await pullsApi.merge(repoId, pull.id, commitMessage, description);
      } else if (action === "close") {
        await pullsApi.close(repoId, pull.id);
      } else {
        await pullsApi.reopen(repoId, pull.id);
      }
      setCommentBody("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action} pull request`);
    } finally {
      setUpdating(false);
    }
  };

  const handleRevert = async () => {
    if (!pull) return;
    try {
      setUpdating(true);
      setError(null);
      setMessage(null);
      const created = await pullsApi.revert(repoId, pull.id);
      const pulls = await pullsApi.list(repoId);
      const sorted = [...(pulls || [])].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      const createdIndex = sorted.findIndex((item) => item.id === created.id);
      if (createdIndex >= 0) {
        onOpenPullRequest(createdIndex + 1);
        return;
      }
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create revert pull request");
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !pull) {
    return null;
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
            {pull.status === "MERGED" ? (
              <span>
                <span className="font-semibold text-[var(--text-primary)]">{creatorName}</span> merged{" "}
                <span>{commitCount} commit{commitCount === 1 ? "" : "s"}</span> into{" "}
                <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{pull.target_branch}</span>{" "}
                from{" "}
                <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{pull.source_branch}</span>{" "}
                <span title={fullTime(mergedTime)} className="hover:underline">{relativeTime(mergedTime)}</span>
              </span>
            ) : (
              <span>
                <span className="font-semibold text-[var(--text-primary)]">{creatorName}</span> wants to merge{" "}
                <span>{commitCount} commit{commitCount === 1 ? "" : "s"}</span> into{" "}
                <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{pull.target_branch}</span>{" "}
                from{" "}
                <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{pull.source_branch}</span>
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
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
                <span className="absolute left-[calc(var(--rail)_-_11px)] top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full border border-[var(--border-muted)] bg-[var(--surface-canvas)] text-[var(--text-secondary)] inline-flex items-center justify-center">
                  <OcticonRepoPush size={14} />
                </span>
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">{creatorName}</span> added {commitCount} commit{commitCount === 1 ? "" : "s"}{" "}
                  <span title={fullTime(pull.created_at)} className="hover:underline">{relativeTime(pull.created_at)}</span>
                </p>
              </li>

              {(compareData?.commits || []).map((commit) => {
                const author = commit.author || creatorName;
                const authorInitial = (author.charAt(0) || "U").toUpperCase();
                return (
                  <li key={commit.hash} className="relative pl-[calc(var(--rail)_+_17px)]">
                    <span className="absolute left-[calc(var(--rail)_-_11px)] top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full border border-[var(--border-muted)] bg-[var(--surface-canvas)] text-[var(--text-secondary)] inline-flex items-center justify-center">
                      <OcticonGitCommit size={14} />
                    </span>
                    <div className="min-h-8 flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 inline-flex items-center gap-2">
                        <span
                          className="h-5 w-5 shrink-0 rounded-full bg-[var(--surface-badge)] text-[9px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]"
                          title={author}
                        >
                          {authorInitial}
                        </span>
                        <span className="truncate text-[var(--text-primary)] underline underline-offset-2 decoration-[var(--border-muted)] hover:text-[var(--text-link)]">
                          {commit.message || "Untitled commit"}
                        </span>
                      </span>
                      <span className="shrink-0 hidden sm:inline-flex items-center gap-3">
                        <span className="rounded-full border border-[var(--border-success-muted)] bg-[var(--surface-canvas)] px-2 py-0.5 text-xs text-[var(--fgColor-open,#1a7f37)]">
                          Verified
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenCommitDiff?.(commit.hash)}
                          className="font-mono text-xs text-[var(--text-link)] hover:underline"
                        >
                          {commit.hash.slice(0, 7)}
                        </button>
                      </span>
                    </div>
                  </li>
                );
              })}

              {events.filter((event) => event.event_type !== "opened").map((event) => {
                const isClosed = event.event_type === "closed";
                const isMerged = event.event_type === "merged";
                const badgeClass = isClosed
                  ? "bg-[#cf222e]"
                  : isMerged
                    ? "bg-[var(--text-accent-purple)]"
                    : "bg-[var(--fgColor-open,#1a7f37)]";
                const Icon = isClosed ? GitPullRequestClosedOcticon : isMerged ? GitMergeReadyOcticon : GitPullRequestOcticon;

                return (
                  <li
                    key={event.id}
                    className={`relative py-4 pl-[calc(var(--rail)_+_17px)] flex items-center text-sm ${
                      isClosed || isMerged ? "border-b-4 border-[var(--border-muted)]" : ""
                    }`}
                  >
                    <span className={`absolute left-[calc(var(--rail)_-_11px)] top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full text-white inline-flex items-center justify-center ${badgeClass}`}>
                      <Icon size={14} />
                    </span>
                    <span className="absolute left-[calc(var(--rail)_+_18px)] top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[9px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
                      {(event.actor || creatorName).charAt(0)}
                    </span>
                    {isMerged ? (
                      <div className="min-w-0 flex-1 pl-8 flex items-center justify-between gap-3 text-[var(--text-secondary)]">
                        <span className="min-w-0">
                          <span className="font-semibold text-[var(--text-primary)]">{event.actor || creatorName}</span>{" "}
                          merged commit{" "}
                          <span className="font-mono text-[var(--text-primary)]">{mergeCommitHash.slice(0, 7)}</span>{" "}
                          into{" "}
                          <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{pull.target_branch}</span>{" "}
                          <span title={fullTime(event.created_at)} className="hover:underline">{relativeTime(event.created_at)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleRevert()}
                          disabled={updating}
                          title="Create a new pull request to revert these changes"
                          className="shrink-0 h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Revert
                        </button>
                      </div>
                    ) : (
                      <span className="pl-8 text-[var(--text-secondary)]">
                        <span className="font-semibold text-[var(--text-primary)]">{event.actor || creatorName}</span> {pullEventText(event.event_type)}{" "}
                        <span title={fullTime(event.created_at)} className="hover:underline">{relativeTime(event.created_at)}</span>
                      </span>
                    )}
                  </li>
                );
              })}

              <MergeOperationPanel
                repoId={repoId}
                status={pull.status}
                sourceBranch={pull.source_branch}
                pullNumber={Number(pullNumber)}
                currentUsername={currentUsername}
                canMerge={canMerge}
                updating={updating}
                conflictFiles={conflictFiles}
                onMerge={(msg, desc) => void updatePull("merge", msg, desc)}
                onOpenConflicts={onOpenConflicts}
              />
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
              ) : pull.status === "CLOSED" ? (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => void updatePull("reopen")}
                  className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--fgColor-open,#1a7f37)] hover:bg-[var(--surface-subtle)] disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  Reopen pull request
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
