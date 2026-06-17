import type { ProfileTabKey } from "./profileTypes";
import { REPO_TAB_KEY_SET, type RepoTabKey } from "./repoTabs";

const PROFILE_TAB_SET = new Set<ProfileTabKey>([
  "overview",
  "repositories",
  "projects",
  "packages",
  "stars",
]);

export type GlobalPageKey =
  | "issues"
  | "pulls"
  | "repositories"
  | "projects"
  | "discussions"
  | "codespaces"
  | "copilot"
  | "explore"
  | "marketplace"
  | "mcp-registry"
  | "search"
  | "settings";

export const GLOBAL_PAGE_TITLES: Record<GlobalPageKey, string> = {
  issues: "Issues",
  pulls: "Pull requests",
  repositories: "Repositories",
  projects: "Projects",
  discussions: "Discussions",
  codespaces: "Codespaces",
  copilot: "Copilot",
  explore: "Explore",
  marketplace: "Marketplace",
  "mcp-registry": "MCP registry",
  search: "Search",
  settings: "Settings",
};

const GLOBAL_PAGE_SET = new Set<GlobalPageKey>(Object.keys(GLOBAL_PAGE_TITLES) as GlobalPageKey[]);

export type RepoContentKind = "root" | "tree" | "blob" | "commits" | "new" | "edit" | "upload" | "compare" | "commit-view" | "branches" | "issues-new" | "issue-view" | "pull-view" | "pull-conflicts" | "fork" | "pulse" | "contributors" | "community" | "community-standards";

export type ParsedRoute = {
  viewMode: "profile" | "repo" | "create-repo" | "global";
  repoOwner: string | null;
  repoName: string | null;
  repoId: string | null;
  tab: RepoTabKey;
  contentKind: RepoContentKind;
  contentPath: string;
  branch: string;
  globalPage: GlobalPageKey | null;
  normalizedPath: string;
};

export function normalizePathValue(value: string): string {
  return value.trim().toLowerCase();
}

