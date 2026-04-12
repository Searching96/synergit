import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import type { Branch, CreateRepositoryPayload, Repository } from "./types/index";
import {
  BarChart3,
  Bell,
  Bot,
  BookOpen,
  Compass,
  CircleDot,
  Code,
  Gift,
  Github,
  Home,
  FolderKanban,
  GitPullRequest,
  LayoutGrid,
  Link2,
  Menu,
  MessageCircle,
  Monitor,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Workflow,
  X,
} from "lucide-react";
import { RepoIcon } from "@primer/octicons-react";
import FileExplorer from "./components/repository/code/FileExplorer";
import RepoTreeBrowserPage from "./components/repository/code/RepoTreeBrowserPage.tsx";
import { ApiError, reposApi } from "./services/api";
import Auth from "./components/auth/Auth";
import PullRequestList from "./components/repository/pulls/PullRequestList";
import RepoInsights from "./components/repository/insights/RepoInsights";
import IssueBoard from "./components/repository/issues/IssueBoard";
import GithubProfilePages from "./components/profile/GithubProfilePages";
import RepoAgentsPage from "./components/repository/pages/RepoAgentsPage";
import RepoActionsPage from "./components/repository/pages/RepoActionsPage";
import RepoProjectsPage from "./components/repository/pages/RepoProjectsPage";
import RepoWikiPage from "./components/repository/pages/RepoWikiPage";
import RepoSecurityPage from "./components/repository/pages/RepoSecurityPage";
import RepoSettingsPage from "./components/repository/pages/RepoSettingsPage";
import CreateRepositoryPage from "./components/create-repository/CreateRepositoryPage";
import CommitHistory from "./components/repository/code/CommitHistory";
import NewFilePage from "./components/repository/code/NewFilePage.tsx";
import UploadFilesPage from "./components/repository/code/UploadFilesPage.tsx";
import type { ProfileTabKey } from "./components/profile/pages/profileTypes";
import { formatVisibilityLabel } from "./utils/visibility";

type TabKey =
  | 'files'
  | 'issues'
  | 'pulls'
  | 'agents'
  | 'actions'
  | 'projects'
  | 'wiki'
  | 'security'
  | 'insights'
  | 'settings';

