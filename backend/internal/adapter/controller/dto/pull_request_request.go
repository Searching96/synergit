package dto

// CreatePullRequestRequest defines payload for creating a pull request.
type CreatePullRequestRequest struct {
	Title        string `json:"title"`
	Description  string `json:"description"`
	SourceBranch string `json:"source_branch"`
	TargetBranch string `json:"target_branch"`
}

// ConflictResolutionRequest defines one resolved file for merge conflict handling.
type ConflictResolutionRequest struct {
	Path            string `json:"path"`
	ResolvedContent string `json:"resolved_content"`
}

// ResolveConflictsRequest defines payload for resolving merge conflicts in a PR.
type ResolveConflictsRequest struct {
	CommitMessage string                      `json:"commit_message"`
	Resolutions   []ConflictResolutionRequest `json:"resolutions"`
}
