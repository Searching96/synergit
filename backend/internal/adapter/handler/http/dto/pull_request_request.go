package dto

// CreatePullRequestRequest defines payload for creating a pull request.
type CreatePullRequestRequest struct {
	Title        string `json:"title" binding:"required"`
	Description  string `json:"description"`
	SourceBranch string `json:"source_branch" binding:"required"`
	TargetBranch string `json:"target_branch" binding:"required"`
}
