import { fetcher } from './client';
import type {
  Branch,
  Commit,
  CreateRepositoryPayload,
  RepoInsightsSnapshot,
  CommitFileChangePayload,
  CommitFilesChangePayload,
  CreateBranchPayload,
  RepoFile,
  Repository,
} from '../../types';

export const reposApi = {
  getRepos: () => fetcher<Repository[]>('/repos'),

  createRepo: (payload: CreateRepositoryPayload) =>
    fetcher<Repository>('/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  createBranch: (repoId: string, payload: CreateBranchPayload) =>
    fetcher<Branch>(`/repos/${repoId}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  commitFileChange: (repoId: string, payload: CommitFileChangePayload) =>
    fetcher<{ message: string }>(`/repos/${repoId}/commit-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  commitFilesChange: (repoId: string, payload: CommitFilesChangePayload) =>
    fetcher<{ message: string }>(`/repos/${repoId}/commit-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  
  getBranches: (repoId: string) => 
    fetcher<Branch[]>(`/repos/${repoId}/branches`),
    
  getTree: (repoId: string, path: string = '', branch: string = '') => 
    fetcher<RepoFile[]>(`/repos/${repoId}/tree?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`),
    
  getBlob: (repoId: string, path: string, branch: string = '') => 
    fetcher<{ content: string } | string>(`/repos/${repoId}/blob?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`),
    
  getCommits: (repoId: string, branch: string = '', path: string = '') => {
    const params = new URLSearchParams();
    params.set('branch', branch);

    if (path.trim()) {
      params.set('path', path);
    }

    return fetcher<Commit[]>(`/repos/${repoId}/commits?${params.toString()}`);
  },

  getInsights: (repoId: string) =>
    fetcher<RepoInsightsSnapshot>(`/repos/${repoId}/insights`),

  triggerInsightsRecompute: (repoId: string, trigger: string = 'manual_frontend') =>
    fetcher<{ message: string }>(
      `/repos/${repoId}/insights/recompute?trigger=${encodeURIComponent(trigger)}`,
      { method: 'POST' },
    ),
};
