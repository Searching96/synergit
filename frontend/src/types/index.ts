export interface Repository {
	id: string;
	name: string;
	path: string;
	created_at: string;
}

export interface RepoFile {
	name: string;
	path: string;
	type: 'file' | 'dir';
}


export interface Commit {
	hash: string;
	author: string;
	message: string;
	date: string; // ISO string from the backend
}

export interface Branch {
	name: string;
	commit_hash: string;
	is_default: boolean;
}