export type ProfileTabKey = "overview" | "repositories" | "projects" | "packages" | "stars";

export interface ShowcaseRepo {
  name: string;
  visibility: string;
  description?: string;
  language: string;
  updatedText: string;
  stars: number;
  forks: number;
  sparkline: number[];
}

export interface StarredRepo {
  owner: string;
  name: string;
  description: string;
  language: string;
  stars: string;
  forks: string;
  updatedText: string;
}

