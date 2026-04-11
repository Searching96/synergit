import { useMemo } from "react";
import type { Repository } from "../../types";
import {
  Bell,
  FolderGit2,
  LayoutGrid,
  Menu,
  Package,
  Plus,
  Search,
  Star,
  Table2,
  Users,
} from "lucide-react";
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
  languageColor,
} from "./pages/profileUtils";

interface GithubProfilePagesProps {
  repositories: Repository[];
  username: string;
  activeTab: ProfileTabKey;
  onTabChange: (tab: ProfileTabKey) => void;
  onOpenWorkspace: (repoName: string) => void;
  onCreateRepository: () => void;
  onLogout: () => void;
}

const PROFILE_TABS: Array<{
  key: ProfileTabKey;
  label: string;
  icon: typeof LayoutGrid;
  count?: number;
}> = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "repositories", label: "Repositories", icon: FolderGit2, count: 41 },
  { key: "projects", label: "Projects", icon: Table2 },
  { key: "packages", label: "Packages", icon: Package },
  { key: "stars", label: "Stars", icon: Star, count: 4 },
];

export default function GithubProfilePages({
  repositories,
  username,
  activeTab,
  onTabChange,
  onOpenWorkspace,
  onCreateRepository,
  onLogout,
}: GithubProfilePagesProps) {
  const profileRepositories = useMemo(
    () => buildDefaultRepositories(repositories),
    [repositories],
  );

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
    `h-10 px-3 md:px-4 text-sm font-medium border-b-2 inline-flex items-center gap-2 whitespace-nowrap ${
      activeTab === key
        ? "border-[#fd8c73] text-[#24292f]"
        : "border-transparent text-[#57606a] hover:text-[#24292f] hover:border-[#d1d9e0]"
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
    <div className="min-h-screen bg-[#ffffff] text-[#24292f]">
      <header className="border-b border-[#d1d9e0] bg-[#f6f8fa]">
        <div className="h-14 px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="h-8 w-8 rounded-md border border-[#d1d9e0] bg-white text-[#57606a] inline-flex items-center justify-center hover:bg-[#f3f4f6]"
            >
              <Menu size={16} />
            </button>
            <div className="h-8 w-8 rounded-full bg-[#24292f] text-white font-bold text-xs inline-flex items-center justify-center">
              GH
            </div>
            <p className="text-sm font-semibold text-[#24292f] truncate">{username}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block relative w-[260px] lg:w-[360px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#57606a]"
              />
              <input
                readOnly
                value="Type / to search"
                className="h-8 w-full rounded-md border border-[#d1d9e0] bg-white pl-9 pr-3 text-sm text-[#57606a]"
              />
            </div>
            <button
              type="button"
              onClick={onCreateRepository}
              className="h-8 w-8 rounded-md border border-[#d1d9e0] bg-white text-[#57606a] inline-flex items-center justify-center hover:bg-[#f3f4f6]"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              className="h-8 w-8 rounded-md border border-[#d1d9e0] bg-white text-[#57606a] inline-flex items-center justify-center hover:bg-[#f3f4f6]"
            >
              <Bell size={14} />
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="h-8 px-3 rounded-md border border-[#d1d9e0] bg-white text-xs font-semibold text-[#24292f] hover:bg-[#f3f4f6]"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="h-11 px-4 md:px-6 flex items-end gap-1 overflow-x-auto">
          {PROFILE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={tabClass(tab.key)}
              >
                <Icon size={15} />
                {tab.label}
                {tab.count ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#eaeef2] text-[#57606a] text-[10px] leading-none">
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      <main className="w-full max-w-[1480px] mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-8 lg:gap-10">
        <aside className="w-full lg:w-[340px]">
          <div className="w-[320px] max-w-full mx-auto lg:mx-0">
            <img
              src={`https://github.com/${encodeURIComponent(username)}.png`}
              alt={`${username} avatar`}
              className="w-full aspect-square object-cover rounded-full border border-[#d1d9e0]"
            />
            <h1 className="mt-4 text-[40px] leading-[44px] font-semibold text-[#24292f]">
              Nguyễn Phúc Thịnh
            </h1>
            <p className="text-[30px] leading-[34px] font-light text-[#57606a]">{username}</p>
            <button
              type="button"
              className="mt-4 h-8 w-full rounded-md border border-[#d1d9e0] bg-[#f6f8fa] text-sm font-semibold text-[#24292f] hover:bg-[#eef1f4]"
            >
              Edit profile
            </button>
            <p className="mt-4 text-sm text-[#57606a] inline-flex items-center gap-2">
              <Users size={14} /> 1 follower · 0 following
            </p>
          </div>
        </aside>

        <section className="min-w-0 w-full">{content}</section>
      </main>

      <footer className="border-t border-[#d8dee4] mt-8 py-6 text-xs text-[#57606a]">
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
    </div>
  );
}
