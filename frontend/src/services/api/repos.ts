import { fetcher } from './client';
import type { Branch, Commit, RepoFile, Repository } from '../../types';

export const reposApi = {
  getRepos: () => fetcher<Repository[]>('/repos'),
  
  getBranches: (repoName: string) => 
    fetcher<Branch[]>(`/repos/${repoName}/branches`),
    
  getTree: (repoName: string, path: string = '', branch: string = '') => 
    fetcher<RepoFile[]>(`/repos/${repoName}/tree?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`),
    
  getBlob: (repoName: string, path: string, branch: string = '') => 
    fetcher<{ content: string } | string>(`/repos/${repoName}/blob?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`),
    
  getCommits: (repoName: string, branch: string = '') => 
    fetcher<Commit[]>(`/repos/${repoName}/commits?branch=${encodeURIComponent(branch)}`),
};