import { fetcher } from './client';
import type {
  AssignIssuePayload,
  CreateIssuePayload,
  Issue,
  IssueAssignee,
  IssueComment,
  IssueEvent,
  PullRequest,
  UpdateIssueStatusPayload,
} from '../../types';

export const issuesApi = {
  create: (repoId: string, payload: CreateIssuePayload): Promise<Issue> =>
    fetcher<Issue>(`/repos/${repoId}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  list: (repoId: string): Promise<Issue[]> =>
    fetcher<Issue[]>(`/repos/${repoId}/issues`),

  get: (repoId: string, issueId: string): Promise<Issue> =>
    fetcher<Issue>(`/repos/${repoId}/issues/${issueId}`),

  updateStatus: (
    repoId: string,
    issueId: string,
    payload: UpdateIssueStatusPayload,
  ): Promise<{ message: string }> =>
    fetcher<{ message: string }>(`/repos/${repoId}/issues/${issueId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  listAssignees: (repoId: string, issueId: string): Promise<IssueAssignee[]> =>
    fetcher<IssueAssignee[]>(`/repos/${repoId}/issues/${issueId}/assignees`),

  listEvents: (repoId: string, issueId: string): Promise<IssueEvent[]> =>
    fetcher<IssueEvent[]>(`/repos/${repoId}/issues/${issueId}/events`),

  listComments: (repoId: string, issueId: string): Promise<IssueComment[]> =>
    fetcher<IssueComment[]>(`/repos/${repoId}/issues/${issueId}/comments`),

  addComment: (repoId: string, issueId: string, body: string): Promise<IssueComment> =>
    fetcher<IssueComment>(`/repos/${repoId}/issues/${issueId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    }),

  assign: (
    repoId: string,
    issueId: string,
    payload: AssignIssuePayload,
  ): Promise<{ message: string }> =>
    fetcher<{ message: string }>(`/repos/${repoId}/issues/${issueId}/assignees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  unassign: (
    repoId: string,
    issueId: string,
    userId: string,
  ): Promise<{ message: string }> =>
    fetcher<{ message: string }>(`/repos/${repoId}/issues/${issueId}/assignees/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    }),

  listLinkedPullRequests: (repoId: string, issueId: string): Promise<PullRequest[]> =>
    fetcher<PullRequest[]>(`/repos/${repoId}/issues/${issueId}/pulls`),

  listLinkedBranches: (repoId: string, issueId: string): Promise<string[]> =>
    fetcher<string[]>(`/repos/${repoId}/issues/${issueId}/branches`),

  linkBranch: (repoId: string, issueId: string, branchName: string): Promise<{ message: string }> =>
    fetcher<{ message: string }>(`/repos/${repoId}/issues/${issueId}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch_name: branchName }),
    }),

  unlinkBranch: (repoId: string, issueId: string, branchName: string): Promise<{ message: string }> =>
    fetcher<{ message: string }>(`/repos/${repoId}/issues/${issueId}/branches/${encodeURIComponent(branchName)}`, {
      method: 'DELETE',
    }),
};