interface MainTab {
  key: TabKey;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

const MAIN_TABS: MainTab[] = [
  { key: 'files', label: 'Code', icon: Code },
  { key: 'issues', label: 'Issues', icon: CircleDot },
  { key: 'pulls', label: 'Pull requests', icon: GitPullRequest },
  { key: 'agents', label: 'Agents', icon: Bot },
  { key: 'actions', label: 'Actions', icon: Workflow },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'wiki', label: 'Wiki', icon: BookOpen },
  { key: 'security', label: 'Security and quality', icon: ShieldCheck },
  { key: 'insights', label: 'Insights', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const TAB_KEY_SET = new Set<TabKey>(MAIN_TABS.map((tab) => tab.key));
const PROFILE_TAB_SET = new Set<ProfileTabKey>([
  'overview',
  'repositories',
  'projects',
  'packages',
  'stars',
]);

function RepositoryIcon({ size = 16, className }: { size?: number; className?: string }) {
  return <RepoIcon size={size} className={className} />;
}

function normalizeProfileTab(search: string): ProfileTabKey {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');

  if (tab && PROFILE_TAB_SET.has(tab as ProfileTabKey)) {
    return tab as ProfileTabKey;
  }

  return 'overview';
}

function buildProfilePath(username: string, tab: ProfileTabKey): string {
  const base = `/${encodeURIComponent(username)}`;

  if (tab === 'overview') {
    return base;
  }

  return `${base}?tab=${encodeURIComponent(tab)}`;
}

type GlobalPageKey =
  | 'issues'
  | 'pulls'
  | 'repositories'
  | 'projects'
  | 'discussions'
  | 'codespaces'
  | 'copilot'
  | 'explore'
  | 'marketplace'
  | 'mcp-registry';

const GLOBAL_PAGE_TITLES: Record<GlobalPageKey, string> = {
  issues: 'Issues',
  pulls: 'Pull requests',
  repositories: 'Repositories',
  projects: 'Projects',
  discussions: 'Discussions',
  codespaces: 'Codespaces',
  copilot: 'Copilot',
  explore: 'Explore',
  marketplace: 'Marketplace',
  'mcp-registry': 'MCP registry',
};

const GLOBAL_PAGE_SET = new Set<GlobalPageKey>(Object.keys(GLOBAL_PAGE_TITLES) as GlobalPageKey[]);

type RepoContentKind = 'root' | 'tree' | 'blob' | 'commits' | 'new' | 'upload';

type ParsedRoute = {
  viewMode: 'profile' | 'repo' | 'create-repo' | 'global';
  repoOwner: string | null;
  repoName: string | null;
  repoId: string | null;
  tab: TabKey;
  contentKind: RepoContentKind;
  contentPath: string;
  branch: string;
  globalPage: GlobalPageKey | null;
  normalizedPath: string;
};

function normalizePathValue(value: string): string {
  return value.trim().toLowerCase();
}

function encodePathSegments(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function decodePathSegments(segments: string[]): string {
  return segments
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join('/');
}

function buildRepoBasePath(owner: string, repoName: string): string {
  return `/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`;
}

function buildRepoTabPath(owner: string, repoName: string, tab: TabKey): string {
  const base = buildRepoBasePath(owner, repoName);
  if (tab === 'files') {
    return base;
  }

  return `${base}/${tab}`;
}

function buildRepoContentPath(
  owner: string,
  repoName: string,
  contentKind: 'tree' | 'blob',
  branch: string,
  contentPath: string,
): string {
  const base = buildRepoBasePath(owner, repoName);
  const safeBranch = branch.trim() || 'master';
  const encodedPath = encodePathSegments(contentPath);
  const branchSegment = encodeURIComponent(safeBranch);

  if (!encodedPath) {
    return `${base}/${contentKind}/${branchSegment}`;
  }

  return `${base}/${contentKind}/${branchSegment}/${encodedPath}`;
}

function buildRepoCommitsPath(owner: string, repoName: string, branch: string): string {
  const base = buildRepoBasePath(owner, repoName);
  const safeBranch = branch.trim() || 'master';
  return `${base}/commits/${encodeURIComponent(safeBranch)}`;
}

function buildRepoNewFilePath(owner: string, repoName: string, branch: string, contentPath: string = ''): string {
  const base = buildRepoBasePath(owner, repoName);
  const safeBranch = branch.trim() || 'master';
  const encodedPath = encodePathSegments(contentPath);
  const branchSegment = encodeURIComponent(safeBranch);

  if (!encodedPath) {
    return `${base}/new/${branchSegment}`;
  }

  return `${base}/new/${branchSegment}/${encodedPath}`;
}

function buildRepoUploadFilesPath(owner: string, repoName: string, branch: string, contentPath: string = ''): string {
  const base = buildRepoBasePath(owner, repoName);
  const safeBranch = branch.trim() || 'master';
  const encodedPath = encodePathSegments(contentPath);
  const branchSegment = encodeURIComponent(safeBranch);

  if (!encodedPath) {
    return `${base}/upload/${branchSegment}`;
  }

  return `${base}/upload/${branchSegment}/${encodedPath}`;
}

function normalizeCommitFilterSearch(search: string): string {
  const params = new URLSearchParams(search);
  const author = (params.get('author') || '').trim();
  const since = (params.get('since') || '').trim();
  const until = (params.get('until') || '').trim();

  const normalized = new URLSearchParams();
  if (author) {
    normalized.set('author', author);
  }
  if (since) {
    normalized.set('since', since);
  }
  if (until) {
    normalized.set('until', until);
  }

  const encoded = normalized.toString();
  return encoded ? `?${encoded}` : '';
}

function parseAppPath(pathname: string): ParsedRoute {
  const normalizedInput = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const segments = normalizedInput.split('/').filter(Boolean);

  if (segments.length === 0) {
    return {
      viewMode: 'profile',
      repoOwner: null,
      repoName: null,
      repoId: null,
      tab: 'files',
      contentKind: 'root',
      contentPath: '',
      branch: '',
      globalPage: null,
      normalizedPath: '/',
    };
  }

  if (segments.length === 1 && segments[0] === 'profile') {
    return {
      viewMode: 'profile',
      repoOwner: null,
      repoName: null,
      repoId: null,
      tab: 'files',
      contentKind: 'root',
      contentPath: '',
      branch: '',
      globalPage: null,
      normalizedPath: '/profile',
    };
  }

  if (segments.length === 1 && segments[0] === 'new') {
    return {
      viewMode: 'create-repo',
      repoOwner: null,
      repoName: null,
      repoId: null,
      tab: 'files',
      contentKind: 'root',
      contentPath: '',
      branch: '',
      globalPage: null,
      normalizedPath: '/new',
    };
  }

  if (segments.length === 2 && segments[0] === 'repos' && segments[1] === 'new') {
    return {
      viewMode: 'create-repo',
      repoOwner: null,
      repoName: null,
      repoId: null,
      tab: 'files',
      contentKind: 'root',
      contentPath: '',
      branch: '',
      globalPage: null,
      normalizedPath: '/new',
    };
  }

  if (segments.length === 1 && GLOBAL_PAGE_SET.has(segments[0] as GlobalPageKey)) {
    const globalPage = segments[0] as GlobalPageKey;
    return {
      viewMode: 'global',
      repoOwner: null,
      repoName: null,
      repoId: null,
      tab: 'files',
      contentKind: 'root',
      contentPath: '',
      branch: '',
      globalPage,
      normalizedPath: `/${globalPage}`,
    };
  }

  if (segments.length === 1) {
    const profileUsername = decodeURIComponent(segments[0]);
    return {
      viewMode: 'profile',
      repoOwner: null,
      repoName: null,
      repoId: null,
      tab: 'files',
      contentKind: 'root',
      contentPath: '',
      branch: '',
      globalPage: null,
      normalizedPath: `/${encodeURIComponent(profileUsername)}`,
    };
  }

  if (segments.length >= 2 && segments[0] === 'repos') {
    const repoId = decodeURIComponent(segments[1]);
    if (segments[2] === 'commits') {
      const branch = segments[3] ? decodeURIComponent(segments[3]) : 'master';
      return {
        viewMode: 'repo',
        repoOwner: null,
        repoName: null,
        repoId,
        tab: 'files',
        contentKind: 'commits',
        contentPath: '',
        branch,
        globalPage: null,
        normalizedPath: `/repos/${encodeURIComponent(repoId)}/commits/${encodeURIComponent(branch)}`,
      };
    }

    if (segments[2] === 'new' || segments[2] === 'upload') {
      const contentKind = segments[2] as 'new' | 'upload';
      const branch = segments[3] ? decodeURIComponent(segments[3]) : 'master';
      const contentPath = decodePathSegments(segments.slice(4));
      const encodedContentPath = encodePathSegments(contentPath);
      let normalizedPath = `/repos/${encodeURIComponent(repoId)}/${contentKind}/${encodeURIComponent(branch)}`;
      if (encodedContentPath) {
        normalizedPath = `${normalizedPath}/${encodedContentPath}`;
      }

      return {
        viewMode: 'repo',
        repoOwner: null,
        repoName: null,
        repoId,
        tab: 'files',
        contentKind,
        contentPath,
        branch,
        globalPage: null,
        normalizedPath,
      };
    }

    const tabSegment = segments[2] || 'files';
    const tab = TAB_KEY_SET.has(tabSegment as TabKey)
      ? (tabSegment as TabKey)
      : 'files';

    return {
      viewMode: 'repo',
      repoOwner: null,
      repoName: null,
      repoId,
      tab,
      contentKind: 'root',
      contentPath: '',
      branch: '',
      globalPage: null,
      normalizedPath: `/repos/${encodeURIComponent(repoId)}/${tab}`,
    };
  }

  if (segments.length >= 2) {
    const repoOwner = decodeURIComponent(segments[0]);
    const repoName = decodeURIComponent(segments[1]);
    const base = buildRepoBasePath(repoOwner, repoName);

    if (segments.length === 2) {
      return {
        viewMode: 'repo',
        repoOwner,
        repoName,
        repoId: null,
        tab: 'files',
        contentKind: 'root',
        contentPath: '',
        branch: '',
        globalPage: null,
        normalizedPath: base,
      };
    }

    const third = segments[2];
    if (third === 'blob' || third === 'tree') {
      const branch = segments[3] ? decodeURIComponent(segments[3]) : '';
      const contentPath = decodePathSegments(segments.slice(4));
      const encodedContentPath = encodePathSegments(contentPath);

      let normalizedPath = base;
      if (branch) {
        normalizedPath = `${base}/${third}/${encodeURIComponent(branch)}`;
        if (encodedContentPath) {
          normalizedPath = `${normalizedPath}/${encodedContentPath}`;
        }
      }

      return {
        viewMode: 'repo',
        repoOwner,
        repoName,
        repoId: null,
        tab: 'files',
        contentKind: third,
        contentPath,
        branch,
        globalPage: null,
        normalizedPath,
      };
    }

    if (third === 'commits') {
      const branch = segments[3] ? decodeURIComponent(segments[3]) : 'master';
      return {
        viewMode: 'repo',
        repoOwner,
        repoName,
        repoId: null,
        tab: 'files',
        contentKind: 'commits',
        contentPath: '',
        branch,
        globalPage: null,
        normalizedPath: buildRepoCommitsPath(repoOwner, repoName, branch),
      };
    }

    if (third === 'new' || third === 'upload') {
      const contentKind = third as 'new' | 'upload';
      const branch = segments[3] ? decodeURIComponent(segments[3]) : 'master';
      const contentPath = decodePathSegments(segments.slice(4));
      const encodedContentPath = encodePathSegments(contentPath);
      let normalizedPath = `${base}/${contentKind}/${encodeURIComponent(branch)}`;
      if (encodedContentPath) {
        normalizedPath = `${normalizedPath}/${encodedContentPath}`;
      }

      return {
        viewMode: 'repo',
        repoOwner,
        repoName,
        repoId: null,
        tab: 'files',
        contentKind,
        contentPath,
        branch,
        globalPage: null,
        normalizedPath,
      };
    }

    if (TAB_KEY_SET.has(third as TabKey)) {
      const tab = third as TabKey;

      return {
        viewMode: 'repo',
        repoOwner,
        repoName,
        repoId: null,
        tab,
        contentKind: 'root',
        contentPath: '',
        branch: '',
        globalPage: null,
        normalizedPath: buildRepoTabPath(repoOwner, repoName, tab),
      };
    }

    return {
      viewMode: 'repo',
      repoOwner,
      repoName,
      repoId: null,
      tab: 'files',
      contentKind: 'root',
      contentPath: '',
      branch: '',
      globalPage: null,
      normalizedPath: base,
    };
  }

  return {
    viewMode: 'profile',
    repoOwner: null,
    repoName: null,
    repoId: null,
    tab: 'files',
    contentKind: 'root',
    contentPath: '',
    branch: '',
    globalPage: null,
    normalizedPath: '/',
  };
}

function App () {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));

  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('files');
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
    (routeContentKind === 'tree' || routeContentKind === 'blob');

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

  const navigateToRepoTab = useCallback((repo: Repository, tab: TabKey) => {
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
      <div className="min-h-screen bg-[var(--surface-subtle)] text-[var(--text-primary)]">
        <div className="max-w-[1100px] mx-auto px-6 py-10">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] p-8">
            <h1 className="text-3xl font-semibold text-[var(--text-primary)]">{currentGlobalTitle}</h1>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              This page is currently a placeholder route and will be implemented next.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigateToProfileTab('overview')}
                className="h-9 px-4 rounded-md border border-[var(--border-input)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
              >
                Back to profile
              </button>
              <button
                type="button"
                onClick={handleOpenCreateRepository}
                className="h-9 px-4 rounded-md bg-[var(--accent-primary)] text-sm font-semibold text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-hover)]"
              >
                New repository
              </button>
            </div>
          </div>
        </div>
      </div>
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
      <header className="border-b border-[var(--border-default)] bg-[var(--surface-canvas)]">
        <div className="h-14 px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsRepoDrawerOpen(true)}
              className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] hover:bg-[var(--surface-subtle)] flex items-center justify-center"
              aria-label="Open repository menu"
            >
              <Menu size={18} className="text-[var(--text-secondary)]" />
            </button>

