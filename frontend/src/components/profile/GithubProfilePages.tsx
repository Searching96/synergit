import { useMemo, useState, type ComponentType } from "react";
import type { Repository } from "../../types";
import {
  Bell,
  Bot,
  CircleDot,
  Compass,
  Gift,
  Github,
  Home,
  GitPullRequest,
  LayoutGrid,
  Link2,
  Menu,
  MessageCircle,
  Monitor,
  Package,
  Plus,
  Search,
  Star,
  Table2,
  Users,
  X,
} from "lucide-react";
import { RepoIcon } from "@primer/octicons-react";
import ProfileOverviewPage from "./pages/ProfileOverviewPage";
import ProfileRepositoriesPage from "./pages/ProfileRepositoriesPage";
import ProfileProjectsPage from "./pages/ProfileProjectsPage";
import ProfilePackagesPage from "./pages/ProfilePackagesPage";
import ProfileStarsPage from "./pages/ProfileStarsPage";
import { PINNED_ORDER, STARRED_REPOS } from "./pages/profileData";
import type { ProfileTabKey, ShowcaseRepo } from "./pages/profileTypes";
import {
  buildContributionMatrix,
  buildDefaultRepositories,
  contributionColor,
  isRepositoryOwnedByUser,
  languageColor,
} from "./pages/profileUtils";

interface GithubProfilePagesProps {
  repositories: Repository[];
  username: string;
  activeTab: ProfileTabKey;
  onTabChange: (tab: ProfileTabKey) => void;
  onNavigateToPath: (path: string) => void;
  onOpenWorkspace: (repoName: string) => void;
  onCreateRepository: () => void;
  onLogout: () => void;
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
  username,
  activeTab,
  onTabChange,
  onNavigateToPath,
  onOpenWorkspace,
  onCreateRepository,
  onLogout,
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

  const profileTabs = useMemo(
    () => PROFILE_TABS.map((tab) => (
      tab.key === "repositories"
        ? { ...tab, count: profileRepositories.length }
        : tab
    )),
    [profileRepositories.length],
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

  const contributions = useMemo(() => buildContributionMatrix(), []);

  const tabClass = (key: ProfileTabKey) =>
    `h-11 text-sm font-medium border-b-2 flex items-center justify-center whitespace-nowrap ${
      activeTab === key
        ? "border-[var(--border-tab-active)] text-[var(--text-primary)]"
        : "border-transparent text-[var(--text-secondary)]"
    }`;

  const content =
    activeTab === "overview" ? (
      <ProfileOverviewPage
        pinnedRepositories={pinnedRepositories}
        contributions={contributions}
        onOpenWorkspace={onOpenWorkspace}
        languageColor={languageColor}
        contributionColor={contributionColor}
      />
    ) : activeTab === "repositories" ? (
      <ProfileRepositoriesPage
        profileRepositories={profileRepositories}
        onOpenWorkspace={onOpenWorkspace}
        onCreateRepository={onCreateRepository}
        languageColor={languageColor}
      />
    ) : activeTab === "projects" ? (
      <ProfileProjectsPage />
    ) : activeTab === "packages" ? (
      <ProfilePackagesPage />
    ) : (
      <ProfileStarsPage starredRepos={STARRED_REPOS} languageColor={languageColor} />
    );

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-default)] bg-[var(--surface-canvas)]">
        <div className="h-14 px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]"
            >
              <Menu size={16} />
            </button>
            <div className="h-8 w-8 rounded-full bg-[var(--text-primary)] text-[var(--text-on-accent)] text-sm font-semibold inline-flex items-center justify-center">
              GH
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{username}</p>
          </div>

          <div className="flex items-center gap-2">
              <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                readOnly
                placeholder="Type / to search"
                className="w-full h-9 pl-9 pr-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-secondary)]"
              />
            </div>
            <button
              type="button"
              onClick={onCreateRepository}
              className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]"
            >
              <Bell size={16} />
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="h-12 px-4 md:px-6 gap-2 flex items-end overflow-x-auto">
          {profileTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={tabClass(tab.key)}
              >
                <div className="flex items-center justify-center px-2 gap-2 h-8 w-full rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]">
                  <Icon size={15} />
                  {tab.label}
                  {tab.count ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-[var(--surface-badge)] text-[var(--text-secondary)] text-[10px] leading-none">
                      {tab.count}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </header>

      <main className="w-full max-w-[1440px] mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-8 lg:gap-10">
        <aside className="w-full lg:w-[340px]">
          <div className="w-[320px] max-w-full mx-auto lg:mx-0">
            <div
              className="w-full aspect-square rounded-full border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[120px] font-semibold text-[var(--text-primary)] flex items-center justify-center"
              aria-label={`${username} avatar`}
            >
              {avatarInitial}
            </div>
            <h1 className="mt-4 text-[40px] leading-[44px] font-semibold text-[var(--text-primary)]">
              My Name
            </h1>
            <p className="text-[30px] leading-[34px] font-light text-[var(--text-secondary)]">{username}</p>
            <button
              type="button"
              className="mt-4 h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-button-muted)]"
            >
              Edit profile
            </button>
            <p className="mt-4 text-sm text-[var(--text-secondary)] inline-flex items-center gap-2">
              <Users size={14} /> 0 follower · 0 following
            </p>
          </div>
        </aside>

        <section className="min-w-0 w-full">{content}</section>
      </main>

      <footer className="border-t border-[var(--border-muted)] mt-8 py-6 text-xs text-[var(--text-secondary)]">
        <div className="max-w-[1480px] mx-auto px-4 md:px-6 flex flex-wrap gap-4 items-center justify-center">
          <span>© 2026 GitHub, Inc.</span>
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
          </aside>
        </div>
      )}
    </div>
  );
}

