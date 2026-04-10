import { useEffect, useState } from "react";
import type { Branch, Repository } from "./types/index";
import { BarChart3, BookOpen, CircleDot, Code, GitPullRequest, History, Menu, X } from "lucide-react";
import FileExplorer from "./components/FileExplorer";
import CommitHistory from "./components/CommitHistory";
import { ApiError, reposApi } from "./services/api";
import Auth from "./components/Auth";
import PullRequestList from "./components/PullRequestList";
import BranchMenu from "./components/BranchMenu";
import RepoInsights from "./components/RepoInsights";
import IssueBoard from "./components/IssueBoard";

function App () {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));

  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'commits' | 'pulls' | 'issues' | 'insights'>('files');
  const [isRepoDrawerOpen, setIsRepoDrawerOpen] = useState<boolean>(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');

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

  useEffect(() => {
    if (!isRepoDrawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsRepoDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRepoDrawerOpen]);

  const handleCreateBranch = async (branchName: string) => {
    if (!selectedRepoId || !branchName.trim()) {
      throw new Error('Invalid branch name');
    }

    await reposApi.createBranch(selectedRepoId, {
      name: branchName.trim(),
      from_branch: currentBranch || undefined,
    });

    await refreshBranches();
    setCurrentBranch(branchName.trim());
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
    <div className="h-screen bg-white font-sans text-gray-900 flex flex-col">
      <header className="h-14 border-b border-gray-200 bg-white px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsRepoDrawerOpen(true)}
            className="h-9 w-9 rounded-md border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center"
            aria-label="Open repository menu"
          >
            <Menu size={18} className="text-gray-700" />
          </button>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {selectedRepo ? selectedRepo.name : 'No repository selected'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {selectedRepo ? 'Repository view' : 'Open the menu to choose a repository'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full min-w-0 min-h-0 overflow-y-auto p-6 md:p-8">
        {!selectedRepo ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center space-y-3">
              <h2 className="text-xl font-medium">Select a repository to view its content</h2>
              <button
                type="button"
                onClick={() => setIsRepoDrawerOpen(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Open Repository Menu
              </button>
            </div>
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
                  <BranchMenu
                    branches={branches}
                    currentBranch={currentBranch}
                    onSelectBranch={setCurrentBranch}
                    onCreateBranch={handleCreateBranch}
                  />
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
                <button
                  onClick={() => setActiveTab('issues')}
                  className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'issues' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <CircleDot size={16} className="mr-2" /> Issues
                </button>
                <button
                  onClick={() => setActiveTab('insights')}
                  className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'insights' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <BarChart3 size={16} className="mr-2" /> Insights
                </button>
              </div>
            </div>

            {/* Dynamic Content Area */}
            <div className={`flex-1 overflow-hidden ${activeTab === 'pulls' || activeTab === 'issues' || activeTab === 'files' ? 'p-0' : 'p-6'}`}>
              {activeTab === 'files' && <FileExplorer repoId={selectedRepo.id} branch={currentBranch} />}
              {activeTab === 'commits' && <CommitHistory repoId={selectedRepo.id} branch={currentBranch} />}
              {activeTab === 'pulls' && (
                <PullRequestList
                  repoId={selectedRepo.id}
                  branches={branches}
                  defaultSourceBranch={currentBranch}
                />
              )}
              {activeTab === 'issues' && <IssueBoard repoId={selectedRepo.id} />}
              {activeTab === 'insights' && <RepoInsights repoId={selectedRepo.id} />}
            </div>
          </div>
        )}
      </main>

      {isRepoDrawerOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close repository menu"
            onClick={() => setIsRepoDrawerOpen(false)}
            className="absolute inset-0 bg-black/35"
          />

          <aside className="absolute left-0 top-0 h-full w-[320px] bg-white border-r border-gray-200 shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Repositories</h3>
              <button
                type="button"
                onClick={() => setIsRepoDrawerOpen(false)}
                className="h-8 w-8 rounded-md border border-gray-300 hover:bg-gray-50 flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto">
              <ul className="space-y-1">
                {repos.map((repo) => (
                  <li key={repo.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRepoId(repo.id);
                        setActiveTab('files');
                        setIsRepoDrawerOpen(false);
                      }}
                      className={`w-full flex items-center p-2 rounded-md text-sm font-medium transition-colors ${
                        selectedRepoId === repo.id
                          ? 'bg-gray-200 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <BookOpen size={16} className="mr-2 text-gray-500" />
                      <span className="truncate">{repo.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;