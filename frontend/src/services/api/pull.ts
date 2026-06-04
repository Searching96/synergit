import { fetcher } from "./client";
import type { ConflictFile, CreatePullRequestPayload, PullRequest, ResolveConflictsPayload } from "../../types";

export const pullsApi = {
  create: (repoId: string, payload: CreatePullRequestPayload): Promise<PullRequest> => {
    return fetcher(`/repos/${repoId}/pulls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  list: (repoId: string): Promise<PullRequest[]> => {
    return fetcher(`/repos/${repoId}/pulls`);
  },

  get: (repoId: string, pullId: string): Promise<PullRequest> => {
    return fetcher(`/repos/${repoId}/pulls/${pullId}`);
  },

  merge: (repoId: string, pullId: string): Promise<{ message: string }> => {
    return fetcher(`/repos/${repoId}/pulls/${pullId}/merge`, {
      method: 'POST',
    });
  },

  close: (repoId: string, pullId: string): Promise<{ message: string }> => {
    return fetcher(`/repos/${repoId}/pulls/${pullId}/close`, {
      method: 'POST',
    });
  },

  reopen: (repoId: string, pullId: string): Promise<{ message: string }> => {
    return fetcher(`/repos/${repoId}/pulls/${pullId}/reopen`, {
      method: 'POST',
    });
  },

  getConflicts: (repoId: string, pullId: string): Promise<ConflictFile[]> => {
    return fetcher(`/repos/${repoId}/pulls/${pullId}/conflicts`);
  },

  resolveConflicts: (repoId: string, pullId: string, payload: ResolveConflictsPayload): 
    Promise<{ message: string }> => {
    return fetcher(`/repos/${repoId}/pulls/${pullId}/conflicts/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
