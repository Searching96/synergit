import type { ProfileTabKey } from "../../../profile/pages/utils/profileTypes";
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
  | "mcp-registry";

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
};

const GLOBAL_PAGE_SET = new Set<GlobalPageKey>(Object.keys(GLOBAL_PAGE_TITLES) as GlobalPageKey[]);

export type RepoContentKind = "root" | "tree" | "blob" | "commits" | "new" | "upload";

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

  return `${base}/${tab}`;
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

export function buildRepoCommitsPath(owner: string, repoName: string, branch: string): string {
  const base = buildRepoBasePath(owner, repoName);
  const safeBranch = branch.trim() || "master";
  return `${base}/commits/${encodeURIComponent(safeBranch)}`;
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

    if (segments[2] === "new" || segments[2] === "upload") {
      const contentKind = segments[2] as "new" | "upload";
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

    if (third === "new" || third === "upload") {
      const contentKind = third as "new" | "upload";
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
