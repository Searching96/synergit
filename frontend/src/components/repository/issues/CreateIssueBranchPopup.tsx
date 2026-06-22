import { useState, useEffect, useMemo, useRef } from "react";
import { XIcon, RepoIcon, GitBranchIcon, LockIcon, CheckIcon, SearchIcon, TriangleDownIcon } from "@primer/octicons-react";
import { reposApi } from "../../../services/api/repos";
import { issuesApi } from "../../../services/api/issues";
import type { Branch, Repository } from "../../../types";
import { Toast } from "../../shared/Toast";

interface CreateIssueBranchPopupProps {
  repoId: string;
  issueId: string;
  issueNumber: string;
  issueTitle: string;
  onClose: () => void;
  onSuccess: (branchName: string) => void;
}

export default function CreateIssueBranchPopup({
  repoId,
  issueId,
  issueNumber,
  issueTitle,
  onClose,
  onSuccess,
}: CreateIssueBranchPopupProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sourceBranch, setSourceBranch] = useState("");
  
  const slug = issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const defaultBranchName = `${issueNumber}-${slug}`.slice(0, 100);
  
  const [branchName, setBranchName] = useState(defaultBranchName);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [allRepos, setAllRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>(repoId);
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const repoDropdownRef = useRef<HTMLDivElement>(null);

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    reposApi.getRepos('contributed').then(res => setAllRepos(res || [])).catch(console.error);
  }, []);

  useEffect(() => {
    reposApi.getBranches(selectedRepoId).then((res) => {
      if (res && res.length > 0) {
        setBranches(res);
        const defaultB = res.find(b => b.is_default);
        if (defaultB) {
          setSourceBranch(defaultB.name);
        } else {
          setSourceBranch(res[0].name);
        }
      }
    }).catch(console.error);
  }, [selectedRepoId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (repoDropdownRef.current && !repoDropdownRef.current.contains(event.target as Node)) {
        setIsRepoDropdownOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreate = async () => {
    if (!branchName.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // Create branch
      await reposApi.createBranch(selectedRepoId, { name: branchName, from_branch: sourceBranch });
      // Link to issue
      await issuesApi.linkBranch(repoId, issueId, branchName);
      onSuccess(branchName);
      onClose();
    } catch (err: any) {
      const msg = err.message || "Failed to create branch";
      if (msg.toLowerCase().includes("already exists")) {
        setErrorMsg(`The branch refs/heads/${branchName} already exists.`);
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedRepo = allRepos.find(r => r.id === selectedRepoId);
  const currentRepoName = selectedRepo ? `${selectedRepo.owner}/${selectedRepo.name}` : "Current repository";

  const filteredRepos = useMemo(() => {
    if (!repoSearch) return allRepos;
    return allRepos.filter(r => `${r.owner}/${r.name}`.toLowerCase().includes(repoSearch.toLowerCase()));
  }, [allRepos, repoSearch]);

  const filteredBranches = useMemo(() => {
    if (!branchSearch) return branches;
    return branches.filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase()));
  }, [branches, branchSearch]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} aria-hidden="true" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[450px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-xl overflow-visible flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 rounded-t-md border-b border-[var(--border-muted)] bg-[var(--surface-canvas)] font-semibold text-sm text-[var(--text-primary)]">
          <span>Create a branch for this issue</span>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <XIcon size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">Branch name</label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-[var(--border-default)] rounded-md focus:border-[var(--text-link)] focus:ring-1 focus:ring-[var(--text-link)] focus:outline-none bg-[var(--surface-canvas)] text-[var(--text-primary)]"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 relative" ref={repoDropdownRef}>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">Repository destination</label>
              <button 
                type="button"
                onClick={() => setIsRepoDropdownOpen(!isRepoDropdownOpen)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-sm border border-[var(--border-default)] rounded-md bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] focus:border-[var(--text-link)] focus:ring-1 focus:ring-[var(--text-link)] focus:outline-none"
              >
                <div className="flex items-center gap-2 truncate">
                  {selectedRepo?.visibility === "PRIVATE" ? <LockIcon size={16} className="text-[var(--text-secondary)] shrink-0" /> : <RepoIcon size={16} className="text-[var(--text-secondary)] shrink-0" />}
                  <span className="truncate">{currentRepoName}</span>
                </div>
                <TriangleDownIcon size={16} className="text-[var(--text-secondary)] shrink-0" />
              </button>

              {isRepoDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-[300px] bg-[var(--surface-canvas)] border border-[var(--border-default)] rounded-md shadow-xl z-50">
                  <div className="px-3 py-2 rounded-t-md border-b border-[var(--border-muted)] bg-[var(--surface-canvas)] font-semibold text-xs text-[var(--text-primary)]">
                    Select an item
                  </div>
                  <div className="p-2 border-b border-[var(--border-muted)]">
                    <div className="relative">
                      <SearchIcon size={16} className="absolute left-2.5 top-2 text-[var(--text-secondary)] pointer-events-none" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Select repository"
                        value={repoSearch}
                        onChange={(e) => setRepoSearch(e.target.value)}
                        className="w-full h-8 pl-8 pr-2 text-sm border border-[var(--border-default)] rounded-md focus:border-[var(--text-link)] focus:ring-1 focus:ring-[var(--text-link)] focus:outline-none bg-[var(--surface-canvas)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredRepos.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[var(--text-secondary)]">No repositories found</div>
                    ) : (
                      <div className="flex flex-col">
                        {filteredRepos.map(repo => (
                          <button
                            key={repo.id}
                            onClick={() => {
                              setSelectedRepoId(repo.id);
                              setIsRepoDropdownOpen(false);
                            }}
                            className="w-full text-left flex items-start px-3 py-2 border-b border-[var(--border-muted)] last:border-0 hover:bg-[var(--surface-hover)] transition-colors"
                          >
                            <div className="w-6 shrink-0 flex items-center justify-center pt-0.5">
                              {repo.id === selectedRepoId && <CheckIcon size={14} className="text-[var(--text-primary)]" />}
                            </div>
                            <div className="w-6 shrink-0 flex items-center justify-center pt-0.5">
                              {repo.visibility === "PRIVATE" ? <LockIcon size={16} className="text-[var(--text-secondary)]" /> : <RepoIcon size={16} className="text-[var(--text-secondary)]" />}
                            </div>
                            <div className="flex-1 min-w-0 pl-1">
                              <div className="text-sm text-[var(--text-primary)] truncate">{repo.owner}/{repo.name}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 relative" ref={branchDropdownRef}>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">Branch source</label>
              <button
                type="button"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-sm border border-[var(--border-default)] rounded-md bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] focus:border-[var(--text-link)] focus:ring-1 focus:ring-[var(--text-link)] focus:outline-none"
              >
                <div className="flex items-center gap-2 truncate">
                  <GitBranchIcon size={16} className="text-[var(--text-secondary)] shrink-0" />
                  <span className="truncate">{sourceBranch || "Select branch"}</span>
                </div>
                <TriangleDownIcon size={16} className="text-[var(--text-secondary)] shrink-0" />
              </button>

              {isBranchDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-[300px] bg-[var(--surface-canvas)] border border-[var(--border-default)] rounded-md shadow-xl z-50">
                  <div className="px-3 py-2 rounded-t-md border-b border-[var(--border-muted)] bg-[var(--surface-canvas)] font-semibold text-xs text-[var(--text-primary)]">
                    Choose a source branch
                  </div>
                  <div className="p-2 border-b border-[var(--border-muted)]">
                    <div className="relative">
                      <SearchIcon size={16} className="absolute left-2.5 top-2 text-[var(--text-secondary)] pointer-events-none" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Select a branch"
                        value={branchSearch}
                        onChange={(e) => setBranchSearch(e.target.value)}
                        className="w-full h-8 pl-8 pr-2 text-sm border border-[var(--border-default)] rounded-md focus:border-[var(--text-link)] focus:ring-1 focus:ring-[var(--text-link)] focus:outline-none bg-[var(--surface-canvas)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredBranches.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[var(--text-secondary)]">No branches found</div>
                    ) : (
                      <div className="flex flex-col">
                        {filteredBranches.map(branch => {
                          const isSelected = branch.name === sourceBranch;
                          return (
                            <button
                              key={branch.name}
                              onClick={() => {
                                setSourceBranch(branch.name);
                                setIsBranchDropdownOpen(false);
                              }}
                              className={`w-full text-left flex items-center pr-3 py-2 border-b border-[var(--border-muted)] last:border-0 hover:bg-[var(--surface-hover)] transition-colors border-l-[3px] ${isSelected ? 'bg-[var(--surface-subtle)] border-l-[var(--text-link)] pl-[9px]' : 'border-l-transparent pl-[9px]'}`}
                            >
                              <div className="w-6 shrink-0 flex items-center justify-center">
                                {isSelected && <CheckIcon size={14} className="text-[var(--text-primary)]" />}
                              </div>
                              <div className="flex-1 min-w-0 flex items-center justify-between">
                                <div className="flex items-center gap-2 truncate">
                                  <GitBranchIcon size={16} className="text-[var(--text-secondary)] shrink-0" />
                                  <span className="text-sm text-[var(--text-primary)] truncate">{branch.name}</span>
                                </div>
                                {branch.is_default && (
                                  <span className="text-xs text-[var(--text-secondary)] ml-2">Default</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">What's next?</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="whatsNext" value="locally" defaultChecked className="accent-[var(--text-link)]" />
                <span className="text-sm text-[var(--text-primary)]">Checkout locally</span>
              </label>
              <label className="flex items-center gap-2 cursor-not-allowed opacity-60">
                <input type="radio" name="whatsNext" value="desktop" disabled className="accent-[var(--text-link)]" />
                <span className="text-sm text-[var(--text-primary)]">Open branch with GitHub Desktop</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleCreate}
              disabled={loading || !branchName.trim() || !sourceBranch}
              className="px-3 py-1.5 text-sm font-semibold rounded-md bg-[var(--fgColor-open,#1f883d)] text-white hover:bg-[#1a7f37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating..." : "Create branch"}
            </button>
          </div>
        </div>
      </div>

      {errorMsg && <Toast message={errorMsg} onClose={() => setErrorMsg(null)} />}
    </>
  );
}
