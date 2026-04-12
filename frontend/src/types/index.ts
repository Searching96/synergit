export interface Repository {
	id: string;
	name: string;
	path: string;
	created_at: string;
	description?: string;
	visibility?: RepositoryVisibility | string;
	owner?: string;
	clone_url?: string;
	language?: string;
	primary_language?: string;
	stars?: number;
	forks?: number;
	updated_at?: string;
}

export type RepositoryVisibility = 'public' | 'private';

export interface CreateRepositoryPayload {
	name: string;
	description?: string;
	visibility?: RepositoryVisibility;
	initialize_readme?: boolean;
	gitignore_template?: string;
	license_template?: string;
}

export interface RepoFile {
	name: string;
	path: string;
	type: 'FILE' | 'DIR';
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

export interface CommitTrendPoint {
	date: string;
	commit_count: number;
}

export interface ContributorStat {
	author_name: string;
	commit_count: number;
}

export interface BranchActivityStat {
	branch_name: string;
	commit_count: number;
}

export interface LanguageBreakdownStat {
	language: string;
	bytes: number;
	percentage: number;
}

export interface RepoInsightsSnapshot {
	repo_id: string;
	computed_at: string;
	commits_last_30d: number;
	commit_trend: CommitTrendPoint[];
	top_contributors: ContributorStat[];
	branch_activity: BranchActivityStat[];
	primary_language?: string;
	language_breakdown: LanguageBreakdownStat[];
	last_error?: string;
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

export type IssueStatus = 'OPEN' | 'CLOSED';

export interface IssueAssignee {
	issue_id: string;
	user_id: string;
	assigned_at: string;
}

export interface Issue {
	id: string;
	repo_id: string;
	creator_id: string;
	title: string;
	description: string;
	status: IssueStatus;
	created_at: string;
	updated_at: string;
	assignees?: IssueAssignee[];
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

export interface CreateIssuePayload {
	title: string;
	description?: string;
}

export interface UpdateIssueStatusPayload {
	status: IssueStatus;
}

export interface AssignIssuePayload {
	user_id: string;
}

export interface CommitFileChangePayload {
	branch: string;
	path: string;
	content: string;
	commit_message: string;
}
