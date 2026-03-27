import { useEffect, useMemo, useState } from "react";
import type { Branch, Repository } from "./types/index";
import { BookOpen, ChevronDown, Code, GitBranch, GitPullRequest, History } from "lucide-react";
import FileExplorer from "./components/FileExplorer";
import CommitHistory from "./components/CommitHistory";
import { ApiError, reposApi } from "./services/api";
import Auth from "./components/Auth";
import PullRequestList from "./components/PullRequestList";

function App () {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));

  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'commits' | 'pulls'>('files');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState<boolean>(false);
  const [branchQuery, setBranchQuery] = useState<string>('');
  const [branchSubmitting, setBranchSubmitting] = useState<boolean>(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  const filteredBranches = useMemo(() => {
    const q = branchQuery.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, branchQuery]);

  const branchQueryTrimmed = branchQuery.trim();
  const branchNameExists = branches.some((b) => b.name.toLowerCase() === branchQueryTrimmed.toLowerCase());

  const refreshBranches = () => {
    if (!selectedRepoId || !isAuthenticated) return;

    reposApi.getBranches(selectedRepoId)
      .then((data) => {
        const branchList = data || [];
        setBranches(branchList);

        const defaultBranch = branchList.find((b) => b.is_default)?.name || branchList[0]?.name || '';

        setCurrentBranch((prev) => {
          if (prev && branchList.some((b) => b.name === prev)) {
            return prev;
          }
          return defaultBranch;
        });

      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isAuthenticated) {
      reposApi.getRepos()
        .then((data) => setRepos(data || [])) // Just to ensure handling null value for data 
                                              // since we do not know the backend will handle empty list or not
        .catch((err) => {
          console.error(err);
          // If token is invalid/expired, log out on explicit 401 from API layer.
          if (err instanceof ApiError && err.status === 401) {
            handleLogout();
          }
        });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedRepoId && isAuthenticated) {
      refreshBranches();
    }
  }, [selectedRepoId, isAuthenticated]);

  const handleCreateBranch = async () => {
    if (!selectedRepoId || !branchQueryTrimmed) return;

    try {
      setBranchSubmitting(true);
      setBranchError(null);

      await reposApi.createBranch(selectedRepoId, {
        name: branchQueryTrimmed,
        from_branch: currentBranch || undefined,
      });

      setBranchQuery('');
      setIsBranchMenuOpen(false);
      refreshBranches();
      setCurrentBranch(branchQueryTrimmed);
    } catch (err: any) {
      setBranchError(err?.message || 'Failed to create branch');
    } finally {
      setBranchSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setSelectedRepoId(null);
  };

  const selectedRepo = repos.find((repo) => repo.id === selectedRepoId) || null;

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900">
      {/* Sidebar */}
      <div className="w-72 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="text-sm font-semibold mb-4 text-gray-600 uppercase tracking-wider">Repository</h3>
        <ul className="space-y-1">
          {repos.map((repo) => (
            <li
              key={repo.id}
              onClick={() => {
                setSelectedRepoId(repo.id);
                setActiveTab('files');
              }}
              className={`flex items-center p-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${
                selectedRepoId === repo.id ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BookOpen size={16} className="mr-2 text-gray-500" />
              {repo.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 w-full h-full min-w-0 min-h-0 overflow-y-auto">
        {!selectedRepo ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <h2 className="text-xl font-medium">Select a repository to view its content </h2>
          </div>
        ) : (
          <div className="w-full h-full min-h-0">
            {/* Header & Tabs */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              {/* Repo Name and Branch Selector */}
              <div className="flex flex-col gap-2">
                {/* Repo Name */}
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                  <BookOpen size={24} className="mr-3 text-gray-400" />
                  {selectedRepo.name}
                </h2>

                {/* Navigation among branches */}
                {branches.length > 0 && (
                  <div className="relative w-full max-w-md">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBranchMenuOpen((prev) => !prev);
                        setBranchError(null);
                      }}
                      className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <GitBranch size={16} className="text-gray-500" />
                        <span className="truncate">{currentBranch || 'Select branch'}</span>
                      </span>
                      <ChevronDown size={16} className="text-gray-500" />
                    </button>

                    {isBranchMenuOpen && (
                      <div className="absolute z-20 mt-2 w-full rounded-md border border-gray-200 bg-white p-3 shadow-lg">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Switch branches
                        </div>

                        <input
                          value={branchQuery}
                          onChange={(e) => setBranchQuery(e.target.value)}
                          placeholder="Find or create branch..."
                          className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                        />

                        <div className="max-h-44 overflow-y-auto rounded-md border border-gray-200">
                          {filteredBranches.length > 0 ? (
                            filteredBranches.map((b) => (
                              <button
                                key={b.name}
                                type="button"
                                onClick={() => {
                                  setCurrentBranch(b.name);
                                  setIsBranchMenuOpen(false);
                                  setBranchQuery('');
                                  setBranchError(null);
                                }}
                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                                  currentBranch === b.name ? 'bg-gray-50 font-semibold text-gray-900' : 'text-gray-700'
                                }`}
                              >
                                <span>{b.name}</span>
                                {b.is_default && <span className="text-xs text-gray-500">default</span>}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">No branches found.</div>
                          )}
                        </div>

                        {branchQueryTrimmed && !branchNameExists && (
                          <button
                            type="button"
                            disabled={branchSubmitting}
                            onClick={handleCreateBranch}
                            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {branchSubmitting
                              ? 'Creating branch...'
                              : `Create branch: ${branchQueryTrimmed} from ${currentBranch}`}
                          </button>
                        )}

                        {branchError && <div className="mt-2 text-sm text-red-600">{branchError}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation between files, commits, and pull requests */}
              <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg mt-4">
                <button
                  onClick={() => setActiveTab('files')}
                  className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'files' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Code size={16} className="mr-2" /> Code
                </button>
                <button
                  onClick={() => setActiveTab('commits')}
                  className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'commits' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <History size={16} className="mr-2" /> Commits
                </button>
                <button
                  onClick={() => setActiveTab('pulls')}
                  className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'pulls' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <GitPullRequest size={16} className="mr-2" /> Pull Requests
                </button>
              </div>
            </div>

            {/* Dynamic Content Area */}
            <div className={`flex-1 overflow-hidden ${activeTab === 'pulls' ? 'p-0' : 'p-6'}`}>
              {activeTab === 'files' && <FileExplorer repoId={selectedRepo.id} branch={currentBranch} />}
              {activeTab === 'commits' && <CommitHistory repoId={selectedRepo.id} branch={currentBranch} />}
              {activeTab === 'pulls' && (
                <PullRequestList
                  repoId={selectedRepo.id}
                  branches={branches}
                  defaultSourceBranch={currentBranch}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;