function encodePathSegments(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function decodePathSegments(segments: string[]): string {
  return segments
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

function normalizeCompareRange(rangeSegment: string): string {
  const raw = rangeSegment.trim();
  if (!raw) {
    return "";
  }

  const parts = raw.split("...");
  if (parts.length !== 2) {
    return "";
  }

  const baseRef = decodeURIComponent(parts[0] || "").trim();
  const headRef = decodeURIComponent(parts[1] || "").trim();
  if (!baseRef || !headRef) {
    return "";
  }

  return `${baseRef}...${headRef}`;
}

function encodeCompareRange(baseRef: string, headRef: string): string {
  return `${encodeURIComponent(baseRef)}...${encodeURIComponent(headRef)}`;
}

export function normalizeProfileTab(search: string): ProfileTabKey {
  const params = new URLSearchParams(search);
  const tab = params.get("tab");

  if (tab && PROFILE_TAB_SET.has(tab as ProfileTabKey)) {
    return tab as ProfileTabKey;
  }

  return "overview";
}

export function buildProfilePath(username: string, tab: ProfileTabKey): string {
  const base = `/${encodeURIComponent(username)}`;

  if (tab === "overview") {
    return base;
  }

  return `${base}?tab=${encodeURIComponent(tab)}`;
}

export function buildRepoBasePath(owner: string, repoName: string): string {
  return `/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`;
}

export function buildRepoTabPath(owner: string, repoName: string, tab: RepoTabKey): string {
  const base = buildRepoBasePath(owner, repoName);
  if (tab === "files") {
    return base;
  }
  if (tab === "insights") {
    return `${base}/pulse`;
  }

  return `${base}/${tab}`;
}

export function buildRepoPulsePath(owner: string, repoName: string): string {
  return `${buildRepoBasePath(owner, repoName)}/pulse`;
}

export function buildRepoContributorsPath(owner: string, repoName: string): string {
  return `${buildRepoBasePath(owner, repoName)}/graphs/contributors`;
}

export function buildRepoCommunityPath(owner: string, repoName: string): string {
  return `${buildRepoBasePath(owner, repoName)}/graphs/community`;
}

export function buildRepoCommunityStandardsPath(owner: string, repoName: string): string {
  return `${buildRepoBasePath(owner, repoName)}/community`;
}

export function formatGitHubDate(value: Date): string {
  return `${value.getMonth() + 1}/${value.getDate()}/${value.getFullYear()}`;
}

export function buildContributorsDefaultSearch(now: Date = new Date()): string {
  const from = new Date(now);
  from.setMonth(from.getMonth() - 3);
  const params = new URLSearchParams();
  params.set("from", formatGitHubDate(from));
  return `?${params.toString()}`;
}

export function normalizeContributorsSearch(search: string): string {
  const params = new URLSearchParams(search);
  if (params.get("all") === "1") {
    return "?all=1";
  }
  const from = (params.get("from") || "").trim();
  if (from) {
    const normalized = new URLSearchParams();
    normalized.set("from", from);
    return `?${normalized.toString()}`;
  }
  return buildContributorsDefaultSearch();
}

export function buildRepoIssuesNewPath(owner: string, repoName: string): string {
  return `${buildRepoBasePath(owner, repoName)}/issues/new`;
}

export function buildRepoIssueViewPath(owner: string, repoName: string, issueNumber: number | string): string {
  return `${buildRepoBasePath(owner, repoName)}/issues/${encodeURIComponent(String(issueNumber))}`;
}

export function buildRepoPullViewPath(owner: string, repoName: string, pullNumber: number | string): string {
  return `${buildRepoBasePath(owner, repoName)}/pull/${encodeURIComponent(String(pullNumber))}`;
}

export function buildRepoPullConflictsPath(owner: string, repoName: string, pullNumber: number | string): string {
  return `${buildRepoPullViewPath(owner, repoName, pullNumber)}/conflicts`;
}

export function buildRepoContentPath(
  owner: string,
  repoName: string,
  contentKind: "tree" | "blob",
  branch: string,
  contentPath: string,
): string {
  const base = buildRepoBasePath(owner, repoName);
  const safeBranch = branch.trim() || "master";
  const encodedPath = encodePathSegments(contentPath);
  const branchSegment = encodeURIComponent(safeBranch);

  if (!encodedPath) {
    return `${base}/${contentKind}/${branchSegment}`;
  }

  return `${base}/${contentKind}/${branchSegment}/${encodedPath}`;
}

export function buildRepoCommitViewPath(owner: string, repoName: string, commitHash: string): string {
  return `${buildRepoBasePath(owner, repoName)}/commit/${encodeURIComponent(commitHash)}`;
}

export function buildRepoCommitsPath(owner: string, repoName: string, branch: string): string {
  const base = buildRepoBasePath(owner, repoName);
  const safeBranch = branch.trim() || "master";
  return `${base}/commits/${encodeURIComponent(safeBranch)}`;
}

export function buildRepoBranchesPath(owner: string, repoName: string): string {
  return `${buildRepoBasePath(owner, repoName)}/branches`;
}

export function buildRepoNewFilePath(owner: string, repoName: string, branch: string, contentPath: string = ""): string {
  const base = buildRepoBasePath(owner, repoName);
  const safeBranch = branch.trim() || "master";
  const encodedPath = encodePathSegments(contentPath);
  const branchSegment = encodeURIComponent(safeBranch);

  if (!encodedPath) {
    return `${base}/new/${branchSegment}`;
  }

  return `${base}/new/${branchSegment}/${encodedPath}`;
}

export function buildRepoEditFilePath(owner: string, repoName: string, branch: string, contentPath: string): string {
  const base = buildRepoBasePath(owner, repoName);
  const safeBranch = branch.trim() || "master";
  const encodedPath = encodePathSegments(contentPath);
  const branchSegment = encodeURIComponent(safeBranch);

  if (!encodedPath) {
    return `${base}/edit/${branchSegment}`;
  }

  return `${base}/edit/${branchSegment}/${encodedPath}`;
}

export function buildRepoUploadFilesPath(owner: string, repoName: string, branch: string, contentPath: string = ""): string {
  const base = buildRepoBasePath(owner, repoName);
  const safeBranch = branch.trim() || "master";
  const encodedPath = encodePathSegments(contentPath);
  const branchSegment = encodeURIComponent(safeBranch);

  if (!encodedPath) {
    return `${base}/upload/${branchSegment}`;
  }

  return `${base}/upload/${branchSegment}/${encodedPath}`;
}

export function buildRepoComparePath(owner: string, repoName: string, baseRef?: string, headRef?: string): string {
  const base = buildRepoBasePath(owner, repoName);
  const normalizedBase = (baseRef || "").trim();
  const normalizedHead = (headRef || "").trim();

  if (!normalizedBase || !normalizedHead) {
    return `${base}/compare`;
  }

  return `${base}/compare/${encodeCompareRange(normalizedBase, normalizedHead)}`;
}

export function normalizeCommitFilterSearch(search: string): string {
  const params = new URLSearchParams(search);
  const author = (params.get("author") || "").trim();
  const since = (params.get("since") || "").trim();
  const until = (params.get("until") || "").trim();

  const normalized = new URLSearchParams();
  if (author) {
    normalized.set("author", author);
  }
  if (since) {
    normalized.set("since", since);
  }
  if (until) {
    normalized.set("until", until);
  }

  const encoded = normalized.toString();
  return encoded ? `?${encoded}` : "";
}

export function parseAppPath(pathname: string): ParsedRoute {
  const normalizedInput = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = normalizedInput.split("/").filter(Boolean);

  if (segments.length === 0) {
    return {
      viewMode: "profile",
      repoOwner: null,
      repoName: null,
      repoId: null,
      tab: "files",
      contentKind: "root",
      contentPath: "",
      branch: "",
      globalPage: null,
      normalizedPath: "/",
    };
  }

  if (segments.length === 1 && segments[0] === "profile") {
    return {
      viewMode: "profile",
      repoOwner: null,
      repoName: null,
      repoId: null,
      tab: "files",
      contentKind: "root",
      contentPath: "",
      branch: "",
      globalPage: null,
      normalizedPath: "/profile",
    };
  }

  if (segments.length === 1 && segments[0] === "new") {
    return {
      viewMode: "create-repo",
      repoOwner: null,
      repoName: null,
      repoId: null,
      tab: "files",
      contentKind: "root",
      contentPath: "",
      branch: "",
      globalPage: null,
      normalizedPath: "/new",
    };
  }

  if (segments.length === 2 && segments[0] === "repos" && segments[1] === "new") {
    return {
      viewMode: "create-repo",
      repoOwner: null,
      repoName: null,
      repoId: null,
      tab: "files",
      contentKind: "root",
      contentPath: "",
      branch: "",
      globalPage: null,
      normalizedPath: "/new",
    };
  }

  if (segments.length >= 1 && segments[0] === "settings") {
    return {
      viewMode: "global",
      repoOwner: null,
      repoName: null,
      repoId: null,
      tab: "files",
      contentKind: "root",
      contentPath: "",
      branch: "",
      globalPage: "settings",
      normalizedPath: "/settings/admin",
    };
  }

  if (segments.length === 1 && GLOBAL_PAGE_SET.has(segments[0] as GlobalPageKey)) {
    const globalPage = segments[0] as GlobalPageKey;
    return {
      viewMode: "global",
      repoOwner: null,
      repoName: null,
      repoId: null,
      tab: "files",
      contentKind: "root",
      contentPath: "",
      branch: "",
      globalPage,
      normalizedPath: `/${globalPage}`,
    };
  }

  if (segments.length === 1) {
    const profileUsername = decodeURIComponent(segments[0]);
    return {
      viewMode: "profile",
      repoOwner: null,
      repoName: null,
      repoId: null,
      tab: "files",
      contentKind: "root",
      contentPath: "",
      branch: "",
      globalPage: null,
      normalizedPath: `/${encodeURIComponent(profileUsername)}`,
    };
  }

  if (segments.length >= 2 && segments[0] === "repos") {
    const repoId = decodeURIComponent(segments[1]);
    if (segments[2] === "compare") {
      const compareRange = segments[3] ? normalizeCompareRange(segments[3]) : "";
      const encodedRange = compareRange
        ? encodeCompareRange(compareRange.split("...")[0], compareRange.split("...")[1])
        : "";

      let normalizedPath = `/repos/${encodeURIComponent(repoId)}/compare`;
      if (encodedRange) {
        normalizedPath = `${normalizedPath}/${encodedRange}`;
      }

      return {
        viewMode: "repo",
        repoOwner: null,
        repoName: null,
        repoId,
        tab: "pulls",
        contentKind: "compare",
        contentPath: compareRange,
        branch: "",
        globalPage: null,
        normalizedPath,
      };
    }

    if (segments[2] === "commits") {
      const branch = segments[3] ? decodeURIComponent(segments[3]) : "master";
      return {
        viewMode: "repo",
        repoOwner: null,
        repoName: null,
        repoId,
        tab: "files",
        contentKind: "commits",
        contentPath: "",
        branch,
        globalPage: null,
        normalizedPath: `/repos/${encodeURIComponent(repoId)}/commits/${encodeURIComponent(branch)}`,
      };
    }

    if (segments[2] === "pulse") {
      return {
        viewMode: "repo",
        repoOwner: null,
        repoName: null,
        repoId,
        tab: "insights",
        contentKind: "pulse",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: `/repos/${encodeURIComponent(repoId)}/pulse`,
      };
    }

    if (segments[2] === "graphs" && segments[3] === "contributors") {
      return {
        viewMode: "repo",
        repoOwner: null,
        repoName: null,
        repoId,
        tab: "insights",
        contentKind: "contributors",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: `/repos/${encodeURIComponent(repoId)}/graphs/contributors`,
      };
    }

    if (segments[2] === "graphs" && segments[3] === "community") {
      return {
        viewMode: "repo",
        repoOwner: null,
        repoName: null,
        repoId,
        tab: "insights",
        contentKind: "community",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: `/repos/${encodeURIComponent(repoId)}/graphs/community`,
      };
    }

    if (segments[2] === "community") {
      return {
        viewMode: "repo",
        repoOwner: null,
        repoName: null,
        repoId,
        tab: "insights",
        contentKind: "community-standards",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: `/repos/${encodeURIComponent(repoId)}/community`,
      };
    }

    if (segments[2] === "new" || segments[2] === "edit" || segments[2] === "upload") {
      const contentKind = segments[2] as "new" | "edit" | "upload";
      const branch = segments[3] ? decodeURIComponent(segments[3]) : "master";
      const contentPath = decodePathSegments(segments.slice(4));
      const encodedContentPath = encodePathSegments(contentPath);
      let normalizedPath = `/repos/${encodeURIComponent(repoId)}/${contentKind}/${encodeURIComponent(branch)}`;
      if (encodedContentPath) {
        normalizedPath = `${normalizedPath}/${encodedContentPath}`;
      }

      return {
        viewMode: "repo",
        repoOwner: null,
        repoName: null,
        repoId,
        tab: "files",
        contentKind,
        contentPath,
        branch,
        globalPage: null,
        normalizedPath,
      };
    }

    const tabSegment = segments[2] || "files";
    const tab = REPO_TAB_KEY_SET.has(tabSegment as RepoTabKey)
      ? (tabSegment as RepoTabKey)
      : "files";

    if (tab === "issues" && segments[3] === "new") {
      return {
        viewMode: "repo",
        repoOwner: null,
        repoName: null,
        repoId,
        tab: "issues",
        contentKind: "issues-new",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: `/repos/${encodeURIComponent(repoId)}/issues/new`,
      };
    }

    if (tab === "issues" && segments[3]) {
      const issueNumber = decodeURIComponent(segments[3]);
      return {
        viewMode: "repo",
        repoOwner: null,
        repoName: null,
        repoId,
        tab: "issues",
        contentKind: "issue-view",
        contentPath: issueNumber,
        branch: "",
        globalPage: null,
        normalizedPath: `/repos/${encodeURIComponent(repoId)}/issues/${encodeURIComponent(issueNumber)}`,
      };
    }

    if ((segments[2] === "pull" || tab === "pulls") && segments[3]) {
      const pullNumber = decodeURIComponent(segments[3]);
      const isConflicts = segments[4] === "conflicts";
      return {
        viewMode: "repo",
        repoOwner: null,
        repoName: null,
        repoId,
        tab: "pulls",
        contentKind: isConflicts ? "pull-conflicts" : "pull-view",
        contentPath: pullNumber,
        branch: "",
        globalPage: null,
        normalizedPath: `/repos/${encodeURIComponent(repoId)}/pull/${encodeURIComponent(pullNumber)}${isConflicts ? "/conflicts" : ""}`,
      };
    }

    return {
      viewMode: "repo",
      repoOwner: null,
      repoName: null,
      repoId,
      tab,
      contentKind: "root",
      contentPath: "",
      branch: "",
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
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "files",
        contentKind: "root",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: base,
      };
    }

    const third = segments[2];
    if (third === "compare") {
      const compareRange = segments[3] ? normalizeCompareRange(segments[3]) : "";
      const parts = compareRange ? compareRange.split("...") : [];
      const encodedRange = parts.length === 2 ? encodeCompareRange(parts[0], parts[1]) : "";

      let normalizedPath = `${base}/compare`;
      if (encodedRange) {
        normalizedPath = `${normalizedPath}/${encodedRange}`;
      }

      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "pulls",
        contentKind: "compare",
        contentPath: compareRange,
        branch: "",
        globalPage: null,
        normalizedPath,
      };
    }

    if (third === "blob" || third === "tree") {
      const branch = segments[3] ? decodeURIComponent(segments[3]) : "";
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
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "files",
        contentKind: third,
        contentPath,
        branch,
        globalPage: null,
        normalizedPath,
      };
    }

    if (third === "commits") {
      const branch = segments[3] ? decodeURIComponent(segments[3]) : "master";
      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "files",
        contentKind: "commits",
        contentPath: "",
        branch,
        globalPage: null,
        normalizedPath: buildRepoCommitsPath(repoOwner, repoName, branch),
      };
    }

    if (third === "commit") {
      const commitHash = segments[3] ? decodeURIComponent(segments[3]) : "";
      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "files",
        contentKind: "commit-view",
        contentPath: commitHash,
        branch: "",
        globalPage: null,
        normalizedPath: `${base}/commit/${encodeURIComponent(commitHash)}`,
      };
    }

    if (third === "branches") {
      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "files",
        contentKind: "branches",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: `${base}/branches`,
      };
    }

    if (third === "fork") {
      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "files",
        contentKind: "fork",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: `${base}/fork`,
      };
    }

    if (third === "pulse") {
      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "insights",
        contentKind: "pulse",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: buildRepoPulsePath(repoOwner, repoName),
      };
    }

    if (third === "graphs" && segments[3] === "contributors") {
      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "insights",
        contentKind: "contributors",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: buildRepoContributorsPath(repoOwner, repoName),
      };
    }

    if (third === "graphs" && segments[3] === "community") {
      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "insights",
        contentKind: "community",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: buildRepoCommunityPath(repoOwner, repoName),
      };
    }

    if (third === "community") {
      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "insights",
        contentKind: "community-standards",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: buildRepoCommunityStandardsPath(repoOwner, repoName),
      };
    }

    if (third === "new" || third === "edit" || third === "upload") {
      const contentKind = third as "new" | "edit" | "upload";
      const branch = segments[3] ? decodeURIComponent(segments[3]) : "master";
      const contentPath = decodePathSegments(segments.slice(4));
      const encodedContentPath = encodePathSegments(contentPath);
      let normalizedPath = `${base}/${contentKind}/${encodeURIComponent(branch)}`;
      if (encodedContentPath) {
        normalizedPath = `${normalizedPath}/${encodedContentPath}`;
      }

      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "files",
        contentKind,
        contentPath,
        branch,
        globalPage: null,
        normalizedPath,
      };
    }

    if (third === "issues" && segments[3] === "new") {
      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "issues",
        contentKind: "issues-new",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: `${base}/issues/new`,
      };
    }

    if (third === "issues" && segments[3]) {
      const issueNumber = decodeURIComponent(segments[3]);
      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "issues",
        contentKind: "issue-view",
        contentPath: issueNumber,
        branch: "",
        globalPage: null,
        normalizedPath: `${base}/issues/${encodeURIComponent(issueNumber)}`,
      };
    }

    if ((third === "pull" || third === "pulls") && segments[3]) {
      const pullNumber = decodeURIComponent(segments[3]);
      const isConflicts = segments[4] === "conflicts";
      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab: "pulls",
        contentKind: isConflicts ? "pull-conflicts" : "pull-view",
        contentPath: pullNumber,
        branch: "",
        globalPage: null,
        normalizedPath: `${base}/pull/${encodeURIComponent(pullNumber)}${isConflicts ? "/conflicts" : ""}`,
      };
    }

    if (REPO_TAB_KEY_SET.has(third as RepoTabKey)) {
      const tab = third as RepoTabKey;

      return {
        viewMode: "repo",
        repoOwner,
        repoName,
        repoId: null,
        tab,
        contentKind: "root",
        contentPath: "",
        branch: "",
        globalPage: null,
        normalizedPath: buildRepoTabPath(repoOwner, repoName, tab),
      };
    }

    return {
      viewMode: "repo",
      repoOwner,
      repoName,
      repoId: null,
      tab: "files",
      contentKind: "root",
      contentPath: "",
      branch: "",
      globalPage: null,
      normalizedPath: base,
    };
  }

  return {
    viewMode: "profile",
    repoOwner: null,
    repoName: null,
    repoId: null,
    tab: "files",
    contentKind: "root",
    contentPath: "",
    branch: "",
    globalPage: null,
    normalizedPath: "/",
  };
}
