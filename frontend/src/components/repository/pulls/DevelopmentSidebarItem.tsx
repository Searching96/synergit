import { useState, useEffect, useMemo } from "react";
import { Settings, Check } from "lucide-react";
import { IssueOpenedIcon, IssueClosedIcon } from "@primer/octicons-react";
import { pullsApi } from "../../../services/api/pull";
import { issuesApi } from "../../../services/api/issues";
import type { Issue } from "../../../types";

export default function DevelopmentSidebarItem({ repoId, pullId, issueNumberMap, onLinkedIssuesChange }: { repoId: string; pullId: string; issueNumberMap: Map<string, number>; onLinkedIssuesChange?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [initialLinkedIssues, setInitialLinkedIssues] = useState<Issue[]>([]);

  const pathParts = window.location.pathname.split("/");
  const repoFullName = `${pathParts[1]}/${pathParts[2]}`;

  useEffect(() => {
    // Always fetch linked issues on mount
    pullsApi.getLinkedIssues(repoId, pullId).then(res => {
      setInitialLinkedIssues(res || []);
      setSelectedIssueIds((res || []).map(i => i.id));
    }).catch(console.error);
  }, [repoId, pullId]);

  useEffect(() => {
    if (isOpen && issues.length === 0) {
      setLoading(true);
      issuesApi.list(repoId)
        .then((res) => {
          const sorted = (res || []).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
          setIssues(sorted);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, repoId, issues.length]);

  const filteredIssues = useMemo(() => {
    if (!filter) return issues;
    const lower = filter.toLowerCase();
    return issues.filter(issue => issue.title.toLowerCase().includes(lower) || issue.id.includes(lower));
  }, [issues, filter]);

  const handleToggleIssue = async (issueId: string) => {
    if (linking) return;
    setLinking(issueId);
    
    const isLinked = selectedIssueIds.includes(issueId);
    try {
      if (isLinked) {
        await pullsApi.unlinkIssue(repoId, pullId, issueId);
        setSelectedIssueIds(prev => prev.filter(id => id !== issueId));
      } else {
        await pullsApi.linkIssue(repoId, pullId, issueId);
        setSelectedIssueIds(prev => [...prev, issueId]);
      }
      if (onLinkedIssuesChange) onLinkedIssuesChange();
    } catch (err) {
      console.error("Failed to toggle issue link", err);
    } finally {
      setLinking(null);
    }
  };

  // We map selected issues either from `issues` or from the IDs if `issues` isn't loaded
  const selectedIssues = useMemo(() => {
    return selectedIssueIds.map(id => issues.find(i => i.id === id) || initialLinkedIssues.find(i => i.id === id)).filter(Boolean) as Issue[];
  }, [selectedIssueIds, issues, initialLinkedIssues]);

  return (
    <div className="pb-4 border-b border-[var(--border-muted)] relative">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[var(--text-primary)]">Development</span>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 hover:text-[var(--text-link)] text-[var(--text-secondary)] transition-colors"
        >
          <Settings size={14} />
        </button>
      </div>

      <p className="mt-2 text-xs text-[var(--text-secondary)] mb-2">Successfully merging this pull request may close these issues.</p>

      {selectedIssues.length > 0 && (
        <div className="space-y-2">
          {selectedIssues.map((issue) => (
            <div key={issue.id} className="flex gap-2">
              <span className={issue.status === "OPEN" ? "text-[var(--fgColor-open,#1a7f37)]" : "text-[var(--fgColor-closed,#8250df)]"}>
                {issue.status === "OPEN" ? <IssueOpenedIcon size={16} /> : <IssueClosedIcon size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <a href={`/${repoFullName}/issues/${issueNumberMap.get(issue.id) || 0}`} className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-link)] hover:underline truncate block">
                  {issue.title}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-6 mt-1 z-50 w-72 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-xl overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-[var(--border-muted)] bg-[var(--surface-subtle)] font-semibold text-xs text-[var(--text-primary)]">
              Link an issue from this repository
            </div>
            <div className="p-2 border-b border-[var(--border-muted)]">
              <input
                type="text"
                autoFocus
                placeholder="Filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full h-8 px-2 text-sm border border-[var(--border-default)] rounded-md focus:border-[var(--text-link)] focus:ring-1 focus:ring-[var(--text-link)] focus:outline-none bg-[var(--surface-canvas)] text-[var(--text-primary)]"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-xs text-[var(--text-secondary)]">Loading...</div>
              ) : filteredIssues.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--text-secondary)]">No issues found</div>
              ) : (
                <div className="flex flex-col">
                  {filteredIssues.map((issue) => {
                    const isSelected = selectedIssueIds.includes(issue.id);
                    const issueNumber = issueNumberMap.get(issue.id) || 0;
                    
                    return (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => handleToggleIssue(issue.id)}
                        className="w-full text-left flex items-start px-3 py-2 border-b border-[var(--border-muted)] last:border-0 hover:bg-[var(--surface-hover)] transition-colors"
                      >
                        <div className="w-6 shrink-0 flex items-center justify-center pt-0.5">
                          {isSelected && <Check size={14} className="text-[var(--text-primary)]" />}
                        </div>
                        <div className="w-6 shrink-0 flex items-center justify-center pt-0.5">
                          <span className={issue.status === "OPEN" ? "text-[var(--fgColor-open,#1a7f37)]" : "text-[var(--fgColor-closed,#8250df)]"}>
                            {issue.status === "OPEN" ? <IssueOpenedIcon size={16} /> : <IssueClosedIcon size={16} />}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pl-1">
                          <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{issue.title}</div>
                          <div className="text-xs text-[var(--text-secondary)] truncate">{repoFullName}#{issueNumber}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
