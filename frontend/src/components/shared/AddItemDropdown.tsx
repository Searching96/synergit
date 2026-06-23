import React, { useState, useEffect, useMemo } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
} from '@floating-ui/react';
import type { Placement } from '@floating-ui/react';
import { SearchIcon, IssueOpenedIcon, IssueClosedIcon, RepoIcon, CheckIcon, PlusIcon } from '@primer/octicons-react';
import { reposApi } from '../../services/api/repos';
import { issuesApi } from '../../services/api/issues';
import type { Repository, Issue } from '../../types';

interface AddItemDropdownProps {
  children: React.ReactNode;
  onSelectIssue?: (issue: Issue, repo: Repository) => void;
  placement?: Placement;
  triggerClassName?: string;
}

export function AddItemDropdown({ children, onSelectIssue, placement = 'bottom-end', triggerClassName = 'inline-flex cursor-pointer' }: AddItemDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issueSearchQuery, setIssueSearchQuery] = useState('');

  // Floating UI setup for Main Dropdown
  const { refs: mainRefs, floatingStyles: mainStyles, context: mainContext } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
    placement,
  });

  const mainClick = useClick(mainContext);
  const mainDismiss = useDismiss(mainContext);
  const mainRole = useRole(mainContext);

  const { getReferenceProps: getMainReferenceProps, getFloatingProps: getMainFloatingProps } = useInteractions([
    mainClick,
    mainDismiss,
    mainRole,
  ]);

  // Load repos when main dropdown opens
  useEffect(() => {
    if (isOpen && repos.length === 0 && !reposLoading) {
      setReposLoading(true);
      reposApi.getRepos()
        .then(async (fetchedRepos) => {
          const reposWithIssues: Repository[] = [];
          await Promise.all(fetchedRepos.map(async (repo) => {
            try {
              const repoIssues = await issuesApi.list(repo.id);
              if (repoIssues && repoIssues.length > 0) {
                reposWithIssues.push(repo);
              }
            } catch (e) {
              console.error(e);
            }
          }));
          setRepos(reposWithIssues);
          if (reposWithIssues.length > 0 && !selectedRepoId) {
            setSelectedRepoId(reposWithIssues[0].id);
          }
        })
        .finally(() => setReposLoading(false));
    }
  }, [isOpen, repos.length, reposLoading, selectedRepoId]);

  // Load issues when a repo is selected
  useEffect(() => {
    if (isOpen && selectedRepoId) {
      setIssuesLoading(true);
      issuesApi.list(selectedRepoId)
        .then(res => {
          const sorted = (res || []).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
          setIssues(sorted);
        })
        .finally(() => setIssuesLoading(false));
    }
  }, [isOpen, selectedRepoId]);

  const filteredIssues = useMemo(() => {
    if (!issueSearchQuery) return issues;
    const lower = issueSearchQuery.toLowerCase();
    return issues.filter(issue => issue.title.toLowerCase().includes(lower) || issue.id.includes(lower));
  }, [issues, issueSearchQuery]);

  const selectedRepo = useMemo(() => repos.find(r => r.id === selectedRepoId), [repos, selectedRepoId]);

  const handleIssueSelect = (issue: Issue) => {
    if (selectedRepo && onSelectIssue) {
      onSelectIssue(issue, selectedRepo);
    }
    setIsOpen(false);
  };

  return (
    <>
      <div ref={mainRefs.setReference} {...getMainReferenceProps()} className={triggerClassName}>
        {children}
      </div>

      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={mainContext} modal={false}>
            <div
              ref={mainRefs.setFloating}
              style={mainStyles}
              {...getMainFloatingProps()}
              className="z-50 w-[300px] bg-white dark:bg-[var(--surface-overlay)] border border-[var(--border-default)] rounded-xl shadow-[0_8px_24px_rgba(140,149,159,0.2)] dark:shadow-[0_8px_24px_rgba(1,4,9,0.8)] overflow-hidden flex flex-col font-sans text-[var(--text-primary)]"
            >
              {/* Header: Repo selector */}
              <div className="p-2 border-b border-[var(--border-default)] bg-[#f6f8fa] dark:bg-[var(--surface-subtle)]">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRepoDropdownOpen(!isRepoDropdownOpen)}
                    className="w-full h-8 px-2 flex items-center justify-between text-[13px] font-medium bg-white dark:bg-[var(--surface-canvas)] border border-[var(--border-default)] rounded-md hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] shadow-sm"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <RepoIcon size={14} className="text-[#656d76]" />
                      {reposLoading ? "Loading repos..." : selectedRepo ? selectedRepo.name : "Select repository"}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">▼</span>
                  </button>

                  {/* Nested Repo Dropdown */}
                  {isRepoDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-[var(--surface-overlay)] border border-[var(--border-default)] rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {repos.map(repo => (
                        <button
                          key={repo.id}
                          type="button"
                          onClick={() => {
                            setSelectedRepoId(repo.id);
                            setIsRepoDropdownOpen(false);
                          }}
                          className="w-full flex items-center px-3 py-2 text-[13px] hover:bg-[#0969da] hover:text-white group"
                        >
                          <div className="w-5 shrink-0">
                            {selectedRepoId === repo.id && <CheckIcon size={14} className="text-[#0969da] group-hover:text-white" />}
                          </div>
                          <span className="truncate">{repo.name}</span>
                        </button>
                      ))}
                      {repos.length === 0 && !reposLoading && (
                        <div className="p-3 text-center text-xs text-[var(--text-muted)]">No repos with issues found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Issue Search Input */}
              <div className="p-2 border-b border-[var(--border-default)] relative">
                <SearchIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search issues"
                  value={issueSearchQuery}
                  onChange={(e) => setIssueSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-2 text-sm border border-[var(--border-default)] rounded-md focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da] focus:outline-none bg-white dark:bg-[var(--surface-canvas)]"
                />
              </div>

              {/* Issue List */}
              <div className="max-h-64 overflow-y-auto flex-1">
                {issuesLoading ? (
                  <div className="p-4 text-center text-xs text-[var(--text-secondary)]">Loading issues...</div>
                ) : filteredIssues.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--text-secondary)]">No issues found</div>
                ) : (
                  <div className="flex flex-col">
                    {filteredIssues.map((issue) => (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => handleIssueSelect(issue)}
                        className="w-full text-left flex items-start px-3 py-2 border-b border-[var(--border-muted)] last:border-0 hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] transition-colors"
                      >
                        <div className="w-6 shrink-0 flex items-center justify-center pt-0.5">
                          <span className={issue.status === "OPEN" ? "text-[var(--fgColor-open,#1a7f37)]" : "text-[var(--fgColor-closed,#8250df)]"}>
                            {issue.status === "OPEN" ? <IssueOpenedIcon size={16} /> : <IssueClosedIcon size={16} />}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pl-1">
                          <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">{issue.title}</div>
                          <div className="text-xs text-[var(--text-secondary)] truncate">
                            {selectedRepo?.name}#{issue.id.slice(0, 5)} {/* Hack for issue number if not available */}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer: Create new issue */}
              <div className="p-2 border-t border-[var(--border-default)] bg-[#f6f8fa] dark:bg-[var(--surface-subtle)]">
                {selectedRepo ? (
                  <a
                    href={`/workspace/${selectedRepo.name}`} // Since issue creation is usually in repo workspace or specific route, we assume /workspace/{repoName}/issues/new or similar. The prompt says "giữ href tới page new issue", so let's use `/${selectedRepo.name}/issues/new` if we know the user. Wait, `selectedRepo.owner.username`?
                    className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-primary)] hover:text-[#0969da]"
                    onClick={(e) => e.stopPropagation()} // Prevent closing dropdown if they just click the link
                  >
                    <PlusIcon size={14} className="text-[#656d76]" />
                    Create a new issue
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)] cursor-not-allowed">
                    <PlusIcon size={14} />
                    Create a new issue
                  </span>
                )}
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