            <div className="h-8 w-8 rounded-full bg-[var(--text-primary)] text-[var(--text-on-accent)] text-sm font-semibold flex items-center justify-center">
              {((currentUsername || "U").trim().charAt(0) || "U").toUpperCase()}
            </div>

            <div className="hidden md:block min-w-0">
              {selectedRepo ? (
                <div className="text-sm text-[var(--text-secondary)] truncate flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => navigateToPath(`/${encodeURIComponent(selectedRepoOwner)}`)}
                    className="text-[var(--text-primary)] hover:opacity-80"
                  >
                    {selectedRepoOwner}
                  </button>
                  <span className="text-[var(--text-muted)]">/</span>
                  <button
                    type="button"
                    onClick={() => navigateToRepoTab(selectedRepo, 'files')}
                    className="font-semibold text-[var(--text-primary)] hover:opacity-80"
                  >
                    {selectedRepo.name}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)] truncate">
                  <span className="font-semibold text-[var(--text-primary)]">select-repository</span>
                </p>
              )}
            </div>
          </div>

          <div className="hidden lg:block flex-1 max-w-xl">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                readOnly
                placeholder="Type / to search"
                className="w-full h-9 pl-9 pr-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-secondary)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreateRepository}
              className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] hover:bg-[var(--surface-subtle)] flex items-center justify-center"
              aria-label="Create"
            >
              <Plus size={16} className="text-[var(--text-secondary)]" />
            </button>
            <button
              type="button"
              className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] hover:bg-[var(--surface-subtle)] flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell size={16} className="text-[var(--text-secondary)]" />
            </button>
            <button
              type="button"
              onClick={() => navigateToProfileTab('overview')}
              className="px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-default)] rounded-md hover:bg-[var(--surface-subtle)]"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-default)] rounded-md hover:bg-[var(--surface-subtle)]"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="h-12 border-t border-[var(--surface-muted)] px-4 md:px-6 flex items-end overflow-x-auto">
          {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  if (!selectedRepo) return;
                  navigateToRepoTab(selectedRepo, tab.key);
                }}
                className={`h-11 px-4 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  active
                    ? 'border-[var(--border-tab-active)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]'
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
        <div className={isFullBrowserMode ? "w-full" : "max-w-[1400px] mx-auto px-4 py-6 h-full"}>
        {!selectedRepo ? (
          <div className="flex h-full items-center justify-center text-[var(--text-secondary)]">
            <div className="text-center space-y-3">
              <h2 className="text-xl font-medium">Select a repository to view its content</h2>
              <button
                type="button"
                onClick={() => setIsRepoDrawerOpen(true)}
                className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-default)] rounded-md bg-[var(--surface-canvas)] hover:bg-[var(--surface-subtle)]"
              >
                Open Repository Menu
              </button>
            </div>
          </div>
        ) : (
          <div className={isFullBrowserMode ? "w-full" : "w-full h-full min-h-0 flex flex-col gap-4"}>
            {!isFullBrowserMode ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <RepositoryIcon size={20} className="text-[var(--text-secondary)]" />
                  <h2 className="text-2xl font-semibold text-[var(--text-link)] truncate">{selectedRepo.name}</h2>
                  <span className="text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-full px-2 py-0.5">
                    {selectedRepoVisibility}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Dynamic Content Area */}
            <div className={isFullBrowserMode ? "w-full" : "flex-1 min-h-0"}>
              {activeTab === 'files' && routeContentKind === 'commits' && (
                <CommitHistory
                  repoId={selectedRepo.id}
                  repoName={selectedRepo.name}
                  branch={currentBranch || routeBranch || defaultBranchName}
                  branches={branches}
                  onSelectBranch={handleSelectCommitBranch}
                  onBack={() => navigateToRepoTab(selectedRepo, 'files')}
                  onBrowseAtCommit={(commitHash) => navigateToRepoContent(selectedRepo, 'tree', '', commitHash)}
                />
              )}
              {activeTab === 'files' && routeContentKind === 'new' && (
                <NewFilePage
                  repoId={selectedRepo.id}
                  repoName={selectedRepo.name}
                  branch={currentBranch || routeBranch || defaultBranchName}
                  branches={branches}
                  initialDirectoryPath={routeContentPath}
                  onSelectBranch={handleSelectBranch}
                  onCancel={() => navigateToRepoContent(selectedRepo, 'tree', routeContentPath, currentBranch || routeBranch || defaultBranchName)}
                  onCommitted={(createdFilePath: string) => navigateToRepoContent(selectedRepo, 'blob', createdFilePath, currentBranch || routeBranch || defaultBranchName)}
                />
              )}
              {activeTab === 'files' && routeContentKind === 'upload' && (
                <UploadFilesPage
                  repoId={selectedRepo.id}
                  repoName={selectedRepo.name}
                  branch={currentBranch || routeBranch || defaultBranchName}
                  initialDirectoryPath={routeContentPath}
                  onCancel={() => navigateToRepoContent(selectedRepo, 'tree', routeContentPath, currentBranch || routeBranch || defaultBranchName)}
                  onCommitted={(targetDirectoryPath: string) => navigateToRepoContent(selectedRepo, 'tree', targetDirectoryPath, currentBranch || routeBranch || defaultBranchName)}
                />
              )}
              {activeTab === 'files' && (routeContentKind === 'tree' || routeContentKind === 'blob') && (
                <RepoTreeBrowserPage
                  repoId={selectedRepo.id}
                  repoName={selectedRepo.name}
                  branch={currentBranch || routeBranch || defaultBranchName}
                  branches={branches}
                  initialLocation={explorerInitialLocation}
                  onNavigateLocation={handleNavigateRepoLocation}
                  onSelectBranch={handleSelectBranch}
                  onOpenCommitHistory={(branchName) => navigateToRepoCommits(selectedRepo, branchName, window.location.search)}
                  onOpenCreateFile={(branchName, directoryPath) => navigateToRepoNewFile(selectedRepo, branchName, directoryPath)}
                  onOpenUploadFiles={(branchName, directoryPath) => navigateToRepoUploadFiles(selectedRepo, branchName, directoryPath)}
                />
              )}
              {activeTab === 'files' && routeContentKind === 'root' && (
                <FileExplorer
                  repoId={selectedRepo.id}
                  repoName={selectedRepo.name}
                  repoDescription={selectedRepo.description}
                  repoOwner={selectedRepo.owner || currentUsername}
                  cloneUrl={selectedRepo.clone_url}
                  branch={currentBranch}
                  branches={branches}
                  initialLocation={explorerInitialLocation}
                  onNavigateLocation={handleNavigateRepoLocation}
                  onSelectBranch={handleSelectBranch}
                  onOpenCommitHistory={(branchName) => navigateToRepoCommits(selectedRepo, branchName)}
                  onOpenCreateFile={(branchName, directoryPath) => navigateToRepoNewFile(selectedRepo, branchName, directoryPath)}
                  onOpenUploadFiles={(branchName, directoryPath) => navigateToRepoUploadFiles(selectedRepo, branchName, directoryPath)}
                />
              )}
              {activeTab === 'issues' && <IssueBoard repoId={selectedRepo.id} />}
              {activeTab === 'pulls' && (
                <PullRequestList
                  repoId={selectedRepo.id}
                  branches={branches}
                  defaultSourceBranch={currentBranch}
                />
              )}
              {activeTab === 'agents' && <RepoAgentsPage />}
              {activeTab === 'actions' && <RepoActionsPage />}
              {activeTab === 'projects' && <RepoProjectsPage />}
              {activeTab === 'wiki' && <RepoWikiPage repoName={selectedRepo.name} />}
              {activeTab === 'security' && <RepoSecurityPage />}
              {activeTab === 'insights' && <RepoInsights repoId={selectedRepo.id} />}
              {activeTab === 'settings' && <RepoSettingsPage />}
            </div>
          </div>
        )}
        </div>
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
          <button
            type="button"
            aria-label="Close repository menu"
            onClick={() => setIsRepoDrawerOpen(false)}
            className="absolute inset-0 bg-[var(--overlay-backdrop)]"
          />

          <aside className="absolute left-0 top-0 h-full w-[320px] bg-[var(--surface-canvas)] border-r border-[var(--border-default)] shadow-xl flex flex-col">
            <div className="px-4 py-4 flex items-center justify-between">
              <Github size={30} className="text-[var(--text-primary)]" />
              <button
                type="button"
                onClick={() => setIsRepoDrawerOpen(false)}
                className="h-8 w-8 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="px-3 py-2 text-sm text-[var(--text-primary)] space-y-1">
              {primarySidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSidebarNavigate(item.path)}
                    className="w-full h-9 text-left px-2 rounded-md hover:bg-[var(--surface-subtle)] inline-flex items-center gap-3"
                  >
                    <Icon size={17} className="text-[var(--text-secondary)]" />
                    <span className="text-base text-[var(--text-primary)]">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mx-4 my-2 border-t border-[var(--border-muted)]" />

            <div className="px-3 py-1 text-sm text-[var(--text-primary)] space-y-1">
              {secondarySidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSidebarNavigate(item.path)}
                    className="w-full h-9 text-left px-2 rounded-md hover:bg-[var(--surface-subtle)] inline-flex items-center gap-3"
                  >
                    <Icon size={17} className="text-[var(--text-secondary)]" />
                    <span className="text-base text-[var(--text-primary)]">{item.label}</span>
                  </button>
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
