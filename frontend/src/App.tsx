import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useRepository } from "./contexts/RepositoryContext";
import type { CreateRepositoryPayload, Repository } from "./types/index";
import type { ForkRepositoryPayload } from "./services/api/repos";
import { checkBackendAvailability } from "./services/api";
import { PageReadyProvider } from "./contexts/PageReadyContext";
import Auth from "./components/auth/Auth";
import GithubProfilePages from "./pages/ProfilePage";
import CreateRepositoryPage from "./pages/CreateRepositoryPage";
import CreateForkPage from "./pages/CreateForkPage";
import TopHeader from "./layouts/TopHeader";
import SidebarMenu from "./layouts/SidebarMenu";
import Footer from "./components/shared/Footer";
import RouteButton from "./components/shared/RouteButton";
import TopNavigationTabs from "./layouts/TopNavigationTabs";
import GlobalPlaceholderPage from "./pages/GlobalPlaceholderPage";
import AccountSettingsPage from "./pages/AccountSettingsPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import RepoWorkspaceContent from "./pages/RepoWorkspacePage";
import { REPO_TABS, type RepoTabKey } from "./utils/repoTabs";
import { repoTabCountsCacheKey, readRepoTabCounts, writeRepoTabCounts } from "./utils/countCache";
import {
  GLOBAL_PAGE_TITLES,
  buildProfilePath,
  buildRepoBasePath,
  buildRepoComparePath,
  buildRepoCommitsPath,
  buildRepoCommitViewPath,
  buildRepoBranchesPath,
  buildRepoContentPath,
  buildRepoEditFilePath,
  buildRepoNewFilePath,
  buildRepoIssuesNewPath,
  buildRepoIssueViewPath,
  buildRepoPullConflictsPath,
  buildRepoPullViewPath,
  buildRepoTabPath,
  buildRepoUploadFilesPath,
  buildRepoContributorsPath,
  buildRepoCommunityPath,
  buildRepoCommunityStandardsPath,
  buildRepoCommitActivityPath,
  buildRepoCodeFrequencyPath,
  buildRepoPulsePath,
  buildContributorsDefaultSearch,
  normalizeContributorsSearch,
  normalizeCommitFilterSearch,
  normalizePathValue,
  normalizeProfileTab,
  parseAppPath,
  type GlobalPageKey,
  type ParsedRoute,
  type RepoContentKind,
} from "./utils/repoRouting";
import type { ProfileTabKey } from "./utils/profileTypes";
import { formatVisibilityLabel } from "./utils/visibility";

function SiteUnavailablePage() {
  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)] flex items-center justify-center px-4">
      <main className="w-full max-w-[520px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">This site is currently not available</h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Synergit cannot connect to the backend service right now.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 h-9 px-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        >
          Retry
        </button>
      </main>
    </div>
  );
}


