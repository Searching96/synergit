import type { Branch, Commit, RepoFile, Repository } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// A generic fetcher that handlers the boilerplate
async function fetcher<T>(endpoint: string): Promise<T> {
	const response = await fetch(`${BASE_URL}${endpoint}`);

	if (!response.ok) {
		const errData = await response.json().catch(() => ({}));
		throw new Error(errData.err || `HTTP error! status: ${response.status}`)
	}

	return response.json();
}

export const api = {
	getRepos: () => fetcher<Repository[]>('/repos'),

	getBranches: (repoName: string) =>
		fetcher<Branch[]>(`/repos/${repoName}/branches`),

	getTree: (repoName: string, path: string, branch: string = '') =>
		fetcher<RepoFile[]>(`/repos/${repoName}/tree?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`),

	getBlob: (repoName: string, path: string, branch: string = '') =>
		fetcher<{ content: string } | string>(`/repos/${repoName}/blob?=path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`),

	getCommits: (repoName: string, branch: string = '') =>
		fetcher<Commit[]>(`/repos/${repoName}/commits?branch=${encodeURIComponent(branch)}`),
}