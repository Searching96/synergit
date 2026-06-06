import { useEffect, useMemo, useState, type ComponentType } from "react";
import type { Repository } from "../../types";
import {
  Bot,
  CircleDot,
  Compass,
  Gift,
  Github,
  Home,
  GitPullRequest,
  LayoutGrid,
  Link2,
  LogOut,
  MessageCircle,
  Monitor,
  Package,
  Star,
  Table2,
  X,
} from "lucide-react";
import { RepoIcon } from "@primer/octicons-react";
import RouteButton from "../layout/RouteButton";
import TopNavigationTabs from "../layout/TopNavigationTabs";
import ProfileOverviewPage from "./pages/ProfileOverviewPage";
import ProfileInfo from "./ProfileInfo";
import ProfileRepositoriesPage from "./pages/ProfileRepositoriesPage";
import ProfileProjectsPage from "./pages/ProfileProjectsPage";
import ProfilePackagesPage from "./pages/ProfilePackagesPage";
import ProfileStarsPage from "./pages/ProfileStarsPage";
import { PINNED_ORDER } from "./pages/utils/profileData";
import type { StarredRepo } from "./pages/utils/profileTypes";
import { starsApi } from "../../services/api";
import { readCachedCount, writeCachedCount, starredCountCacheKey } from "../../utils/countCache";
import type { ProfileTabKey, ShowcaseRepo } from "./pages/utils/profileTypes";
import {
  buildDefaultRepositories,
  contributionColor,
  isRepositoryOwnedByUser,
  languageColor,
} from "./pages/utils/profileUtils";
import TopHeader from "../layout/TopHeader";

interface GithubProfilePagesProps {
  repositories: Repository[];
  repositoryCount: number;
  username: string;
  activeTab: ProfileTabKey;
  onTabChange: (tab: ProfileTabKey) => void;
  onNavigateToPath: (path: string) => void;
  onOpenWorkspace: (repoName: string) => void;
  onCreateRepository: () => void;
  onLogout: () => void;
  onSearch?: (query: string) => void;
  hasFetchError?: boolean;
  hasFetchPending?: boolean;
}

const PROFILE_TABS: Array<{
  key: ProfileTabKey;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  count?: number;
}> = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "repositories", label: "Repositories", icon: RepoIconGlyph },
  { key: "projects", label: "Projects", icon: Table2 },
  { key: "packages", label: "Packages", icon: Package },
  { key: "stars", label: "Stars", icon: Star, count: 4 },
];

function RepoIconGlyph({ size = 16, className }: { size?: number; className?: string }) {
  return <RepoIcon size={size} className={className} />;
}