function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, currentUsername, login, logout } = useAuth();
  const {
    repos,
    profileRepoCount,
    profileFetchFailed,
    profileRepoCountPending,
    profileRepositoriesPending,
    selectedRepoId,
    selectedRepo,
    branches,
    currentBranch,
    setSelectedRepoId,
    setCurrentBranch,
    refreshBranches,
    handleRepoUpdated,
    handleRepoDeleted,
    handleCreateRepository: contextHandleCreateRepository,
    handleForkRepository: contextHandleForkRepository,
    clearState
  } = useRepository();

  const [backendStatus, setBackendStatus] = useState<"checking" | "available" | "unavailable">("checking");
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false);
  const [repoRouteResolved, setRepoRouteResolved] = useState<boolean>(false);
  const [initialRoute] = useState(() => parseAppPath(window.location.pathname));
  const [activeTab, setActiveTab] = useState<RepoTabKey>(initialRoute.tab);
  const [viewMode, setViewMode] = useState<'profile' | 'repo' | 'create-repo' | 'global'>(initialRoute.viewMode);
  const [createRepoSubmitting, setCreateRepoSubmitting] = useState<boolean>(false);
  const [createRepoError, setCreateRepoError] = useState<string | null>(null);
  const [createForkSubmitting, setCreateForkSubmitting] = useState<boolean>(false);
  const [createForkError, setCreateForkError] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<ProfileTabKey>('overview');
  const [activeGlobalPage, setActiveGlobalPage] = useState<GlobalPageKey | null>(initialRoute.globalPage);
  const [routeContentKind, setRouteContentKind] = useState<RepoContentKind>(initialRoute.contentKind);
  const [routeContentPath, setRouteContentPath] = useState<string>(initialRoute.contentPath);
  const [routeBranch, setRouteBranch] = useState<string>(initialRoute.branch);

  const profileFetchPending = profileRepoCountPending || profileRepositoriesPending;

  useEffect(() => {
    let cancelled = false;
    setBackendStatus("checking");

    void checkBackendAvailability().then((available) => {
      if (cancelled) {
        return;
      }

      setBackendStatus(available ? "available" : "unavailable");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const repoTabsWithCounts = useMemo(() => {
    const selected = repos.find((repo) => repo.id === selectedRepoId);

    let openIssues = 0;
    let openPulls = 0;

    if (selected) {
      openIssues = selected.open_issues_count ?? 0;
      openPulls = selected.open_pulls_count ?? 0;
      if (selected.owner) {
        writeRepoTabCounts(repoTabCountsCacheKey(selected.owner, selected.name), {
          issues: openIssues,
          pulls: openPulls,
        });
      }
    } else {
      // Cold load: the repositories list hasn't resolved yet, so seed the
      // badges from the last known counts keyed by the URL's owner/name.
      const parsed = parseAppPath(window.location.pathname);
      if (parsed.repoOwner && parsed.repoName) {
        const cached = readRepoTabCounts(repoTabCountsCacheKey(parsed.repoOwner, parsed.repoName));
        if (cached) {
          openIssues = cached.issues;
          openPulls = cached.pulls;
        }
      }
    }

    return REPO_TABS.map((tab) =>
      tab.key === "issues" && openIssues > 0
        ? { ...tab, count: openIssues }
        : tab.key === "pulls" && openPulls > 0
          ? { ...tab, count: openPulls }
          : tab,
    );
  }, [repos, selectedRepoId]);

  const defaultBranchName = branches.find((item) => item.is_default)?.name || branches[0]?.name || 'master';

  const getRepoOwner = useCallback((repo: Repository) => {
    return (repo.owner && repo.owner.trim()) || currentUsername;
  }, [currentUsername]);

  const findRepoFromParsedRoute = useCallback((parsed: ParsedRoute): Repository | null => {
    if (parsed.repoId) {
      return repos.find((repo) => repo.id === parsed.repoId) || null;
    }

    if (!parsed.repoOwner || !parsed.repoName) {
      return null;
    }

    const exactMatch = repos.find((repo) => {
      return (
        normalizePathValue(getRepoOwner(repo)) === normalizePathValue(parsed.repoOwner || '') &&
        normalizePathValue(repo.name) === normalizePathValue(parsed.repoName || '')
      );
    });

    if (exactMatch) {
      return exactMatch;
    }

    return repos.find((repo) => normalizePathValue(repo.name) === normalizePathValue(parsed.repoName || '')) || null;
  }, [getRepoOwner, repos]);

  const applyRoute = useCallback((pathname: string, search: string = window.location.search, options?: { replace?: boolean }) => {
    const parsed = parseAppPath(pathname);

    const replaceHistoryIfNeeded = (nextFullPath: string) => {
      const currentFullPath = `${window.location.pathname}${window.location.search}`;
      if (options?.replace && currentFullPath !== nextFullPath) {
        window.history.replaceState({}, '', nextFullPath);
      }
    };

    setViewMode(parsed.viewMode);
    setActiveTab(parsed.tab);
    setActiveGlobalPage(parsed.globalPage);
    setRouteContentKind(parsed.contentKind);
    setRouteContentPath(parsed.contentPath);
    setRouteBranch(parsed.branch);

    if (parsed.viewMode === 'profile') {
      const resolvedProfileTab = normalizeProfileTab(search);
      setProfileTab(resolvedProfileTab);
      setSelectedRepoId(null);

      const profilePath = buildProfilePath(currentUsername, resolvedProfileTab);
      replaceHistoryIfNeeded(profilePath);

      return parsed;
    }

    if (parsed.viewMode === 'repo') {
      const targetRepo = findRepoFromParsedRoute(parsed);

      if (targetRepo) {
        setSelectedRepoId(targetRepo.id);

        const owner = getRepoOwner(targetRepo);
        let canonicalPath = buildRepoTabPath(owner, targetRepo.name, parsed.tab);
        let canonicalSearch = '';

        if (parsed.tab === 'files') {
          if (parsed.contentKind === 'blob') {
            canonicalPath = buildRepoContentPath(owner, targetRepo.name, 'blob', parsed.branch || currentBranch || 'master', parsed.contentPath);
          } else if (parsed.contentKind === 'tree') {
            canonicalPath = buildRepoContentPath(owner, targetRepo.name, 'tree', parsed.branch || currentBranch || 'master', parsed.contentPath);
          } else if (parsed.contentKind === 'commits') {
            canonicalPath = buildRepoCommitsPath(owner, targetRepo.name, parsed.branch || currentBranch || defaultBranchName);
            canonicalSearch = normalizeCommitFilterSearch(search);
          } else if (parsed.contentKind === 'new') {
            canonicalPath = buildRepoNewFilePath(owner, targetRepo.name, parsed.branch || currentBranch || defaultBranchName, parsed.contentPath);
          } else if (parsed.contentKind === 'edit') {
            canonicalPath = buildRepoEditFilePath(owner, targetRepo.name, parsed.branch || currentBranch || defaultBranchName, parsed.contentPath);
          } else if (parsed.contentKind === 'upload') {
            canonicalPath = buildRepoUploadFilesPath(owner, targetRepo.name, parsed.branch || currentBranch || defaultBranchName, parsed.contentPath);
          } else if (parsed.contentKind === 'commit-view') {
            canonicalPath = buildRepoCommitViewPath(owner, targetRepo.name, parsed.contentPath);
          } else if (parsed.contentKind === 'branches') {
            canonicalPath = buildRepoBranchesPath(owner, targetRepo.name);
          } else {
            canonicalPath = buildRepoBasePath(owner, targetRepo.name);
          }
        } else if (parsed.tab === 'pulls' && parsed.contentKind === 'compare') {
          const compareRange = parsed.contentPath.trim();
          const rangeParts = compareRange.split('...');
          if (rangeParts.length === 2 && rangeParts[0].trim() && rangeParts[1].trim()) {
            canonicalPath = buildRepoComparePath(owner, targetRepo.name, rangeParts[0], rangeParts[1]);
          } else {
            canonicalPath = buildRepoComparePath(owner, targetRepo.name);
          }
        } else if (parsed.tab === 'pulls' && parsed.contentKind === 'pull-conflicts') {
          canonicalPath = buildRepoPullConflictsPath(owner, targetRepo.name, parsed.contentPath);
        } else if (parsed.tab === 'pulls' && parsed.contentKind === 'pull-view') {
          canonicalPath = buildRepoPullViewPath(owner, targetRepo.name, parsed.contentPath);
        } else if (parsed.tab === 'issues' && parsed.contentKind === 'issues-new') {
          canonicalPath = buildRepoIssuesNewPath(owner, targetRepo.name);
        } else if (parsed.tab === 'issues' && parsed.contentKind === 'issue-view') {
          canonicalPath = buildRepoIssueViewPath(owner, targetRepo.name, parsed.contentPath);
        } else if (parsed.tab === 'insights' && parsed.contentKind === 'pulse') {
          canonicalPath = buildRepoPulsePath(owner, targetRepo.name);
        } else if (parsed.tab === 'insights' && parsed.contentKind === 'contributors') {
          canonicalPath = buildRepoContributorsPath(owner, targetRepo.name);
          canonicalSearch = normalizeContributorsSearch(search);
        } else if (parsed.tab === 'insights' && parsed.contentKind === 'community') {
          canonicalPath = buildRepoCommunityPath(owner, targetRepo.name);
        } else if (parsed.tab === 'insights' && parsed.contentKind === 'community-standards') {
          canonicalPath = buildRepoCommunityStandardsPath(owner, targetRepo.name);
        } else if (parsed.tab === 'insights' && parsed.contentKind === 'commit-activity') {
          canonicalPath = buildRepoCommitActivityPath(owner, targetRepo.name);
        } else if (parsed.tab === 'insights' && parsed.contentKind === 'code-frequency') {
          canonicalPath = buildRepoCodeFrequencyPath(owner, targetRepo.name);
        }

        replaceHistoryIfNeeded(`${canonicalPath}${canonicalSearch}`);
      } else if (!parsed.repoId) {
        setSelectedRepoId(null);
      }

      if (parsed.tab === 'files') {
        setCurrentBranch(parsed.branch || '');
      }

      return parsed;
    }

    replaceHistoryIfNeeded(parsed.normalizedPath);

    return parsed;
  }, [currentBranch, currentUsername, defaultBranchName, findRepoFromParsedRoute, getRepoOwner, setCurrentBranch, setSelectedRepoId]);

  const navigateToPath = useCallback((pathname: string, options?: { replace?: boolean }) => {
    navigate(pathname, { replace: options?.replace });
  }, [navigate]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    navigateToPath('/search');
  }, [navigateToPath]);





  useEffect(() => {
    if (selectedRepoId && isAuthenticated) {
      refreshBranches();
    }
  }, [selectedRepoId, isAuthenticated, refreshBranches]);

  const selectedRepoVisibility = formatVisibilityLabel(selectedRepo?.visibility);
  const selectedRepoOwner = selectedRepo ? getRepoOwner(selectedRepo) : currentUsername;
  const isFullBrowserMode =
    !!selectedRepo &&
    ((activeTab === 'files' &&
      ((routeContentKind === 'tree' && routeContentPath !== '') || routeContentKind === 'blob' || routeContentKind === 'new' || routeContentKind === 'edit' || routeContentKind === 'commit-view')) ||
      (activeTab === 'pulls' && routeContentKind === 'pull-conflicts'));

  useEffect(() => {
    if (!isAuthenticated) return;
    applyRoute(location.pathname, location.search, { replace: true });
    if (repos.length > 0) setRepoRouteResolved(true);
  }, [applyRoute, isAuthenticated, repos, location]);

  const navigateToProfileTab = useCallback((tab: ProfileTabKey, options?: { replace?: boolean }) => {
    navigateToPath(buildProfilePath(currentUsername, tab), options);
  }, [currentUsername, navigateToPath]);

  const navigateToRepoTab = useCallback((repo: Repository, tab: RepoTabKey) => {
    const owner = getRepoOwner(repo);
    navigateToPath(buildRepoTabPath(owner, repo.name, tab));
  }, [getRepoOwner, navigateToPath]);

  const navigateToRepoIssuesNew = useCallback((repo: Repository) => {
    const owner = getRepoOwner(repo);
    navigateToPath(buildRepoIssuesNewPath(owner, repo.name));
  }, [getRepoOwner, navigateToPath]);

  const navigateToRepoIssueView = useCallback((repo: Repository, issueNumber: number) => {
    const owner = getRepoOwner(repo);
    navigateToPath(buildRepoIssueViewPath(owner, repo.name, issueNumber));
  }, [getRepoOwner, navigateToPath]);

  const navigateToRepoContent = useCallback((
    repo: Repository,
    contentKind: 'root' | 'tree' | 'blob',
    contentPath: string,
    branchName: string,
  ) => {
    const owner = getRepoOwner(repo);

    if (contentKind === 'root') {
      if (branchName === defaultBranchName) {
        navigateToPath(buildRepoBasePath(owner, repo.name));
      } else {
        navigateToPath(buildRepoContentPath(owner, repo.name, 'tree', branchName, ''));
      }
      return;
    }

    if (contentKind === 'blob') {
      navigateToPath(buildRepoContentPath(owner, repo.name, 'blob', branchName, contentPath));
      return;
    }

    navigateToPath(buildRepoContentPath(owner, repo.name, 'tree', branchName, contentPath));
  }, [defaultBranchName, getRepoOwner, navigateToPath]);

  const navigateToRepoCommits = useCallback((repo: Repository, branchName: string, search: string = '') => {
    const owner = getRepoOwner(repo);
    const basePath = buildRepoCommitsPath(owner, repo.name, branchName || defaultBranchName);
    navigateToPath(`${basePath}${normalizeCommitFilterSearch(search)}`);
  }, [defaultBranchName, getRepoOwner, navigateToPath]);

  const navigateToRepoNewFile = useCallback((repo: Repository, branchName: string, contentPath: string = '') => {
    const owner = getRepoOwner(repo);
    navigateToPath(buildRepoNewFilePath(owner, repo.name, branchName || defaultBranchName, contentPath));
  }, [defaultBranchName, getRepoOwner, navigateToPath]);

  const navigateToRepoEditFile = useCallback((repo: Repository, branchName: string, contentPath: string) => {
    const owner = getRepoOwner(repo);
    navigateToPath(buildRepoEditFilePath(owner, repo.name, branchName || defaultBranchName, contentPath));
  }, [defaultBranchName, getRepoOwner, navigateToPath]);

  const navigateToRepoUploadFiles = useCallback((repo: Repository, branchName: string, contentPath: string = '') => {
    const owner = getRepoOwner(repo);
    navigateToPath(buildRepoUploadFilesPath(owner, repo.name, branchName || defaultBranchName, contentPath));
  }, [defaultBranchName, getRepoOwner, navigateToPath]);

  const navigateToRepoCompare = useCallback((repo: Repository, baseRef?: string, headRef?: string) => {
    const owner = getRepoOwner(repo);
    navigateToPath(buildRepoComparePath(owner, repo.name, baseRef, headRef));
  }, [getRepoOwner, navigateToPath]);

  const navigateToRepoPullView = useCallback((repo: Repository, pullNumber: number) => {
    const owner = getRepoOwner(repo);
    navigateToPath(buildRepoPullViewPath(owner, repo.name, pullNumber));
  }, [getRepoOwner, navigateToPath]);

  const navigateToRepoPullConflicts = useCallback((repo: Repository, pullNumber: number | string) => {
    const owner = getRepoOwner(repo);
    navigateToPath(buildRepoPullConflictsPath(owner, repo.name, pullNumber));
  }, [getRepoOwner, navigateToPath]);

  const handleSelectBranch = (branchName: string) => {
    setCurrentBranch(branchName);

    if (!selectedRepo || activeTab !== 'files') {
      return;
    }

    if (routeContentKind === 'commits') {
      navigateToRepoCommits(selectedRepo, branchName, window.location.search);
      return;
    }

    if (routeContentKind === 'new') {
      navigateToRepoNewFile(selectedRepo, branchName, routeContentPath);
      return;
    }

    if (routeContentKind === 'edit') {
      navigateToRepoEditFile(selectedRepo, branchName, routeContentPath);
      return;
    }

    if (routeContentKind === 'upload') {
      navigateToRepoUploadFiles(selectedRepo, branchName, routeContentPath);
      return;
    }

    if (routeContentKind === 'compare') {
      navigateToRepoTab(selectedRepo, 'pulls');
      return;
    }

    if (routeContentKind === 'issues-new' || routeContentKind === 'issue-view' || routeContentKind === 'pull-view' || routeContentKind === 'pull-conflicts' || routeContentKind === 'commit-view' || routeContentKind === 'branches' || routeContentKind === 'fork' || routeContentKind === 'pulse' || routeContentKind === 'contributors' || routeContentKind === 'community' || routeContentKind === 'community-standards' || routeContentKind === 'commit-activity' || routeContentKind === 'code-frequency' || routeContentKind === 'settings') {
      return;
    }

    const targetContentKind = routeContentKind === 'root' ? 'tree' : routeContentKind;
    navigateToRepoContent(selectedRepo, targetContentKind, routeContentPath, branchName);
  };

  const handleSelectCommitBranch = (branchName: string) => {
    setCurrentBranch(branchName);

    if (!selectedRepo) {
      return;
    }

    navigateToRepoCommits(selectedRepo, branchName, window.location.search);
  };

  const handleRepoUpdatedWrapper = useCallback((updatedRepo: Repository) => {
    handleRepoUpdated(updatedRepo);
    if (selectedRepo && selectedRepo.id === updatedRepo.id && selectedRepo.name !== updatedRepo.name) {
      const newPath = buildRepoTabPath(getRepoOwner(updatedRepo), updatedRepo.name, activeTab);
      window.history.replaceState({}, '', newPath);
    }
  }, [selectedRepo, activeTab, getRepoOwner, handleRepoUpdated]);

  const handleRepoDeletedWrapper = useCallback((repoId: string) => {
    handleRepoDeleted(repoId);
    navigateToProfileTab('repositories');
  }, [handleRepoDeleted, navigateToProfileTab]);

  const explorerInitialLocation = useMemo(() => {
    if (routeContentKind === 'blob') {
      return { type: 'file' as const, path: routeContentPath };
    }

    if (routeContentKind === 'tree' && routeContentPath) {
      return { type: 'dir' as const, path: routeContentPath };
    }

    return { type: 'root' as const, path: '' };
  }, [routeContentKind, routeContentPath]);

  const handleNavigateRepoLocation = (location: { type: 'root' | 'file' | 'dir'; path?: string }) => {
    if (!selectedRepo) {
      return;
    }

    const nextPath = (location.path || '').trim();
    const branchName = currentBranch || routeBranch || defaultBranchName;

    if (location.type === 'root') {
      navigateToRepoContent(selectedRepo, 'root', '', branchName);
      return;
    }

    if (location.type === 'file') {
      navigateToRepoContent(selectedRepo, 'blob', nextPath, branchName);
      return;
    }

    navigateToRepoContent(selectedRepo, 'tree', nextPath, branchName);
  };

  const handleOpenWorkspaceFromProfile = (repoName: string) => {
    const target =
      repos.find((repo) => repo.name.toLowerCase() === repoName.toLowerCase()) ||
      repos[0];

    if (!target) return;

    navigateToRepoTab(target, 'files');
  };

  const handleLogout = () => {
    logout();
    clearState();
    setViewMode('profile');
    navigateToPath('/login', { replace: true });
    setCreateRepoError(null);
    setCreateRepoSubmitting(false);
    setCreateForkError(null);
    setCreateForkSubmitting(false);
  };

  const handleOpenCreateRepository = () => {
    setCreateRepoError(null);
    navigateToPath('/new');
  };

  const handleCancelCreateRepository = () => {
    setCreateRepoError(null);

    if (selectedRepo) {
      navigateToRepoTab(selectedRepo, 'files');
      return;
    }

    navigateToProfileTab('overview');
  };

  const handleCreateRepository = async (payload: CreateRepositoryPayload) => {
    try {
      setCreateRepoSubmitting(true);
      setCreateRepoError(null);

      const createdRepo = await contextHandleCreateRepository(payload);
      navigateToRepoTab(createdRepo, 'files');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create repository';
      setCreateRepoError(message);
    } finally {
      setCreateRepoSubmitting(false);
    }
  };

  const handleCancelCreateFork = () => {
    setCreateForkError(null);

    if (selectedRepo) {
      navigateToRepoTab(selectedRepo, 'files');
      return;
    }

    navigateToProfileTab('overview');
  };

  const handleCreateFork = async (payload: ForkRepositoryPayload) => {
    if (!selectedRepo) return;
    try {
      setCreateForkSubmitting(true);
      setCreateForkError(null);

      const forkedRepo = await contextHandleForkRepository(selectedRepo.id, payload);
      navigateToRepoTab(forkedRepo, 'files');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create fork';
      setCreateForkError(message);
    } finally {
      setCreateForkSubmitting(false);
    }
  };

  const currentGlobalTitle = activeGlobalPage ? GLOBAL_PAGE_TITLES[activeGlobalPage] : 'Page';

  const renderContent = () => {
    if (backendStatus === "unavailable") {
      return <SiteUnavailablePage />;
    }

    if (!isAuthenticated) {
      if (location.pathname !== '/login' && location.pathname !== '/signup') {
        // use React Router navigation asynchronously if needed, or better yet, since we are in render,
        // we should just let the Navigate component handle it, or we can just use location.pathname
        // But since we can't call navigate during render, we'll use history state replacement
        window.history.replaceState({}, '', '/login');
      }
      return <Auth onLoginSuccess={(token) => {
        login(token);
        if (location.pathname === '/login' || location.pathname === '/signup' || window.location.pathname === '/login' || window.location.pathname === '/signup') {
          navigateToPath('/', { replace: true });
        }
      }} />;
    }

    if (viewMode === 'profile') {
      return (
        <>
          <GithubProfilePages
            repositories={repos}
            repositoryCount={profileRepoCount}
            username={currentUsername}
            activeTab={profileTab}
            onTabChange={(tab) => navigateToProfileTab(tab)}
            onNavigateToPath={navigateToPath}
            onOpenWorkspace={handleOpenWorkspaceFromProfile}
            onCreateRepository={handleOpenCreateRepository}
            onLogout={handleLogout}
            onSearch={handleSearch}
            hasFetchError={profileFetchFailed}
            hasFetchPending={profileFetchPending}
            onMenuClick={() => setIsSidebarMenuOpen(true)}
          />
        </>
      );
    }

    if (viewMode === 'create-repo') {
      return (
        <>
          <CreateRepositoryPage
            ownerName={currentUsername}
            submitting={createRepoSubmitting}
            error={createRepoError}
            onCancel={handleCancelCreateRepository}
            onCreateRepository={handleCreateRepository}
            onMenuClick={() => setIsSidebarMenuOpen(true)}
          />
        </>
      );
    }

    if (activeTab === 'files' && routeContentKind === 'fork' && selectedRepo) {
      return (
        <>
          <CreateForkPage
            ownerName={currentUsername}
            sourceRepo={selectedRepo}
            submitting={createForkSubmitting}
            error={createForkError}
            onCancel={handleCancelCreateFork}
            onCreateFork={handleCreateFork}
          />
        </>
      );
    }

    if (viewMode === 'global') {
      if (activeGlobalPage === 'search') {
        return (
          <SearchResultsPage
            repos={repos}
            query={searchQuery}
            currentUsername={currentUsername}
            onSearch={handleSearch}
            onOpenRepo={(repo) => navigateToRepoTab(repo, 'files')}
            onHome={() => navigateToProfileTab('overview')}
          />
        );
      }
      if (activeGlobalPage === 'settings') {
        return <AccountSettingsPage username={currentUsername} onGoToProfile={() => navigateToProfileTab('overview')} />;
      }
      return (
        <GlobalPlaceholderPage
          title={currentGlobalTitle}
          onBackToProfile={() => navigateToProfileTab('overview')}
          onCreateRepository={handleOpenCreateRepository}
        />
      );
    }

    return (
      <div className="flex-1 bg-[var(--surface-subtle)] font-sans text-[var(--text-primary)] flex flex-col">
        <header className="border-b border-[var(--border-default)] bg-[var(--surface-page)]">
          <TopHeader
            leftContent={selectedRepo ? (
              <div className="flex flex-col min-w-0">
                <div className="min-w-0 flex items-center gap-1 text-sm font-semibold">
                  <RouteButton
                    href={`/${encodeURIComponent(selectedRepoOwner)}`}
                    onClick={() => navigateToPath(`/${encodeURIComponent(selectedRepoOwner)}`)}
                    className="max-w-[180px] truncate"
                  >
                    {selectedRepoOwner}
                  </RouteButton>
                  <span className="text-[var(--text-muted)] font-normal">/</span>
                  <RouteButton
                    selected
                    href={`/${encodeURIComponent(selectedRepoOwner)}/${encodeURIComponent(selectedRepo.name)}`}
                    onClick={() => navigateToRepoTab(selectedRepo, 'files')}
                    className="truncate"
                  >
                    {selectedRepo.name}
                  </RouteButton>
                </div>
              </div>
            ) : null}
            onMenuClick={() => setIsSidebarMenuOpen(true)}
            onIssuesClick={() => navigateToPath('/issues')}
            onPullsClick={() => navigateToPath('/pulls')}
            onCreateClick={handleOpenCreateRepository}
            onProfileClick={() => navigateToProfileTab('overview')}
            profileInitial={currentUsername}
            profileName={currentUsername}
            onSignOut={handleLogout}
            onSettings={() => navigateToPath('/settings/admin')}
            onSearch={handleSearch}
          />

          <TopNavigationTabs
            tabs={repoTabsWithCounts}
            activeKey={activeTab}
            onSelect={(tab) => {
              if (!selectedRepo) {
                return;
              }

              navigateToRepoTab(selectedRepo, tab);
            }}
          />
        </header>

        <main className="flex-1 w-full min-w-0 min-h-0 bg-[var(--surface-canvas)]">
          <div className="flex flex-col">
            <div>
              <RepoWorkspaceContent
                selectedRepo={selectedRepo}
                currentUsername={currentUsername}
                selectedRepoVisibility={selectedRepoVisibility}
                isResolvingRepo={!selectedRepo && !profileFetchFailed && !repoRouteResolved}
                isFullBrowserMode={isFullBrowserMode}
                activeTab={activeTab}
                routeContentKind={routeContentKind}
                routeContentPath={routeContentPath}
                routeBranch={routeBranch}
                defaultBranchName={defaultBranchName}
                currentBranch={currentBranch || ''}
                branches={branches}
                explorerInitialLocation={explorerInitialLocation}
                locationSearch={window.location.search}
                onSelectBranch={handleSelectBranch}
                onSelectCommitBranch={handleSelectCommitBranch}
                onNavigateRepoLocation={handleNavigateRepoLocation}
                onBackToFiles={() => {
                  if (!selectedRepo) {
                    return;
                  }

                  navigateToRepoTab(selectedRepo, 'files');
                }}
                onNavigateRepoContent={(contentKind, contentPath, branchName) => {
                  if (!selectedRepo) {
                    return;
                  }

                  navigateToRepoContent(selectedRepo, contentKind, contentPath, branchName);
                }}
                onOpenRepoCommits={(branchName, search = '') => {
                  if (!selectedRepo) {
                    return;
                  }

                  navigateToRepoCommits(selectedRepo, branchName, search);
                }}
                onOpenBranches={() => {
                  if (!selectedRepo) return;
                  const owner = getRepoOwner(selectedRepo);
                  navigateToPath(buildRepoBranchesPath(owner, selectedRepo.name));
                }}
                onOpenCreateFile={(branchName, directoryPath) => {
                  if (!selectedRepo) {
                    return;
                  }

                  navigateToRepoNewFile(selectedRepo, branchName, directoryPath);
                }}
                onOpenEditFile={(branchName, filePath) => {
                  if (!selectedRepo) {
                    return;
                  }

                  navigateToRepoEditFile(selectedRepo, branchName, filePath);
                }}
                onOpenUploadFiles={(branchName, directoryPath) => {
                  if (!selectedRepo) {
                    return;
                  }

                  navigateToRepoUploadFiles(selectedRepo, branchName, directoryPath);
                }}
                onOpenFork={() => {
                  if (!selectedRepo) return;
                  navigateToPath(`${buildRepoBasePath(getRepoOwner(selectedRepo), selectedRepo.name)}/fork`);
                }}
                onOpenRepoCompare={(baseRef, headRef) => {
                  if (!selectedRepo) {
                    return;
                  }

                  navigateToRepoCompare(selectedRepo, baseRef, headRef);
                }}
                onOpenPullRequest={(pullNumber) => {
                  if (!selectedRepo) {
                    return;
                  }

                  navigateToRepoPullView(selectedRepo, pullNumber);
                }}
                onOpenPullRequestConflicts={(pullNumber) => {
                  if (!selectedRepo) {
                    return;
                  }

                  navigateToRepoPullConflicts(selectedRepo, pullNumber);
                }}
                onBackToPullRequests={() => {
                  if (!selectedRepo) {
                    return;
                  }

                  navigateToRepoTab(selectedRepo, 'pulls');
                }}
                onOpenCreateIssue={() => {
                  if (!selectedRepo) {
                    return;
                  }

                  navigateToRepoIssuesNew(selectedRepo);
                }}
                onCloseCreateIssue={() => {
                  if (!selectedRepo) {
                    return;
                  }

                  navigateToRepoTab(selectedRepo, 'issues');
                }}
                onOpenIssue={(issueNumber) => {
                  if (!selectedRepo) {
                    return;

                  }

                  navigateToRepoIssueView(selectedRepo, issueNumber);
                }}
                onBackToIssues={() => {
                  if (!selectedRepo) {
                    return;
                  }

                  navigateToRepoTab(selectedRepo, 'issues');
                }}
                onRepoUpdated={handleRepoUpdatedWrapper}
                onRepoDeleted={handleRepoDeletedWrapper}
                onGoToProfile={() => navigateToProfileTab('overview')}
                onOpenRepoPulse={() => {
                  if (!selectedRepo) return;
                  navigateToPath(buildRepoPulsePath(getRepoOwner(selectedRepo), selectedRepo.name));
                }}
                onOpenRepoContributors={() => {
                  if (!selectedRepo) return;
                  navigateToPath(`${buildRepoContributorsPath(getRepoOwner(selectedRepo), selectedRepo.name)}${buildContributorsDefaultSearch()}`);
                }}
                onOpenRepoContributorsPeriod={(search) => {
                  if (!selectedRepo) return;
                  navigateToPath(`${buildRepoContributorsPath(getRepoOwner(selectedRepo), selectedRepo.name)}${search}`);
                }}
                onOpenRepoCommunity={() => {
                  if (!selectedRepo) return;
                  navigateToPath(buildRepoCommunityPath(getRepoOwner(selectedRepo), selectedRepo.name));
                }}
                onOpenRepoCommunityStandards={() => {
                  if (!selectedRepo) return;
                  navigateToPath(buildRepoCommunityStandardsPath(getRepoOwner(selectedRepo), selectedRepo.name));
                }}
                onOpenRepoCommitActivity={() => {
                  if (!selectedRepo) return;
                  navigateToPath(buildRepoCommitActivityPath(getRepoOwner(selectedRepo), selectedRepo.name));
                }}
                onOpenRepoCodeFrequency={() => {
                  if (!selectedRepo) return;
                  navigateToPath(buildRepoCodeFrequencyPath(getRepoOwner(selectedRepo), selectedRepo.name));
                }}
              />
            </div>

          </div>
        </main>
      </div>
    );
  };


  const showFooter = !(viewMode === 'repo' && activeTab === 'files' && routeContentKind !== 'root');

  return (
    <PageReadyProvider>
      <div className="min-h-screen flex flex-col">
        {renderContent()}
        {showFooter && <Footer />}
      </div>
      <SidebarMenu
        username={currentUsername}
        isOpen={isSidebarMenuOpen}
        onClose={() => setIsSidebarMenuOpen(false)}
        onNavigate={navigateToPath}
      />
    </PageReadyProvider>
  );
}

export default App;
