import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import type { Branch, CreateRepositoryPayload, Repository } from "./types/index";
import {
  Bot,
  Compass,
  CircleDot,
  Gift,
  Github,
  Home,
  GitPullRequest,
  LayoutGrid,
  Link2,
  MessageCircle,
  Monitor,
  X,
} from "lucide-react";
import { RepoIcon } from "@primer/octicons-react";
import { ApiError, reposApi } from "./services/api";
import Auth from "./components/auth/Auth";
import GithubProfilePages from "./components/profile/GithubProfilePages";
import CreateRepositoryPage from "./components/create-repository/CreateRepositoryPage";
import TopHeader from "./components/layout/TopHeader";
import RouteButton from "./components/layout/RouteButton";
import TopNavigationTabs from "./components/layout/TopNavigationTabs";
import GlobalPlaceholderPage from "./components/layout/GlobalPlaceholderPage";
import RepoWorkspaceContent from "./components/repository/workspace/RepoWorkspaceContent";
import TooltipButton from "./components/ui/TooltipButton";
import { REPO_TABS, type RepoTabKey } from "./components/repository/workspace/utils/repoTabs";
import {
  GLOBAL_PAGE_TITLES,
  buildProfilePath,
  buildRepoBasePath,
  buildRepoComparePath,
  buildRepoCommitsPath,
  buildRepoContentPath,
  buildRepoNewFilePath,
  buildRepoTabPath,
  buildRepoUploadFilesPath,
  normalizeCommitFilterSearch,
  normalizePathValue,
  normalizeProfileTab,
  parseAppPath,
  type GlobalPageKey,
  type ParsedRoute,
  type RepoContentKind,
} from "./components/repository/workspace/utils/repoRouting";
import type { ProfileTabKey } from "./components/profile/pages/utils/profileTypes";
import { formatVisibilityLabel } from "./utils/visibility";

function RepositoryIcon({ size = 16, className }: { size?: number; className?: string }) {
  return <RepoIcon size={size} className={className} />;
}

