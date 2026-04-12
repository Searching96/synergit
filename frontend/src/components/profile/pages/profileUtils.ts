import type { Repository } from "../../../types";
import type { ShowcaseRepo } from "./profileTypes";
import { SAMPLE_REPOSITORIES } from "./profileData";

const LANGUAGE_COLORS: Record<string, string> = {
  "Assembly": "#6e4c13",
  "Batchfile": "#c1f12e",
  "C#": "#178600",
  "TypeScript": "var(--language-typescript)",
  "JavaScript": "var(--language-javascript)",
  "Python": "var(--language-python)",
  "Go": "var(--language-go)",
  "Rust": "var(--language-rust)",
  "Java": "var(--language-java)",
  "Shell": "#89e051",
  "CSS": "#563d7c",
  "HTML": "var(--language-html)",
  "Jupyter Notebook": "var(--language-jupyter)",
  "C": "var(--language-c)",
  "C++": "var(--language-cpp)",
  "Dockerfile": "#384d54",
  "GDScript": "var(--language-gdscript)",
  "Haskell": "#5e5086",
};

export function languageColor(language: string): string {
  return LANGUAGE_COLORS[language] || "var(--text-secondary)";
}

export function formatRepositoryVisibilityLabel(rawVisibility?: string): "Public" | "Private" {
  const normalized = (rawVisibility || "").trim().toLowerCase();
  return normalized === "private" ? "Private" : "Public";
}

function normalizeRepositoryDescription(description?: string): string | undefined {
  const trimmed = (description || "").trim();
  return trimmed ? trimmed : undefined;
}

export function buildDefaultRepositories(repositories: Repository[]): ShowcaseRepo[] {
  if (repositories.length === 0) return SAMPLE_REPOSITORIES;

  const liveRepos = repositories.map((repo) => ({
    name: repo.name,
    visibility: formatRepositoryVisibilityLabel(repo.visibility),
    description: normalizeRepositoryDescription(repo.description),
    language: (repo.primary_language || repo.language || "").trim(),
    updatedText: "Updated recently",
    stars: typeof repo.stars === "number" ? repo.stars : 0,
    forks: typeof repo.forks === "number" ? repo.forks : 0,
    sparkline: [1, 1, 2, 2, 2, 3, 3, 2, 2, 2, 3, 4, 3, 2, 2, 1],
  }));

  const filler = SAMPLE_REPOSITORIES.filter(
    (sample) => !liveRepos.some((repo) => repo.name.toLowerCase() === sample.name.toLowerCase()),
  );

  return [...liveRepos, ...filler];
}

function normalizeOwner(value: string): string {
  return value.trim().toLowerCase();
}

function inferOwnerFromPath(pathValue: string): string {
  const parts = pathValue
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);

  if (parts.length >= 2) {
    return normalizeOwner(parts[parts.length - 2]);
  }

  return "";
}

function inferOwnerFromCloneURL(cloneURL: string): string {
  try {
    const url = new URL(cloneURL);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length >= 2) {
      return normalizeOwner(parts[parts.length - 2]);
    }
  } catch {
    return "";
  }

  return "";
}

export function isRepositoryOwnedByUser(repo: Repository, username: string): boolean {
  const expectedOwner = normalizeOwner(username);
  if (!expectedOwner) {
    return false;
  }

  if (repo.owner && repo.owner.trim()) {
    return normalizeOwner(repo.owner) === expectedOwner;
  }

  if (repo.path && repo.path.trim()) {
    return inferOwnerFromPath(repo.path) === expectedOwner;
  }

  if (repo.clone_url && repo.clone_url.trim()) {
    return inferOwnerFromCloneURL(repo.clone_url) === expectedOwner;
  }

  return false;
}

export function buildContributionMatrix(): number[][] {
  return Array.from({ length: 53 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const score = (week * 7 + day * 3 + (week % 5) * 11) % 10;
      if (score < 3) return 0;
      if (score < 5) return 1;
      if (score < 7) return 2;
      if (score < 9) return 3;
      return 4;
    }),
  );
}

export function contributionColor(level: number): string {
  switch (level) {
    case 0:
      return "var(--contrib-level-0)";
    case 1:
      return "var(--contrib-level-1)";
    case 2:
      return "var(--contrib-level-2)";
    case 3:
      return "var(--contrib-level-3)";
    default:
      return "var(--contrib-level-4)";
  }
}

