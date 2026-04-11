import type { Repository } from "../../types";
import type { ShowcaseRepo } from "./profileTypes";
import { SAMPLE_REPOSITORIES } from "./profileData";

const LANGUAGE_COLORS: Record<string, string> = {
  "TypeScript": "#3178c6",
  "JavaScript": "#f1e05a",
  "Python": "#3572A5",
  "Go": "#00ADD8",
  "Rust": "#dea584",
  "Java": "#b07219",
  "HTML": "#e34c26",
  "Jupyter Notebook": "#DA5B0B",
  "C": "#555555",
  "C++": "#f34b7d",
  "GDScript": "#355570",
};

export function languageColor(language: string): string {
  return LANGUAGE_COLORS[language] || "#57606a";
}

export function buildDefaultRepositories(repositories: Repository[]): ShowcaseRepo[] {
  if (repositories.length === 0) return SAMPLE_REPOSITORIES;

  const languageCycle = ["TypeScript", "Go", "Rust", "Python", "JavaScript", "HTML"];

  const liveRepos = repositories.map((repo, index) => ({
    name: repo.name,
    visibility: "Public" as const,
    description: `Repository at ${repo.path}`,
    language: languageCycle[index % languageCycle.length],
    updatedText: "Updated recently",
    stars: 0,
    forks: 0,
    sparkline: [1, 1, 2, 2, 2, 3, 3, 2, 2, 2, 3, 4, 3, 2, 2, 1],
  }));

  const filler = SAMPLE_REPOSITORIES.filter(
    (sample) => !liveRepos.some((repo) => repo.name.toLowerCase() === sample.name.toLowerCase()),
  );

  return [...liveRepos, ...filler];
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
      return "#ebedf0";
    case 1:
      return "#9be9a8";
    case 2:
      return "#40c463";
    case 3:
      return "#30a14e";
    default:
      return "#216e39";
  }
}