function App () {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));

  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RepoTabKey>('files');
  const [viewMode, setViewMode] = useState<'profile' | 'repo' | 'create-repo' | 'global'>('profile');
  const [isRepoDrawerOpen, setIsRepoDrawerOpen] = useState<boolean>(false);
  const [createRepoSubmitting, setCreateRepoSubmitting] = useState<boolean>(false);
  const [createRepoError, setCreateRepoError] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<ProfileTabKey>('overview');
  const [activeGlobalPage, setActiveGlobalPage] = useState<GlobalPageKey | null>(null);
  const [routeContentKind, setRouteContentKind] = useState<RepoContentKind>('root');
  const [routeContentPath, setRouteContentPath] = useState<string>('');
  const [routeBranch, setRouteBranch] = useState<string>('');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');

  const getCurrentUsername = () => {
    const token = localStorage.getItem('token');
    if (!token) return 'owner';

    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return 'owner';

      const normalizedBase64 = payloadPart
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const payloadJson = atob(normalizedBase64);
      const payload = JSON.parse(payloadJson) as { username?: unknown };

      if (typeof payload.username === 'string' && payload.username.trim()) {
        return payload.username;
      }
    } catch {
      return 'owner';
    }

    return 'owner';
  };

  const currentUsername = getCurrentUsername();
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
          } else if (parsed.contentKind === 'upload') {
            canonicalPath = buildRepoUploadFilesPath(owner, targetRepo.name, parsed.branch || currentBranch || defaultBranchName, parsed.contentPath);
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
        }

        replaceHistoryIfNeeded(`${canonicalPath}${canonicalSearch}`);
      } else if (!parsed.repoId) {
        setSelectedRepoId(null);
      }

      if (parsed.tab === 'files' && parsed.branch) {
        setCurrentBranch(parsed.branch);
      }

      return parsed;
    }

    replaceHistoryIfNeeded(parsed.normalizedPath);

    return parsed;
  }, [currentBranch, currentUsername, defaultBranchName, findRepoFromParsedRoute, getRepoOwner]);

  const navigateToPath = useCallback((pathname: string, options?: { replace?: boolean }) => {
    const url = new URL(pathname, window.location.origin);
    const parsed = parseAppPath(url.pathname);
    const nextFullPath = `${parsed.normalizedPath}${url.search}`;
    const currentFullPath = `${window.location.pathname}${window.location.search}`;

    if (currentFullPath !== nextFullPath) {
      if (options?.replace) {
        window.history.replaceState({}, '', nextFullPath);
      } else {
        window.history.pushState({}, '', nextFullPath);
      }
    } else if (options?.replace) {
      window.history.replaceState({}, '', nextFullPath);
    }

    return applyRoute(parsed.normalizedPath, url.search, { replace: true });
  }, [applyRoute]);

  const refreshBranches = () => {
    if (!selectedRepoId || !isAuthenticated) return;

    reposApi.getBranches(selectedRepoId)
      .then((data) => {
        const branchList = data || [];
        setBranches(branchList);

        const defaultBranch = branchList.find((b) => b.is_default)?.name || branchList[0]?.name || '';
        const routeRevision = (routeBranch || '').trim();
        const routePinnedToRevision =
          !!routeRevision &&
          (routeContentKind === 'tree' || routeContentKind === 'blob' || routeContentKind === 'commits') &&
          !branchList.some((b) => b.name === routeRevision);

        setCurrentBranch((prev) => {
          if (routePinnedToRevision) {
            return routeRevision;
          }

          if (routeRevision && branchList.some((b) => b.name === routeRevision)) {
            return routeRevision;
          }

          if (prev && branchList.some((b) => b.name === prev)) {
            return prev;
          }

          return defaultBranch;
        });

      })
      .catch(console.error);
  };

  const hydratePrimaryLanguagesFromInsights = useCallback(async (repositories: Repository[]) => {
    const missingLanguageRepos = repositories.filter((repo) => {
      const resolved = (repo.primary_language || repo.language || "").trim();
      return resolved.length === 0;
    });

    if (missingLanguageRepos.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      missingLanguageRepos.map(async (repo) => {
        const snapshot = await reposApi.getInsights(repo.id);
        const primaryLanguage = (
          snapshot.primary_language ||
          snapshot.language_breakdown?.[0]?.language ||
          ""
        ).trim();

        if (!primaryLanguage) {
          return null;
        }

        return {
          repoId: repo.id,
          primaryLanguage,
        };
      }),
    );

    const primaryLanguageByRepoId = new Map<string, string>();
    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value) {
        continue;
      }

      primaryLanguageByRepoId.set(result.value.repoId, result.value.primaryLanguage);
    }

    if (primaryLanguageByRepoId.size === 0) {
      return;
    }

    setRepos((prev) => prev.map((repo) => {
      const primaryLanguage = primaryLanguageByRepoId.get(repo.id);
      if (!primaryLanguage) {
        return repo;
      }

      const existingPrimary = (repo.primary_language || "").trim();
      if (existingPrimary === primaryLanguage) {
        return repo;
      }

      return {
        ...repo,
        primary_language: primaryLanguage,
        language: (repo.language || primaryLanguage).trim(),
      };
    }));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      reposApi.getRepos()
        .then((data) => {
          const repositories = data || [];
          setRepos(repositories); // Just to ensure handling null value for data
          void hydratePrimaryLanguagesFromInsights(repositories);
        })
                                              // since we do not know the backend will handle empty list or not
        .catch((err) => {
          console.error(err);
          // If token is invalid/expired, log out on explicit 401 from API layer.
          if (err instanceof ApiError && err.status === 401) {
            handleLogout();
          }
        });
    }
  }, [hydratePrimaryLanguagesFromInsights, isAuthenticated]);

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

  const selectedRepo = repos.find((repo) => repo.id === selectedRepoId) || null;
  const selectedRepoVisibility = formatVisibilityLabel(selectedRepo?.visibility);
  const selectedRepoOwner = (selectedRepo?.owner || currentUsername).trim();
  const isFullBrowserMode =
    !!selectedRepo &&
    activeTab === 'files' &&
    (routeContentKind === 'tree' || routeContentKind === 'blob' || routeContentKind === 'new');

  useEffect(() => {
    applyRoute(window.location.pathname, window.location.search, { replace: true });

    const onPopState = () => {
      applyRoute(window.location.pathname, window.location.search, { replace: true });
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyRoute]);

  useEffect(() => {
    if (!isAuthenticated) return;
    applyRoute(window.location.pathname, window.location.search, { replace: true });
  }, [applyRoute, isAuthenticated, repos]);

  const navigateToProfileTab = useCallback((tab: ProfileTabKey, options?: { replace?: boolean }) => {
    navigateToPath(buildProfilePath(currentUsername, tab), options);
  }, [currentUsername, navigateToPath]);

  const navigateToRepoTab = useCallback((repo: Repository, tab: RepoTabKey) => {
    const owner = getRepoOwner(repo);
    navigateToPath(buildRepoTabPath(owner, repo.name, tab));
  }, [getRepoOwner, navigateToPath]);

  const navigateToRepoContent = useCallback((
    repo: Repository,
    contentKind: 'root' | 'tree' | 'blob',
    contentPath: string,
    branchName: string,
  ) => {
    const owner = getRepoOwner(repo);

    if (contentKind === 'root') {
      navigateToPath(buildRepoBasePath(owner, repo.name));
      return;
    }

    if (contentKind === 'blob') {
      navigateToPath(buildRepoContentPath(owner, repo.name, 'blob', branchName, contentPath));
      return;
    }

    if (!contentPath && branchName === defaultBranchName) {
      navigateToPath(buildRepoBasePath(owner, repo.name));
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

  const navigateToRepoUploadFiles = useCallback((repo: Repository, branchName: string, contentPath: string = '') => {
    const owner = getRepoOwner(repo);
    navigateToPath(buildRepoUploadFilesPath(owner, repo.name, branchName || defaultBranchName, contentPath));
  }, [defaultBranchName, getRepoOwner, navigateToPath]);

  const navigateToRepoCompare = useCallback((repo: Repository, baseRef?: string, headRef?: string) => {
    const owner = getRepoOwner(repo);
    navigateToPath(buildRepoComparePath(owner, repo.name, baseRef, headRef));
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

    if (routeContentKind === 'upload') {
      navigateToRepoUploadFiles(selectedRepo, branchName, routeContentPath);
      return;
    }

    if (routeContentKind === 'compare') {
      navigateToRepoTab(selectedRepo, 'pulls');
      return;
    }

    navigateToRepoContent(selectedRepo, routeContentKind, routeContentPath, branchName);
  };

  const handleSelectCommitBranch = (branchName: string) => {
    setCurrentBranch(branchName);

    if (!selectedRepo) {
      return;
    }

    navigateToRepoCommits(selectedRepo, branchName, window.location.search);
  };

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
    if (repos.length === 0) {
      setIsRepoDrawerOpen(true);
      return;
    }

    const target =
      repos.find((repo) => repo.name.toLowerCase() === repoName.toLowerCase()) ||
      repos[0];

    if (!target) return;

    navigateToRepoTab(target, 'files');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setSelectedRepoId(null);
    setViewMode('profile');
    navigateToPath(`/${encodeURIComponent(currentUsername)}`, { replace: true });
    setCreateRepoError(null);
    setCreateRepoSubmitting(false);
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

      const createdRepoResponse = await reposApi.createRepo(payload);
      const createdRepo: Repository = {
        ...createdRepoResponse,
        description: createdRepoResponse.description ?? payload.description,
        visibility: createdRepoResponse.visibility ?? payload.visibility ?? 'PUBLIC',
      };

      setRepos((prev) => {
        const withoutCreated = prev.filter((repo) => repo.id !== createdRepo.id);
        return [createdRepo, ...withoutCreated];
      });
      setSelectedRepoId(createdRepo.id);
      navigateToRepoTab(createdRepo, 'files');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create repository';
      setCreateRepoError(message);
    } finally {
      setCreateRepoSubmitting(false);
    }
  };

  const currentGlobalTitle = activeGlobalPage ? GLOBAL_PAGE_TITLES[activeGlobalPage] : 'Page';

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={() => {
      setIsAuthenticated(true);
    }} />;
  }

  if (viewMode === 'profile') {
    return (
      <GithubProfilePages
        repositories={repos}
        username={currentUsername}
        activeTab={profileTab}
        onTabChange={(tab) => navigateToProfileTab(tab)}
        onNavigateToPath={navigateToPath}
        onOpenWorkspace={handleOpenWorkspaceFromProfile}
        onCreateRepository={handleOpenCreateRepository}
        onLogout={handleLogout}
      />
    );
  }

  if (viewMode === 'create-repo') {
    return (
      <CreateRepositoryPage
        ownerName={currentUsername}
        submitting={createRepoSubmitting}
        error={createRepoError}
        onCancel={handleCancelCreateRepository}
        onCreateRepository={handleCreateRepository}
      />
    );
  }

  if (viewMode === 'global') {
    return (
      <GlobalPlaceholderPage
        title={currentGlobalTitle}
        onBackToProfile={() => navigateToProfileTab('overview')}
        onCreateRepository={handleOpenCreateRepository}
      />
    );
  }

  const handleSidebarNavigate = (path: string) => {
    setIsRepoDrawerOpen(false);
    navigateToPath(path);
  };

  const primarySidebarItems: Array<{ key: string; label: string; icon: ComponentType<{ size?: number; className?: string }>; path: string }> = [
    { key: 'home', label: 'Home', icon: Home, path: buildProfilePath(currentUsername, 'overview') },
    { key: 'issues', label: 'Issues', icon: CircleDot, path: '/issues' },
    { key: 'pulls', label: 'Pull requests', icon: GitPullRequest, path: '/pulls' },
    { key: 'repositories', label: 'Repositories', icon: RepositoryIcon, path: buildProfilePath(currentUsername, 'repositories') },
    { key: 'projects', label: 'Projects', icon: LayoutGrid, path: '/projects' },
    { key: 'discussions', label: 'Discussions', icon: MessageCircle, path: '/discussions' },
    { key: 'codespaces', label: 'Codespaces', icon: Monitor, path: '/codespaces' },
    { key: 'copilot', label: 'Copilot', icon: Bot, path: '/copilot' },
  ];

  const secondarySidebarItems: Array<{ key: string; label: string; icon: ComponentType<{ size?: number; className?: string }>; path: string }> = [
    { key: 'explore', label: 'Explore', icon: Compass, path: '/explore' },
    { key: 'marketplace', label: 'Marketplace', icon: Gift, path: '/marketplace' },
    { key: 'mcp-registry', label: 'MCP registry', icon: Link2, path: '/mcp-registry' },
  ];

  return (
    <div className="h-screen bg-[var(--surface-subtle)] font-sans text-[var(--text-primary)] flex flex-col">
      <header className="border-b border-[var(--border-default)] bg-[var(--surface-page)]">
        <TopHeader
          leftContent={selectedRepo ? (
            <div className="min-w-0 flex items-center gap-1 text-sm">
              <RouteButton
                onClick={() => navigateToPath(`/${encodeURIComponent(selectedRepoOwner)}`)}
                className="max-w-[180px] truncate"
              >
                {selectedRepoOwner}
              </RouteButton>
              <span className="text-[var(--text-muted)]">/</span>
              <RouteButton
                selected
                onClick={() => navigateToRepoTab(selectedRepo, 'files')}
                className="truncate"
              >
                {selectedRepo.name}
              </RouteButton>
            </div>
          ) : (
            <RouteButton selected onClick={() => setIsRepoDrawerOpen(true)} className="truncate">
              select-repository
            </RouteButton>
          )}
          onMenuClick={() => setIsRepoDrawerOpen(true)}
          menuAriaLabel="Open repository menu"
          onIssuesClick={() => navigateToPath('/issues')}
          onPullsClick={() => navigateToPath('/pulls')}
          onCreateClick={handleOpenCreateRepository}
          onProfileClick={() => navigateToProfileTab('overview')}
          profileInitial={currentUsername}
        />

        <TopNavigationTabs
          tabs={REPO_TABS}
          activeKey={activeTab}
          onSelect={(tab) => {
            if (!selectedRepo) {
              return;
            }

            navigateToRepoTab(selectedRepo, tab);
          }}
        />
      </header>

      <main className="flex-1 w-full min-w-0 min-h-0 overflow-y-auto bg-[var(--surface-canvas)]">
        <RepoWorkspaceContent
          selectedRepo={selectedRepo}
          currentUsername={currentUsername}
          selectedRepoVisibility={selectedRepoVisibility}
          isFullBrowserMode={isFullBrowserMode}
          activeTab={activeTab}
          routeContentKind={routeContentKind}
          routeContentPath={routeContentPath}
          routeBranch={routeBranch}
          defaultBranchName={defaultBranchName}
          currentBranch={currentBranch}
          branches={branches}
          explorerInitialLocation={explorerInitialLocation}
          locationSearch={window.location.search}
          onOpenRepoDrawer={() => setIsRepoDrawerOpen(true)}
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
          onOpenCreateFile={(branchName, directoryPath) => {
            if (!selectedRepo) {
              return;
            }

            navigateToRepoNewFile(selectedRepo, branchName, directoryPath);
          }}
          onOpenUploadFiles={(branchName, directoryPath) => {
            if (!selectedRepo) {
              return;
            }

            navigateToRepoUploadFiles(selectedRepo, branchName, directoryPath);
          }}
          onOpenRepoCompare={(baseRef, headRef) => {
            if (!selectedRepo) {
              return;
            }

            navigateToRepoCompare(selectedRepo, baseRef, headRef);
          }}
        />
      </main>

      {!isFullBrowserMode ? (
        <footer className="border-t border-[var(--border-muted)] py-4 text-xs text-[var(--text-secondary)] bg-[var(--surface-canvas)]">
          <div className="max-w-[1400px] mx-auto px-4 flex flex-wrap gap-4 items-center justify-center">
            <span className="inline-flex items-center gap-1.5">
              <Github size={16} className="text-[var(--text-secondary)]" />
              (c) 2026 GitHub, Inc.
            </span>
            <span>Terms</span>
            <span>Privacy</span>
            <span>Security</span>
            <span>Status</span>
            <span>Community</span>
            <span>Docs</span>
            <span>Contact</span>
            <span>Manage cookies</span>
            <span>Do not share my personal information</span>
          </div>
        </footer>
      ) : null}

      {isRepoDrawerOpen && (
        <div className="fixed inset-0 z-50">
          <TooltipButton
            type="button"
            aria-label="Close repository menu"
            onClick={() => setIsRepoDrawerOpen(false)}
            className="absolute inset-0 bg-[var(--overlay-backdrop)]"
          />

          <aside className="absolute left-0 top-0 h-full w-[320px] bg-[var(--surface-canvas)] border-r border-[var(--border-default)] shadow-xl flex flex-col">
            <div className="px-4 py-4 flex items-center justify-between">
              <Github size={30} className="text-[var(--text-primary)]" />
              <TooltipButton
                type="button"
                onClick={() => setIsRepoDrawerOpen(false)}
                className="h-8 w-8 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} className="text-[var(--text-secondary)]" />
              </TooltipButton>
            </div>

            <div className="px-3 py-2 text-sm text-[var(--text-primary)] space-y-1">
              {primarySidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TooltipButton
                    key={item.key}
                    type="button"
                    onClick={() => handleSidebarNavigate(item.path)}
                    className="w-full h-9 text-left px-2 rounded-md hover:bg-[var(--surface-subtle)] inline-flex items-center gap-3"
                  >
                    <Icon size={17} className="text-[var(--text-secondary)]" />
                    <span className="text-base text-[var(--text-primary)]">{item.label}</span>
                  </TooltipButton>
                );
              })}
            </div>

            <div className="mx-4 my-2 border-t border-[var(--border-muted)]" />

            <div className="px-3 py-1 text-sm text-[var(--text-primary)] space-y-1">
              {secondarySidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TooltipButton
                    key={item.key}
                    type="button"
                    onClick={() => handleSidebarNavigate(item.path)}
                    className="w-full h-9 text-left px-2 rounded-md hover:bg-[var(--surface-subtle)] inline-flex items-center gap-3"
                  >
                    <Icon size={17} className="text-[var(--text-secondary)]" />
                    <span className="text-base text-[var(--text-primary)]">{item.label}</span>
                  </TooltipButton>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;
