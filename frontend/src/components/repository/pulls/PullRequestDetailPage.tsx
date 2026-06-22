import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { CommitChangeLink } from "../../shared/CommitChangeLink";
import { shortenHash } from "../../../utils/stringUtils";
import { collaboratorsApi, issuesApi } from "../../../services/api";
import { pullsApi } from "../../../services/api/pull";
import { reposApi } from "../../../services/api/repos";
import { OcticonRepoPush, OcticonGitCommit, OcticonGitPullRequest, OcticonGitPullRequestClosed, OcticonGitMergeReady, OcticonCrossReference } from "../../icons/Octicons";
import { CopyIcon, CheckIcon, IssueOpenedIcon, IssueClosedIcon } from "@primer/octicons-react";
import { Tooltip } from "../../../components/shared/Tooltip";
import type { ConflictFile, PullRequest, PullRequestCompareResult, PullRequestEvent, RepoCollaborator, Issue, Label } from "../../../types";
import { labelsApi } from "../../../services/api/labels";
import MergeOperationPanel from "./MergeOperationPanel";
import DevelopmentSidebarItem from "./DevelopmentSidebarItem";

interface PullRequestDetailPageProps {
  repoId: string;
  currentUsername: string;
  pullNumber: string;
  onBack: () => void;
  onOpenConflicts: () => void;
  onOpenPullRequest: (pullNumber: number) => void;
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
    return { label: "Merged", color: "#8250df", icon: <OcticonGitMergeReady size={15} /> };
  }
  if (status === "CLOSED") {
    return { label: "Closed", color: "#cf222e", icon: <OcticonGitPullRequestClosed size={15} /> };
  }
  return { label: "Open", color: "#1a7f37", icon: <OcticonGitPullRequest size={15} /> };
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
    case "issue_linked":
      return "linked an issue that may be closed by this pull request";
    case "issue_unlinked":
      return "removed a link to an issue that may be closed by this pull request";
    default:
      return type;
  }
}


