import { fetcher } from './client';
import type {
  Branch,
  Commit,
  PullRequestCompareResult,
  CreateRepositoryPayload,
  ProfileActivitySnapshot,
  RepoInsightsSnapshot,
  CommitFileChangePayload,
  CommitFilesChangePayload,
  CreateBranchPayload,
  DeletePathPayload,
  RenameBranchPayload,
  RepoFile,
  Repository,
} from '../../types';

export const reposApi = {
  getRepos: () => fetcher<Repository[]>('/repos'),

  getRepoCount: () => fetcher<{ count: number }>('/repos/count'),

  createRepo: (payload: CreateRepositoryPayload) =>
    fetcher<Repository>('/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  updateVisibility: (repoId: string, visibility: 'PUBLIC' | 'PRIVATE') =>
    fetcher<Repository>(`/repos/${repoId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility }),
    }),

  renameRepo: (repoId: string, name: string) =>
    fetcher<Repository>(`/repos/${repoId}/name`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),

  deleteRepo: (repoId: string) =>
    fetcher<{ message: string }>(`/repos/${repoId}`, {
      method: 'DELETE',
    }),

  createBranch: (repoId: string, payload: CreateBranchPayload) =>
    fetcher<Branch>(`/repos/${repoId}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  renameBranch: (repoId: string, payload: RenameBranchPayload) =>
    fetcher<Branch>(`/repos/${repoId}/branches`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  deleteBranch: (repoId: string, branchName: string) =>
    fetcher<void>(`/repos/${repoId}/branches/${encodeURIComponent(branchName)}`, {
      method: 'DELETE',
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
  
  deletePath: (repoId: string, payload: DeletePathPayload) =>
    fetcher<{ message: string }>(`/repos/${repoId}/contents`, {
      method: 'DELETE',
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

  getCommitDetail: (repoId: string, commitHash: string) =>
    fetcher<Commit>(`/repos/${repoId}/commits/${encodeURIComponent(commitHash)}`),

  getCommitDiff: (repoId: string, commitHash: string) =>
    fetcher<Array<{ path: string; additions: number; deletions: number; patch: string }>>(`/repos/${repoId}/commits/${encodeURIComponent(commitHash)}/diff`),

  getCompare: (repoId: string, baseRef: string, headRef: string) =>
    fetcher<PullRequestCompareResult>(
      `/repos/${repoId}/compare?base=${encodeURIComponent(baseRef)}&head=${encodeURIComponent(headRef)}`,
    ),

  getInsights: (repoId: string) =>
    fetcher<RepoInsightsSnapshot>(`/repos/${repoId}/insights`),

  triggerInsightsRecompute: (repoId: string, trigger: string = 'manual_frontend') =>
    fetcher<{ message: string }>(
      `/repos/${repoId}/insights/recompute?trigger=${encodeURIComponent(trigger)}`,
      { method: 'POST' },
    ),

  getProfileActivity: (year?: number) => {
    const query = typeof year === 'number' ? `?year=${encodeURIComponent(String(year))}` : '';
    return fetcher<ProfileActivitySnapshot>(`/profile/activity${query}`);
  },
};
