import { fetcher } from './client';
import type {
  AssignIssuePayload,
  CreateIssuePayload,
  Issue,
  IssueAssignee,
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
};