export default function PullRequestDetailPage({
  repoId,
  currentUsername,
  pullNumber,
  onBack,
  onOpenConflicts,
  onOpenPullRequest,
  onOpenIssue,
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
  const [issues, setIssues] = useState<Issue[]>([]);
  const [assignees, setAssignees] = useState<Array<{ user_id: string; assigned_at: string }>>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [repoLabels, setRepoLabels] = useState<Label[]>([]);
  const [openMenu, setOpenMenu] = useState<"assignees" | "labels" | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [labelFilter, setLabelFilter] = useState<string>("");

  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!sentinelRef.current) return;
      const rect = sentinelRef.current.getBoundingClientRect();
      setIsStickyVisible(rect.top < 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    const scrollContainer = document.querySelector('main') || document.documentElement;
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    collaborators.forEach((collaborator) => {
      if (collaborator.username) {
        map[collaborator.user_id] = collaborator.username;
      }
    });
    return map;
  }, [collaborators]);

  const issueNumberMap = useMemo(() => {
    const mapping = new Map<string, number>();
    const sortedByCreatedAsc = [...issues].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    sortedByCreatedAsc.forEach((issue, index) => {
      mapping.set(issue.id, index + 1);
    });
    return mapping;
  }, [issues]);

  const load = useCallback(async (isSilent?: boolean) => {
    try {
      if (!isSilent) {
        setLoading(true);
        setError(null);
        setCompareData(null);
        setConflictFiles([]);
        setEvents([]);
      }
      const [pulls, collabs, repoIssues, rLabels] = await Promise.all([
        pullsApi.list(repoId),
        collaboratorsApi.list(repoId).catch(() => []),
        issuesApi.list(repoId).catch(() => []),
        labelsApi.listForRepo(repoId).catch(() => []),
      ]);
      setCollaborators(collabs || []);
      setIssues(repoIssues || []);
      setRepoLabels(rLabels || []);

      const sorted = [...(pulls || [])].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      const resolved = sorted[Number(pullNumber) - 1] || null;
      if (!isSilent) {
        setPull(resolved);
      }

      if (!resolved) {
        setCompareData(null);
        setConflictFiles([]);
        setEvents([]);
        if (isSilent) setPull(null);
        return;
      }

      const [freshPull, compare, pullEvents, conflicts, asg, lb] = await Promise.all([
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
        pullsApi.listPRAssignees(repoId, resolved.id).catch(() => []),
        pullsApi.listPRLabels(repoId, resolved.id).catch(() => []),
      ]);
      setPull(freshPull);
      setCompareData(compare);
      setEvents(pullEvents || []);
      setConflictFiles(conflicts || []);
      setAssignees(asg || []);
      setLabels(lb || []);
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
      await load(true);
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
      await load(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create revert pull request");
    } finally {
      setUpdating(false);
    }
  };

  const toggleAssignee = async (userId: string) => {
    if (!pull) return;
    try {
      if (assignees.some((a) => a.user_id === userId)) {
        await pullsApi.removePRAssignee(repoId, pull.id, userId);
        setAssignees((prev) => prev.filter((a) => a.user_id !== userId));
      } else {
        await pullsApi.addPRAssignee(repoId, pull.id, userId);
        setAssignees((prev) => [...prev, { user_id: userId, assigned_at: new Date().toISOString() }]);
      }
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const toggleLabel = async (labelId: string) => {
    if (!pull) return;
    try {
      if (labels.some((l) => l.id === labelId)) {
        await pullsApi.removePRLabel(repoId, pull.id, labelId);
        setLabels((prev) => prev.filter((l) => l.id !== labelId));
      } else {
        await pullsApi.addPRLabel(repoId, pull.id, labelId);
        const l = repoLabels.find((r) => r.id === labelId);
        if (l) setLabels((prev) => [...prev, l]);
      }
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const visibleCollaborators = collaborators.filter((c) =>
    (c.username || c.user_id).toLowerCase().includes(assigneeFilter.toLowerCase())
  );
  const visibleLabels = repoLabels.filter((l) =>
    l.name.toLowerCase().includes(labelFilter.toLowerCase())
  );

  const filteredEvents = events.filter((event) => event.event_type !== "opened");
  const mergedIndex = filteredEvents.findIndex((e) => e.event_type === "merged");
  const mainEvents = mergedIndex !== -1 ? filteredEvents.slice(0, mergedIndex + 1) : filteredEvents;
  const postMergeEvents = mergedIndex !== -1 ? filteredEvents.slice(mergedIndex + 1) : [];

  const lastMainEvent = mainEvents[mainEvents.length - 1];
  const hasThickLine = lastMainEvent && (lastMainEvent.event_type === "closed" || lastMainEvent.event_type === "merged");

  const renderEvent = (event: PullRequestEvent) => {
    const isClosed = event.event_type === "closed";
    const isMerged = event.event_type === "merged";
    const badgeClass = isClosed
      ? "bg-[#cf222e]"
      : isMerged
        ? "bg-[var(--text-accent-purple)]"
        : "bg-[var(--fgColor-open,#1a7f37)]";
    const Icon = isClosed ? OcticonGitPullRequestClosed : isMerged ? OcticonGitMergeReady : OcticonGitPullRequest;

    return (
      <li
        key={event.id}
        className={`relative py-4 pl-[calc(var(--rail)_+_17px)] flex items-start text-sm ${
          isClosed || isMerged ? "after:absolute after:-bottom-2.5 after:left-0 after:right-0 after:h-1 after:bg-[var(--border-muted)]" : ""
        }`}
      >
        <span className={`absolute left-[calc(var(--rail)_-_11px)] top-4 z-10 h-6 w-6 rounded-full text-white inline-flex items-center justify-center ${badgeClass}`}>
          <Icon size={14} />
        </span>
        <div className="flex-1 min-w-0 flex items-center gap-2 text-[var(--text-secondary)]">
          <span className="shrink-0 h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[9px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
            {(event.actor || creatorName).charAt(0)}
          </span>
          {isMerged ? (
            <div className="min-w-0 flex-1 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="font-semibold text-[var(--text-primary)]">{event.actor || creatorName}</span>{" "}
                merged commit{" "}
                <CommitChangeLink hash={mergeCommitHash} text={shortenHash(mergeCommitHash)} className="font-mono font-semibold text-[var(--text-primary)] hover:text-[var(--text-link)] hover:underline" />{" "}
                into{" "}
                <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{pull?.target_branch}</span>{" "}
                <span title={fullTime(event.created_at)} className="underline hover:text-[var(--text-link)]">{relativeTime(event.created_at)}</span>
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
            <span className="min-w-0">
              <span className="font-semibold text-[var(--text-primary)]">{event.actor || creatorName}</span> {pullEventText(event.event_type)}{" "}
              <span title={fullTime(event.created_at)} className="underline hover:text-[var(--text-link)]">{relativeTime(event.created_at)}</span>
            </span>
          )}
        </div>
      </li>
    );
  };

  const renderUnlinkedIssue = (event: PullRequestEvent) => {
    const issueNo = event.issue?.id ? issueNumberMap.get(event.issue.id) || 0 : 0;
    return (
      <li
        key={`unlinked-${event.id}`}
        className="relative py-4 pl-[calc(var(--rail)_+_17px)] flex items-start text-sm"
      >
        <span className="absolute left-[calc(var(--rail)_-_11px)] top-4 z-10 h-6 w-6 rounded-full bg-[var(--surface-badge)] text-[var(--text-secondary)] inline-flex items-center justify-center">
          <OcticonCrossReference size={16} />
        </span>
        <div className="text-[var(--text-secondary)] w-full">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[9px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
              {(event.actor || creatorName).charAt(0)}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-[var(--text-primary)]">{event.actor || creatorName}</span> removed a link to an issue{" "}
              <span title={fullTime(event.created_at)} className="hover:underline hover:text-[var(--text-link)] cursor-pointer">{relativeTime(event.created_at)}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {event.issue ? (
              <div className="flex items-center justify-between">
                <span onClick={() => onOpenIssue(issueNo)} className="font-semibold text-[var(--text-primary)] hover:text-[var(--text-link)] hover:underline cursor-pointer">
                  {event.issue.title} <span className="text-[var(--text-secondary)] font-normal">#{issueNo}</span>
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${
                  event.issue.status === "OPEN" ? "bg-[#2da44e]" : "bg-[#57606a]"
                }`}>
                  {event.issue.status === "OPEN" ? <IssueOpenedIcon size={14} /> : <IssueClosedIcon size={14} />}
                  {event.issue.status === "OPEN" ? "Open" : "Closed"}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </li>
    );
  };

  const renderLinkedIssueGroup = (group: PullRequestEvent[]) => {
    const first = group[0];
    return (
      <li
        key={`linked-group-${first.id}`}
        className="relative py-4 pl-[calc(var(--rail)_+_17px)] flex items-start text-sm"
      >
        <span className="absolute left-[calc(var(--rail)_-_11px)] top-4 z-10 h-6 w-6 rounded-full bg-[var(--surface-badge)] text-[var(--text-secondary)] inline-flex items-center justify-center">
          <OcticonCrossReference size={16} />
        </span>
        <div className="text-[var(--text-secondary)] w-full">
          <div>
            This was linked to {group.length === 1 ? "an issue" : "issues"}{" "}
            <span title={fullTime(first.created_at)} className="underline hover:text-[var(--text-link)]">{relativeTime(first.created_at)}</span>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {group.map(e => {
              const issueNo = e.issue?.id ? issueNumberMap.get(e.issue.id) || 0 : 0;
              return e.issue ? (
                <div key={e.id} className="flex items-center justify-between">
                  <span onClick={() => onOpenIssue(issueNo)} className="font-semibold text-[var(--text-primary)] hover:text-[var(--text-link)] hover:underline cursor-pointer">
                    {e.issue.title} <span className="text-[var(--text-secondary)] font-normal">#{issueNo}</span>
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${
                    e.issue.status === "OPEN" ? "bg-[#2da44e]" : "bg-[#57606a]"
                  }`}>
                    {e.issue.status === "OPEN" ? <IssueOpenedIcon size={14} /> : <IssueClosedIcon size={14} />}
                    {e.issue.status === "OPEN" ? "Open" : "Closed"}
                  </span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      </li>
    );
  };

  const renderEventList = (eventsList: PullRequestEvent[]) => {
    const items = [];
    for (let i = 0; i < eventsList.length; i++) {
      const event = eventsList[i];
      if (event.event_type === "issue_linked") {
        const group = [event];
        while (i + 1 < eventsList.length && eventsList[i + 1].event_type === "issue_linked") {
          i++;
          group.push(eventsList[i]);
        }
        items.push(renderLinkedIssueGroup(group));
      } else if (event.event_type === "issue_unlinked") {
        items.push(renderUnlinkedIssue(event));
      } else {
        items.push(renderEvent(event));
      }
    }
    return items;
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

  const prSubtitle = pull?.status === "MERGED" ? (
    <span>
      <span className="font-semibold text-[var(--text-primary)]">{creatorName}</span> merged{" "}
      <span>{commitCount} commit{commitCount === 1 ? "" : "s"}</span> into{" "}
      <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{pull.target_branch}</span>{" "}
      from{" "}
      <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{pull.source_branch}</span>{" "}
      <span title={fullTime(mergedTime)} className="underline hover:text-[var(--text-link)]">{relativeTime(mergedTime)}</span>
    </span>
  ) : (
    <span>
      <span className="font-semibold text-[var(--text-primary)]">{creatorName}</span> wants to merge{" "}
      <span>{commitCount} commit{commitCount === 1 ? "" : "s"}</span> into{" "}
      <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{pull?.target_branch}</span>{" "}
      from{" "}
      <span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{pull?.source_branch}</span>
    </span>
  );

  return (
    <div className="w-full relative">
      <div 
        className={`fixed top-0 left-0 w-full z-50 bg-[var(--surface-canvas)] border-b border-[var(--border-muted)] shadow-sm transition-transform duration-200 ${
          isStickyVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-white"
              style={{ backgroundColor: copy.color }}
            >
              {copy.icon}
              {copy.label}
            </span>
            <div className="flex flex-col min-w-0">
              <h1 className="text-xl font-semibold text-[var(--text-primary)] truncate">
                {pull?.title} <span className="text-[var(--text-secondary)] font-normal">#{pullNumber}</span>
              </h1>
              <div className="text-sm text-[var(--text-secondary)] truncate">
                {prSubtitle}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content={copied ? "Copied!" : "Copy link"} placement="bottom-end">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="shrink-0 h-8 px-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              >
                {copied ? <CheckIcon size={16} className="text-[var(--fgColor-open,#1a7f37)]" /> : <CopyIcon size={16} />}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
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
            {prSubtitle}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <button type="button" className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm inline-flex items-center gap-2">
            Code <ChevronDown size={14} />
          </button>
        </div>
      </div>
      
      <div ref={sentinelRef} className="h-0 w-full" />

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
                  <span className="text-[var(--text-secondary)]">commented <span title={fullTime(pull.created_at)} className="underline hover:text-[var(--text-link)]">{relativeTime(pull.created_at)}</span></span>
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
            <span className="absolute left-[var(--rail)] -top-4 -bottom-2.5 w-0.5 bg-[var(--border-muted)]" aria-hidden />
            {!hasThickLine && (
              <span className="absolute left-16 right-0 -bottom-2.5 h-[2px] bg-[var(--border-muted)]" aria-hidden />
            )}
            <ul className="space-y-4">
              <li className="relative py-4 pl-[calc(var(--rail)_+_17px)] flex items-start">
                <span className="absolute left-[calc(var(--rail)_-_11px)] top-4 z-10 h-6 w-6 rounded-full bg-[var(--surface-badge)] text-[var(--text-secondary)] inline-flex items-center justify-center">
                  <OcticonRepoPush size={14} />
                </span>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[9px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
                    {creatorName.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-[var(--text-primary)]">{creatorName}</span> added {commitCount} commit{commitCount === 1 ? "" : "s"}{" "}
                    <span title={fullTime(pull.created_at)} className="underline hover:text-[var(--text-link)]">{relativeTime(pull.created_at)}</span>
                  </div>
                </div>
              </li>

              {(compareData?.commits || []).map((commit) => {
                const author = commit.author || creatorName;
                const authorInitial = (author.charAt(0) || "U").toUpperCase();
                return (
                  <li key={commit.hash} className="relative pl-[calc(var(--rail)_+_17px)]">
                    <span className="absolute left-[calc(var(--rail)_-_11px)] top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-[var(--surface-badge)] text-[var(--text-secondary)] inline-flex items-center justify-center">
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
                        <CommitChangeLink 
                          hash={commit.hash} 
                          text={shortenHash(commit.hash)}
                          className="font-mono text-xs text-[var(--text-secondary)] underline hover:text-[var(--text-link)]"
                        />
                      </span>
                    </div>
                  </li>
                );
              })}

              {renderEventList(mainEvents)}
            </ul>
          </div>

          {postMergeEvents.length > 0 && (
            <div className="relative mt-8">
              {postMergeEvents.length > 1 && (
                <span className="absolute left-[var(--rail)] top-4 -bottom-2.5 w-0.5 bg-[var(--border-muted)]" aria-hidden />
              )}
              <ul className="space-y-4">
                {renderEventList(postMergeEvents)}
              </ul>
            </div>
          )}

          <div className="mt-8">
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
                  className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] font-semibold hover:bg-[var(--surface-subtle)] disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <span className="text-[var(--text-danger)] flex"><OcticonGitPullRequestClosed size={16} /></span>
                  Close pull request
                </button>
              ) : pull.status === "CLOSED" ? (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => void updatePull("reopen")}
                  className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] font-semibold hover:bg-[var(--surface-subtle)] disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <span className="text-[var(--fgColor-open,#1a7f37)] flex"><OcticonGitPullRequest size={16} /></span>
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
          <div className="pb-4 border-b border-[var(--border-muted)]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">Reviewers</span>
              <span className="inline-flex items-center gap-2">
                <span className="text-xs text-[var(--text-link)] hover:underline cursor-pointer">Request</span>
                <Settings size={14} className="text-[var(--text-secondary)]" />
              </span>
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">Copilot</p>
          </div>

          <div className="relative pb-4 border-b border-[var(--border-muted)]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">Assignees</span>
              <button
                type="button"
                aria-label="Edit assignees"
                onClick={() => setOpenMenu((m) => (m === "assignees" ? null : "assignees"))}
                className="h-6 w-6 inline-flex items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                <Settings size={14} />
              </button>
            </div>
            {assignees.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                No one assigned
                {collaborators.some((c) => c.username === currentUsername) ? (
                  <>
                    {" "}&mdash;{" "}
                    <button type="button" onClick={() => {
                      const me = collaborators.find((c) => c.username === currentUsername);
                      if (me) void toggleAssignee(me.user_id);
                    }} className="text-[var(--text-link)] hover:underline">
                      Assign yourself
                    </button>
                  </>
                ) : null}
              </p>
            ) : (
              <div className="mt-2 space-y-1">
                {assignees.map((a) => {
                  const name = nameById[a.user_id] || a.user_id;
                  return (
                    <div key={a.user_id} className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[10px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
                        {name.charAt(0)}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">{name}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {openMenu === "assignees" ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} aria-hidden />
                <div className="absolute right-0 z-20 mt-1 w-80 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg">
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
                              className="w-full px-2 py-1.5 text-left rounded-md inline-flex items-center gap-2 hover:bg-[var(--surface-hover)]"
                            >
                              <input type="checkbox" readOnly checked={assignees.some((a) => a.user_id === collaborator.user_id)} className="h-4 w-4" />
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
                onClick={() => setOpenMenu((m) => (m === "labels" ? null : "labels"))}
                className="h-6 w-6 inline-flex items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                <Settings size={14} />
              </button>
            </div>
            {labels.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">None yet</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1">
                {labels.map((label) => (
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
            {openMenu === "labels" ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} aria-hidden />
                <div className="absolute right-0 z-20 mt-1 w-80 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg">
                  <div className="p-2">
                    <p className="px-1 pb-1 text-xs font-semibold text-[var(--text-secondary)]">Apply labels to this pull request</p>
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
                              className="w-full px-2 py-1.5 text-left rounded-md inline-flex items-start gap-2 hover:bg-[var(--surface-hover)]"
                            >
                              <input type="checkbox" readOnly checked={labels.some((l) => l.id === label.id)} className="mt-0.5 h-4 w-4" />
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

          <div className="pb-4 border-b border-[var(--border-muted)]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">Projects</span>
              <Settings size={14} className="text-[var(--text-secondary)]" />
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">None yet</p>
          </div>

          <div className="pb-4 border-b border-[var(--border-muted)]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">Milestone</span>
              <Settings size={14} className="text-[var(--text-secondary)]" />
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">No milestone</p>
          </div>

          <DevelopmentSidebarItem repoId={repoId} pullId={pull.id} issueNumberMap={issueNumberMap} onLinkedIssuesChange={() => void load(true)} />

          <div className="pb-4 border-b border-[var(--border-muted)]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">Notifications</span>
              <span className="inline-flex items-center gap-2">
                <span className="text-xs text-[var(--text-link)]">Customize</span>
                <Settings size={14} className="text-[var(--text-secondary)]" />
              </span>
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">You're receiving notifications because you modified the open/close state.</p>
          </div>
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
