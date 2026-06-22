import { useState, useEffect, useMemo } from "react";
import { GearIcon, CheckIcon, GitPullRequestIcon, GitBranchIcon, GitMergeIcon, GitPullRequestClosedIcon, SearchIcon, ArrowLeftIcon, CopyIcon, XIcon } from "@primer/octicons-react";
import CreateIssueBranchPopup from "./CreateIssueBranchPopup";
import { Toast } from "../../shared/Toast";
import { Tooltip } from "../../shared/Tooltip";
import { pullsApi } from "../../../services/api/pull";
import { issuesApi } from "../../../services/api/issues";
import { reposApi } from "../../../services/api/repos";
import type { PullRequest, Branch } from "../../../types";

export default function IssueDevelopmentSidebarItem({ repoId, issueId, issueNumber, issueTitle, onUpdate }: { repoId: string; issueId: string; issueNumber: string; issueTitle: string; onUpdate?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filter, setFilter] = useState("");
  
  const [allPulls, setAllPulls] = useState<PullRequest[]>([]);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  
  const [linkedPulls, setLinkedPulls] = useState<PullRequest[]>([]);
  const [linkedBranchNames, setLinkedBranchNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [checkoutBranch, setCheckoutBranch] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyCheckout = () => {
    if (!checkoutBranch) return;
    navigator.clipboard.writeText(`git fetch origin\ngit checkout ${checkoutBranch}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    issuesApi.listLinkedPullRequests(repoId, issueId).then(res => setLinkedPulls(res || [])).catch(console.error);
    issuesApi.listLinkedBranches(repoId, issueId).then(res => setLinkedBranchNames(res || [])).catch(console.error);
  }, [repoId, issueId]);

  useEffect(() => {
    if (isOpen && allPulls.length === 0 && allBranches.length === 0) {
      setLoading(true);
      Promise.all([
        pullsApi.list(repoId),
        reposApi.getBranches(repoId)
      ]).then(([pullsRes, branchesRes]) => {
        setAllPulls((pullsRes || []).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)));
        setAllBranches((branchesRes || []).filter(b => !b.is_default));
      }).finally(() => setLoading(false));
    }
  }, [isOpen, repoId, allPulls.length, allBranches.length]);

  type SuggestionItem = { type: 'pr'; id: string; title: string; pr: PullRequest } | { type: 'branch'; id: string; title: string; branch: Branch };

  const suggestionItems = useMemo(() => {
    const items: SuggestionItem[] = [];
    allPulls.forEach(pr => items.push({ type: 'pr', id: pr.id, title: pr.title, pr }));
    allBranches.forEach(b => items.push({ type: 'branch', id: b.name, title: b.name, branch: b }));
    
    if (!filter) return items;
    const lower = filter.toLowerCase();
    return items.filter(i => i.title.toLowerCase().includes(lower));
  }, [allPulls, allBranches, filter]);

  const selectedItems = useMemo(() => {
    return suggestionItems.filter(item => item.type === 'pr' ? linkedPulls.some(p => p.id === item.id) : linkedBranchNames.includes(item.id));
  }, [suggestionItems, linkedPulls, linkedBranchNames]);

  const unselectedItems = useMemo(() => {
    return suggestionItems.filter(item => !(item.type === 'pr' ? linkedPulls.some(p => p.id === item.id) : linkedBranchNames.includes(item.id)));
  }, [suggestionItems, linkedPulls, linkedBranchNames]);

  const handleTogglePR = async (pr: PullRequest) => {
    if (linking) return;
    setLinking(pr.id);
    const isLinked = linkedPulls.some(p => p.id === pr.id);
    try {
      if (isLinked) {
        await pullsApi.unlinkIssue(repoId, pr.id, issueId);
        setLinkedPulls(prev => prev.filter(p => p.id !== pr.id));
        onUpdate?.();
      } else {
        await pullsApi.linkIssue(repoId, pr.id, issueId);
        setLinkedPulls(prev => [...prev, pr]);
        onUpdate?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLinking(null);
    }
  };

  const handleToggleBranch = async (branchName: string) => {
    if (linking) return;
    setLinking(branchName);
    const isLinked = linkedBranchNames.includes(branchName);
    try {
      if (isLinked) {
        await issuesApi.unlinkBranch(repoId, issueId, branchName);
        setLinkedBranchNames(prev => prev.filter(b => b !== branchName));
        onUpdate?.();
      } else {
        await issuesApi.linkBranch(repoId, issueId, branchName);
        setLinkedBranchNames(prev => [...prev, branchName]);
        onUpdate?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLinking(null);
    }
  };

  const renderItem = (item: SuggestionItem, isSelected: boolean) => {
    return (
      <button
        key={`${item.type}-${item.id}`}
        type="button"
        onClick={() => item.type === 'pr' ? handleTogglePR(item.pr) : handleToggleBranch(item.id)}
        className="w-full text-left flex items-start px-3 py-2 border-b border-[var(--border-muted)] last:border-0 hover:bg-[var(--surface-hover)] transition-colors"
      >
        <div className="w-6 shrink-0 flex items-center justify-center pt-0.5">
          <input type="checkbox" checked={isSelected} readOnly className="accent-[var(--text-link)] cursor-pointer" />
        </div>
        <div className="w-6 shrink-0 flex items-center justify-center pt-0.5">
          {item.type === 'pr' ? (
             <span className={item.pr.status === "OPEN" ? "text-[var(--fgColor-open,#1a7f37)]" : item.pr.status === "MERGED" ? "text-[var(--fgColor-done,#8250df)]" : "text-[var(--fgColor-closed,#cf222e)]"}>
               {item.pr.status === "OPEN" ? <GitPullRequestIcon size={16} /> : item.pr.status === "MERGED" ? <GitMergeIcon size={16} /> : <GitPullRequestClosedIcon size={16} />}
             </span>
          ) : (
             <span className="text-[var(--text-secondary)]">
               <GitBranchIcon size={16} />
             </span>
          )}
        </div>
        <div className="flex-1 min-w-0 pl-1">
          <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.title}</div>
          {item.type === 'pr' && <div className="text-xs text-[var(--text-secondary)] truncate">#{item.id.slice(0, 7)}</div>}
        </div>
      </button>
    );
  };

  return (
    <div className="pb-4 border-b border-[var(--border-muted)] relative">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[var(--text-primary)]">Development</span>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 hover:text-[var(--text-link)] text-[var(--text-secondary)] transition-colors"
        >
          <GearIcon size={14} />
        </button>
      </div>

      {(linkedPulls.length > 0 || linkedBranchNames.length > 0) ? (
        <div className="space-y-4 mt-2">
          {linkedBranchNames.map(branchName => (
            <div key={branchName} className="flex gap-2 items-start">
              <span className="text-[var(--text-secondary)] mt-0.5">
                <GitBranchIcon size={16} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <a href={`/${window.location.pathname.split('/')[1]}/${window.location.pathname.split('/')[2]}/tree/${branchName}`} className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-link)] hover:underline cursor-pointer block truncate">{branchName}</a>
                <span className="text-xs text-[var(--text-secondary)] block truncate mt-0.5">{window.location.pathname.split('/')[2]}/{window.location.pathname.split('/')[3]}</span>
              </div>
            </div>
          ))}
          {linkedPulls.map(pr => (
            <div key={pr.id} className="flex gap-2 items-start">
              <span className={`mt-0.5 ${pr.status === "OPEN" ? "text-[var(--fgColor-open,#1a7f37)]" : pr.status === "MERGED" ? "text-[var(--fgColor-done,#8250df)]" : "text-[var(--fgColor-closed,#cf222e)]"}`}>
                {pr.status === "OPEN" ? <GitPullRequestIcon size={16} /> : pr.status === "MERGED" ? <GitMergeIcon size={16} /> : <GitPullRequestClosedIcon size={16} />}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <a href={`/${window.location.pathname.split('/')[1]}/${window.location.pathname.split('/')[2]}/pulls/${pr.id}`} className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-link)] hover:underline cursor-pointer block truncate">{pr.title}</a>
                <span className="text-xs text-[var(--text-secondary)] block truncate mt-0.5">{window.location.pathname.split('/')[2]}/{window.location.pathname.split('/')[3]}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-[var(--text-secondary)] mb-2">
          <button onClick={() => setIsCreateOpen(true)} className="text-[var(--text-link)] hover:underline">
            Create a branch
          </button>{" "}
          for this issue or link a pull request.
        </p>
      )}

      {isCreateOpen && (
        <CreateIssueBranchPopup
          repoId={repoId}
          issueId={issueId}
          issueNumber={issueNumber}
          issueTitle={issueTitle}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(branchName) => {
            if (!linkedBranchNames.includes(branchName)) {
              setLinkedBranchNames(prev => [...prev, branchName]);
              onUpdate?.();
            }
            setSuccessToast("Branch created");
            setCheckoutBranch(branchName);
          }}
        />
      )}

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-6 mt-1 z-50 w-72 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-xl overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-[var(--border-muted)] bg-[var(--surface-canvas)]">
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => setIsOpen(false)} className="text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-md p-1 -ml-1 flex items-center justify-center">
                  <ArrowLeftIcon size={16} />
                </button>
                <span className="font-semibold text-sm text-[var(--text-primary)]">{window.location.pathname.split('/')[2]}/{window.location.pathname.split('/')[3]}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Link a branch, pull request, or <button onClick={() => { setIsOpen(false); setIsCreateOpen(true); }} className="text-[var(--text-link)] hover:underline">create a branch</button>
              </p>
            </div>
            <div className="p-2 border-b border-[var(--border-muted)]">
              <div className="relative">
                <SearchIcon size={16} className="absolute left-2.5 top-2 text-[var(--text-secondary)] pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search pull requests"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full h-8 pl-8 pr-2 text-sm border border-[var(--border-default)] rounded-md focus:border-[var(--text-link)] focus:ring-1 focus:ring-[var(--text-link)] focus:outline-none bg-[var(--surface-canvas)] text-[var(--text-primary)]"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-xs text-[var(--text-secondary)]">Loading...</div>
              ) : suggestionItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--text-secondary)]">No suggestions found</div>
              ) : (
                <div className="flex flex-col">
                  {selectedItems.length > 0 && (
                    <div className="border-b border-[var(--border-muted)]">
                      <div className="px-3 py-1 bg-[var(--surface-subtle)] text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Group selected
                      </div>
                      {selectedItems.map(item => renderItem(item, true))}
                    </div>
                  )}
                  {unselectedItems.length > 0 && (
                    <div>
                      {selectedItems.length > 0 && (
                        <div className="px-3 py-1 bg-[var(--surface-subtle)] text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-muted)]">
                          Suggestions
                        </div>
                      )}
                      {unselectedItems.map(item => renderItem(item, false))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {successToast && (
        <Toast message={successToast} type="success" duration={3000} onClose={() => setSuccessToast(null)} />
      )}

      {checkoutBranch && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setCheckoutBranch(null)} aria-hidden="true" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[450px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-muted)] bg-[var(--surface-canvas)] rounded-t-md">
              <span className="font-semibold text-sm text-[var(--text-primary)]">Checkout in your local repository</span>
              <button onClick={() => setCheckoutBranch(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <XIcon size={16} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-[var(--text-primary)] mb-3">Run the following commands in your local clone.</p>
              <div className="bg-[var(--surface-subtle)] p-3 relative flex items-center justify-between group">
                <pre className="text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap flex-1">
                  {`git fetch origin\ngit checkout ${checkoutBranch}`}
                </pre>
                <Tooltip content={copied ? "Copied!" : "Copy to clipboard"} placement="bottom">
                  <button
                    onClick={handleCopyCheckout}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-link)] p-1 ml-2 flex-shrink-0"
                  >
                    {copied ? <CheckIcon size={16} className="text-[var(--fgColor-open,#1a7f37)]" /> : <CopyIcon size={16} />}
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
