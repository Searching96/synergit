import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Bold, CheckCircle2, ChevronDown, CircleDot, CircleSlash, Code, Heading, Italic, Link, List, ListOrdered, Settings } from "lucide-react";
import { CopyIcon, CheckIcon, GitPullRequestIcon, GitMergeIcon, GitPullRequestClosedIcon } from "@primer/octicons-react";
import { OcticonCrossReference } from "../../icons/Octicons";
import { collaboratorsApi, issuesApi, labelsApi } from "../../../services/api";
import type { Issue, IssueAssignee, IssueCloseReason, IssueComment, IssueEvent, Label, RepoCollaborator } from "../../../types";
import { Tooltip } from "../../../components/shared/Tooltip";
import IssueDevelopmentSidebarItem from "./IssueDevelopmentSidebarItem";
interface IssueDetailPageProps {
  repoId: string;
  currentUsername: string;
  issueNumber: string;
  onBack: () => void;
  onOpenCreate: () => void;
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
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? "" : "s"} ago`;
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

function eventText(type: string): string {
  switch (type) {
    case "opened":
      return "opened this issue";
    case "reopened":
      return "reopened this";
    case "closed_completed":
      return "closed this as completed";
    case "closed_not_planned":
      return "closed this as not planned";
    case "closed_duplicate":
      return "closed this as duplicate";
    default:
      return type;
  }
}

function ReopenedIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width={size} height={size} fill="currentColor" className={className}>
      <path d="M5.029 2.217a6.5 6.5 0 0 1 9.437 5.11.75.75 0 1 0 1.492-.154 8 8 0 0 0-14.315-4.03L.427 1.927A.25.25 0 0 0 0 2.104V5.75A.25.25 0 0 0 .25 6h3.646a.25.25 0 0 0 .177-.427L2.715 4.215a6.491 6.491 0 0 1 2.314-1.998ZM1.262 8.169a.75.75 0 0 0-1.22.658 8.001 8.001 0 0 0 14.315 4.03l1.216 1.216a.25.25 0 0 0 .427-.177V10.25a.25.25 0 0 0-.25-.25h-3.646a.25.25 0 0 0-.177.427l1.358 1.358a6.501 6.501 0 0 1-11.751-3.11.75.75 0 0 0-.272-.506Z" />
      <path d="M9.06 9.06a1.5 1.5 0 1 1-2.12-2.12 1.5 1.5 0 0 1 2.12 2.12Z" />
    </svg>
  );
}

function eventColor(type: string): string {
  if (type === "closed_completed") return "#8250df";
  if (type === "closed_not_planned" || type === "closed_duplicate") return "#6e7781";
  return "#1a7f37";
}

function EventIcon({ type }: { type: string }) {
  if (type === "closed_completed") return <CheckCircle2 size={14} />;
  if (type === "closed_not_planned" || type === "closed_duplicate") return <CircleSlash size={14} />;
  if (type === "reopened") return <ReopenedIcon size={14} />;
  return <CircleDot size={14} />;
}

export default function IssueDetailPage({
  repoId,
  currentUsername,
  issueNumber,
  onBack,
  onOpenCreate,
}: IssueDetailPageProps) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [events, setEvents] = useState<IssueEvent[]>([]);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [assignees, setAssignees] = useState<IssueAssignee[]>([]);
  const [collaborators, setCollaborators] = useState<RepoCollaborator[]>([]);
  const [repoLabels, setRepoLabels] = useState<Label[]>([]);
  const [openMenu, setOpenMenu] = useState<"assignees" | "labels" | "relationships" | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [labelFilter, setLabelFilter] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isStickyVisible, setIsStickyVisible] = useState<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!sentinelRef.current) return;
      const rect = sentinelRef.current.getBoundingClientRect();
      // Show sticky header when sentinel is above the viewport
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
  const [updating, setUpdating] = useState<boolean>(false);
  const [commentBody, setCommentBody] = useState<string>("");
  const [posting, setPosting] = useState<boolean>(false);
  const [commentPreview, setCommentPreview] = useState<boolean>(false);
  const [closeMenuOpen, setCloseMenuOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    collaborators.forEach((c) => {
      if (c.username) map[c.user_id] = c.username;
    });
    return map;
  }, [collaborators]);

  const loadDetails = useCallback(
    async (resolved: Issue) => {
      const [ev, lb, asg, cm] = await Promise.all([
        issuesApi.listEvents(repoId, resolved.id).catch(() => []),
        labelsApi.listForIssue(repoId, resolved.id).catch(() => []),
        issuesApi.listAssignees(repoId, resolved.id).catch(() => []),
        issuesApi.listComments(repoId, resolved.id).catch(() => []),
      ]);
      setEvents(ev || []);
      setLabels(lb || []);
      setAssignees(asg || []);
      setComments(cm || []);
    },
    [repoId],
  );

  const load = useCallback(async (isSilent?: boolean) => {
    try {
      if (!isSilent) {
        setLoading(true);
        setError(null);
      }
      const [list, collabs, rLabels] = await Promise.all([
        issuesApi.list(repoId),
        collaboratorsApi.list(repoId).catch(() => []),
        labelsApi.listForRepo(repoId).catch(() => []),
      ]);
      setCollaborators(collabs || []);
      setRepoLabels(rLabels || []);
      const sorted = [...(list || [])].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      const resolved = sorted[Number(issueNumber) - 1] || null;
      if (!isSilent) {
        setIssue(resolved);
      }
      if (resolved) {
        await loadDetails(resolved);
        if (isSilent) setIssue(resolved);
      } else if (isSilent) {
        setIssue(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load issue");
    } finally {
      setLoading(false);
    }
  }, [issueNumber, loadDetails, repoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyStatus = async (status: "OPEN" | "CLOSED", reason?: IssueCloseReason) => {
    if (!issue) return;
    try {
      setUpdating(true);
      setError(null);
      setCloseMenuOpen(false);
      if (commentBody.trim()) {
        await issuesApi.addComment(repoId, issue.id, commentBody.trim());
        setCommentBody("");
      }
      const payload = status === "CLOSED" ? { status, close_reason: reason } : { status };
      await issuesApi.updateStatus(repoId, issue.id, payload);
      const next = { ...issue, status, close_reason: status === "CLOSED" ? reason ?? "COMPLETED" : null } as Issue;
      await loadDetails(next);
      setIssue(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update issue");
    } finally {
      setUpdating(false);
    }
  };

  const timeline = useMemo(() => {
    const items = [
      ...events.filter((e) => e.event_type !== "opened").map((e) => ({ kind: "event" as const, at: e.created_at, event: e })),
      ...comments.map((c) => ({ kind: "comment" as const, at: c.created_at, comment: c })),
    ];
    return items.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  }, [events, comments]);

  const postComment = async () => {
    if (!issue || !commentBody.trim()) return;
    try {
      setPosting(true);
      setError(null);
      await issuesApi.addComment(repoId, issue.id, commentBody.trim());
      setCommentBody("");
      await loadDetails(issue);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setPosting(false);
    }
  };

  const toggleAssignee = async (userId: string) => {
    if (!issue) return;
    try {
      const has = assignees.some((a) => a.user_id === userId);
      if (has) {
        await issuesApi.unassign(repoId, issue.id, userId);
      } else {
        await issuesApi.assign(repoId, issue.id, { user_id: userId });
      }
      await loadDetails(issue);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleLabel = async (labelId: string) => {
    if (!issue) return;
    try {
      const has = labels.some((l) => l.id === labelId);
      if (has) {
        await labelsApi.remove(repoId, issue.id, labelId);
      } else {
        await labelsApi.add(repoId, issue.id, { label_id: labelId });
      }
      await loadDetails(issue);
    } catch (err) {
      console.error(err);
    }
  };

  const visibleCollaborators = collaborators.filter((c) =>
    (c.username ?? "").toLowerCase().includes(assigneeFilter.trim().toLowerCase()),
  );
  const visibleLabels = repoLabels.filter((l) =>
    (l.name ?? "").toLowerCase().includes(labelFilter.trim().toLowerCase()),
  );

  if (loading && !issue) {
    return null;
  }

  if (!issue) {
    return (
      <div className="p-5 text-sm text-[var(--text-secondary)]">
        Issue not found.{" "}
        <button type="button" onClick={onBack} className="text-[var(--text-link)] hover:underline">
          Back to issues
        </button>
      </div>
    );
  }

  const closedCompleted = issue.status === "CLOSED" && issue.close_reason !== "NOT_PLANNED" && issue.close_reason !== "DUPLICATE";
  const statusColor = issue.status === "OPEN" ? "#1a7f37" : closedCompleted ? "#8250df" : "#6e7781";
  const statusLabel = issue.status === "OPEN" ? "Open" : "Closed";
  const creatorName = nameById[issue.creator_id] || "Someone";

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
              style={{ backgroundColor: statusColor }}
            >
              {issue.status === "OPEN" ? <CircleDot size={15} /> : closedCompleted ? <CheckCircle2 size={15} /> : <CircleSlash size={15} />}
              {statusLabel}
            </span>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              {issue.title} <span className="text-[var(--text-secondary)] font-normal">#{issueNumber}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCreate}
              className="shrink-0 h-8 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)]"
            >
              New issue
            </button>
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

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {issue.title} <span className="text-[var(--text-secondary)] font-normal">#{issueNumber}</span>
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenCreate}
            className="shrink-0 h-8 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)]"
          >
            New issue
          </button>
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

      <div className="py-3 border-b border-[var(--border-muted)]">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-white"
          style={{ backgroundColor: statusColor }}
        >
          {issue.status === "OPEN" ? <CircleDot size={15} /> : closedCompleted ? <CheckCircle2 size={15} /> : <CircleSlash size={15} />}
          {statusLabel}
        </span>
      </div>
      
      <div ref={sentinelRef} className="h-0 w-full" />

      <div className="flex flex-col gap-6 lg:flex-row pt-5">
        <div className="flex-1 min-w-0" style={{ "--rail": "85px" } as CSSProperties}>
          <div className="relative pl-16">
            <span className="absolute left-0 top-0 h-10 w-10 rounded-full bg-[var(--surface-badge)] text-sm inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
              {creatorName.charAt(0)}
            </span>
            <div className="rounded-md ml-[calc(var(--rail)_-_85px)] border border-[var(--border-default)]">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-muted)] bg-[var(--surface-info-subtle)] text-sm">
                <span>
                  <span className="font-semibold text-[var(--text-primary)]">{creatorName}</span>{" "}
                  <span className="text-[var(--text-secondary)]">opened <span title={fullTime(issue.created_at)} className="hover:underline">{relativeTime(issue.created_at)}</span></span>
                </span>
                <span className="rounded-full border border-[var(--border-default)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">Author</span>
              </div>
              <div className="px-3 py-2 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                {issue.description.trim() || <span className="italic text-[var(--text-secondary)]">No description provided.</span>}
              </div>
            </div>
          </div>

          {timeline.length > 0 ? (
            <div className="relative mt-4">
              <span className="absolute left-[var(--rail)] -top-4 -bottom-6 w-0.5 bg-[var(--border-muted)]" aria-hidden />
              <ul className="space-y-3">
                {timeline.map((item, index) => {
                  if (item.kind === "event") {
                    if (item.event.event_type === "pr_linked" || item.event.event_type === "pr_unlinked") {
                      const prevItem = index > 0 ? timeline[index - 1] : null;
                      const nextItem = index < timeline.length - 1 ? timeline[index + 1] : null;
                      
                      const prevIsLink = prevItem?.kind === "event" && (prevItem.event.event_type === "pr_linked" || prevItem.event.event_type === "pr_unlinked");
                      const nextIsLink = nextItem?.kind === "event" && (nextItem.event.event_type === "pr_linked" || nextItem.event.event_type === "pr_unlinked");
                      
                      const pt = prevIsLink ? "pt-1" : "pt-4";
                      const pb = nextIsLink ? "pb-1" : "pb-4";
                      const iconTop = prevIsLink ? "top-1" : "top-4";

                      return (
                        <li key={`e-${item.event.id}`} className={`relative ${pt} ${pb} pl-[calc(var(--rail)_+_17px)] flex items-start text-sm`}>
                          <span className={`absolute left-[calc(var(--rail)_-_11px)] ${iconTop} z-10 h-6 w-6 rounded-full bg-[var(--surface-badge)] text-[var(--text-secondary)] inline-flex items-center justify-center`}>
                            {item.event.event_type === "pr_unlinked" && item.event.pull_request ? (
                              item.event.pull_request.status === "OPEN" ? (
                                <GitPullRequestIcon size={16} className="text-[var(--fgColor-open,#1a7f37)]" />
                              ) : item.event.pull_request.status === "MERGED" ? (
                                <GitMergeIcon size={16} className="text-[var(--fgColor-done,#8250df)]" />
                              ) : (
                                <GitPullRequestClosedIcon size={16} className="text-[var(--fgColor-closed,#cf222e)]" />
                              )
                            ) : (
                              <OcticonCrossReference size={16} />
                            )}
                          </span>
                          <div className="text-[var(--text-secondary)] w-full">
                            <div className="flex items-center gap-1.5">
                              <span className="shrink-0 h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[9px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
                                {(item.event.actor || creatorName).charAt(0)}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-[var(--text-primary)]">{item.event.actor || creatorName}</span>
                                <span>{item.event.event_type === "pr_linked" ? "linked a pull request that will close this issue" : "removed a link to a pull request"}</span>
                                {item.event.pull_request && (
                                  <span className="inline-flex items-center gap-1">
                                    {item.event.pull_request.status === "OPEN" ? (
                                      <GitPullRequestIcon size={16} className="text-[var(--fgColor-open,#1a7f37)]" />
                                    ) : item.event.pull_request.status === "MERGED" ? (
                                      <GitMergeIcon size={16} className="text-[var(--fgColor-done,#8250df)]" />
                                    ) : (
                                      <GitPullRequestClosedIcon size={16} className="text-[var(--fgColor-closed,#cf222e)]" />
                                    )}
                                    <a href={`/repository/${repoId}/pulls/${item.event.pull_request_number}`} className="font-semibold text-[var(--text-primary)] hover:text-[var(--text-link)] hover:underline">
                                      {item.event.pull_request.title} #{item.event.pull_request_number}
                                    </a>
                                  </span>
                                )}
                                <span title={fullTime(item.event.created_at)} className="hover:underline hover:text-[var(--text-link)] cursor-pointer">{relativeTime(item.event.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    }
                    return (
                      <li key={`e-${item.event.id}`} className="relative pl-[calc(var(--rail)_+_17px)] flex items-center text-sm">
                        <span
                          style={{ backgroundColor: eventColor(item.event.event_type) }}
                          className="absolute left-[calc(var(--rail)_-_11px)] top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full text-white inline-flex items-center justify-center"
                        >
                          <EventIcon type={item.event.event_type} />
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                          <span className="h-5 w-5 rounded-full bg-[var(--surface-badge)] text-[9px] inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
                            {item.event.actor.charAt(0)}
                          </span>
                          <span>
                            <span className="font-semibold text-[var(--text-primary)]">{item.event.actor}</span> {eventText(item.event.event_type)}{" "}
                            <span title={fullTime(item.event.created_at)} className="hover:underline">{relativeTime(item.event.created_at)}</span>
                          </span>
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={`c-${item.comment.id}`} className="relative pl-16">
                      <span className="absolute left-0 top-0 h-10 w-10 rounded-full bg-[var(--surface-badge)] text-sm inline-flex items-center justify-center uppercase text-[var(--text-secondary)]">
                        {item.comment.author.charAt(0)}
                      </span>
                      <div className="rounded-md ml-[calc(var(--rail)_-_85px)] border border-[var(--border-default)] bg-[var(--surface-canvas)]">
                        <div className={`flex items-center justify-between px-3 py-2 border-b border-[var(--border-muted)] text-sm text-[var(--text-secondary)] ${item.comment.author === creatorName ? "bg-[var(--surface-info-subtle)]" : "bg-[var(--surface-subtle)]"}`}>
                          <span>
                            <span className="font-semibold text-[var(--text-primary)]">{item.comment.author}</span> commented <span title={fullTime(item.comment.created_at)} className="hover:underline">{relativeTime(item.comment.created_at)}</span>
                          </span>
                          {item.comment.author === creatorName ? (
                            <span className="rounded-full border border-[var(--border-default)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">Author</span>
                          ) : null}
                        </div>
                        <div className="px-3 py-2 text-sm text-[var(--text-primary)] whitespace-pre-wrap">{item.comment.body}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

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
                <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                  {[Heading, Bold, Italic, ListOrdered, Code, Link, List].map((Icon, i) => (
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
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Use Markdown to format your comment"
                  className="w-full min-h-28 px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--surface-canvas)] resize-y"
                />
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">Paste, drop, or click to add files</span>
              <div className="flex items-center gap-2">
                {issue.status === "OPEN" ? (
                  <div className="relative inline-flex">
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => void applyStatus("CLOSED", "COMPLETED")}
                      className="h-8 pl-3 pr-2 rounded-l-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={15} className="text-[var(--text-accent-purple)]" />
                      {commentBody.trim() ? "Close with comment" : "Close issue"}
                    </button>
                    <button
                      type="button"
                      aria-label="Close options"
                      onClick={() => setCloseMenuOpen((o) => !o)}
                      className="h-8 px-1.5 rounded-r-md border border-l-0 border-[var(--border-default)] bg-[var(--surface-canvas)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
                    >
                      <ChevronDown size={14} />
                    </button>
                    {closeMenuOpen ? (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setCloseMenuOpen(false)} aria-hidden />
                        <div className="absolute right-0 bottom-full mb-1 z-20 w-72 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg py-1">
                          {[
                            { reason: "COMPLETED" as const, icon: <CheckCircle2 size={15} className="text-[var(--text-accent-purple)]" />, title: "Close as completed", subtitle: "Done, closed, fixed, resolved" },
                            { reason: "NOT_PLANNED" as const, icon: <CircleSlash size={15} className="text-[var(--text-secondary)]" />, title: "Close as not planned", subtitle: "Won't fix, can't repro, stale" },
                            { reason: "DUPLICATE" as const, icon: <CircleSlash size={15} className="text-[var(--text-secondary)]" />, title: "Close as duplicate", subtitle: "Duplicate of another issue" },
                          ].map((opt) => (
                            <button
                              key={opt.reason}
                              type="button"
                              onClick={() => void applyStatus("CLOSED", opt.reason)}
                              className="w-full px-3 py-2 text-left rounded-md inline-flex items-start gap-2 hover:bg-[var(--surface-hover)]"
                            >
                              <span className="mt-0.5">{opt.icon}</span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-[var(--text-primary)]">{opt.title}</span>
                                <span className="block text-xs text-[var(--text-secondary)]">{opt.subtitle}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="relative inline-flex">
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => void applyStatus("OPEN")}
                      className="h-8 pl-3 pr-2 rounded-l-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <ReopenedIcon size={15} className="text-[var(--fgColor-open,#1a7f37)]" />
                      {commentBody.trim() ? "Reopen with comment" : "Reopen issue"}
                    </button>
                    <button
                      type="button"
                      aria-label="Reopen options"
                      onClick={() => setCloseMenuOpen((o) => !o)}
                      className="h-8 px-1.5 rounded-r-md border border-l-0 border-[var(--border-default)] bg-[var(--surface-canvas)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
                    >
                      <ChevronDown size={14} />
                    </button>
                    {closeMenuOpen ? (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setCloseMenuOpen(false)} aria-hidden />
                        <div className="absolute right-0 bottom-full mb-1 z-20 w-72 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg py-1">
                          <button
                            type="button"
                            onClick={() => void applyStatus("OPEN")}
                            className="w-full px-3 py-2 text-left rounded-md inline-flex items-start gap-2 hover:bg-[var(--surface-hover)]"
                          >
                            <span className="mt-0.5"><ReopenedIcon size={15} className="text-[var(--fgColor-open,#1a7f37)]" /></span>
                            <span className="block text-sm font-semibold text-[var(--text-primary)]">Reopen issue</span>
                          </button>
                          {[
                            { reason: "NOT_PLANNED" as const, title: "Close as not planned", subtitle: "Won't fix, can't repro, stale" },
                            { reason: "DUPLICATE" as const, title: "Close as duplicate", subtitle: "Duplicate of another issue" },
                          ].map((opt) => (
                            <button
                              key={opt.reason}
                              type="button"
                              onClick={() => void applyStatus("CLOSED", opt.reason)}
                              className="w-full px-3 py-2 text-left rounded-md inline-flex items-start gap-2 hover:bg-[var(--surface-hover)]"
                            >
                              <span className="mt-0.5"><CircleSlash size={15} className="text-[var(--text-secondary)]" /></span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-[var(--text-primary)]">{opt.title}</span>
                                <span className="block text-xs text-[var(--text-secondary)]">{opt.subtitle}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
                <button
                  type="button"
                  disabled={posting || !commentBody.trim()}
                  onClick={() => void postComment()}
                  className="h-8 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
                >
                  {posting ? "Commenting..." : "Comment"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="w-full lg:w-72 lg:shrink-0 space-y-4 text-sm">
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

          <div className="relative pb-4 border-b border-[var(--border-muted)]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">Relationships</span>
              <button
                type="button"
                onClick={() => setOpenMenu((m) => (m === "relationships" ? null : "relationships"))}
                className="h-6 w-6 inline-flex items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                <Settings size={14} />
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">None yet</p>
            {openMenu === "relationships" ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} aria-hidden />
                <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg p-2">
                  <button type="button" className="w-full px-2 py-1.5 text-left text-sm text-[var(--text-primary)] rounded-md hover:bg-[var(--surface-hover)] flex items-center justify-between group">
                    <span>Mark as blocked by</span>
                  </button>
                  <button type="button" className="w-full px-2 py-1.5 text-left text-sm text-[var(--text-primary)] rounded-md hover:bg-[var(--surface-hover)] flex items-center justify-between group">
                    <span>Mark as blocking</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <IssueDevelopmentSidebarItem repoId={repoId} issueId={issue.id} issueNumber={issueNumber} issueTitle={issue.title} onUpdate={() => void loadDetails(issue)} />
          {[
            { label: "Projects", value: "None yet" },
            { label: "Milestone", value: "No milestone" },
          ].map((section) => (
            <div key={section.label} className="pb-4 border-b border-[var(--border-muted)]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--text-primary)]">{section.label}</span>
                <button
                  type="button"
                  className="h-6 w-6 inline-flex items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                >
                  <Settings size={14} />
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">{section.value}</p>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
