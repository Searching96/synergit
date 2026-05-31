import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, CircleDot, CircleSlash, RotateCcw, Settings } from "lucide-react";
import { collaboratorsApi, issuesApi, labelsApi } from "../../../services/api";
import type { Issue, IssueAssignee, IssueCloseReason, IssueComment, IssueEvent, Label, RepoCollaborator } from "../../../types";

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

function formatDate(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

function EventIcon({ type }: { type: string }) {
  if (type === "closed_completed") return <CheckCircle2 size={14} className="text-[var(--text-accent-purple)]" />;
  if (type === "closed_not_planned" || type === "closed_duplicate") return <CircleSlash size={14} className="text-[var(--text-secondary)]" />;
  if (type === "reopened") return <RotateCcw size={14} className="text-[var(--fgColor-open,#1a7f37)]" />;
  return <CircleDot size={14} className="text-[var(--fgColor-open,#1a7f37)]" />;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [commentBody, setCommentBody] = useState<string>("");
  const [posting, setPosting] = useState<boolean>(false);
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

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [list, collabs] = await Promise.all([
        issuesApi.list(repoId),
        collaboratorsApi.list(repoId).catch(() => []),
      ]);
      setCollaborators(collabs || []);
      const sorted = [...(list || [])].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      const resolved = sorted[Number(issueNumber) - 1] || null;
      setIssue(resolved);
      if (resolved) {
        await loadDetails(resolved);
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
      setIssue(next);
      await loadDetails(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update issue");
    } finally {
      setUpdating(false);
    }
  };

  const timeline = useMemo(() => {
    const items = [
      ...events.map((e) => ({ kind: "event" as const, at: e.created_at, event: e })),
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

  if (loading) {
    return <div className="p-5 text-sm text-[var(--text-secondary)]">Loading issue...</div>;
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
    <div className="w-full">
      {error ? (
        <div className="mb-3 p-3 text-sm border border-[var(--border-danger-soft)] bg-[var(--surface-danger-subtle)] text-[var(--text-danger)] rounded-md">
          {error}
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border-muted)]">
        <h1 className="text-2xl text-[var(--text-primary)]">
          {issue.title} <span className="text-[var(--text-secondary)] font-light">#{issueNumber}</span>
        </h1>
        <button
          type="button"
          onClick={onOpenCreate}
          className="shrink-0 h-8 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)]"
        >
          New issue
        </button>
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

      <div className="flex flex-col gap-6 lg:flex-row pt-5">
        <div className="flex-1 min-w-0">
          <div className="flex gap-3">
            <span className="h-8 w-8 rounded-full bg-[var(--surface-badge)] text-xs inline-flex items-center justify-center uppercase text-[var(--text-secondary)] shrink-0">
              {creatorName.charAt(0)}
            </span>
            <div className="flex-1 min-w-0 rounded-md border border-[var(--border-default)]">
              <div className="px-3 py-2 border-b border-[var(--border-muted)] bg-[var(--surface-subtle)] text-sm">
                <span className="font-semibold text-[var(--text-primary)]">{creatorName}</span>{" "}
                <span className="text-[var(--text-secondary)]">opened on {formatDate(issue.created_at)}</span>
              </div>
              <div className="px-3 py-3 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                {issue.description.trim() || <span className="italic text-[var(--text-secondary)]">No description provided.</span>}
              </div>
            </div>
          </div>

          {timeline.length > 0 ? (
            <div className="relative mt-4">
              <span className="absolute left-4 -top-4 -bottom-6 w-px bg-[var(--border-muted)]" aria-hidden />
              <ul className="space-y-3">
                {timeline.map((item) =>
                  item.kind === "event" ? (
                    <li key={`e-${item.event.id}`} className="relative flex items-center gap-3 text-sm">
                      <span className="z-10 w-8 flex justify-center shrink-0">
                        <span className="h-6 w-6 rounded-full bg-[var(--surface-canvas)] border border-[var(--border-muted)] inline-flex items-center justify-center">
                          <EventIcon type={item.event.event_type} />
                        </span>
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        <span className="font-semibold text-[var(--text-primary)]">{item.event.actor}</span> {eventText(item.event.event_type)}{" "}
                        <span title={new Date(item.event.created_at).toLocaleString()}>on {formatDate(item.event.created_at)}</span>
                      </span>
                    </li>
                  ) : (
                    <li key={`c-${item.comment.id}`} className="relative flex items-start gap-3">
                      <span className="z-10 h-8 w-8 rounded-full bg-[var(--surface-badge)] text-xs inline-flex items-center justify-center uppercase text-[var(--text-secondary)] shrink-0">
                        {item.comment.author.charAt(0)}
                      </span>
                      <div className="flex-1 min-w-0 rounded-md border border-[var(--border-default)]">
                        <div className="px-3 py-2 border-b border-[var(--border-muted)] bg-[var(--surface-subtle)] text-sm text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">{item.comment.author}</span> commented on {formatDate(item.comment.created_at)}
                        </div>
                        <div className="px-3 py-2 text-sm text-[var(--text-primary)] whitespace-pre-wrap">{item.comment.body}</div>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <span className="h-8 w-8 rounded-full bg-[var(--surface-badge)] text-xs inline-flex items-center justify-center uppercase text-[var(--text-secondary)] shrink-0">
              {(currentUsername || "?").charAt(0)}
            </span>
            <div className="flex-1 min-w-0 rounded-md border border-[var(--border-default)]">
              <div className="px-3 py-2 border-b border-[var(--border-muted)] text-sm font-semibold text-[var(--text-primary)]">
                Add a comment
              </div>
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Use Markdown to format your comment"
                className="w-full min-h-28 px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--surface-canvas)] resize-y"
              />
              <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-[var(--border-muted)]">
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
                              className="w-full px-3 py-2 text-left inline-flex items-start gap-2 hover:bg-[var(--surface-hover)]"
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
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => void applyStatus("OPEN")}
                    className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <RotateCcw size={15} />
                    {commentBody.trim() ? "Reopen with comment" : "Reopen issue"}
                  </button>
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
          <div className="pb-4 border-b border-[var(--border-muted)]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">Assignees</span>
              <Settings size={14} className="text-[var(--text-secondary)]" />
            </div>
            {assignees.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">No one assigned</p>
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
          </div>

          <div className="pb-4 border-b border-[var(--border-muted)]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">Labels</span>
              <Settings size={14} className="text-[var(--text-secondary)]" />
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
  );
}
