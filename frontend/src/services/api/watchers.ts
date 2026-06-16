import { fetcher } from "./client";

export interface WatchStatus {
  watched: boolean;
  count: number;
}

export const watchersApi = {
  getStatus: (repoId: string): Promise<WatchStatus> => fetcher<WatchStatus>(`/repos/${repoId}/watch`),
  watch: (repoId: string): Promise<WatchStatus> => fetcher<WatchStatus>(`/repos/${repoId}/watch`, { method: "POST" }),
  unwatch: (repoId: string): Promise<WatchStatus> => fetcher<WatchStatus>(`/repos/${repoId}/watch`, { method: "DELETE" }),
};
