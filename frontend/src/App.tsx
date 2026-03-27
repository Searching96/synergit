import { useEffect, useState, type FormEvent } from "react";
import type { Branch, Repository } from "./types/index";
import { BookOpen, Code, GitBranch, GitPullRequest, History} from "lucide-react";
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

  const [branches, setBranches] = useState<Branch[]>([])
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [isCreatingBranch, setIsCreatingBranch] = useState<boolean>(false);
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [branchFrom, setBranchFrom] = useState<string>('');
  const [branchSubmitting, setBranchSubmitting] = useState<boolean>(false);
  const [branchError, setBranchError] = useState<string | null>(null);

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

        setBranchFrom((prev) => {
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

  const handleCreateBranch = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRepoId || !newBranchName.trim()) return;

    try {
      setBranchSubmitting(true);
      setBranchError(null);

      await reposApi.createBranch(selectedRepoId, {
        name: newBranchName.trim(),
        from_branch: branchFrom || undefined,
      });

      setNewBranchName('');
      setIsCreatingBranch(false);
      refreshBranches();
      setCurrentBranch(newBranchName.trim());
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
      <div className="flex-1 p-8 overflow-y-auto">
        {!selectedRepo ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <h2 className="text-xl font-medium">Select a repository to view its content </h2>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
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
                  <div className="flex items-center text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md w-fit mb-1">
                    <GitBranch size={16} className="mr-2 text-gray-500" />
                    <select
                      value={currentBranch}
                      onChange={(e) => setCurrentBranch(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 cursor-pointer font-medium outline-none"
                    >
                      {branches.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {isCreatingBranch ? (
                  <form onSubmit={handleCreateBranch} className="flex flex-wrap items-center gap-2 mt-1">
                    <input
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="new-branch-name"
                      className="px-2 py-1 text-sm border border-gray-300 rounded-md"
                      required
                    />
                    <select
                      value={branchFrom}
                      onChange={(e) => setBranchFrom(e.target.value)}
                      className="px-2 py-1 text-sm border border-gray-300 rounded-md"
                    >
                      {branches.map((b) => (
                        <option key={b.name} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={branchSubmitting}
                      className="px-3 py-1 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-900 disabled:opacity-50"
                    >
                      {branchSubmitting ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingBranch(false);
                        setBranchError(null);
                      }}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingBranch(true);
                      setBranchError(null);
                      setBranchFrom(currentBranch || branches.find((b) => b.is_default)?.name || branches[0]?.name || '');
                    }}
                    className="w-fit px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Create Branch
                  </button>
                )}

                {branchError && (
                  <div className="text-sm text-red-600">{branchError}</div>
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
            <div className="flex-1 p-6 overflow-hidden">
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