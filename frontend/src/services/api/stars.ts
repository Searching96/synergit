import { fetcher } from "./client";
import type { Repository } from "../../types";

export interface StarStatus {
  starred: boolean;
  count: number;
}

export const starsApi = {
  getStatus: (repoId: string): Promise<StarStatus> => fetcher<StarStatus>(`/repos/${repoId}/star`),
  star: (repoId: string): Promise<StarStatus> => fetcher<StarStatus>(`/repos/${repoId}/star`, { method: "POST" }),
  unstar: (repoId: string): Promise<StarStatus> => fetcher<StarStatus>(`/repos/${repoId}/star`, { method: "DELETE" }),
  listStarred: (): Promise<Repository[]> => fetcher<Repository[]>(`/profile/starred`),
};
