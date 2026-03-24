import { fetcher } from './client';
import type { Branch, Commit, RepoFile, Repository } from '../../types';

export const reposApi = {
  getRepos: () => fetcher<Repository[]>('/repos'),
  
  getBranches: (repoId: string) => 
    fetcher<Branch[]>(`/repos/${repoId}/branches`),
    
  getTree: (repoId: string, path: string = '', branch: string = '') => 
    fetcher<RepoFile[]>(`/repos/${repoId}/tree?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`),
    
  getBlob: (repoId: string, path: string, branch: string = '') => 
    fetcher<{ content: string } | string>(`/repos/${repoId}/blob?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`),
    
  getCommits: (repoId: string, branch: string = '') => 
    fetcher<Commit[]>(`/repos/${repoId}/commits?branch=${encodeURIComponent(branch)}`),
};