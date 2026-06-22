package dto

type CreateIssueRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type UpdateIssueStatusRequest struct {
	Status      string `json:"status"`
	CloseReason string `json:"close_reason"`
}

type AssignIssueRequest struct {
	UserID string `json:"user_id" binding:"required"`
}

type LinkBranchRequest struct {
	BranchName string `json:"branch_name" binding:"required"`
}

type CreateIssueCommentRequest struct {
	Body string `json:"body"`
}
