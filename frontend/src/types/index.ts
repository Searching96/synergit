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

export interface ConflictFile {
	path: string;
	content: string;
}

export interface ConflictResolution {
	path: string;
	resolved_content: string;
}

export interface ResolveConflictsPayload {
	commit_message: string;
	resolutions: ConflictResolution[];
}

export interface PullRequest {
	id: string;
	repo_id: string;
	creator_id: string;
	title: string;
	description: string;
	source_branch: string;
	target_branch: string;
	status: 'OPEN' | 'MERGED' | 'CLOSED';
	created_at: string;
	updated_at: string;
}

export interface CreateBranchPayload {
	name: string;
	from_branch?: string;
}

export interface CreatePullRequestPayload {
	title: string;
	description?: string;
	source_branch: string;
	target_branch: string;
}