export default function GithubProfilePages({
  repositories,
  repositoryCount,
  username,
  activeTab,
  onTabChange,
  onNavigateToPath,
  onOpenWorkspace,
  onCreateRepository,
  onLogout,
  onSearch,
  hasFetchError = false,
  hasFetchPending = false,
}: GithubProfilePagesProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const ownedRepositories = useMemo(
    () => repositories.filter((repo) => isRepositoryOwnedByUser(repo, username)),
    [repositories, username],
  );

  const profileRepositories = useMemo(
    () => buildDefaultRepositories(ownedRepositories),
    [ownedRepositories],
  );

  const [starred, setStarred] = useState<Repository[]>([]);
  const [starredCount, setStarredCount] = useState<number>(
    () => readCachedCount(starredCountCacheKey(username)) ?? 0,
  );
  useEffect(() => {
    let cancelled = false;
    void starsApi
      .countStarred()
      .then(({ count }) => {
        if (cancelled) return;
        setStarredCount(count);
        writeCachedCount(starredCountCacheKey(username), count);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    if (activeTab !== "stars") {
      return;
    }

    let cancelled = false;
    void starsApi
      .listStarred()
      .then((list) => {
        if (cancelled) {
          return;
        }

        setStarred(list);
        setStarredCount(list.length);
        writeCachedCount(starredCountCacheKey(username), list.length);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeTab, username]);

  const starredRepos = useMemo<StarredRepo[]>(
    () =>
      starred.map((r) => ({
        id: r.id,
        owner: r.owner || username,
        name: r.name,
        description: r.description || "",
        language: r.primary_language || r.language || "",
        stars: r.stars != null ? String(r.stars) : "",
        forks: r.forks != null ? String(r.forks) : "",
        updatedText: r.updated_at
          ? `Updated on ${new Date(r.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
          : "",
      })),
    [starred, username],
  );

  const profileTabs = useMemo(
    () => PROFILE_TABS.map((tab) =>
      tab.key === "repositories"
        ? { ...tab, count: repositoryCount }
        : tab.key === "stars"
          ? { ...tab, count: starredCount }
          : tab
    ),
    [repositoryCount, starredCount],
  );

  const profileBasePath = `/${encodeURIComponent(username)}`;
  const avatarInitial = (username.trim().charAt(0) || "U").toUpperCase();

  const primarySidebarItems: Array<{
    key: string;
    label: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    path: string;
  }> = [
    { key: "home", label: "Home", icon: Home, path: profileBasePath },
    { key: "issues", label: "Issues", icon: CircleDot, path: "/issues" },
    { key: "pulls", label: "Pull requests", icon: GitPullRequest, path: "/pulls" },
    { key: "repositories", label: "Repositories", icon: RepoIconGlyph, path: `${profileBasePath}?tab=repositories` },
    { key: "projects", label: "Projects", icon: LayoutGrid, path: "/projects" },
    { key: "discussions", label: "Discussions", icon: MessageCircle, path: "/discussions" },
    { key: "codespaces", label: "Codespaces", icon: Monitor, path: "/codespaces" },
    { key: "copilot", label: "Copilot", icon: Bot, path: "/copilot" },
  ];

  const secondarySidebarItems: Array<{
    key: string;
    label: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    path: string;
  }> = [
    { key: "explore", label: "Explore", icon: Compass, path: "/explore" },
    { key: "marketplace", label: "Marketplace", icon: Gift, path: "/marketplace" },
    { key: "mcp-registry", label: "MCP registry", icon: Link2, path: "/mcp-registry" },
  ];

  const handleSidebarNavigate = (path: string) => {
    setIsMenuOpen(false);
    onNavigateToPath(path);
  };

  const pinnedRepositories = useMemo(() => {
    const ordered: ShowcaseRepo[] = [];

    for (const name of PINNED_ORDER) {
      const found = profileRepositories.find(
        (repo) => repo.name.toLowerCase() === name.toLowerCase(),
      );
      if (found) ordered.push(found);
    }

    for (const repo of profileRepositories) {
      if (ordered.length >= 6) break;
      if (!ordered.some((item) => item.name === repo.name)) {
        ordered.push(repo);
      }
    }

    return ordered.slice(0, 6);
  }, [profileRepositories]);

  const shouldShowFetchFailure = hasFetchError;
  const shouldShowFetchLoading = !shouldShowFetchFailure && hasFetchPending;
  const fetchStatusMessage = shouldShowFetchFailure
    ? "Failed to fetch"
    : shouldShowFetchLoading
      ? "Loading..."
      : null;

  const content =
    activeTab === "overview" ? (
      <ProfileOverviewPage
        pinnedRepositories={pinnedRepositories}
        onOpenWorkspace={onOpenWorkspace}
        languageColor={languageColor}
        contributionColor={contributionColor}
        isProfileDataLoading={shouldShowFetchLoading}
        hasProfileDataError={shouldShowFetchFailure}
      />
    ) : activeTab === "repositories" ? (
      <ProfileRepositoriesPage
        profileRepositories={profileRepositories}
        isLoading={hasFetchPending}
        onOpenWorkspace={onOpenWorkspace}
        onCreateRepository={onCreateRepository}
        languageColor={languageColor}
      />
    ) : activeTab === "projects" ? (
      <ProfileProjectsPage />
    ) : activeTab === "packages" ? (
      <ProfilePackagesPage />
    ) : (
      <ProfileStarsPage
        starredRepos={starredRepos}
        languageColor={languageColor}
        onNavigateToPath={onNavigateToPath}
        onStarChange={(repoId, isStarred) => {
          if (isStarred || !repoId) {
            return;
          }

          setStarred((current) => current.filter((repo) => repo.id !== repoId));
          setStarredCount((count) => Math.max(0, count - 1));
        }}
      />
    );

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-default)] bg-[var(--surface-page)]">
        <TopHeader
          leftContent={
            <RouteButton selected onClick={() => onNavigateToPath(profileBasePath)} className="truncate">
              {username}
            </RouteButton>
          }
          onMenuClick={() => setIsMenuOpen(true)}
          menuAriaLabel="Open navigation menu"
          onIssuesClick={() => onNavigateToPath("/issues")}
          onPullsClick={() => onNavigateToPath("/pulls")}
          onCreateClick={onCreateRepository}
          onProfileClick={() => onNavigateToPath(profileBasePath)}
          profileInitial={avatarInitial}
          profileName={username}
          onSignOut={onLogout}
          onSearch={onSearch}
        />

        <TopNavigationTabs
          tabs={profileTabs}
          activeKey={activeTab}
          onSelect={onTabChange}
        />
      </header>

      <main className="w-full max-w-[1240px] mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-8 lg:gap-10">
        <ProfileInfo username={username} />

        <section className="min-w-0 w-full">
          {fetchStatusMessage && activeTab !== "overview" && activeTab !== "repositories" ? (
            <p className="mb-3 text-sm text-[var(--text-secondary)]">{fetchStatusMessage}</p>
          ) : null}
          {content}
        </section>
      </main>

      <footer className="border-t border-[var(--border-muted)] mt-8 py-6 text-xs text-[var(--text-secondary)]">
        <div className="max-w-[1480px] mx-auto px-4 md:px-6 flex flex-wrap gap-4 items-center justify-center">
          <span>&copy; 2026 GitHub, Inc.</span>
          <span>Terms</span>
          <span>Privacy</span>
          <span>Security</span>
          <span>Status</span>
          <span>Community</span>
          <span>Docs</span>
          <span>Contact</span>
        </div>
      </footer>

      {isMenuOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsMenuOpen(false)}
            className="absolute inset-0 bg-[var(--overlay-backdrop)]"
          />

          <aside className="absolute left-0 top-0 h-full w-[320px] bg-[var(--surface-canvas)] border-r border-[var(--border-default)] shadow-xl flex flex-col">
            <div className="px-4 py-4 flex items-center justify-between">
              <Github size={30} className="text-[var(--text-primary)]" />
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
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

            <div className="mx-4 my-2 border-t border-[var(--border-muted)]" />

            <div className="px-3 py-1">
              <button
                type="button"
                onClick={onLogout}
                className="w-full h-9 text-left px-2 rounded-md hover:bg-[var(--surface-subtle)] inline-flex items-center gap-3 text-base text-[var(--text-primary)]"
              >
                <LogOut size={17} className="text-[var(--text-secondary)]" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

