import type { ShowcaseRepo, StarredRepo } from "./profileTypes";

export const SAMPLE_REPOSITORIES: ShowcaseRepo[] = [];

export const PINNED_ORDER = [
  "flight-management-system",
  "rust-solo-all-db",
  "synergy-hub",
  "FoxyAdventureElementals-VNGxUITGameJam",
  "synergyit",
  "game-mario",
];

export const STARRED_REPOS: StarredRepo[] = [
  {
    owner: "toddmvlidey",
    name: "shors-python",
    description: "Implementation of Shor's algorithm in Python 3.X using state vectors",
    language: "Python",
    stars: "72",
    forks: "22",
    updatedText: "Updated on Aug 26, 2020",
  },
  {
    owner: "jwasham",
    name: "coding-interview-university",
    description: "A complete computer science study plan to become a software engineer.",
    language: "",
    stars: "340,754",
    forks: "81,912",
    updatedText: "Updated on Aug 28, 2025",
  },
  {
    owner: "moeru-ai",
    name: "airi",
    description:
      "Self hosted, your-owned Grok Companion, a container of souls of waifu, cyber livings to bring them into your worlds.",
    language: "TypeScript",
    stars: "37,686",
    forks: "3,768",
    updatedText: "Updated 7 hours ago",
  },
  {
    owner: "jart",
    name: "cosmopolitan",
    description: "build-once run-anywhere c library",
    language: "C",
    stars: "20,739",
    forks: "736",
    updatedText: "Updated on Mar 6",
  },
];
