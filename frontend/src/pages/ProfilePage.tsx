import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useSetPageReady } from "../contexts/PageReadyContext";
import type { Repository } from "../types";
import {
  LayoutGrid,
  Package,
  Star,
  Table2,
} from "lucide-react";
import { RepoIcon } from "@primer/octicons-react";
import RouteButton from "../components/shared/RouteButton";
import TopNavigationTabs from "../layouts/TopNavigationTabs";
import ProfileOverviewPage from "../components/profile/pages/ProfileOverviewPage";
import ProfileInfo from "../components/profile/ProfileInfo";
import ProfileRepositoriesPage from "../components/profile/pages/ProfileRepositoriesPage";
import ProfileProjectsPage from "../components/profile/pages/ProfileProjectsPage";
import ProfilePackagesPage from "../components/profile/pages/ProfilePackagesPage";
import ProfileStarsPage from "../components/profile/pages/ProfileStarsPage";
import { PINNED_ORDER } from "../utils/profileData";
import type { StarredRepo } from "../utils/profileTypes";
import { starsApi } from "../services/api";
import { readCachedCount, writeCachedCount, starredCountCacheKey } from "../utils/countCache";
import type { ProfileTabKey, ShowcaseRepo } from "../utils/profileTypes";
import {
  buildDefaultRepositories,
  contributionColor,
  isRepositoryOwnedByUser,
  languageColor,
} from "../utils/profileUtils";
import TopHeader from "../layouts/TopHeader";

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
  onMenuClick?: () => void;
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
  onMenuClick,
}: GithubProfilePagesProps) {
  useSetPageReady(!hasFetchPending && !hasFetchError);

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
      <ProfileProjectsPage isLoading={hasFetchPending} />
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
          onMenuClick={onMenuClick}
          menuAriaLabel="Open navigation menu"
          onIssuesClick={() => onNavigateToPath("/issues")}
          onPullsClick={() => onNavigateToPath("/pulls")}
          onCreateClick={onCreateRepository}
          onProfileClick={() => onNavigateToPath(profileBasePath)}
          profileInitial={avatarInitial}
          profileName={username}
          onSignOut={onLogout}
          onSettings={() => onNavigateToPath('/settings/admin')}
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
          {fetchStatusMessage && activeTab !== "overview" && activeTab !== "repositories" && activeTab !== "projects" ? (
            <p className="mb-3 text-sm text-[var(--text-secondary)]">{fetchStatusMessage}</p>
          ) : null}
          {content}
        </section>
      </main>
    </div>
  );
}

