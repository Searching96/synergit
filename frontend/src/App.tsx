import { useEffect, useState, type ComponentType } from "react";
import type { Branch, Repository } from "./types/index";
import {
  BarChart3,
  Bell,
  BookOpen,
  CircleDot,
  Code,
  GitFork,
  GitPullRequest,
  History,
  Menu,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react";
import FileExplorer from "./components/FileExplorer";
import CommitHistory from "./components/CommitHistory";
import { ApiError, reposApi } from "./services/api";
import Auth from "./components/Auth";
import PullRequestList from "./components/PullRequestList";
import BranchMenu from "./components/BranchMenu";
import RepoInsights from "./components/RepoInsights";
import IssueBoard from "./components/IssueBoard";

type TabKey = 'files' | 'commits' | 'pulls' | 'issues' | 'insights';

interface MainTab {
  key: TabKey;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

const MAIN_TABS: MainTab[] = [
  { key: 'files', label: 'Code', icon: Code },
  { key: 'issues', label: 'Issues', icon: CircleDot },
  { key: 'pulls', label: 'Pull requests', icon: GitPullRequest },
  { key: 'commits', label: 'Commits', icon: History },
  { key: 'insights', label: 'Insights', icon: BarChart3 },
];

function App () {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));

  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('files');
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
    <div className="h-screen bg-[#f6f8fa] font-sans text-[#1f2328] flex flex-col">
      <header className="border-b border-[#d1d9e0] bg-white">
        <div className="h-14 max-w-[1400px] mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsRepoDrawerOpen(true)}
              className="h-9 w-9 rounded-md border border-[#d1d9e0] bg-white hover:bg-[#f6f8fa] flex items-center justify-center"
              aria-label="Open repository menu"
            >
              <Menu size={18} className="text-[#57606a]" />
            </button>

            <div className="h-8 w-8 rounded-full bg-[#24292f] text-white text-sm font-semibold flex items-center justify-center">
              S
            </div>

            <div className="hidden md:block min-w-0">
              <p className="text-sm font-semibold text-[#24292f] truncate">
                {selectedRepo ? selectedRepo.name : 'Select repository'}
              </p>
            </div>
          </div>

          <div className="hidden lg:block flex-1 max-w-xl">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c959f]" />
              <input
                type="text"
                readOnly
                placeholder="Type / to search"
                className="w-full h-9 pl-9 pr-3 rounded-md border border-[#d1d9e0] bg-white text-sm text-[#57606a]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-9 w-9 rounded-md border border-[#d1d9e0] bg-white hover:bg-[#f6f8fa] flex items-center justify-center"
              aria-label="Create"
            >
              <Plus size={16} className="text-[#57606a]" />
            </button>
            <button
              type="button"
              className="h-9 w-9 rounded-md border border-[#d1d9e0] bg-white hover:bg-[#f6f8fa] flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell size={16} className="text-[#57606a]" />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-[#24292f] border border-[#d1d9e0] rounded-md hover:bg-[#f6f8fa]"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="h-12 border-t border-[#f0f2f5] max-w-[1400px] mx-auto px-4 flex items-end overflow-x-auto">
          {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`h-11 px-4 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  active
                    ? 'border-[#fd8c73] text-[#24292f]'
                    : 'border-transparent text-[#57606a] hover:text-[#24292f] hover:border-[#d1d9e0]'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 w-full min-w-0 min-h-0 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-4 py-6 h-full">
        {!selectedRepo ? (
          <div className="flex h-full items-center justify-center text-[#57606a]">
            <div className="text-center space-y-3">
              <h2 className="text-xl font-medium">Select a repository to view its content</h2>
              <button
                type="button"
                onClick={() => setIsRepoDrawerOpen(true)}
                className="px-4 py-2 text-sm font-medium text-[#24292f] border border-[#d1d9e0] rounded-md bg-white hover:bg-[#f6f8fa]"
              >
                Open Repository Menu
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full min-h-0 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen size={20} className="text-[#57606a]" />
                <h2 className="text-2xl font-semibold text-[#0969da] truncate">{selectedRepo.name}</h2>
                <span className="text-xs font-medium text-[#57606a] border border-[#d1d9e0] rounded-full px-2 py-0.5">
                  Public
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm font-medium border border-[#d1d9e0] bg-white rounded-md hover:bg-[#f6f8fa]"
                >
                  Unwatch
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm font-medium border border-[#d1d9e0] bg-white rounded-md hover:bg-[#f6f8fa] inline-flex items-center gap-2"
                >
                  <GitFork size={14} />
                  Fork
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm font-medium border border-[#d1d9e0] bg-white rounded-md hover:bg-[#f6f8fa] inline-flex items-center gap-2"
                >
                  <Star size={14} />
                  Star
                </button>
              </div>
            </div>

            {branches.length > 0 && (
              <BranchMenu
                branches={branches}
                currentBranch={currentBranch}
                onSelectBranch={setCurrentBranch}
                onCreateBranch={handleCreateBranch}
              />
            )}

            {/* Dynamic Content Area */}
            <div className={`flex-1 overflow-hidden ${activeTab === 'pulls' || activeTab === 'issues' || activeTab === 'files' ? 'p-0' : 'p-6 bg-white border border-[#d1d9e0] rounded-md'}`}>
              {activeTab === 'files' && (
                <FileExplorer
                  repoId={selectedRepo.id}
                  repoName={selectedRepo.name}
                  branch={currentBranch}
                  branchCount={branches.length}
                />
              )}
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
        </div>
      </main>

      {isRepoDrawerOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close repository menu"
            onClick={() => setIsRepoDrawerOpen(false)}
            className="absolute inset-0 bg-black/35"
          />

          <aside className="absolute left-0 top-0 h-full w-[320px] bg-white border-r border-[#d1d9e0] shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b border-[#d1d9e0] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#57606a] uppercase tracking-wider">Menu</h3>
              <button
                type="button"
                onClick={() => setIsRepoDrawerOpen(false)}
                className="h-8 w-8 rounded-md border border-[#d1d9e0] hover:bg-[#f6f8fa] flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} className="text-[#57606a]" />
              </button>
            </div>

            <div className="px-3 py-2 border-b border-[#d1d9e0] text-sm text-[#57606a] space-y-1">
              <button type="button" className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[#f6f8fa]">Home</button>
              <button type="button" className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[#f6f8fa]">Issues</button>
              <button type="button" className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[#f6f8fa]">Pull requests</button>
              <button type="button" className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[#f6f8fa]">Repositories</button>
            </div>

            <div className="p-3 overflow-y-auto">
              <h4 className="text-xs font-semibold text-[#57606a] uppercase tracking-wider mb-2">Your repositories</h4>
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
                          ? 'bg-[#ddf4ff] text-[#0969da]'
                          : 'text-[#24292f] hover:bg-[#f6f8fa]'
                      }`}
                    >
                      <BookOpen size={16} className="mr-2 text-[#57606a]" />
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