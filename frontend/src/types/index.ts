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
	open_issues_count?: number;
	open_pulls_count?: number;
}

export type RepositoryVisibility = 'PUBLIC' | 'PRIVATE';

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

export interface CommitPage {
	commits: Commit[];
	total_commits: number;
}

export interface CommitStats {
	total_commits: number;
	latest_commit: Commit | null;
}

export interface Branch {
	name: string;
	commit_hash: string;
	is_default: boolean;
	last_author?: string;
	last_updated?: string;
	behind_count?: number;
	ahead_count?: number;
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

export interface ProfileContributionDay {
	date: string;
	commit_count: number;
}

export interface ProfileActivityChart {
	commits: number;
	code_reviews: number;
	issues: number;
	pull_requests: number;
}

export interface ProfileRepoContribution {
	repository: string;
	commit_count: number;
}

export interface ProfileActivityOverview {
	top_repositories: ProfileRepoContribution[];
	other_repo_count: number;
	commits_last_365_days: number;
}

export interface ProfileActivitySnapshot {
	username: string;
	computed_at: string;
	selected_year: number;
	available_years: number[];
	contribution_days: ProfileContributionDay[];
	total_contributions: number;
	activity_chart: ProfileActivityChart;
	activity_overview: ProfileActivityOverview;
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
	source_commit_hash?: string;
	target_commit_hash?: string;
	status: 'OPEN' | 'MERGED' | 'CLOSED';
	created_at: string;
	updated_at: string;
}

export interface PullRequestEvent {
	id: string;
	pull_request_id: string;
	actor_id: string;
	actor: string;
	event_type: string;
	created_at: string;
}

export type CompareFileStatus = 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED' | 'COPIED' | 'UNKNOWN';

export interface CompareFileDiff {
	path: string;
	previous_path?: string;
	status: CompareFileStatus;
	additions: number;
	deletions: number;
	patch: string;
}

export interface PullRequestCompareSummary {
	commit_count: number;
	files_changed: number;
	additions: number;
	deletions: number;
	contributor_count: number;
}

export interface PullRequestCompareResult {
	repo_id: string;
	base_ref: string;
	head_ref: string;
	can_compare: boolean;
	mergeable: boolean;
	merge_message: string;
	summary: PullRequestCompareSummary;
	commits: Commit[];
	files: CompareFileDiff[];
	related_pull_requests: PullRequest[];
}

export type IssueStatus = 'OPEN' | 'CLOSED';
export type IssueCloseReason = 'COMPLETED' | 'NOT_PLANNED' | 'DUPLICATE';

export interface IssueAssignee {
	issue_id: string;
	user_id: string;
	assigned_at: string;
}

export interface IssueEvent {
	id: string;
	issue_id: string;
	actor_id: string;
	actor: string;
	event_type: string;
	created_at: string;
}

export interface IssueComment {
	id: string;
	issue_id: string;
	author_id: string;
	author: string;
	body: string;
	created_at: string;
}

export interface Issue {
	id: string;
	repo_id: string;
	creator_id: string;
	title: string;
	description: string;
	status: IssueStatus;
	close_reason?: IssueCloseReason | null;
	created_at: string;
	updated_at: string;
	assignees?: IssueAssignee[];
}

export interface CreateBranchPayload {
	name: string;
	from_branch?: string;
}

export interface RenameBranchPayload {
	old_name: string;
	new_name: string;
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
	close_reason?: IssueCloseReason | null;
}

export interface AssignIssuePayload {
	user_id: string;
}

export interface Label {
	id: string;
	repo_id: string;
	name: string;
	color: string;
	description: string;
	created_at: string;
}

export interface RepoCollaborator {
	repository_id: string;
	user_id: string;
	username: string;
	role: string;
	created_at: string;
}

export interface AddLabelPayload {
	label_id: string;
}

export interface CommitFileChangePayload {
	branch: string;
	path: string;
	old_path?: string;
	content: string;
	commit_message: string;
}

export interface CommitFileEntryPayload {
	path: string;
	content: string;
}

export interface CommitFilesChangePayload {
	branch: string;
	files: CommitFileEntryPayload[];
	commit_message: string;
}

export interface DeletePathPayload {
	branch: string;
	path: string;
	commit_message: string;
}
