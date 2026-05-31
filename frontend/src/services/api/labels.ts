import { fetcher } from './client';
import type { AddLabelPayload, Label, RepoCollaborator } from '../../types';

export const labelsApi = {
  listForRepo: (repoId: string): Promise<Label[]> =>
    fetcher<Label[]>(`/repos/${repoId}/labels`),

  listForIssue: (repoId: string, issueId: string): Promise<Label[]> =>
    fetcher<Label[]>(`/repos/${repoId}/issues/${issueId}/labels`),

  add: (repoId: string, issueId: string, payload: AddLabelPayload): Promise<{ message: string }> =>
    fetcher<{ message: string }>(`/repos/${repoId}/issues/${issueId}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  remove: (repoId: string, issueId: string, labelId: string): Promise<{ message: string }> =>
    fetcher<{ message: string }>(`/repos/${repoId}/issues/${issueId}/labels/${encodeURIComponent(labelId)}`, {
      method: 'DELETE',
    }),
};

export const collaboratorsApi = {
  list: (repoId: string): Promise<RepoCollaborator[]> =>
    fetcher<RepoCollaborator[]>(`/repos/${repoId}/collabs`),
};
