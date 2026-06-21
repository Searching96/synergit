import { fetcher } from "./client";
import type { ConflictFile, CreatePullRequestPayload, Issue, Label, PullRequest, PullRequestEvent, ResolveConflictsPayload } from "../../types";

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

  listEvents: (repoId: string, pullId: string): Promise<PullRequestEvent[]> => {
    return fetcher(`/repos/${repoId}/pulls/${pullId}/events`);
  },

  merge: (repoId: string, pullId: string, commitMessage?: string, description?: string): Promise<{ message: string }> => {
    return fetcher(`/repos/${repoId}/pulls/${pullId}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commit_message: commitMessage || '', description: description || '' }),
    });
  },

  revert: (repoId: string, pullId: string): Promise<PullRequest> => {
    return fetcher(`/repos/${repoId}/pulls/${pullId}/revert`, {
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

  // PR Labels
  listPRLabels: (repoId: string, pullId: string) =>
    fetcher<Label[]>(`/repos/${repoId}/pulls/${pullId}/labels`),

  addPRLabel: (repoId: string, pullId: string, labelId: string) =>
    fetcher<{ message: string }>(`/repos/${repoId}/pulls/${pullId}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label_id: labelId }),
    }),

  removePRLabel: (repoId: string, pullId: string, labelId: string) =>
    fetcher<void>(`/repos/${repoId}/pulls/${pullId}/labels/${encodeURIComponent(labelId)}`, {
      method: 'DELETE',
    }),

  // PR Assignees
  listPRAssignees: (repoId: string, pullId: string) =>
    fetcher<Array<{ user_id: string; assigned_at: string }>>(`/repos/${repoId}/pulls/${pullId}/assignees`),

  addPRAssignee: (repoId: string, pullId: string, userId: string) =>
    fetcher<{ message: string }>(`/repos/${repoId}/pulls/${pullId}/assignees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    }),

	removePRAssignee: (repoId: string, pullId: string, userId: string) =>
		fetcher<void>(`/repos/${repoId}/pulls/${pullId}/assignees/${encodeURIComponent(userId)}`, {
			method: 'DELETE',
		}),

	// PR Issues
	getLinkedIssues: (repoId: string, pullId: string) =>
		fetcher<Issue[]>(`/repos/${repoId}/pulls/${pullId}/issues`),

	linkIssue: (repoId: string, pullId: string, issueId: string) =>
		fetcher<{ message: string }>(`/repos/${repoId}/pulls/${pullId}/issues`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ issue_id: issueId }),
		}),

	unlinkIssue: (repoId: string, pullId: string, issueId: string) =>
		fetcher<void>(`/repos/${repoId}/pulls/${pullId}/issues/${encodeURIComponent(issueId)}`, {
			method: 'DELETE',
		}),
};
